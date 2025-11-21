import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FolderOpen, Settings, LogOut, LogIn, FileText, Code, Building2, ChevronDown, ChevronRight, Check, Kanban, FileCode, Lightbulb, MessageSquare } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import NiceModal from '@ebay/nice-modal-react';
import { OAuthDialog } from '@/components/dialogs/global/OAuthDialog';
import { useUserSystem } from '@/components/ConfigProvider';
import { oauthApi, projectsApi } from '@/lib/api';

const PLANNING_SUB_TABS = [
  { label: 'sidebar.tabs.conversation', icon: MessageSquare, to: '/conversation' },
  { label: 'sidebar.tabs.documents', icon: FileText, to: '/docs' },
];

const DEVELOPMENT_SUB_TABS = [
  { label: 'sidebar.tabs.kanban', icon: Kanban, to: '/tasks' },
  { label: 'sidebar.tabs.code', icon: FileCode, to: '/code' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isProjectsActive = location.pathname.startsWith('/projects') || location.pathname === '/';
  const { projectId, project } = useProject();
  const { t } = useTranslation(['common']);
  const { loginStatus, reloadSystem } = useUserSystem();

  // Check if planning section should be expanded (when on conversation or docs page)
  const isPlanningActive = location.pathname.includes('/conversation') || location.pathname.includes('/docs');
  const [isPlanningOpen, setIsPlanningOpen] = useState(isPlanningActive);

  // Check if development section should be expanded (when on tasks or code page)
  const isDevelopmentActive = location.pathname.includes('/tasks') || location.pathname.includes('/code');
  const [isDevelopmentOpen, setIsDevelopmentOpen] = useState(isDevelopmentActive);

  // Fetch all projects for the dropdown
  const { data: allProjects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  // Check if we're inside a project context (including settings with projectId)
  const isInsideProject = projectId && (
    location.pathname.includes(`/projects/${projectId}`) ||
    location.pathname.startsWith('/settings')
  );

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      // Keep the same tab (conversation, docs, tasks, or code) when switching projects
      let currentTab = '/tasks';
      if (location.pathname.includes('/conversation')) currentTab = '/conversation';
      else if (location.pathname.includes('/docs')) currentTab = '/docs';
      else if (location.pathname.includes('/code')) currentTab = '/code';
      navigate(`/projects/${newProjectId}${currentTab}`);
    }
  };

  const handleOpenOAuth = async () => {
    const profile = await NiceModal.show(OAuthDialog);
    if (profile) {
      await reloadSystem();
    }
  };

  const handleOAuthLogout = async () => {
    try {
      await oauthApi.logout();
      await reloadSystem();
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const isOAuthLoggedIn = loginStatus?.status === 'loggedin';

  return (
    <div className="w-64 h-full bg-muted/30 border-r border-border shadow-lg flex flex-col">
      {/* Logo Section */}
      <div className="p-4 border-b border-border">
        <Link to="/projects" className="flex items-center gap-3">
          <Logo />
          <img src="/logo-text.png" alt="ANYON" className="h-6" />
        </Link>
      </div>

      {/* Project Selector - shown when inside a project */}
      {isInsideProject && project && (
        <div className="p-3 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between h-10 px-3 font-medium"
              >
                <span className="truncate">{project.name}</span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[232px]">
              {allProjects.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onSelect={() => handleProjectChange(p.id)}
                  className="flex items-center justify-between"
                >
                  <span className="truncate">{p.name}</span>
                  {p.id === projectId && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        {isInsideProject ? (
          // Show project tabs when inside a project
          <div className="space-y-1">
            {/* Planning Tab (Collapsible) */}
            <div>
              <button
                onClick={() => setIsPlanningOpen(!isPlanningOpen)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isPlanningActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <Lightbulb className="h-5 w-5" />
                <span className="font-medium flex-1 text-left">{t('sidebar.tabs.planning')}</span>
                {isPlanningOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {/* Sub-tabs */}
              {isPlanningOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  {PLANNING_SUB_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const fullPath = `/projects/${projectId}${tab.to}`;
                    const isActive = location.pathname.includes(tab.to);

                    return (
                      <Link
                        key={tab.to}
                        to={fullPath}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-accent/70 text-accent-foreground'
                            : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{t(tab.label)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Development Tab (Collapsible) */}
            <div>
              <button
                onClick={() => setIsDevelopmentOpen(!isDevelopmentOpen)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isDevelopmentActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <Code className="h-5 w-5" />
                <span className="font-medium flex-1 text-left">{t('sidebar.tabs.development')}</span>
                {isDevelopmentOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {/* Sub-tabs */}
              {isDevelopmentOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  {DEVELOPMENT_SUB_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const fullPath = `/projects/${projectId}${tab.to}`;
                    const isActive = location.pathname.includes(tab.to);

                    return (
                      <Link
                        key={tab.to}
                        to={fullPath}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-accent/70 text-accent-foreground'
                            : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">{t(tab.label)}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Settings Link */}
            <Link
              to={`/settings/projects?projectId=${projectId}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                location.pathname.startsWith('/settings')
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <Settings className="h-5 w-5" />
              <span className="font-medium">{t('common:settings')}</span>
            </Link>
          </div>
        ) : (
          // Show projects link when not inside a project
          <div className="space-y-1">
            <Link
              to="/projects"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isProjectsActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <FolderOpen className="h-5 w-5" />
              <span className="font-medium">{t('sidebar.projects')}</span>
            </Link>

            {/* Organizations Link */}
            <Link
              to="/organizations"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                location.pathname === '/organizations'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <Building2 className="h-5 w-5" />
              <span className="font-medium">{t('sidebar.organizations')}</span>
            </Link>

            {/* Settings Link */}
            <Link
              to="/settings"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                location.pathname.startsWith('/settings')
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              }`}
            >
              <Settings className="h-5 w-5" />
              <span className="font-medium">{t('common:settings')}</span>
            </Link>
          </div>
        )}
      </nav>

      {/* Login Status */}
      <div className="p-4 border-t border-border">
        {isOAuthLoggedIn ? (
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
            <div className="flex-1 truncate">
              {loginStatus?.profile?.email ||
                loginStatus?.profile?.username ||
                '로그인됨'}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOAuthLogout}
              className="h-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleOpenOAuth}
          >
            <LogIn className="mr-2 h-4 w-4" />
            로그인하기
          </Button>
        )}
      </div>
    </div>
  );
}
