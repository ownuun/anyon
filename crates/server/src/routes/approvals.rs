use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::post,
};
use db::models::{
    execution_process::{ExecutionProcess, ExecutionProcessRunReason},
    executor_session::ExecutorSession,
    task::{Task, TaskStatus},
};
use deployment::Deployment;
use executors::{
    actions::{
        ExecutorAction, ExecutorActionType, coding_agent_follow_up::CodingAgentFollowUpRequest,
    },
    profile::to_default_variant,
};
use services::services::container::ContainerService;
use utils::approvals::{ApprovalResponse, ApprovalStatus};

use crate::DeploymentImpl;

pub async fn respond_to_approval(
    State(deployment): State<DeploymentImpl>,
    Path(id): Path<String>,
    Json(request): Json<ApprovalResponse>,
) -> Result<Json<ApprovalStatus>, StatusCode> {
    let service = deployment.approvals();

    match service.respond(&deployment.db().pool, &id, request).await {
        Ok((status, context)) => {
            deployment
                .track_if_analytics_allowed(
                    "approval_responded",
                    serde_json::json!({
                        "approval_id": &id,
                        "status": format!("{:?}", status),
                        "tool_name": context.tool_name,
                        "execution_process_id": context.execution_process_id.to_string(),
                    }),
                )
                .await;

            // Handle ExitPlanMode approval: move to dev column and start implementation
            if context.tool_name == "ExitPlanMode" && matches!(status, ApprovalStatus::Approved) {
                if let Some(plan) = context.plan {
                    if let Err(e) = handle_exit_plan_mode_approval(
                        &deployment,
                        context.execution_process_id,
                        plan,
                    )
                    .await
                    {
                        tracing::error!("Failed to handle ExitPlanMode approval: {:?}", e);
                    }
                } else {
                    tracing::error!("ExitPlanMode approved but no plan found in context");
                }
            }

            Ok(Json(status))
        }
        Err(e) => {
            tracing::error!("Failed to respond to approval: {:?}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn handle_exit_plan_mode_approval(
    deployment: &DeploymentImpl,
    execution_process_id: uuid::Uuid,
    plan: String,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let pool = &deployment.db().pool;

    // Load execution context
    let ctx = ExecutionProcess::load_context(pool, execution_process_id).await?;

    // Save the plan to the task
    Task::update_plan(pool, ctx.task.id, Some(plan.clone())).await?;
    tracing::info!("Saved plan for task {}", ctx.task.id);

    // Move task from Plan to InProgress (dev column)
    if ctx.task.status == TaskStatus::Plan {
        Task::update_status(pool, ctx.task.id, TaskStatus::InProgress).await?;
        tracing::info!("Task {} moved from Plan to InProgress", ctx.task.id);
    }

    // Get executor profile from the current action
    let action = ctx.execution_process.executor_action()?;
    let executor_profile_id = match action.typ() {
        ExecutorActionType::CodingAgentInitialRequest(req) => req.executor_profile_id.clone(),
        ExecutorActionType::CodingAgentFollowUpRequest(req) => req.executor_profile_id.clone(),
        _ => return Err("Not a coding agent action".into()),
    };

    // Get session ID for follow-up
    let session = ExecutorSession::find_by_execution_process_id(pool, execution_process_id)
        .await?
        .ok_or("No executor session found")?;
    let session_id = session
        .session_id
        .ok_or("No session ID in executor session")?;

    // Create follow-up request with the plan as prompt
    let default_profile = to_default_variant(&executor_profile_id);
    let follow_up = CodingAgentFollowUpRequest {
        prompt: format!("Execute the following plan:\n\n{}", plan),
        session_id,
        executor_profile_id: default_profile,
    };
    let new_action = ExecutorAction::new(
        ExecutorActionType::CodingAgentFollowUpRequest(follow_up),
        action.next_action().cloned().map(Box::new),
    );

    // Start the implementation execution
    deployment
        .container()
        .start_execution(
            &ctx.task_attempt,
            &new_action,
            &ExecutionProcessRunReason::CodingAgent,
        )
        .await?;

    tracing::info!("Started implementation execution for task {}", ctx.task.id);
    Ok(())
}

pub fn router() -> Router<DeploymentImpl> {
    Router::new().route("/approvals/{id}/respond", post(respond_to_approval))
}
