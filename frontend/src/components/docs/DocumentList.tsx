import { FileText, Clock } from 'lucide-react';
import type { Document } from '@/types/document';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

interface DocumentListProps {
  documents: Document[];
  onSelectDoc: (docId: string) => void | Promise<void>;
  className?: string;
  selectedDocIds?: Set<string>;
  onToggleSelection?: (docId: string) => void;
}

export function DocumentList({
  documents,
  onSelectDoc,
  className,
  selectedDocIds,
  onToggleSelection,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No documents yet
      </div>
    );
  }

  const hasSelectionMode = selectedDocIds && onToggleSelection;

  return (
    <div className={cn('space-y-2', className)}>
      {documents.map((doc) => {
        const isSelected = selectedDocIds?.has(doc.id) ?? false;

        return (
          <div
            key={doc.id}
            className={cn(
              "w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors group",
              isSelected && "ring-2 ring-purple-500 bg-purple-50"
            )}
          >
            <div className="flex items-start gap-3">
              {hasSelectionMode && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelection(doc.id)}
                  className="mt-0.5"
                />
              )}
              <button
                onClick={() => onSelectDoc(doc.id)}
                className="flex items-start gap-3 flex-1 min-w-0 text-left"
              >
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate group-hover:text-foreground transition-colors">
                    {doc.title}
                  </h4>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatDistanceToNow(new Date(doc.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
