import { TaskStatus } from 'shared/types';

export const statusLabels: Record<TaskStatus, string> = {
  todo: 'Backlog',
  plan: 'Plan',
  inprogress: 'Dev',
  inreview: 'Review',
  done: 'Done',
  cancelled: 'Cancelled',
};

export const statusBoardColors: Record<TaskStatus, string> = {
  todo: '--neutral-foreground',
  plan: '--primary',
  inprogress: '--info',
  inreview: '--warning',
  done: '--success',
  cancelled: '--destructive',
};
