import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, MessageSquare } from 'lucide-react';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { NewCard, NewCardHeader } from '@/components/ui/new-card';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import TaskAttemptPanel from '@/components/panels/TaskAttemptPanel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useProjectTasks } from '@/hooks/useProjectTasks';
import { useTaskAttempts } from '@/hooks/useTaskAttempts';
import { useBranches } from '@/hooks';
import { attemptsApi, tasksApi } from '@/lib/api';
import { useUserSystem } from '@/components/ConfigProvider';
import { ExecutionProcessesProvider } from '@/contexts/ExecutionProcessesContext';
import {
  GitOperationsProvider,
  useGitOperationsError,
} from '@/contexts/GitOperationsContext';
import { ClickedElementsProvider } from '@/contexts/ClickedElementsProvider';
import { ReviewProvider } from '@/contexts/ReviewProvider';
import type { TaskAttempt, TaskWithAttemptStatus } from 'shared/types';
import { cn } from '@/lib/utils';
import { ConversationDocsPanel } from '@/components/conversation/ConversationDocsPanel';
import {
  PLANNING_AUTOSEND_PROMPT,
  PLANNING_TASK_DESCRIPTION,
  PLANNING_TASK_TITLE,
} from '@/constants/planning';

function GitErrorBanner() {
  const { error: gitError } = useGitOperationsError();

  if (!gitError) return null;

  return (
    <div className="mx-4 mt-4 p-3 border border-destructive rounded">
      <div className="text-destructive text-sm">{gitError}</div>
    </div>
  );
}

function usePlanningSession(
  projectId?: string,
  activated?: boolean,
  activationNonce?: number
) {
  const { config } = useUserSystem();
  const { tasksById, isLoading: tasksLoading, error: tasksError } =
    useProjectTasks(projectId ?? '');
  const { data: branches = [], isLoading: branchesLoading } = useBranches(
    projectId,
    { enabled: !!projectId }
  );
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const creationRequestedRef = useRef<number | null>(null);

  const planningTask = useMemo(() => {
    const planningTasks = Object.values(tasksById).filter(
      (task) => task.title === PLANNING_TASK_TITLE
    );

    if (!planningTasks.length) return undefined;

    return planningTasks.sort((a, b) => {
      const diff =
        new Date(b.created_at as string).getTime() -
        new Date(a.created_at as string).getTime();
      if (diff !== 0) return diff;
      return b.id.localeCompare(a.id);
    })[0];
  }, [tasksById]);

  const { data: attempts = [], isLoading: attemptsLoading } = useTaskAttempts(
    planningTask?.id,
    { enabled: !!planningTask?.id }
  );

  const latestAttempt: TaskAttempt | undefined = useMemo(() => {
    if (!attempts?.length) return undefined;
    return [...attempts].sort((a, b) => {
      const diff =
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    })[0];
  }, [attempts]);

  useEffect(() => {
    if (planningTask) {
      creationRequestedRef.current = activationNonce ?? null;
    }
  }, [planningTask, activationNonce]);

  useEffect(() => {
    setCreateError(null);
    setCreating(false);
    creationRequestedRef.current = null;
  }, [activationNonce]);

  useEffect(() => {
    if (!projectId) return;
    if (!activated) return;
    if (creating) return;
    if (creationRequestedRef.current === activationNonce) return;
    if (branchesLoading) return;
    if (!branches.length) {
      setCreateError('브랜치 정보를 불러오지 못했습니다.');
      return;
    }
    if (!config?.executor_profile) {
      setCreateError('실행기 프로필을 설정해주세요.');
      return;
    }

    const baseBranch =
      branches.find((b) => b.is_current)?.name ?? branches[0]?.name;
    if (!baseBranch) {
      setCreateError('사용할 수 있는 브랜치가 없습니다.');
      return;
    }

    creationRequestedRef.current = activationNonce ?? null;
    setCreating(true);
    setCreateError(null);

    const createPlanningTask = async () => {
      try {
        await tasksApi.createAndStart({
          task: {
            project_id: projectId,
            title: PLANNING_TASK_TITLE,
            description: PLANNING_TASK_DESCRIPTION,
            status: 'inprogress',
            parent_task_attempt: null,
            image_ids: null,
            shared_task_id: null,
          },
          executor_profile_id: config.executor_profile,
          base_branch: baseBranch,
        });
      } catch (err) {
        const msg =
          (err as { message?: string }).message ??
          '기획 대화 세션 생성에 실패했습니다.';
        setCreateError(msg);
      } finally {
        setCreating(false);
      }
    };

    void createPlanningTask();
  }, [
    branches,
    branchesLoading,
    activated,
    config?.executor_profile,
    creating,
    projectId,
    activationNonce,
  ]);

  const isLoading =
    activated &&
    (tasksLoading ||
      branchesLoading ||
      creating ||
      (!latestAttempt && attemptsLoading));

  const error = activated
    ? (tasksError ??
        createError ??
        (planningTask && !latestAttempt
          ? '시도를 불러오지 못했습니다. 새로 고침 후 다시 시도해주세요.'
          : null))
    : null;

  return {
    task: planningTask,
    attempt: latestAttempt,
    isLoading,
    error,
    retryCreate: () => {
      creationRequestedRef.current = null;
      setCreateError(null);
      setCreating(false);
    },
    activated: !!activated,
  };
}

