import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MarkdownRenderer } from '../../components/MarkdownRenderer/MarkdownRenderer';

function renderMarkdown(markdown: string) {
  return render(
    <MemoryRouter>
      <MarkdownRenderer markdown={markdown} />
    </MemoryRouter>
  );
}

describe('MarkdownRenderer', () => {
  it('renders headings', () => {
    renderMarkdown('# Getting started\n\nSome intro text.');
    expect(screen.getByRole('heading', { level: 1, name: 'Getting started' })).toBeInTheDocument();
    expect(screen.getByText('Some intro text.')).toBeInTheDocument();
  });

  it('renders fenced code blocks', () => {
    renderMarkdown('```js\nconst x = 1;\n```');
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('renders GitHub-flavoured tables via remark-gfm', () => {
    renderMarkdown('| Currency | Country |\n| --- | --- |\n| NGN | Nigeria |');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByText('NGN')).toBeInTheDocument();
  });

  it('renders an internal link ("/...") as a client-side router link', () => {
    renderMarkdown('See [pricing](/docs/pricing) for details.');
    const link = screen.getByRole('link', { name: 'pricing' });
    expect(link).toHaveAttribute('href', '/docs/pricing');
  });

  it('renders an external link with target="_blank" and rel="noreferrer"', () => {
    renderMarkdown('See [IvoryPay](https://ivorypay.io) for details.');
    const link = screen.getByRole('link', { name: 'IvoryPay' });
    expect(link).toHaveAttribute('href', 'https://ivorypay.io');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('renders list items', () => {
    renderMarkdown('- First\n- Second');
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
