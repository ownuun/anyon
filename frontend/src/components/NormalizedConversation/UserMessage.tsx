import MarkdownRenderer from '@/components/ui/markdown-renderer';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useProcessRetry } from '@/hooks/useProcessRetry';
import { TaskAttempt, BaseAgentCapability } from 'shared/types';
import { useUserSystem } from '@/components/ConfigProvider';
import { useDraftStream } from '@/hooks/follow-up/useDraftStream';
import { RetryEditorInline } from './RetryEditorInline';
import { useRetryUi } from '@/contexts/RetryUiContext';

const UserMessage = ({
  content,
  executionProcessId,
  taskAttempt,
}: {
  content: string;
  executionProcessId?: string;
  taskAttempt?: TaskAttempt;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const retryHook = useProcessRetry(taskAttempt);
  const { capabilities } = useUserSystem();
  const attemptId = taskAttempt?.id;
  const { retryDraft } = useDraftStream(attemptId);
  const { activeRetryProcessId, isProcessGreyed } = useRetryUi();

  const canFork = !!(
    taskAttempt?.executor &&
    capabilities?.[taskAttempt.executor]?.includes(
      BaseAgentCapability.SESSION_FORK
    )
  );

  // Enter retry mode: create retry draft; actual editor will render inline
  const startRetry = async () => {
    if (!executionProcessId || !taskAttempt) return;
    setIsEditing(true);
    retryHook?.startRetry(executionProcessId, content).catch(() => {
      // rollback if server call fails
      setIsEditing(false);
    });
  };

  // Exit editing state once draft disappears (sent/cancelled)
  useEffect(() => {
    if (!retryDraft?.retry_process_id) setIsEditing(false);
  }, [retryDraft?.retry_process_id]);

  // On reload or when server provides a retry_draft for this process, show editor
  useEffect(() => {
    if (
      executionProcessId &&
      retryDraft?.retry_process_id &&
      retryDraft.retry_process_id === executionProcessId
    ) {
      setIsEditing(true);
    }
  }, [executionProcessId, retryDraft?.retry_process_id]);

  const showRetryEditor =
    !!executionProcessId &&
    isEditing &&
    activeRetryProcessId === executionProcessId;
  const greyed =
    !!executionProcessId &&
    isProcessGreyed(executionProcessId) &&
    !showRetryEditor;

  const retryState = executionProcessId
    ? retryHook?.getRetryDisabledState(executionProcessId)
    : { disabled: true, reason: 'Missing process id' };
  const disabled = !!retryState?.disabled;
  const reason = retryState?.reason ?? undefined;
  const editTitle = disabled && reason ? reason : 'Edit message';

  return (
    <div className={`px-4 py-2 ${greyed ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="group rounded-xl border px-4 py-3.5 bg-slate-50/80 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {showRetryEditor ? (
              <RetryEditorInline
                attempt={taskAttempt as TaskAttempt}
                executionProcessId={executionProcessId as string}
                initialVariant={null}
                onCancelled={() => {
                  setIsEditing(false);
                }}
              />
            ) : (
              <MarkdownRenderer
                content={content}
                className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 dark:text-slate-300"
              />
            )}
          </div>
          {executionProcessId && canFork && !showRetryEditor && (
            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
              <Button
                onClick={startRetry}
                variant="ghost"
                className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                disabled={disabled}
                title={editTitle}
                aria-label="Edit message"
                aria-disabled={disabled}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserMessage;
