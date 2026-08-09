import { useLocation } from 'react-router-dom';
import { MarkdownRenderer } from '../../components/MarkdownRenderer/MarkdownRenderer';
import { LEGAL_DOCS, findLegalDoc } from '../../content/legalDocs';
import type { LegalDocMeta } from '../../content/legalDocs';
import styles from './Legal.module.scss';

// Imported as raw text and bundled at build time rather than fetched at
// runtime: these pages have no live data in them, and a policy that can fail
// to load is worse than one that ships in the JS.
import privacyMd from './content/privacy.md?raw';
import dataPolicyMd from './content/data-policy.md?raw';
import termsMd from './content/terms.md?raw';

// The wording lives here, keyed by route, while the front matter lives in
// content/legalDocs. Splitting them is what keeps react-markdown and these
// three documents out of the entry bundle - see the note in that file.
export const LEGAL_BODIES: Record<string, string> = {
  '/privacy': privacyMd,
  '/data-policy': dataPolicyMd,
  '/terms': termsMd,
};

export type { LegalDocMeta };
export { LEGAL_DOCS, findLegalDoc };

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function Legal() {
  const { pathname } = useLocation();
  const doc = findLegalDoc(pathname);

  if (!doc) return null;

  return (
    <main className={`container ${styles.page}`}>
      <header className={styles.head}>
        <span className={styles.eyebrow}>Legal</span>
        <h1>{doc.title}</h1>
        <p className={styles.standfirst}>{doc.standfirst}</p>
        <p className={styles.updated}>Last updated {formatDate(doc.updated)}</p>
      </header>

      {doc.isDraft && (
        <p className={styles.draft} role="note">
          <strong>Draft — not yet reviewed by a lawyer.</strong> The passages marked{' '}
          <em>[To confirm]</em> are open questions, not settled policy. Nothing on this page should
          be relied on as a binding commitment until this banner is gone.
        </p>
      )}

      <div className={styles.body}>
        <MarkdownRenderer markdown={LEGAL_BODIES[doc.path] ?? ''} />
      </div>
    </main>
  );
}
