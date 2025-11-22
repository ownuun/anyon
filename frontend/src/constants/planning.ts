export const PLANNING_TASK_TITLE = 'Planning Conversation';
export const PLANNING_TASK_DESCRIPTION =
  'Auto-generated planning chat session for the Conversation tab.';
export const PLANNING_AUTOSEND_PROMPT =
  '/anyon:anyon-method:workflows:startup-launchpad';

export const isPlanningTask = (params: {
  title: string;
  description: string | null;
}): boolean => {
  return (
    params.title === PLANNING_TASK_TITLE &&
    params.description === PLANNING_TASK_DESCRIPTION
  );
};
