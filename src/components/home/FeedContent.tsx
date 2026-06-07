import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface FeedContentProps {
  content: string;
  format?: 'plain' | 'markdown';
  className?: string;
}

export function FeedContent({ content, format = 'markdown', className }: FeedContentProps) {
  if (format === 'plain') {
    return (
      <p className={cn('text-foreground/90 whitespace-pre-wrap break-words', className)}>
        {content}
      </p>
    );
  }

  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none break-words',
        'prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5',
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs',
        'prose-code:before:content-none prose-code:after:content-none',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            const url = href || '';
            // Internal links via SPA routing
            const internal = /^\/(documents|task)\//.test(url);
            if (internal) {
              return (
                <Link to={url} className="text-primary hover:underline">
                  {children}
                </Link>
              );
            }
            return (
              <a
                {...props}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {children}
              </a>
            );
          },
          img: () => null, // images handled separately as attachments
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
