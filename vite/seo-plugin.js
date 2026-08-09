// -----------------------------------------------------------------------
// Build-time SEO: a sitemap, and one static HTML file per indexable route.
//
// This app is a single-page app, which means the server returns the same
// index.html for every URL and the real title only appears once React has run.
// Googlebot renders JavaScript and copes. Nothing else does: Slack, WhatsApp,
// X, LinkedIn, iMessage, Discord and every other unfurler reads the raw bytes
// and stops. Without this plugin, every link to the site shared anywhere shows
// the homepage's title and the homepage's description.
//
// So after the bundle is written we take the built index.html - assets already
// hashed and injected - swap the head tags for the route's own, and write a
// copy to `dist/<route>/index.html`. Static hosts (Netlify, Vercel, Cloudflare
// Pages, nginx with try_files) serve that file for `/<route>` before falling
// back to the SPA rewrite, so crawlers get the right head and browsers still
// boot the same app.
//
// Route metadata is NOT duplicated here. It is read out of src/content/seo.ts,
// the same module the running app imports.
// -----------------------------------------------------------------------

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { transformWithOxc } from 'vite';

/**
 * seo.ts is TypeScript and this file runs in plain Node. It imports nothing,
 * so stripping the types is the whole job - transpile it and import the result
 * straight from memory rather than keeping a second copy of the metadata in a
 * format Node can already read.
 *
 * Oxc rather than esbuild: Vite 8 bundles the former and no longer ships the
 * latter, so `transformWithEsbuild` throws here unless esbuild is installed
 * separately as a dependency this build does not otherwise need.
 */
async function loadSeoModule(root) {
  const path = resolve(root, 'src/content/seo.ts');
  const source = await readFile(path, 'utf8');
  const { code } = await transformWithOxc(source, path, { lang: 'ts' });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

// Only the two characters that can break out of a double-quoted attribute or
// start an entity. The copy is full of em-dashes and curly quotes, and the
// document is UTF-8, so those go through as themselves.
function escapeAttribute(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function escapeText(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function replaceTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeText(title)}</title>`);
}

/**
 * Rewrites the `content` of one meta tag, matching on its name/property
 * whichever way round the attributes are written.
 */
function replaceMeta(html, attribute, key, content) {
  const pattern = new RegExp(
    `<meta[^>]*${attribute}=["']${key}["'][^>]*>`,
    'i'
  );
  const escaped = escapeAttribute(content);

  return html.replace(pattern, (tag) =>
    /content=/i.test(tag)
      ? tag.replace(/content=(["'])[\s\S]*?\1/i, `content="${escaped}"`)
      : tag.replace(/\/?>$/, ` content="${escaped}" />`)
  );
}

function replaceCanonical(html, href) {
  return html.replace(
    /<link[^>]*rel=["']canonical["'][^>]*>/i,
    `<link rel="canonical" href="${escapeAttribute(href)}" />`
  );
}

function buildRouteHtml(html, seo, { titleFor, canonicalFor }) {
  const title = titleFor(seo);
  const canonical = canonicalFor(seo.path);

  let out = replaceTitle(html, title);
  out = replaceMeta(out, 'name', 'description', seo.description);
  out = replaceMeta(out, 'name', 'robots', seo.noindex ? 'noindex, follow' : 'index, follow');
  out = replaceCanonical(out, canonical);

  out = replaceMeta(out, 'property', 'og:title', title);
  out = replaceMeta(out, 'property', 'og:description', seo.description);
  out = replaceMeta(out, 'property', 'og:url', canonical);
  out = replaceMeta(out, 'property', 'og:image:alt', title);

  out = replaceMeta(out, 'name', 'twitter:title', title);
  out = replaceMeta(out, 'name', 'twitter:description', seo.description);

  return out;
}

function buildSitemap(routes, { canonicalFor }, lastmod) {
  const urls = routes
    .map((route) =>
      [
        '  <url>',
        `    <loc>${escapeText(canonicalFor(route.path))}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        // The homepage and the two pages that carry live data are the ones
        // worth recrawling often. Everything else changes when we edit it.
        `    <priority>${route.path === '/' ? '1.0' : '0.8'}</priority>`,
        '  </url>',
      ].join('\n')
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function seoPlugin() {
  let outDir = 'dist';
  let root = process.cwd();

  return {
    name: 'rovie:seo',
    apply: 'build',

    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },

    // closeBundle rather than generateBundle: index.html is written by Vite's
    // own HTML plugin during generateBundle, so this has to run after the
    // whole thing has landed on disk.
    async closeBundle() {
      const seo = await loadSeoModule(root);
      const indexPath = resolve(outDir, 'index.html');
      const html = await readFile(indexPath, 'utf8');
      const lastmod = new Date().toISOString().slice(0, 10);

      await writeFile(
        resolve(outDir, 'sitemap.xml'),
        buildSitemap(seo.INDEXABLE_ROUTES, seo, lastmod),
        'utf8'
      );

      let written = 0;
      for (const route of seo.INDEXABLE_ROUTES) {
        const target =
          route.path === '/'
            ? indexPath
            : resolve(outDir, `${route.path.replace(/^\//, '')}/index.html`);

        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, buildRouteHtml(html, route, seo), 'utf8');
        written += 1;
      }

      this.info(`wrote sitemap.xml and ${written} prerendered head${written === 1 ? '' : 's'}`);
    },
  };
}
