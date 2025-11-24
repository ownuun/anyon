import { useEffect, useRef, useState } from 'react';

export type DocumentSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseDocumentAutosaveOptions {
  docId?: string;
  content: string;
  onSave: (docId: string, content: string) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

export function useDocumentAutosave({
  docId,
  content,
  onSave,
  debounceMs = 1500,
  enabled = true,
}: UseDocumentAutosaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<DocumentSaveStatus>('idle');
  const lastSavedContentRef = useRef<string>('');
  const saveTimeoutRef = useRef<number | undefined>(undefined);
  const initialContentSetRef = useRef(false);

  useEffect(() => {
    // Skip if disabled or no docId
    if (!enabled || !docId) return;

    // Set initial content reference without triggering save
    if (!initialContentSetRef.current) {
      lastSavedContentRef.current = content;
      initialContentSetRef.current = true;
      return;
    }

    // Skip if content hasn't changed
    if (content === lastSavedContentRef.current) {
      return;
    }

    const doSave = async () => {
      // Double-check content is still different
      if (content === lastSavedContentRef.current) {
        return;
      }

      try {
        setIsSaving(true);
        setSaveStatus('saving');

        await onSave(docId, content);

        lastSavedContentRef.current = content;
        setSaveStatus('saved');

        // Auto-hide "saved" status after 2 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (error) {
        console.error('Document autosave failed:', error);
        setSaveStatus('error');
        // Keep error status visible, will retry on next change
      } finally {
        setIsSaving(false);
      }
    };

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = window.setTimeout(doSave, debounceMs);

    // Cleanup on unmount or dependency change
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [docId, content, onSave, debounceMs, enabled]);

  // Reset on document change
  useEffect(() => {
    initialContentSetRef.current = false;
    lastSavedContentRef.current = '';
    setSaveStatus('idle');
    setIsSaving(false);
  }, [docId]);

  return { isSaving, saveStatus } as const;
}
