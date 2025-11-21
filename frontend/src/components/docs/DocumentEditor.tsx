import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Eye, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Markdown from 'markdown-to-jsx';

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
}

export function DocumentEditor({ content, onChange, className }: DocumentEditorProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('preview'); // 기본값을 preview로 변경

  return (
    <div className={cn('w-full h-full flex flex-col', className)}>
      {/* Toolbar */}
      <div className="border-b px-4 py-2 flex items-center gap-2 bg-background">
        <Button
          variant={mode === 'preview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('preview')}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button
          variant={mode === 'edit' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setMode('edit')}
        >
          <Edit3 className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {mode === 'edit' ? (
          <Textarea
            value={content}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-full min-h-[600px] font-mono text-sm resize-none border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 p-6"
            placeholder="# Start writing in markdown..."
          />
        ) : (
          <div className="p-6 max-w-4xl mx-auto">
            {content ? (
              <article className="prose prose-slate prose-lg max-w-none dark:prose-invert
                prose-headings:font-bold prose-headings:tracking-tight
                prose-h1:text-4xl prose-h1:mb-4 prose-h1:mt-8
                prose-h2:text-3xl prose-h2:mb-3 prose-h2:mt-6 prose-h2:border-b prose-h2:pb-2
                prose-h3:text-2xl prose-h3:mb-2 prose-h3:mt-4
                prose-p:text-base prose-p:leading-7 prose-p:mb-4
                prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                prose-strong:font-semibold prose-strong:text-foreground
                prose-code:text-sm prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg prose-pre:p-4
                prose-ul:list-disc prose-ul:ml-6 prose-ul:mb-4
                prose-ol:list-decimal prose-ol:ml-6 prose-ol:mb-4
                prose-li:mb-1
                prose-blockquote:border-l-4 prose-blockquote:border-muted-foreground prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
                prose-img:rounded-lg prose-img:shadow-md
                prose-table:border-collapse prose-table:w-full
                prose-th:border prose-th:border-border prose-th:bg-muted prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold
                prose-td:border prose-td:border-border prose-td:px-4 prose-td:py-2
                prose-hr:border-border prose-hr:my-8"
              >
                <Markdown
                  options={{
                    overrides: {
                      h1: {
                        props: {
                          className: 'scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl',
                        },
                      },
                      h2: {
                        props: {
                          className: 'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
                        },
                      },
                      h3: {
                        props: {
                          className: 'scroll-m-20 text-2xl font-semibold tracking-tight',
                        },
                      },
                      h4: {
                        props: {
                          className: 'scroll-m-20 text-xl font-semibold tracking-tight',
                        },
                      },
                      p: {
                        props: {
                          className: 'leading-7 [&:not(:first-child)]:mt-6',
                        },
                      },
                      ul: {
                        props: {
                          className: 'my-6 ml-6 list-disc [&>li]:mt-2',
                        },
                      },
                      ol: {
                        props: {
                          className: 'my-6 ml-6 list-decimal [&>li]:mt-2',
                        },
                      },
                      code: {
                        props: {
                          className: 'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
                        },
                      },
                      pre: {
                        props: {
                          className: 'mb-4 mt-6 overflow-x-auto rounded-lg border bg-black p-4',
                        },
                      },
                      blockquote: {
                        props: {
                          className: 'mt-6 border-l-2 pl-6 italic',
                        },
                      },
                      table: {
                        props: {
                          className: 'w-full my-6',
                        },
                      },
                      thead: {
                        props: {
                          className: 'border-b',
                        },
                      },
                      tr: {
                        props: {
                          className: 'border-b transition-colors hover:bg-muted/50',
                        },
                      },
                      th: {
                        props: {
                          className: 'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
                        },
                      },
                      td: {
                        props: {
                          className: 'p-4 align-middle',
                        },
                      },
                      a: {
                        props: {
                          className: 'font-medium text-primary underline underline-offset-4',
                        },
                      },
                    },
                  }}
                >
                  {content}
                </Markdown>
              </article>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg mb-2">No content yet</p>
                  <p className="text-sm">Click Edit to start writing</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
