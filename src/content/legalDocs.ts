// The legal pages' front matter, with the wording itself deliberately left
// behind in pages/Legal.
//
// The router needs to know these three routes exist in order to declare them,
// and the footer and the SEO table need their paths. If that list lived in
// Legal.tsx - as it used to - importing it would drag in three markdown files,
// react-markdown and remark-gfm, and put the whole markdown pipeline in the
// entry bundle for the benefit of every visitor who never opens a policy.
//
// Metadata here, prose there, and the page stays lazily loaded.

export interface LegalDocMeta {
  path: string;
  title: string;
  /** One line under the title saying what the reader is about to get. */
  standfirst: string;
  /** ISO date the wording last changed. Shown, so the page can be trusted. */
  updated: string;
  /**
   * True while the wording still contains items marked [To confirm]. Drives
   * the banner - a policy with open questions in it must not look settled.
   */
  isDraft: boolean;
}

export const LEGAL_DOCS: readonly LegalDocMeta[] = [
  {
    path: '/privacy',
    title: 'Privacy',
    standfirst: 'What Rovie collects about you, why, and what you can ask us to do with it.',
    updated: '2026-08-08',
    isDraft: true,
  },
  {
    path: '/data-policy',
    title: 'Data policy',
    standfirst:
      'What happens to prompts and completions passing through the gateway, and what the model providers receive.',
    updated: '2026-08-08',
    isDraft: true,
  },
  {
    path: '/terms',
    title: 'Terms of service',
    standfirst: 'The agreement covering your account, your API key, your balance and your usage.',
    updated: '2026-08-08',
    isDraft: true,
  },
];

export function findLegalDoc(path: string): LegalDocMeta | undefined {
  return LEGAL_DOCS.find((doc) => doc.path === path);
}
