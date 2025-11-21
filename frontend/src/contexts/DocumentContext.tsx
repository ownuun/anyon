import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Document, DocumentCategory } from '@/types/document';
import {
  createDocument,
  deleteDocument,
  getDocument,
  listDocuments,
  updateDocument,
} from '@/lib/document-api';
import { toast } from 'sonner';

interface DocumentContextType {
  // State
  documents: Document[];
  openDocument: Document | null;
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  loadDocuments: () => Promise<void>;
  openDoc: (docId: string) => Promise<void>;
  closeDoc: () => void;
  createDoc: (category: DocumentCategory, title: string) => Promise<Document | null>;
  updateDoc: (docId: string, content: string, title?: string) => Promise<void>;
  deleteDoc: (docId: string) => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export function useDocumentContext() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocumentContext must be used within DocumentProvider');
  }
  return context;
}

interface DocumentProviderProps {
  children: React.ReactNode;
  projectId: string;
}

export function DocumentProvider({ children, projectId }: DocumentProviderProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [openDocument, setOpenDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setOpenDocument(null);
    try {
      const { items } = await listDocuments(projectId);
      setDocuments(items);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Open a document
  const openDoc = useCallback(
    async (docId: string) => {
      const existing = documents.find((doc) => doc.id === docId);
      if (existing) {
        setOpenDocument(existing);
        return;
      }

      try {
        const doc = await getDocument(projectId, docId);
        setDocuments((prev) => {
          const next = prev.filter((d) => d.id !== docId);
          return [...next, doc];
        });
        setOpenDocument(doc);
      } catch (error) {
        console.error('Failed to open document:', error);
        toast.error('Document not found');
      }
    },
    [documents, projectId]
  );

  // Close the currently open document
  const closeDoc = useCallback(() => {
    setOpenDocument(null);
  }, []);

  // Create a new document
  const createDoc = useCallback(
    async (category: DocumentCategory, title: string) => {
      setIsSaving(true);
      try {
        const newDoc = await createDocument(projectId, {
          title,
          content: '',
          category,
        });
        setDocuments((prev) => [...prev, newDoc]);

        toast.success(`Document "${title}" created`);

        return newDoc;
      } catch (error) {
        console.error('Failed to create document:', error);
        toast.error('Failed to create document');
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [projectId]
  );

  // Update a document
  const updateDoc = useCallback(
    async (docId: string, content: string, title?: string) => {
      setIsSaving(true);
      try {
        const updatedDoc = await updateDocument(projectId, docId, {
          content,
          ...(title && { title }),
        });

        setDocuments((prev) =>
          prev.map((doc) => (doc.id === docId ? updatedDoc : doc))
        );

        if (openDocument?.id === docId) {
          setOpenDocument(updatedDoc);
        }

        toast.success('Saved', { duration: 1000 });
      } catch (error) {
        console.error('Failed to update document:', error);
        toast.error('Failed to save');
      } finally {
        setIsSaving(false);
      }
    },
    [projectId, openDocument]
  );

  // Delete a document
  const deleteDoc = useCallback(
    async (docId: string) => {
      setIsSaving(true);
      try {
        await deleteDocument(projectId, docId);
        setDocuments((prev) => prev.filter((doc) => doc.id !== docId));

        if (openDocument?.id === docId) {
          setOpenDocument(null);
        }

        toast.success('Document deleted');
      } catch (error) {
        console.error('Failed to delete document:', error);
        toast.error('Failed to delete document');
      } finally {
        setIsSaving(false);
      }
    },
    [projectId, openDocument]
  );

  const value: DocumentContextType = {
    documents,
    openDocument,
    isLoading,
    isSaving,
    loadDocuments,
    openDoc,
    closeDoc,
    createDoc,
    updateDoc,
    deleteDoc,
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}
