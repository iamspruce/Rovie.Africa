// Routes that exist so the footer never links into nothing, but whose content
// hasn't been written yet. Each one renders through pages/Placeholder, so
// filling one in means writing a real page and deleting its entry here - the
// route keeps working either way.
//
// `summary` is not filler. It's the brief for whoever writes the page, shown
// to the visitor in the meantime so the page is honest about what it will be.
export interface PlaceholderPage {
  path: string;
  title: string;
  summary: string;
}

export const PLACEHOLDER_PAGES: readonly PlaceholderPage[] = [
  {
    path: '/docs',
    title: 'Documentation',
    summary:
      'Signing up, getting a key, and making a first call, plus how balance and local pricing work end to end.',
  },
  {
    path: '/api-reference',
    title: 'API reference',
    summary:
      'Every endpoint on the Account, Payment and gateway services - parameters, responses and errors. The OpenAI-compatible chat endpoint lives here too.',
  },
  {
    path: '/sdk',
    title: 'SDK',
    summary:
      'The client this site is built on, and how to drop it into your own project. One module per service, with a shared HTTP client.',
  },
  {
    path: '/about',
    title: 'About',
    summary:
      'Who is building Rovie, and why frontier models being priced in dollars is a problem worth a company.',
  },
];

export function findPlaceholderByPath(path: string): PlaceholderPage | undefined {
  return PLACEHOLDER_PAGES.find((page) => page.path === path);
}
