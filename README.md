# Rovie.africa
Building the future of AI in Africa

Two sites live in this repository, built and deployed independently:

| | | |
| --- | --- | --- |
| `src/` | rovie.africa | The product. React 19 + Vite, SPA. |
| `docs/` | docs.rovie.africa | The documentation. Astro + Starlight, static. |

```bash
npm install && npm run dev              # the app,  http://localhost:5173
cd docs && npm install && npm run dev   # the docs, http://localhost:4321
```

**Two servers, two ports.** They are separate sites in every environment, so
the links between them are absolute URLs and real cross-origin navigations. In
dev they follow the environment automatically — the header's "Docs" link points
at `localhost:4321`, and the docs' link back points at `localhost:5173`.

There is no way to reach the docs through the app's dev server: a subdomain
does not create a server, so `docs.localhost:5173` resolves to 127.0.0.1 and
then hits Vite on 5173, which is this app. Start the second server.

Not running the docs locally? Set `VITE_DOCS_URL=https://docs.rovie.africa` in
`.env.local` and the links point at the deployed site instead. The reverse
override is `ROVIE_APP_URL` for the docs build.

They share a palette, two typefaces and a wordmark, and link into each other's
routes — but nothing else. See `docs/README.md` for why the documentation is a
separate site rather than a section of this one, and how to deploy it.

## Map geometry

`src/assets/geo/` is generated, not written. `npm run geo:build` rebuilds it
from the `world-atlas` package: the globe's GeoJSON, the wordmark's outline and
the sign-in plate's projected paths. Commit what it produces, and don't edit
those files by hand — see `scripts/build-geo.mjs` for what each one is for.

The docs site generates its logo from the same wordmark outline
(`docs/scripts/build-logo.mjs`), so `npm run geo:build` should be followed by
`cd docs && npm run logo:build`. CI checks that it was.

## Where the documentation went

`/docs`, `/api-reference` and `/sdk` were placeholder routes in this app. They
are now written, on their own site, and those three paths 301 to it — see
`public/_redirects`. Nothing under `src/pages/` serves them any more, and
`src/content/seo.ts` has no entry for them, because a redirect never renders.
