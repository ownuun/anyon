import { useTranslation } from 'react-i18next';

export function ProjectCode() {
  const { t } = useTranslation(['common']);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <p className="text-lg">{t('sidebar.tabs.code')}</p>
        <p className="text-sm mt-2">Coming soon...</p>
      </div>
    </div>
  );
}
