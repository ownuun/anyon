export type DocumentCategory = 'planning' | 'design' | 'technology';

export interface Document {
  id: string; // UUID
  title: string;
  content: string; // Markdown content
  category: DocumentCategory;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentDto {
  title: string;
  content: string;
  category: DocumentCategory;
}

export interface UpdateDocumentDto {
  title?: string;
  content?: string;
  category?: DocumentCategory;
}

export interface ApiDocument {
  id: string;
  project_id: string;
  title: string;
  content: string;
  category: DocumentCategory;
  created_at: string;
  updated_at: string;
}

export interface DocumentListResponse {
  items: ApiDocument[];
  total: number;
}

export function mapApiDocument(apiDoc: ApiDocument): Document {
  return {
    id: apiDoc.id,
    title: apiDoc.title,
    content: apiDoc.content,
    category: apiDoc.category,
    projectId: apiDoc.project_id,
    createdAt: new Date(apiDoc.created_at),
    updatedAt: new Date(apiDoc.updated_at),
  };
}
