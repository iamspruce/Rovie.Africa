// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';
import starlightLlmsTxt from 'starlight-llms-txt';
import starlightLinksValidator from 'starlight-links-validator';

// -----------------------------------------------------------------------
// docs.rovie.africa
//
// A separate site from the app in ../src, on purpose. The app is a React SPA:
// the server hands the same index.html to every URL and the real title only
// exists once React has run, which is why ../vite/seo-plugin.js exists at all.
// That trade is fine for six product pages and wrong for a hundred pages of
// prose whose entire job is to be found. Astro emits real HTML per page, so
// the docs need no prerender step, no runtime <head> rewriting, and no
// JavaScript at all to be read.
//
// There is deliberately NO UI framework here - no React, no islands. The one
// dynamic thing on the site is the live price table in
// components/ModelTable.astro, which is ~2 KB of plain script. Adding React
// for it would ship a runtime to every reader for one table on one page, and
// would additionally break the /llms-*.txt build, which renders every page to
// text without a framework renderer registered.
//
// What IS shared with the app: the palette and the two typefaces
// (src/styles/rovie.css, which restates ../src/styles/base/_theme.scss in
// Starlight's token names), the wordmark geometry (scripts/build-logo.mjs),
// and the header links back into the product. A docs domain that looks like a
// different company loses the reader at the boundary.
// -----------------------------------------------------------------------

// `astro dev` sets NODE_ENV to development; `astro build` sets it to
// production. The default is deliberately the production URL rather than the
// localhost one - a build that guessed wrong and shipped links to
// http://localhost:5173 would be far worse than a dev server that links to the
// deployed app. Set ROVIE_APP_URL to override either way.
const isDev = process.env.NODE_ENV === 'development';

export const SITE = 'https://docs.rovie.africa';

/**
 * The app this site documents. Cross-origin in every environment - the app is
 * Vite on 5173 in dev and rovie.africa in production, never a path under this
 * site. Mirrors DOCS_URL in ../src/content/navLinks.ts, pointing the other way.
 */
export const APP =
  process.env.ROVIE_APP_URL || (isDev ? 'http://localhost:5173' : 'https://rovie.africa');

