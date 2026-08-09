import { useLocation } from 'react-router-dom';
import { MarkdownRenderer } from '../../components/MarkdownRenderer/MarkdownRenderer';
import styles from './Legal.module.scss';

// Imported as raw text and bundled at build time rather than fetched at
// runtime: these pages have no live data in them, and a policy that can fail
// to load is worse than one that ships in the JS.
import privacyMd from './content/privacy.md?raw';
import dataPolicyMd from './content/data-policy.md?raw';
import termsMd from './content/terms.md?raw';

export interface LegalDoc {
  path: string;
  title: string;
  /** One line under the title saying what the reader is about to get. */
  standfirst: string;
  /** ISO date the wording last changed. Shown, so the page can be trusted. */
  updated: string;
  body: string;
  /**
   * True while the wording still contains items marked [To confirm]. Drives
   * the banner - a policy with open questions in it must not look settled.
   */
  isDraft: boolean;
}

export const LEGAL_DOCS: readonly LegalDoc[] = [
  {
    path: '/privacy',
    title: 'Privacy',
    standfirst: 'What Rovie collects about you, why, and what you can ask us to do with it.',
    updated: '2026-08-08',
    body: privacyMd,
    isDraft: true,
  },
  {
    path: '/data-policy',
    title: 'Data policy',
    standfirst:
      'What happens to prompts and completions passing through the gateway, and what the model providers receive.',
    updated: '2026-08-08',
    body: dataPolicyMd,
    isDraft: true,
  },
  {
    path: '/terms',
    title: 'Terms of service',
    standfirst: 'The agreement covering your account, your API key, your balance and your usage.',
    updated: '2026-08-08',
    body: termsMd,
    isDraft: true,
  },
];

export function findLegalDoc(path: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((doc) => doc.path === path);
}

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
        <MarkdownRenderer markdown={doc.body} />
      </div>
    </main>
  );
}
