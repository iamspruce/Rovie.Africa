// -----------------------------------------------------------------------
// Verifies every link into the API reference actually resolves.
//
// starlight-links-validator checks the docs against the content collection,
// and the reference is not in it - starlight-openapi injects those routes at
// build time from openapi.yaml. So the validator is configured to skip /api/**
// (see astro.config.mjs) and this script covers it instead, by checking the one
// place those pages exist: the built output.
//
// That matters more here than an ordinary broken link. Reference URLs are
// derived from operationIds, so renaming an operation in openapi.yaml silently
// breaks every prose page pointing at it, and the build would otherwise be
// perfectly happy.
//
// Runs as part of `npm run build`, after astro build.
// -----------------------------------------------------------------------

import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, '../src/content/docs');
const componentsDir = resolve(here, '../src/components');
const distDir = resolve(here, '../dist');

/** Markdown `](/api/…)` and raw `href="/api/…"`, which the island uses. */
const LINK_PATTERN = /(?:\]\(|href=["'])(\/api\/[^)"'\s#]*)/g;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else yield path;
  }
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

const found = new Map(); // link -> [files that use it]

for (const dir of [contentDir, componentsDir]) {
  for await (const file of walk(dir)) {
    if (!/\.(md|mdx|astro)$/.test(file)) continue;

    const source = await readFile(file, 'utf8');
    for (const [, link] of source.matchAll(LINK_PATTERN)) {
      const users = found.get(link) ?? [];
      users.push(file.replace(`${resolve(here, '..')}/`, ''));
      found.set(link, users);
    }
  }
}

const broken = [];

for (const [link, users] of found) {
  // trailingSlash is 'always', so /api/foo/ is written to dist/api/foo/index.html.
  const target = resolve(distDir, `.${link}`.replace(/\/$/, ''), 'index.html');
  if (!(await exists(target))) broken.push({ link, users });
}

if (broken.length > 0) {
  console.error(`\n${broken.length} link(s) into the API reference do not resolve:\n`);
  for (const { link, users } of broken) {
    console.error(`  ${link}`);
    for (const user of users) console.error(`      used in ${user}`);
  }
  console.error(
    '\nReference URLs come from operationIds in openapi.yaml. If one was renamed,\n' +
      'every link to it has to move with it.\n'
  );
  process.exitCode = 1;
} else {
  console.log(`All ${found.size} API reference link(s) resolve.`);
}
