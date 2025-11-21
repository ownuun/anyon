import { Loader2 } from 'lucide-react';
import { FileSearchTextarea } from '@/components/ui/file-search-textarea';
import { cn } from '@/lib/utils';
import { useProject } from '@/contexts/ProjectContext';
import { useCallback, type ReactNode } from 'react';

type Props = {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<Element>) => void;
  disabled: boolean;
  // Loading overlay
  showLoadingOverlay: boolean;
  onPasteFiles?: (files: File[]) => void;
  textareaClassName?: string;
  onFocusChange?: (isFocused: boolean) => void;
  // GPT style: buttons inside the card
  leftActions?: ReactNode;
  rightActions?: ReactNode;
};

export function FollowUpEditorCard({
  placeholder,
  value,
  onChange,
  onKeyDown,
  disabled,
  showLoadingOverlay,
  onPasteFiles,
  textareaClassName,
  onFocusChange,
  leftActions,
  rightActions,
}: Props) {
  const { projectId } = useProject();

  const handleFocus = useCallback(() => {
    onFocusChange?.(true);
  }, [onFocusChange]);

  const handleBlur = useCallback(() => {
    onFocusChange?.(false);
  }, [onFocusChange]);

  return (
    <div className="relative rounded-2xl border border-border/60 bg-background shadow-sm hover:border-border transition-colors">
      <FileSearchTextarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn('flex-1 min-h-[40px] resize-none border-0 shadow-none rounded-2xl focus:border-0', textareaClassName)}
        disabled={disabled}
        projectId={projectId}
        rows={1}
        maxRows={80}
        onPasteFiles={onPasteFiles}
      />
      {(leftActions || rightActions) && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            {leftActions}
          </div>
          <div className="flex items-center gap-2">
            {rightActions}
          </div>
        </div>
      )}
      {showLoadingOverlay && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-background/60 rounded-2xl">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  );
}
