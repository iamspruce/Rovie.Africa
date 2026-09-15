# docs.rovie.africa

The documentation site. Astro + Starlight, static output, its own build and its
own deploy — separate from the app in `../src` so that a broken guide cannot
take the product down and a failing component test cannot block a typo fix.

```bash
cd docs
npm install
npm run dev      # http://localhost:4321
```

The port is pinned with `strictPort`, not left to a default: the app names
`localhost:4321` in `../src/content/navLinks.ts`, so it is a contract between
two projects. A taken port is an error here rather than a silent move to 4322,
which would leave every "Docs" link in the running app pointing at nothing.

Links back into the app follow the environment — `localhost:5173` under
`astro dev`, `rovie.africa` in a build. Override with `ROVIE_APP_URL`.

## Why this is not part of the app

The app is a React SPA. The server hands the same `index.html` to every URL and
the real title only exists once React has run, which is why `../vite/seo-plugin.js`
exists — it writes one prerendered `<head>` per route after the bundle lands.

That trade is right for six product pages and wrong for a hundred pages of
prose whose entire job is to be found. Astro emits real HTML per page, so the
docs need no prerender step, no runtime `<head>` rewriting, and no JavaScript
at all to be read.

There is deliberately **no UI framework here** — no React, no islands. The one
dynamic thing on the site is the live price table in
`src/components/ModelTable.astro`, which is a couple of kilobytes of plain
script.

## Layout

```
openapi.yaml              The API reference. Generated into pages - never write
                          a reference page by hand.
astro.config.mjs          Site config, sidebar, plugins.
src/content/docs/         Every page. Directory = sidebar group.
src/components/           ModelTable (live prices), AppNav (header links home).
src/styles/rovie.css      The app's palette and typefaces in Starlight's tokens.
scripts/                  Logo generation, spec validation, link checking.
```

## Scripts

| | |
| --- | --- |
| `npm run dev` | Dev server. Link validation is off here, so half-written pages can point at pages that don't exist yet. |
| `npm run build` | Static build, then `check-api-links.mjs`. Set `CI=true` to also run the link validator. |
| `npm run openapi:validate` | Parses and validates `openapi.yaml` with the same parser the build uses. Run it before a long build. |
| `npm run logo:build` | Regenerates the two logo SVGs from the app's wordmark geometry. |

## Editing the API reference

**Don't.** Every page under `/api/` is generated from `openapi.yaml`. Edit the
spec and the pages follow.

Two things to know:

- **Reference URLs come from `operationId`.** `createChatCompletion` becomes
  `/api/operations/createchatcompletion/`. Renaming an operation moves its page
  and breaks every prose link to it — `scripts/check-api-links.mjs` runs as
  part of `npm run build` and will tell you which.
- **The spec covers the public API only.** The gateway and the unauthenticated
  catalog endpoints. `account-service`'s shared-secret admin routes and
  `portal-api`'s session-cookie `/me/*` surface are deliberately absent; the
  reasoning is in the comment block at the top of `openapi.yaml`, and it is
  worth reading before adding a path.

## Adding a page

Drop a `.md` or `.mdx` file under `src/content/docs/<group>/` with `title` and
`description` frontmatter, then add it to the `sidebar` array in
`astro.config.mjs`. The sidebar is explicit rather than inferred so that
ordering is a decision rather than an accident of filenames.

`description` is not optional in practice — it is the search snippet and the
social card body. Aim for 140–160 characters.

## What the build guarantees

Four checks, all of which fail the build rather than reaching production:

1. **`openapi.yaml` parses and validates** against the OpenAPI schema.
2. **Internal links resolve** (`starlight-links-validator`, on when `CI=true`).
3. **Links into the API reference resolve** (`scripts/check-api-links.mjs`).
   Separate because the reference routes are injected at build time and the
   validator cannot see them.
4. **The logo matches the app's wordmark** (CI regenerates and diffs it).

## Deploying

Static output in `dist/`. Any static host works. As a second project on the
same repository:

| | |
| --- | --- |
| Root directory | `docs` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 22 or later (`starlight-openapi` requires ≥ 22.12) |
| Environment | `CI=true` — turns on link validation |

Then point `docs.rovie.africa` at it with a CNAME.

### The redirects on the app side

Three paths on `rovie.africa` used to be the docs and now 301 here:

| From | To |
| --- | --- |
| `/docs/*` | `https://docs.rovie.africa/*` |
| `/docs` | `/start/quickstart/` |
| `/api-reference` | `/api/` |
| `/sdk` | `/sdks/overview/` |

They live in `../public/_redirects` (Netlify and Cloudflare Pages read it
directly; that file also carries the nginx equivalents in a comment). The app
additionally redirects them client-side via
`../src/components/ExternalRedirect` — a fallback for hosts that ignore
`_redirects`, not the mechanism. A client-side redirect is a 200 with a hop in
it, and only the 301 passes the old URLs' ranking.

## For models, not people

The build emits `/llms.txt`, `/llms-small.txt` and `/llms-full.txt`. When
somebody asks Claude or ChatGPT how to call Rovie Route, those files are what it
reads — which for an AI gateway is the same job as the docs themselves, not a
side quest. They are generated from the same pages, so they cannot go stale.
