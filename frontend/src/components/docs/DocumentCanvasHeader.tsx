import { useState } from 'react';
import { X, Trash2, Check, Edit2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Document } from '@/types/document';
import type { DocumentSaveStatus } from '@/hooks/useDocumentAutosave';

interface DocumentCanvasHeaderProps {
  document: Document;
  onClose: () => void;
  onDelete: () => void | Promise<void>;
  onTitleChange: (title: string) => void | Promise<void>;
  saveStatus?: DocumentSaveStatus;
  isSaving?: boolean;
  disableTitleEdit?: boolean;
  disableDelete?: boolean;
}

export function DocumentCanvasHeader({
  document,
  onClose,
  onDelete,
  onTitleChange,
  saveStatus = 'idle',
  disableTitleEdit = false,
  disableDelete = false,
}: DocumentCanvasHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(document.title);

  const handleTitleSubmit = () => {
    if (title.trim() && title !== document.title) {
      onTitleChange(title.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setTitle(document.title);
    setIsEditingTitle(false);
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
      <div className="flex items-center gap-3 flex-1">
        {isEditingTitle ? (
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') handleTitleCancel();
              }}
              className="h-8"
              autoFocus
              onBlur={handleTitleSubmit}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleTitleSubmit}
              className="h-8 w-8 p-0"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group">
            <h2 className="text-lg font-semibold">{document.title}</h2>
            {!disableTitleEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingTitle(true)}
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {/* Auto-save status indicator */}
        {saveStatus === 'saving' && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving...
          </span>
        )}
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1.5 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3 w-3" />
            Error saving
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">

        {!disableDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        )}

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
