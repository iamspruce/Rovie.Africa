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

// Documentation, the API reference and the SDK guide used to be three
// placeholders here. They are now written, and they live on their own site -
// docs.rovie.africa, built from docs/ in this repository. The three routes stay
// alive as redirects in routes/router.tsx and as 301s in public/_redirects.
//
// /about was the last entry, and it is written now too - pages/About. The list
// is deliberately left in place rather than deleted with it: it is empty
// because every page is written, which is a state the next unwritten route
// should be able to leave by adding three lines here. Placeholder itself still
// earns its keep as the catch-all 404.
export const PLACEHOLDER_PAGES: readonly PlaceholderPage[] = [];

export function findPlaceholderByPath(path: string): PlaceholderPage | undefined {
  return PLACEHOLDER_PAGES.find((page) => page.path === path);
}
