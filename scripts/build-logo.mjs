// -----------------------------------------------------------------------
// Bakes the brand SVGs in public/logos into one TypeScript module the app can
// inline. Run it with `npm run logo:build` after replacing an SVG.
//
// Why the logo is inlined rather than loaded as an <img>:
//
//   1. It has to follow the theme. The files ship as black ink with a matching
//      "-inverted" white-on-black variant, which is right for handing to a
//      press kit and wrong for a page that flips with the OS setting. Inlined,
//      every stroke and fill becomes `currentColor` and one component serves
//      both themes - so the app never loads the inverted files at all. They
//      stay in public/logos as downloadable assets.
//   2. It is above the fold on every single route. An <img> is a second
//      request before the header can paint, on a connection this audience
//      often does not have.
//
// Why a build step rather than committing the SVGs as JSX: the two files share
// their mark artwork byte-for-byte (the horizontal logo is the same four paths
// scaled down, plus a wordmark). Extracting them here means that artwork is
// stored once instead of twice, and the shared-ness is checked on every build
// rather than assumed - see the assertion below.
// -----------------------------------------------------------------------

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOGO_DIR = resolve(ROOT, 'public/logos');
const OUT_DIR = resolve(ROOT, 'src/assets');

const BANNER = `// GENERATED FILE - DO NOT EDIT.
//
// Written by scripts/build-logo.mjs from public/logos/*.svg. Replace the SVG,
// then run \`npm run logo:build\`, and commit the result.
`;

/** Pulls the bits of an SVG this app needs, and refuses anything unexpected. */
function parse(file) {
  const src = readFileSync(resolve(LOGO_DIR, file), 'utf8');

  const viewBox = src.match(/viewBox="([^"]+)"/)?.[1];
  if (!viewBox) throw new Error(`${file}: no viewBox`);

  const groups = [...src.matchAll(/<g ([^>]*)>(.*?)<\/g>/gs)].map(([, attrs, body]) => ({
    transform: attrs.match(/transform="([^"]+)"/)?.[1] ?? null,
    strokeWidth: attrs.match(/stroke-width="([^"]+)"/)?.[1] ?? null,
    paths: [...body.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]),
  }));

  if (!groups.length) throw new Error(`${file}: no <g> found`);
  return { viewBox, groups };
}

const mark = parse('rovie-mark-nested.svg');
const horizontal = parse('rovie-logo-horizontal.svg');

// The whole point of this script. If a redraw ever desyncs the two files, the
// build fails here rather than silently shipping a header whose mark no longer
// matches the favicon.
const markPaths = mark.groups[0].paths;
const horizontalMarkPaths = horizontal.groups[0].paths;
if (JSON.stringify(markPaths) !== JSON.stringify(horizontalMarkPaths)) {
  throw new Error(
    'rovie-mark-nested.svg and rovie-logo-horizontal.svg no longer share their mark artwork.\n' +
      'They are meant to be the same drawing at two sizes. Re-export both from the same source.'
  );
}

const wordmarkGroup = horizontal.groups[1];
if (!wordmarkGroup || wordmarkGroup.paths.length !== 1) {
  throw new Error('rovie-logo-horizontal.svg: expected a second <g> holding one wordmark path');
}

const ts = `${BANNER}
/**
 * The nested-Africa mark: four concentric outlines of the continent, read as a
 * signal radiating out from it. Stored once and shared by both lockups - the
 * horizontal logo is this same artwork scaled down beside the wordmark.
 *
 * Stroked, not filled. Drawn in \`currentColor\` by the component so the mark
 * follows the theme instead of needing the inverted file.
 */
export const MARK_PATHS: readonly string[] = [
${markPaths.map((d) => `  '${d}',`).join('\n')}
];

/** viewBox of the mark-only lockup. */
export const MARK_VIEWBOX = '${mark.viewBox}';

/** Centres the mark in its own box. */
export const MARK_TRANSFORM = '${mark.groups[0].transform}';

/** Stroke weight at the mark-only size, in that viewBox's units. */
export const MARK_STROKE_WIDTH = ${mark.groups[0].strokeWidth};

/** viewBox of the horizontal lockup - mark plus wordmark. */
export const HORIZONTAL_VIEWBOX = '${horizontal.viewBox}';

/** Places and scales the shared mark artwork inside the horizontal lockup. */
export const HORIZONTAL_MARK_TRANSFORM = '${horizontal.groups[0].transform}';

/**
 * Stroke weight for the mark inside the horizontal lockup. Larger than
 * MARK_STROKE_WIDTH because the transform above scales the artwork down and
 * the stroke scales with it; the two cancel out to the same optical weight.
 */
export const HORIZONTAL_MARK_STROKE_WIDTH = ${horizontal.groups[0].strokeWidth};

/** The "rovie" wordmark. Filled rather than stroked. */
export const WORDMARK_PATH =
  '${wordmarkGroup.paths[0]}';

/** Places the wordmark beside the mark. */
export const WORDMARK_TRANSFORM = '${wordmarkGroup.transform}';
`;

mkdirSync(OUT_DIR, { recursive: true });
const out = resolve(OUT_DIR, 'logo.generated.ts');
writeFileSync(out, ts);

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log('Wrote src/assets/logo.generated.ts');
console.log(`  mark        ${markPaths.length} paths, shared by both lockups`);
console.log(`  wordmark    1 path`);
console.log(`  total       ${kb(Buffer.byteLength(ts))}`);
