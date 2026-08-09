import ReactMarkdown from 'react-markdown';
import type { ComponentPropsWithoutRef } from 'react';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import styles from './MarkdownRenderer.module.scss';

interface MarkdownRendererProps {
  markdown: string;
}

export function MarkdownRenderer({ markdown }: MarkdownRendererProps) {
  return (
    <div className={styles.markdown}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children, ...rest }: ComponentPropsWithoutRef<'a'>) {
            if (href?.startsWith('/')) {
              return (
                <Link to={href} {...rest}>
                  {children}
                </Link>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer" {...rest}>
                {children}
              </a>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
