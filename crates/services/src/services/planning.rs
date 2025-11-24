use db::models::task::{Task, TaskStatus};

pub const PLANNING_TASK_TITLE: &str = "Planning Conversation";
pub const PLANNING_TASK_DESCRIPTION: &str =
    "Auto-generated planning chat session for the Conversation tab.";

/// Check if task is the special "Planning Conversation" task
/// Used for: skip git branch creation, use base branch directly
pub fn is_planning_conversation_task(task: &Task) -> bool {
    task.title == PLANNING_TASK_TITLE
        && task
            .description
            .as_deref()
            .map(|d| d == PLANNING_TASK_DESCRIPTION)
            .unwrap_or(false)
}

/// Check if task should skip initial prompt (task title/description)
/// Used for: prevent auto-sending task.to_prompt() as initial message
pub fn should_skip_initial_prompt(task: &Task) -> bool {
    // Planning Conversation tasks
    let is_conversation_task = is_planning_conversation_task(task);

    // Tasks in "Plan" status (kanban plan column)
    let is_plan_status_task = task.status == TaskStatus::Plan;

    is_conversation_task || is_plan_status_task
}

/// Legacy function for backward compatibility
/// Use specific functions above instead
#[deprecated(note = "Use is_planning_conversation_task() or should_skip_initial_prompt()")]
pub fn is_planning_task(task: &Task) -> bool {
    is_planning_conversation_task(task)
}
