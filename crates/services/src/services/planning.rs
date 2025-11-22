use db::models::task::Task;

pub const PLANNING_TASK_TITLE: &str = "Planning Conversation";
pub const PLANNING_TASK_DESCRIPTION: &str =
    "Auto-generated planning chat session for the Conversation tab.";

pub fn is_planning_task(task: &Task) -> bool {
    task.title == PLANNING_TASK_TITLE
        && task
            .description
            .as_deref()
            .map(|d| d == PLANNING_TASK_DESCRIPTION)
            .unwrap_or(false)
}
