import { useState } from 'react';
import { X, Save, Trash2, Check, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Document } from '@/types/document';

interface DocumentCanvasHeaderProps {
  document: Document;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onTitleChange: (title: string) => void | Promise<void>;
  isSaving?: boolean;
  disableTitleEdit?: boolean;
  disableDelete?: boolean;
}

export function DocumentCanvasHeader({
  document,
  onClose,
  onSave,
  onDelete,
  onTitleChange,
  isSaving = false,
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

        {/* Saving indicator */}
        {isSaving && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Saving...
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          <span>Save</span>
        </Button>

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
