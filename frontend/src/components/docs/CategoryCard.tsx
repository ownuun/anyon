import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentList } from './DocumentList';
import type { Document, DocumentCategory } from '@/types/document';
import type { LucideIcon } from 'lucide-react';

interface CategoryCardProps {
  category: DocumentCategory;
  title: string;
  icon: LucideIcon;
  documents: Document[];
  onCreateDoc: (category: DocumentCategory) => void | Promise<void>;
  onSelectDoc: (docId: string) => void | Promise<void>;
  selectedDocIds?: Set<string>;
  onToggleSelection?: (docId: string) => void;
}

export function CategoryCard({
  category,
  title,
  icon: Icon,
  documents,
  onCreateDoc,
  onSelectDoc,
  selectedDocIds,
  onToggleSelection,
}: CategoryCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5" />
            <CardTitle className="text-xl">{title}</CardTitle>
          </div>

          {/* + Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onCreateDoc(category)}
            className="h-8 w-8 p-0 hover:bg-primary hover:text-primary-foreground transition-colors"
            title={`Create new ${title.toLowerCase()} document`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <DocumentList
          documents={documents}
          onSelectDoc={onSelectDoc}
          selectedDocIds={selectedDocIds}
          onToggleSelection={onToggleSelection}
        />
      </CardContent>
    </Card>
  );
}