function PlanningChatPane({
  task,
  attempt,
  isLoading,
  error,
  onRetry,
  onReset,
  autoPromptError,
  onRetryAutoPrompt,
}: {
  task: TaskWithAttemptStatus | undefined;
  attempt: TaskAttempt | undefined;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onReset: () => void;
  autoPromptError: string | null;
  onRetryAutoPrompt: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader message="기획 대화 세션 준비 중..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <Alert variant="destructive" className="w-full max-w-xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>대화 세션을 불러오지 못했습니다</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <span>{error}</span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onRetry}>
                다시 시도
              </Button>
              <Button variant="outline" onClick={onReset}>
                초기화
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!task || !attempt) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-muted-foreground">
        <p>기획 대화 세션이 준비되지 않았습니다.</p>
      </div>
    );
  }

  return (
    <GitOperationsProvider attemptId={attempt.id}>
          <ClickedElementsProvider attempt={attempt}>
        <ReviewProvider key={attempt.id}>
          <ExecutionProcessesProvider key={attempt.id} attemptId={attempt.id}>
            <NewCard className="h-full min-h-0 flex flex-col bg-diagonal-lines bg-muted border-0">
              <NewCardHeader
                className="shrink-0"
                title={
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    <span>기획 대화</span>
                  </div>
                }
              />
              <GitErrorBanner />
              {autoPromptError && (
                <div className="mx-4 mt-3">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>자동 프롬프트 전송 실패</AlertTitle>
                    <AlertDescription className="flex flex-col gap-2">
                      <span>{autoPromptError}</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={onRetryAutoPrompt}>
                          다시 보내기
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              <TaskAttemptPanel attempt={attempt} task={task}>
                {({ logs, followUp }) => (
                  <div className="flex-1 min-h-0 flex flex-col">
                    <div className="flex-1 min-h-0 flex flex-col">{logs}</div>

                    <div className="min-h-0 max-h-[50%] border-t overflow-hidden">
                      <div className="mx-auto w-full max-w-[50rem] h-full min-h-0">
                        {followUp}
                      </div>
                    </div>
                  </div>
                )}
              </TaskAttemptPanel>
            </NewCard>
          </ExecutionProcessesProvider>
        </ReviewProvider>
      </ClickedElementsProvider>
    </GitOperationsProvider>
  );
}

export function ProjectConversation() {
  const { projectId } = useParams<{ projectId: string }>();

  const [activationNonce, setActivationNonce] = useState(0);
  const [activated, setActivated] = useState(false);
  const [autoPromptError, setAutoPromptError] = useState<string | null>(null);
  const autoPromptAttemptedRef = useRef<string | null>(null);
  const autoPromptInFlightRef = useRef(false);

  const { task, attempt, isLoading, error, retryCreate } =
    usePlanningSession(projectId, activated, activationNonce);

  const sendAutoPrompt = useCallback(
    async (options?: { force?: boolean }) => {
      if (!attempt?.id) return;
      if (autoPromptInFlightRef.current) return;
      if (!options?.force && autoPromptAttemptedRef.current === attempt.id)
        return;

      autoPromptAttemptedRef.current = attempt.id;
      autoPromptInFlightRef.current = true;
      try {
        await attemptsApi.followUp(attempt.id, {
          prompt: PLANNING_AUTOSEND_PROMPT,
          variant: null,
          image_ids: null,
          retry_process_id: null,
          force_when_dirty: null,
          perform_git_reset: null,
        });
        setAutoPromptError(null);
      } catch (err) {
        const msg =
          (err as { message?: string }).message ??
          '자동 프롬프트 전송에 실패했습니다.';
        setAutoPromptError(msg);
      } finally {
        autoPromptInFlightRef.current = false;
      }
    },
    [attempt?.id]
  );

  useEffect(() => {
    if (!activated) return;
    if (!attempt?.id) return;
    if (isLoading || error) return;

    void sendAutoPrompt();
  }, [activated, attempt?.id, isLoading, error, sendAutoPrompt]);

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full"
      >
        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="p-4 h-full">
            {!activated ? (
              <div className="h-full flex items-center justify-center">
                <NewCard className="max-w-xl w-full">
                  <div className="p-8 flex flex-col gap-4 items-center text-center">
                    <MessageSquare className="h-10 w-10 text-primary" />
                    <div className="space-y-2">
                      <p className="text-lg font-semibold">기획 대화 시작</p>
                      <p className="text-sm text-muted-foreground">
                        Claude Code와 바로 대화를 시작해 기획을 정리하세요. 필요한 프롬프트는 직접 입력하면 됩니다.
                      </p>
                    </div>
                    <Button
                      size="lg"
                      onClick={() => {
                        setActivationNonce((n) => n + 1);
                        setActivated(true);
                      }}
                    >
                      기획 시작하기
                    </Button>
                  </div>
                </NewCard>
              </div>
            ) : (
              <PlanningChatPane
                task={task}
                attempt={attempt}
                isLoading={isLoading}
                error={error}
                autoPromptError={autoPromptError}
                onRetryAutoPrompt={() => sendAutoPrompt({ force: true })}
                onRetry={retryCreate}
                onReset={() => {
                  setActivated(false);
                  retryCreate();
                  autoPromptAttemptedRef.current = null;
                  setAutoPromptError(null);
                }}
              />
            )}
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={40} minSize={30}>
          <div className={cn('h-full w-full border-l bg-muted/30')}>
            {projectId && <ConversationDocsPanel projectId={projectId} />}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
