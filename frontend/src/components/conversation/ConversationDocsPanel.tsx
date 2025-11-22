import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DocumentProvider, useDocumentContext } from '@/contexts/DocumentContext';
import { DocumentCanvas } from '@/components/docs/DocumentCanvas';
import type { Document } from '@/types/document';
import { cn } from '@/lib/utils';

const DOC_TABS = [
  { id: 'prd', title: 'PRD', filename: 'prd.md' },
  { id: 'ux-design', title: 'UX Design', filename: 'ux-design.md' },
  { id: 'design-guide', title: 'Design Guide', filename: 'design-guide.md' },
  { id: 'trd', title: 'TRD', filename: 'trd.md' },
  { id: 'architecture', title: 'Architecture', filename: 'architecture.md' },
  { id: 'erd', title: 'ERD', filename: 'erd.md' },
] as const;

function ConversationDocsContent() {
  const { documents, openDoc, openDocument, isLoading } = useDocumentContext();
  const [activeTab, setActiveTab] = useState<string>(DOC_TABS[0].id);

  // Map filename-based documents
  const docsByFilename = useMemo(() => {
    const map: Record<string, Document> = {};
    documents.forEach((doc) => {
      const filename = `${doc.title}.md`;
      map[filename] = doc;
    });
    return map;
  }, [documents]);

  // Auto-open the active tab's doc when available
  useEffect(() => {
    const tab = DOC_TABS.find((t) => t.id === activeTab);
    if (!tab) return;
    const doc = docsByFilename[tab.filename];
    if (doc) {
      void openDoc(doc.id);
    }
  }, [activeTab, docsByFilename, openDoc]);

  // When documents finish loading and no open document, open the first available
  useEffect(() => {
    if (isLoading) return;
    if (openDocument) return;
    const firstTab = DOC_TABS[0];
    const doc = docsByFilename[firstTab.filename];
    if (doc) {
      setActiveTab(firstTab.id);
      void openDoc(doc.id);
    }
  }, [docsByFilename, isLoading, openDoc, openDocument]);

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="px-4 pt-3">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            {DOC_TABS.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className={cn('text-sm font-medium')}>
                {tab.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {DOC_TABS.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="flex-1 min-h-0">
            <div className="h-full">
              <DocumentCanvas disableDelete disableTitleEdit />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export function ConversationDocsPanel({ projectId }: { projectId: string }) {
  return (
    <DocumentProvider projectId={projectId} category="conversation">
      <ConversationDocsContent />
    </DocumentProvider>
  );
}
