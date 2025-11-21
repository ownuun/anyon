import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function DevBanner() {
  const { t } = useTranslation();

  // Only show in development mode
  if (import.meta.env.MODE !== 'development') {
    return null;
  }

  return (
    <div className="bg-warning text-warning-foreground text-center py-2 px-4 text-sm font-medium border-b border-warning/80">
      <div className="flex items-center justify-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>{t('devMode.banner')}</span>
      </div>
    </div>
  );
}
