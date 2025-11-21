import { useTranslation } from 'react-i18next';
import MarkdownRenderer from '@/components/ui/markdown-renderer.tsx';
import {
  ActionType,
  NormalizedEntry,
  TaskAttempt,
  ToolStatus,
  type NormalizedEntryType,
  type TaskWithAttemptStatus,
  type JsonValue,
} from 'shared/types.ts';
import type { ProcessStartPayload } from '@/types/logs';
import FileChangeRenderer from './FileChangeRenderer';
import { useExpandable } from '@/stores/useExpandableStore';
import {
  AlertCircle,
  Bot,
  Brain,
  CheckSquare,
  ChevronDown,
  Hammer,
  Edit,
  Eye,
  Globe,
  Plus,
  Search,
  Settings,
  Terminal,
  User,
} from 'lucide-react';
import RawLogText from '../common/RawLogText';
import UserMessage from './UserMessage';
import PendingApprovalEntry from './PendingApprovalEntry';
import { NextActionCard } from './NextActionCard';
import { cn } from '@/lib/utils';
import { useRetryUi } from '@/contexts/RetryUiContext';

type Props = {
  entry: NormalizedEntry | ProcessStartPayload;
  expansionKey: string;
  diffDeletable?: boolean;
  executionProcessId?: string;
  taskAttempt?: TaskAttempt;
  task?: TaskWithAttemptStatus;
};

type FileEditAction = Extract<ActionType, { action: 'file_edit' }>;

const renderJson = (v: JsonValue) => (
  <pre className="whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre>
);

const getEntryIcon = (entryType: NormalizedEntryType) => {
  const iconSize = 'h-3 w-3';
  if (entryType.type === 'user_message' || entryType.type === 'user_feedback') {
    return <User className={iconSize} />;
  }
  if (entryType.type === 'assistant_message') {
    return <Bot className={iconSize} />;
  }
  if (entryType.type === 'system_message') {
    return <Settings className={iconSize} />;
  }
  if (entryType.type === 'thinking') {
    return <Brain className={iconSize} />;
  }
  if (entryType.type === 'error_message') {
    return <AlertCircle className={iconSize} />;
  }
  if (entryType.type === 'tool_use') {
    const { action_type, tool_name } = entryType;

    // Special handling for TODO tools
    if (
      action_type.action === 'todo_management' ||
      (tool_name &&
        (tool_name.toLowerCase() === 'todowrite' ||
          tool_name.toLowerCase() === 'todoread' ||
          tool_name.toLowerCase() === 'todo_write' ||
          tool_name.toLowerCase() === 'todo_read' ||
          tool_name.toLowerCase() === 'todo'))
    ) {
      return <CheckSquare className={iconSize} />;
    }

    if (action_type.action === 'file_read') {
      return <Eye className={iconSize} />;
    } else if (action_type.action === 'file_edit') {
      return <Edit className={iconSize} />;
    } else if (action_type.action === 'command_run') {
      return <Terminal className={iconSize} />;
    } else if (action_type.action === 'search') {
      return <Search className={iconSize} />;
    } else if (action_type.action === 'web_fetch') {
      return <Globe className={iconSize} />;
    } else if (action_type.action === 'task_create') {
      return <Plus className={iconSize} />;
    } else if (action_type.action === 'plan_presentation') {
      return <CheckSquare className={iconSize} />;
    } else if (action_type.action === 'tool') {
      return <Hammer className={iconSize} />;
    }
    return <Settings className={iconSize} />;
  }
  return <Settings className={iconSize} />;
};

type ExitStatusVisualisation = 'success' | 'error' | 'pending';

const getStatusIndicator = (entryType: NormalizedEntryType) => {
  let status_visualisation: ExitStatusVisualisation | null = null;
  if (
    entryType.type === 'tool_use' &&
    entryType.action_type.action === 'command_run'
  ) {
    status_visualisation = 'pending';
    if (entryType.action_type.result?.exit_status?.type === 'success') {
      if (entryType.action_type.result?.exit_status?.success) {
        status_visualisation = 'success';
      } else {
        status_visualisation = 'error';
      }
    } else if (
      entryType.action_type.result?.exit_status?.type === 'exit_code'
    ) {
      if (entryType.action_type.result?.exit_status?.code === 0) {
        status_visualisation = 'success';
      } else {
        status_visualisation = 'error';
      }
    }
  }

  // If pending, should be a pulsing primary-foreground
  const colorMap: Record<ExitStatusVisualisation, string> = {
    success: 'bg-success',
    error: 'bg-destructive',
    pending: 'bg-primary-foreground/50',
  };

  if (!status_visualisation) return null;

  return (
    <div className="relative">
      <div
        className={`${colorMap[status_visualisation]} h-1.5 w-1.5 rounded-full absolute -left-1 -bottom-4`}
      />
      {status_visualisation === 'pending' && (
        <div
          className={`${colorMap[status_visualisation]} h-1.5 w-1.5 rounded-full absolute -left-1 -bottom-4 animate-ping`}
        />
      )}
    </div>
  );
};

