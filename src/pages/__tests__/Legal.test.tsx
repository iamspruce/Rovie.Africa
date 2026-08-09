import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Legal, LEGAL_DOCS } from '../Legal/Legal';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<Legal />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Legal pages', () => {
  it.each(LEGAL_DOCS.map((doc) => [doc.path, doc.title]))(
    '%s renders its title and body',
    (path, title) => {
      renderAt(path);
      expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
      // The Markdown body renders as real headings, not as a string of text.
      expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
    }
  );

  it('dates every document, so a reader can tell how current it is', () => {
    LEGAL_DOCS.forEach((doc) => {
      const { unmount } = renderAt(doc.path);
      expect(screen.getByText(/last updated/i)).toBeInTheDocument();
      unmount();
    });
  });

  // Unreviewed legal wording must never look settled. If a document still
  // carries [To confirm] items, the banner has to be on the page.
  it('warns on any document still carrying open questions', () => {
    LEGAL_DOCS.filter((doc) => doc.isDraft).forEach((doc) => {
      const { unmount } = renderAt(doc.path);
      expect(screen.getByRole('note')).toHaveTextContent(/not yet reviewed by a lawyer/i);
      unmount();
    });
  });

  it('keeps the draft flag honest against the wording itself', () => {
    LEGAL_DOCS.forEach((doc) => {
      const hasOpenQuestions = doc.body.includes('[To confirm]');
      expect(doc.isDraft).toBe(hasOpenQuestions);
    });
  });

  it('cross-links privacy and the data policy, which answer different questions', () => {
    renderAt('/privacy');
    const links = screen.getAllByRole('link', { name: /data policy/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/data-policy'));
  });
});
