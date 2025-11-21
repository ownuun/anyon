import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useEffect,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import type { Project } from 'shared/types';

const LAST_PROJECT_ID_KEY = 'anyon_last_project_id';

interface ProjectContextValue {
  projectId: string | undefined;
  project: Project | undefined;
  isLoading: boolean;
  error: Error | null;
  isError: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const location = useLocation();

  // Extract projectId from: 1) route path, 2) query param, 3) localStorage
  const projectId = useMemo(() => {
    // First, check route path
    const pathMatch = location.pathname.match(/^\/projects\/([^/]+)/);
    if (pathMatch) {
      return pathMatch[1];
    }

    // Then, check query parameter
    const searchParams = new URLSearchParams(location.search);
    const queryProjectId = searchParams.get('projectId');
    if (queryProjectId) {
      return queryProjectId;
    }

    // Finally, fallback to localStorage
    return localStorage.getItem(LAST_PROJECT_ID_KEY) || undefined;
  }, [location.pathname, location.search]);

  const query = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.getById(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const value = useMemo(
    () => ({
      projectId,
      project: query.data,
      isLoading: query.isLoading,
      error: query.error,
      isError: query.isError,
    }),
    [projectId, query.data, query.isLoading, query.error, query.isError]
  );

  // Save projectId to localStorage when navigating to a project
  useEffect(() => {
    const pathMatch = location.pathname.match(/^\/projects\/([^/]+)/);
    if (pathMatch) {
      localStorage.setItem(LAST_PROJECT_ID_KEY, pathMatch[1]);
    }
  }, [location.pathname]);

  // Centralized page title management
  useEffect(() => {
    if (query.data) {
      document.title = `${query.data.name} | ANYON`;
    } else {
      document.title = 'ANYON';
    }
  }, [query.data]);

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
