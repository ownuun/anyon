import { useDocumentContext } from '@/contexts/DocumentContext';
import { DocumentCanvasHeader } from './DocumentCanvasHeader';
import { DocumentEditor } from './DocumentEditor';
import { useCallback, useState, useEffect } from 'react';

interface DocumentCanvasProps {
  disableTitleEdit?: boolean;
  disableDelete?: boolean;
}

export function DocumentCanvas({
  disableDelete = false,
  disableTitleEdit = false,
}: DocumentCanvasProps) {
  const { openDocument, closeDoc, updateDoc, deleteDoc, isSaving } =
    useDocumentContext();

  // Local content state for immediate updates
  const [localContent, setLocalContent] = useState('');

  // Sync local content with open document
  useEffect(() => {
    if (openDocument) {
      setLocalContent(openDocument.content);
    }
  }, [openDocument?.id]); // Only sync when document ID changes

  const handleSave = useCallback(async () => {
    if (openDocument) {
      await updateDoc(openDocument.id, localContent);
    }
  }, [openDocument, localContent, updateDoc]);

  const handleDelete = useCallback(async () => {
    if (openDocument) {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${openDocument.title}"?`
      );
      if (confirmed) {
        await deleteDoc(openDocument.id);
      }
    }
  }, [openDocument, deleteDoc]);

  const handleTitleChange = useCallback(
    async (newTitle: string) => {
      if (openDocument) {
        await updateDoc(openDocument.id, localContent, newTitle);
      }
    },
    [openDocument, localContent, updateDoc]
  );

  const handleContentChange = useCallback((newContent: string) => {
    setLocalContent(newContent);
  }, []);

  if (!openDocument) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <DocumentCanvasHeader
        document={openDocument}
        onClose={closeDoc}
        onSave={handleSave}
        onDelete={handleDelete}
        onTitleChange={handleTitleChange}
        isSaving={isSaving}
        disableDelete={disableDelete}
        disableTitleEdit={disableTitleEdit}
      />

      <div className="flex-1 overflow-hidden">
        <DocumentEditor
          content={localContent}
          onChange={handleContentChange}
        />
      </div>
    </div>
  );
}
