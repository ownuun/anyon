import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { FileText, Palette, Code } from 'lucide-react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { DocumentProvider, useDocumentContext } from '@/contexts/DocumentContext';
import { CategoryCard } from '@/components/docs/CategoryCard';
import { DocumentCanvas } from '@/components/docs/DocumentCanvas';
import type { DocumentCategory } from '@/types/document';

const DOC_CATEGORIES = [
  {
    key: 'planning' as DocumentCategory,
    icon: FileText,
  },
  {
    key: 'design' as DocumentCategory,
    icon: Palette,
  },
  {
    key: 'technology' as DocumentCategory,
    icon: Code,
  },
] as const;

function ProjectDocsContent() {
  const { t } = useTranslation(['docs', 'common']);
  const { documents, createDoc, openDoc, openDocument } = useDocumentContext();

  const handleCreateDoc = async (category: DocumentCategory) => {
    const title = window.prompt(t('docs:enterDocumentName'), t('docs:newDocument'));
    if (!title?.trim()) return;

    const newDoc = await createDoc(category, title.trim());
    if (newDoc) {
      await openDoc(newDoc.id);
    }
  };

  const getDocsByCategory = (category: DocumentCategory) => {
    return documents.filter((doc) => doc.category === category);
  };

  return (
    <div className="h-full">
      {!openDocument ? (
        // No document open: Full-width category view
        <div className="space-y-6 p-8 pb-16 md:pb-8 h-full overflow-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {t('docs:title')}
              </h1>
              <p className="text-muted-foreground">{t('docs:subtitle')}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {DOC_CATEGORIES.map((category) => (
              <CategoryCard
                key={category.key}
                category={category.key}
                title={t(`docs:categories.${category.key}.title`)}
                icon={category.icon}
                documents={getDocsByCategory(category.key)}
                onCreateDoc={handleCreateDoc}
                onSelectDoc={openDoc}
              />
            ))}
          </div>
        </div>
      ) : (
        // Document open: Split view with resizable panels
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel
            id="categories"
            order={1}
            defaultSize={40}
            minSize={30}
            maxSize={60}
          >
            <div className="space-y-6 p-8 pb-16 md:pb-8 h-full overflow-auto">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {t('docs:title')}
                  </h1>
                  <p className="text-muted-foreground">{t('docs:subtitle')}</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {DOC_CATEGORIES.map((category) => (
                  <CategoryCard
                    key={category.key}
                    category={category.key}
                    title={t(`docs:categories.${category.key}.title`)}
                    icon={category.icon}
                    documents={getDocsByCategory(category.key)}
                    onCreateDoc={handleCreateDoc}
                    onSelectDoc={openDoc}
                  />
                ))}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />
          <ResizablePanel id="canvas" order={2} defaultSize={60} minSize={40}>
            <DocumentCanvas />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}

export function ProjectDocs() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <DocumentProvider projectId={projectId}>
      <ProjectDocsContent />
    </DocumentProvider>
  );
}
