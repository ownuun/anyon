import { Circle, CheckCircle2, Loader2, ChevronDown } from 'lucide-react';
import { useEntries } from '@/contexts/EntriesContext';
import { usePinnedTodos } from '@/hooks/usePinnedTodos';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const TODO_PANEL_OPEN_KEY = 'todo-panel-open';

function getStatusIcon(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'completed')
    return <CheckCircle2 aria-hidden className="h-4 w-4 text-emerald-500" />;
  if (s === 'in_progress' || s === 'in-progress')
    return <Loader2 aria-hidden className="h-4 w-4 text-blue-500 animate-spin" />;
  return <Circle aria-hidden className="h-4 w-4 text-slate-400" />;
}

function getStatusStyle(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'completed') return 'bg-emerald-50 dark:bg-emerald-950/30';
  if (s === 'in_progress' || s === 'in-progress') return 'bg-blue-50 dark:bg-blue-950/30';
  return 'bg-transparent';
}

function TodoPanel() {
  const { t } = useTranslation('tasks');
  const { entries } = useEntries();
  const { todos } = usePinnedTodos(entries);
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(TODO_PANEL_OPEN_KEY);
    return stored === null ? true : stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(TODO_PANEL_OPEN_KEY, String(isOpen));
  }, [isOpen]);

  if (!todos || todos.length === 0) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 border border-slate-200/60 dark:border-slate-700/60 shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('todos.title', { count: todos.length })}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            'h-4 w-4 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-3 pb-3">
          <ul className="space-y-1.5">
            {todos.map((todo, index) => {
              const s = (todo.status || '').toLowerCase();
              const isCompleted = s === 'completed';

              return (
                <li
                  key={`${todo.content}-${index}`}
                  className={cn(
                    'flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-150',
                    getStatusStyle(todo.status),
                    'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  )}
                >
                  <span className="mt-0.5 flex items-center justify-center shrink-0">
                    {getStatusIcon(todo.status)}
                  </span>
                  <span
                    className={cn(
                      'text-sm leading-relaxed break-words',
                      isCompleted
                        ? 'text-slate-500 dark:text-slate-500 line-through'
                        : 'text-slate-700 dark:text-slate-300'
                    )}
                  >
                    {todo.content}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TodoPanel;