export default defineConfig({
  site: SITE,
  // Trailing slashes are the shape Starlight links in, and mismatched
  // canonicals are the easiest way to split a page's ranking across two URLs.
  trailingSlash: 'always',

  server: {
    // Astro's own default, pinned rather than inherited: the app's DOCS_URL
    // (../src/content/navLinks.ts) names this port for dev, so it is a
    // contract between two projects and not a preference. `strictPort` makes
    // a taken port an error instead of a silent move to 4322, which would
    // leave every "Docs" link in the running app pointing at nothing.
    port: 4321,
    strictPort: true,
  },

  integrations: [
    starlight({
      title: 'Rovie docs',
      description:
        'Get an API key and call GPT, Claude, Gemini, Llama and every other frontier model through one OpenAI-compatible endpoint, billed in your own currency.',
      tagline: 'One key. Every model. Priced where you are.',

      // The mark only - the "Rovie docs" beside it is Starlight's own title
      // text, so it picks up the display face from rovie.css. Baking the
      // wordmark into the SVG would render it in whatever the reader's system
      // font is, since Starlight puts the logo in an <img>.
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
      },
      favicon: '/favicon.svg',

      customCss: ['./src/styles/rovie.css', './src/styles/model-table.css'],

      // The app's own OG card. Docs pages that get shared are shared into the
      // same conversations product pages are.
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: `${APP}/og.png` } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: `${APP}/og.png` } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#ffffff', media: '(prefers-color-scheme: light)' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#000000', media: '(prefers-color-scheme: dark)' } },
      ],

      social: [{ icon: 'email', label: 'Email Rovie', href: 'mailto:hello@rovie.africa' }],

      components: {
        // Starlight has no config key for extra header links, so the way back
        // into the product goes through the one slot that sits in the header's
        // right-hand group. The reader arrived from rovie.africa and will
        // leave to it; docs with no way home are a dead end.
        SocialIcons: './src/components/AppNav.astro',
      },

      editLink: {
        baseUrl: 'https://github.com/rovie-africa/rovie-africa/edit/main/docs/',
      },

      lastUpdated: true,

      // Full-text search, built at build time into a static index. No Algolia
      // account, no third-party request from the reader's browser, and it
      // works on the first deploy rather than after a crawl.
      pagefind: true,

      sidebar: [
        {
          label: 'Get started',
          items: [
            { label: 'What Rovie is', slug: 'start/what-rovie-is' },
            { label: 'Quickstart', slug: 'start/quickstart' },
            { label: 'Authentication', slug: 'start/authentication' },
            { label: 'Coming from OpenAI', slug: 'start/from-openai' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Choosing a model', slug: 'guides/choosing-a-model' },
            { label: 'Streaming', slug: 'guides/streaming' },
            { label: 'Tool calling', slug: 'guides/tool-calling' },
            { label: 'Errors and retries', slug: 'guides/errors' },
            { label: 'Rate limits and budgets', slug: 'guides/limits' },
            { label: 'Balance and top-ups', slug: 'guides/billing' },
            { label: 'Pricing in local currency', slug: 'guides/local-pricing' },
            { label: 'Usage and cost tracking', slug: 'guides/usage' },
          ],
        },
        {
          label: 'Models',
          items: [
            { label: 'The catalog', slug: 'models/catalog' },
            { label: 'Capabilities', slug: 'models/capabilities' },
          ],
        },
        // Filled in by starlight-openapi from ../openapi.yaml. Nothing under
        // it is written by hand, so the reference cannot drift from the spec.
        ...openAPISidebarGroups,
        {
          label: 'SDKs',
          items: [
            { label: 'Overview', slug: 'sdks/overview' },
            { label: 'TypeScript', slug: 'sdks/typescript' },
            { label: 'Python', slug: 'sdks/python' },
            { label: 'Editors and agents', slug: 'sdks/tools' },
          ],
        },
      ],

      plugins: [
        starlightOpenAPI([
          {
            base: 'api',
            schema: './openapi.yaml',
            sidebar: {
              label: 'API reference',
              collapsed: false,
              operations: { badges: true, labels: 'summary' },
            },
            snippets: {
              operation: {
                // httpsnippet, which generates these, has no Python target -
                // so Python is not missing here by choice. It is hand-written
                // on every page that needs it, and that turns out to be the
                // better answer anyway: a generated Python snippet would be a
                // raw `requests` call, when what a Python reader should
                // actually write is the `openai` client pointed at our base
                // URL. See start/quickstart and sdks/python.
                clients: {
                  shell: ['curl'],
                  javascript: ['fetch'],
                  go: ['nethttp'],
                },
                default: { target: 'shell', client: 'curl' },
              },
            },
          },
        ]),

        // /llms.txt, /llms-small.txt and /llms-full.txt. Not decoration for an
        // AI gateway: when somebody asks Claude or ChatGPT "how do I call
        // Rovie", these files are what it reads. Getting the base URL and the
        // key format in front of a model is the same job as getting them in
        // front of a person.
        starlightLlmsTxt({
          projectName: 'Rovie',
          description:
            'Rovie is an OpenAI-compatible AI gateway. One API key reaches GPT, Claude, Gemini, Llama, DeepSeek and other frontier models, billed against a balance topped up in African currencies.',
          details: [
            '- Base URL: https://api.getrovie.com',
            '- Auth: `Authorization: Bearer rv_...` on every request',
            '- The chat endpoint is OpenAI-compatible: point any OpenAI SDK at the base URL above.',
          ].join('\n'),
          optionalLinks: [
            { label: 'Model catalog and live pricing', url: `${APP}/models` },
            { label: 'Service status', url: `${APP}/status` },
          ],
        }),

        // A broken link between two docs pages is a build failure, not
        // something to find in production. Off in dev, where half-written
        // pages legitimately point at pages that don't exist yet.
        ...(process.env.NODE_ENV === 'production' || process.env.CI
          ? [
              starlightLinksValidator({
                errorOnRelativeLinks: false,
                // Everything under /api/ is injected by starlight-openapi at
                // build time, so it is not in the content collection this
                // plugin validates against and every link into the reference
                // reads as broken. Excluding it here does NOT stop those links
                // being checked - scripts/check-api-links.mjs verifies each one
                // against the built output, which is the only place those
                // routes exist. `npm run build` runs it.
                exclude: ['/api', '/api/**'],
              }),
            ]
          : []),
      ],
    }),
  ],
});