/**********************
 * Helper definitions *
 **********************/

const shouldRenderMarkdown = (entryType: NormalizedEntryType) =>
  entryType.type === 'assistant_message' ||
  entryType.type === 'system_message' ||
  entryType.type === 'thinking' ||
  entryType.type === 'tool_use';

const getContentClassName = (entryType: NormalizedEntryType) => {
  const base = ' whitespace-pre-wrap break-words';
  if (
    entryType.type === 'tool_use' &&
    entryType.action_type.action === 'command_run'
  )
    return `${base} font-mono`;

  // Keep content-only styling — no bg/padding/rounded here.
  if (entryType.type === 'error_message')
    return `${base} font-mono text-destructive`;

  if (entryType.type === 'thinking') return `${base} opacity-60`;

  if (
    entryType.type === 'tool_use' &&
    (entryType.action_type.action === 'todo_management' ||
      (entryType.tool_name &&
        ['todowrite', 'todoread', 'todo_write', 'todo_read', 'todo'].includes(
          entryType.tool_name.toLowerCase()
        )))
  )
    return `${base} font-mono text-foreground`;

  if (
    entryType.type === 'tool_use' &&
    entryType.action_type.action === 'plan_presentation'
  )
    return `${base} text-info bg-info/10 px-3 py-2 border-l-4 border-info`;

  return base;
};

/*********************
 * Unified card      *
 *********************/

type CardVariant = 'system' | 'error';

const MessageCard: React.FC<{
  children: React.ReactNode;
  variant: CardVariant;
  expanded?: boolean;
  onToggle?: () => void;
}> = ({ children, variant, expanded, onToggle }) => {
  const frameBase =
    'rounded-xl border px-4 py-3.5 w-full cursor-pointer transition-all duration-150';
  const systemTheme =
    'bg-slate-50/80 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 shadow-sm';
  const errorTheme =
    'border-red-200/60 dark:border-red-800/40 bg-red-50/80 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100/80 dark:hover:bg-red-900/40 shadow-sm';

  return (
    <div
      className={`${frameBase} ${
        variant === 'system' ? systemTheme : errorTheme
      }`}
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1 text-sm leading-relaxed">{children}</div>
        {onToggle && (
          <ExpandChevron
            expanded={!!expanded}
            onClick={onToggle}
            variant={variant}
          />
        )}
      </div>
    </div>
  );
};

/************************
 * Collapsible container *
 ************************/

type CollapsibleVariant = 'system' | 'error';

const ExpandChevron: React.FC<{
  expanded: boolean;
  onClick: () => void;
  variant: CollapsibleVariant;
}> = ({ expanded, onClick, variant }) => {
  const color =
    variant === 'system'
      ? 'text-muted-foreground'
      : 'text-destructive';

  return (
    <ChevronDown
      onClick={onClick}
      className={`h-4 w-4 cursor-pointer transition-transform ${color} ${
        expanded ? '' : '-rotate-90'
      }`}
    />
  );
};

const CollapsibleEntry: React.FC<{
  content: string;
  markdown: boolean;
  expansionKey: string;
  variant: CollapsibleVariant;
  contentClassName: string;
}> = ({ content, markdown, expansionKey, variant, contentClassName }) => {
  const multiline = content.includes('\n');
  const [expanded, toggle] = useExpandable(`entry:${expansionKey}`, false);

  const Inner = (
    <div className={contentClassName}>
      {markdown ? (
        <MarkdownRenderer
          content={content}
          className="whitespace-pre-wrap break-words"
          enableCopyButton={false}
        />
      ) : (
        content
      )}
    </div>
  );

  const firstLine = content.split('\n')[0];
  const PreviewInner = (
    <div className={contentClassName}>
      {markdown ? (
        <MarkdownRenderer
          content={firstLine}
          className="whitespace-pre-wrap break-words"
          enableCopyButton={false}
        />
      ) : (
        firstLine
      )}
    </div>
  );

  if (!multiline) {
    return <MessageCard variant={variant}>{Inner}</MessageCard>;
  }

  return expanded ? (
    <MessageCard variant={variant} expanded={expanded} onToggle={toggle}>
      {Inner}
    </MessageCard>
  ) : (
    <MessageCard variant={variant} expanded={expanded} onToggle={toggle}>
      {PreviewInner}
    </MessageCard>
  );
};

