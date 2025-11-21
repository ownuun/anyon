import { Outlet, useSearchParams } from 'react-router-dom';
import { DevBanner } from '@/components/DevBanner';
import { Sidebar } from '@/components/layout/Sidebar';

export function NormalLayout() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view');
  const shouldHideSidebar = view === 'preview' || view === 'diffs';

  return (
    <div className="flex flex-col h-full">
      <DevBanner />
      <div className="flex flex-1 min-h-0">
        {!shouldHideSidebar && <Sidebar />}
        <div className="flex flex-col flex-1 min-w-0 bg-background">
          <div className="flex-1 min-h-0 overflow-hidden">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
