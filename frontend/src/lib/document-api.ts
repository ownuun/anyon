import { handleApiResponse, makeRequest } from '@/lib/api';
import {
  type ApiDocument,
  type Document,
  type DocumentCategory,
  type DocumentListResponse,
  mapApiDocument,
  type CreateDocumentDto,
  type UpdateDocumentDto,
} from '@/types/document';

interface ListDocumentsParams {
  category?: DocumentCategory;
  page?: number;
  pageSize?: number;
}

const buildUrl = (projectId: string, suffix = '') =>
  `/api/projects/${projectId}/documents${suffix}`;

const buildQuery = (params: ListDocumentsParams = {}) => {
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set('category', params.category);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.pageSize) searchParams.set('page_size', params.pageSize.toString());
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

const mapDocumentsResponse = (payload: DocumentListResponse): { items: Document[]; total: number } => ({
  items: payload.items.map(mapApiDocument),
  total: payload.total,
});

export async function listDocuments(
  projectId: string,
  params: ListDocumentsParams = {}
): Promise<{ items: Document[]; total: number }> {
  const response = await makeRequest(buildUrl(projectId, buildQuery(params)));
  const payload = await handleApiResponse<DocumentListResponse>(response);
  return mapDocumentsResponse(payload);
}

export async function getDocument(
  projectId: string,
  documentId: string
): Promise<Document> {
  const response = await makeRequest(buildUrl(projectId, `/${documentId}`));
  const payload = await handleApiResponse<ApiDocument>(response);
  return mapApiDocument(payload);
}

export async function createDocument(
  projectId: string,
  data: CreateDocumentDto
): Promise<Document> {
  const response = await makeRequest(buildUrl(projectId), {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const payload = await handleApiResponse<ApiDocument>(response);
  return mapApiDocument(payload);
}

export async function updateDocument(
  projectId: string,
  documentId: string,
  data: UpdateDocumentDto
): Promise<Document> {
  const response = await makeRequest(buildUrl(projectId, `/${documentId}`), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  const payload = await handleApiResponse<ApiDocument>(response);
  return mapApiDocument(payload);
}

export async function deleteDocument(
  projectId: string,
  documentId: string
): Promise<void> {
  const response = await makeRequest(buildUrl(projectId, `/${documentId}`), {
    method: 'DELETE',
  });
  await handleApiResponse<void>(response);
}