type ToolStatusAppearance = 'default' | 'denied' | 'timed_out';

const PLAN_APPEARANCE: Record<
  ToolStatusAppearance,
  {
    border: string;
    headerBg: string;
    headerText: string;
    contentBg: string;
    contentText: string;
  }
> = {
  default: {
    border: 'border-info/40',
    headerBg: 'bg-info/10',
    headerText: 'text-info',
    contentBg: 'bg-info/10',
    contentText: 'text-info',
  },
  denied: {
    border: 'border-destructive/40',
    headerBg: 'bg-destructive/10',
    headerText: 'text-destructive',
    contentBg: 'bg-destructive/5',
    contentText: 'text-destructive',
  },
  timed_out: {
    border: 'border-warning/40',
    headerBg: 'bg-warning/10',
    headerText: 'text-warning',
    contentBg: 'bg-warning/5',
    contentText: 'text-warning',
  },
};

const PlanPresentationCard: React.FC<{
  plan: string;
  expansionKey: string;
  defaultExpanded?: boolean;
  statusAppearance?: ToolStatusAppearance;
}> = ({
  plan,
  expansionKey,
  defaultExpanded = false,
  statusAppearance = 'default',
}) => {
  const { t } = useTranslation('common');
  const [expanded, toggle] = useExpandable(
    `plan-entry:${expansionKey}`,
    defaultExpanded
  );
  const tone = PLAN_APPEARANCE[statusAppearance];

  return (
    <div className="inline-block w-full">
      <div
        className={cn('border w-full overflow-hidden rounded-lg', tone.border)}
      >
        <button
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            toggle();
          }}
          title={
            expanded
              ? t('conversation.planToggle.hide')
              : t('conversation.planToggle.show')
          }
          className={cn(
            'w-full px-4 py-2.5 flex items-center gap-2 text-left border-b',
            tone.headerBg,
            tone.headerText,
            tone.border
          )}
        >
          <span className=" min-w-0 truncate">
            <span className="font-semibold">{t('conversation.plan')}</span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <ExpandChevron
              expanded={expanded}
              onClick={toggle}
              variant={statusAppearance === 'denied' ? 'error' : 'system'}
            />
          </div>
        </button>

        {expanded && (
          <div className={cn('px-4 py-3', tone.contentBg)}>
            <div className={cn('', tone.contentText)}>
              <MarkdownRenderer
                content={plan}
                className="whitespace-pre-wrap break-words"
                enableCopyButton
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ToolCallCard: React.FC<{
  entry: NormalizedEntry | ProcessStartPayload;
  expansionKey: string;
  forceExpanded?: boolean;
}> = ({ entry, expansionKey, forceExpanded = false }) => {
  const { t } = useTranslation('common');

  // Determine if this is a NormalizedEntry with tool_use
  const isNormalizedEntry = 'entry_type' in entry;
  const entryType =
    isNormalizedEntry && entry.entry_type.type === 'tool_use'
      ? entry.entry_type
      : undefined;

  // Compute defaults from entry
  const linkifyUrls = entryType?.tool_name === 'GitHub CLI Setup Script';
  const defaultExpanded = linkifyUrls;

  const [expanded, toggle] = useExpandable(
    `tool-entry:${expansionKey}`,
    defaultExpanded
  );
  const effectiveExpanded = forceExpanded || expanded;

  // Extract action details
  const actionType = entryType?.action_type;
  const isCommand = actionType?.action === 'command_run';
  const isTool = actionType?.action === 'tool';

  // Label and content
  const label = isCommand ? 'Ran' : entryType?.tool_name || 'Tool';

  const inlineText = isNormalizedEntry ? entry.content.trim() : '';
  const isSingleLine = inlineText !== '' && !/\r?\n/.test(inlineText);
  const showInlineSummary = isSingleLine;

  // Command details
  const commandResult = isCommand ? actionType.result : null;
  const output = commandResult?.output ?? null;
  let argsText: string | null = null;
  if (isCommand) {
    const fromArgs =
      typeof actionType.command === 'string' ? actionType.command : '';
    const fallback = inlineText;
    argsText = (fromArgs || fallback).trim();
  }

  // Tool details
  const hasArgs = isTool && !!actionType.arguments;
  const hasResult = isTool && !!actionType.result;

  const hasExpandableDetails = isCommand
    ? Boolean(argsText) || Boolean(output)
    : hasArgs || hasResult;

  const HeaderWrapper: React.ElementType = hasExpandableDetails
    ? 'button'
    : 'div';
  const headerProps = hasExpandableDetails
    ? {
        onClick: (e: React.MouseEvent) => {
          e.preventDefault();
          toggle();
        },
        title: effectiveExpanded
          ? t('conversation.toolDetailsToggle.hide')
          : t('conversation.toolDetailsToggle.show'),
      }
    : {};

  const headerClassName = cn(
    'w-full flex items-center gap-1.5 text-left text-secondary-foreground'
  );

  return (
    <div className="inline-block w-full flex flex-col gap-4">
      <HeaderWrapper {...headerProps} className={headerClassName}>
        <span className=" min-w-0 flex items-center gap-1.5">
          <span>
            {entryType && getStatusIndicator(entryType)}
            {entryType && getEntryIcon(entryType)}
          </span>
          {showInlineSummary ? (
            <span>{inlineText}</span>
          ) : (
            <span className="font-normal">{label}</span>
          )}
        </span>
      </HeaderWrapper>

      {effectiveExpanded && (
        <div className="max-h-[200px] overflow-y-auto border rounded-lg">
          {isCommand ? (
            <>
              {argsText && (
                <>
                  <div className="text-xs font-medium uppercase text-muted-foreground bg-muted/30 border-b px-3 py-2">
                    {t('conversation.args')}
                  </div>
                  <div className="px-3 py-2">{argsText}</div>
                </>
              )}

              {output && (
                <>
                  <div className="text-xs font-medium uppercase text-muted-foreground bg-muted/30 border-y px-3 py-2">
                    {t('conversation.output')}
                  </div>
                  <div className="px-3 py-2">
                    <RawLogText content={output} linkifyUrls={linkifyUrls} />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {isTool && actionType && (
                <>
                  <div className="text-xs font-medium uppercase text-muted-foreground bg-muted/30 border-b px-3 py-2">
                    {t('conversation.args')}
                  </div>
                  <div className="px-3 py-2">
                    {renderJson(actionType.arguments)}
                  </div>
                  <div className="text-xs font-medium uppercase text-muted-foreground bg-muted/30 border-y px-3 py-2">
                    {t('conversation.result')}
                  </div>
                  <div className="px-3 py-2">
                    {actionType.result?.type.type === 'markdown' &&
                      actionType.result.value && (
                        <MarkdownRenderer
                          content={actionType.result.value?.toString()}
                        />
                      )}
                    {actionType.result?.type.type === 'json' &&
                      renderJson(actionType.result.value)}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

const LoadingCard = () => {
  return (
    <div className="flex animate-pulse space-x-3 items-center">
      <div className="size-3 rounded-full bg-foreground/20"></div>
      <div className="flex-1 h-3 rounded-md bg-foreground/10"></div>
      <div className="flex-1 h-3"></div>
      <div className="flex-1 h-3"></div>
    </div>
  );
};

const isPendingApprovalStatus = (
  status: ToolStatus
): status is Extract<ToolStatus, { status: 'pending_approval' }> =>
  status.status === 'pending_approval';

const getToolStatusAppearance = (status: ToolStatus): ToolStatusAppearance => {
  if (status.status === 'denied') return 'denied';
  if (status.status === 'timed_out') return 'timed_out';
  return 'default';
};

/*******************
 * Main component  *
 *******************/

export const DisplayConversationEntryMaxWidth = (props: Props) => {
  return (
    <div className="mx-auto w-full max-w-[50rem]">
      <DisplayConversationEntry {...props} />
    </div>
  );
};

function DisplayConversationEntry({
  entry,
  expansionKey,
  executionProcessId,
  taskAttempt,
  task,
}: Props) {
  const { t } = useTranslation('common');
  const isNormalizedEntry = (
    entry: NormalizedEntry | ProcessStartPayload
  ): entry is NormalizedEntry => 'entry_type' in entry;

  const isProcessStart = (
    entry: NormalizedEntry | ProcessStartPayload
  ): entry is ProcessStartPayload => 'processId' in entry;

  const { isProcessGreyed } = useRetryUi();
  const greyed = isProcessGreyed(executionProcessId);

  if (isProcessStart(entry)) {
    return (
      <div className={greyed ? 'opacity-50 pointer-events-none' : undefined}>
        <ToolCallCard entry={entry} expansionKey={expansionKey} />
      </div>
    );
  }

  // Hide "System initialized with model" message
  if (
    isNormalizedEntry(entry) &&
    entry.entry_type.type === 'system_message' &&
    entry.content.startsWith('System initialized with model')
  ) {
    return null;
  }

  // Handle NormalizedEntry
  const entryType = entry.entry_type;
  const isSystem = entryType.type === 'system_message';
  const isError = entryType.type === 'error_message';
  const isToolUse = entryType.type === 'tool_use';
  const isUserMessage = entryType.type === 'user_message';
  const isUserFeedback = entryType.type === 'user_feedback';
  const isLoading = entryType.type === 'loading';
  const isFileEdit = (a: ActionType): a is FileEditAction =>
    a.action === 'file_edit';

  if (isUserMessage) {
    return (
      <UserMessage
        content={entry.content}
        executionProcessId={executionProcessId}
        taskAttempt={taskAttempt}
      />
    );
  }

  if (isUserFeedback) {
    const feedbackEntry = entryType as Extract<
      NormalizedEntryType,
      { type: 'user_feedback' }
    >;
    return (
      <div className="py-2">
        <div className="bg-destructive/5 px-4 py-3 rounded-lg border border-destructive/20">
          <div className="text-xs font-medium mb-2 text-destructive">
            {t('conversation.deniedByUser', {
              toolName: feedbackEntry.denied_tool,
            })}
          </div>
          <MarkdownRenderer
            content={entry.content}
            className="whitespace-pre-wrap break-words flex flex-col gap-1"
          />
        </div>
      </div>
    );
  }
  const renderToolUse = () => {
    if (!isNormalizedEntry(entry)) return null;
    if (entryType.type !== 'tool_use') return null;
    const toolEntry = entryType;

    const status = toolEntry.status;
    const statusAppearance = getToolStatusAppearance(status);
    const isPlanPresentation =
      toolEntry.action_type.action === 'plan_presentation';
    const isPendingApproval = status.status === 'pending_approval';
    const defaultExpanded = isPendingApproval || isPlanPresentation;

    const body = (() => {
      if (isFileEdit(toolEntry.action_type)) {
        const fileEditAction = toolEntry.action_type as FileEditAction;
        return (
          <div className="space-y-3">
            {fileEditAction.changes.map((change, idx) => (
              <FileChangeRenderer
                key={idx}
                path={fileEditAction.path}
                change={change}
                expansionKey={`edit:${expansionKey}:${idx}`}
                defaultExpanded={defaultExpanded}
                statusAppearance={statusAppearance}
                forceExpanded={isPendingApproval}
              />
            ))}
          </div>
        );
      }

      if (toolEntry.action_type.action === 'plan_presentation') {
        return (
          <PlanPresentationCard
            plan={toolEntry.action_type.plan}
            expansionKey={expansionKey}
            defaultExpanded={defaultExpanded}
            statusAppearance={statusAppearance}
          />
        );
      }

      return (
        <ToolCallCard
          entry={entry}
          expansionKey={expansionKey}
          forceExpanded={isPendingApproval}
        />
      );
    })();

    const content = (
      <div
        className={`px-4 py-2 text-sm space-y-3 ${greyed ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {body}
      </div>
    );

    if (isPendingApprovalStatus(status)) {
      return (
        <PendingApprovalEntry
          pendingStatus={status}
          executionProcessId={executionProcessId}
        >
          {content}
        </PendingApprovalEntry>
      );
    }

    return content;
  };

  if (isToolUse) {
    return renderToolUse();
  }

  if (isSystem || isError) {
    return (
      <div
        className={`px-4 py-2 text-sm ${greyed ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <CollapsibleEntry
          content={isNormalizedEntry(entry) ? entry.content : ''}
          markdown={shouldRenderMarkdown(entryType)}
          expansionKey={expansionKey}
          variant={isSystem ? 'system' : 'error'}
          contentClassName={getContentClassName(entryType)}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 py-2 text-sm">
        <LoadingCard />
      </div>
    );
  }

  if (entry.entry_type.type === 'next_action') {
    return (
      <div className="px-4 py-2 text-sm">
        <NextActionCard
          attemptId={taskAttempt?.id}
          containerRef={taskAttempt?.container_ref}
          failed={entry.entry_type.failed}
          execution_processes={entry.entry_type.execution_processes}
          task={task}
          needsSetup={entry.entry_type.needs_setup}
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-2 text-[18px]">
      <div className={getContentClassName(entryType)}>
        {shouldRenderMarkdown(entryType) ? (
          <MarkdownRenderer
            content={isNormalizedEntry(entry) ? entry.content : ''}
            className="whitespace-pre-wrap break-words flex flex-col gap-1"
            enableCopyButton={entryType.type === 'assistant_message'}
          />
        ) : isNormalizedEntry(entry) ? (
          entry.content
        ) : (
          ''
        )}
      </div>
    </div>
  );
}

export default DisplayConversationEntryMaxWidth;
