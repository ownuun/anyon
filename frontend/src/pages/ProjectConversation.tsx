import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { MessageSquare, Sparkles } from 'lucide-react';

export function ProjectConversation() {
  const { t } = useTranslation(['common']);
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-6 max-w-md px-6">
        <div className="flex justify-center items-center gap-3">
          <MessageSquare className="h-16 w-16 text-primary" strokeWidth={1.5} />
          <Sparkles className="h-8 w-8 text-primary animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            {t('common:sidebar.tabs.conversation')}
          </h2>
          <p className="text-xl text-muted-foreground">
            Coming Soon
          </p>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p>대화형 AI 기획 도구가 곧 추가됩니다.</p>
          <p>Interactive AI planning tool is coming soon.</p>
        </div>
      </div>
    </div>
  );
}
