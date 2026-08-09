// Parses and validates openapi.yaml with the same parser starlight-openapi
// uses, so a spec that would fail the docs build fails here first - in CI, in
// a second, with a readable error - instead of thirty seconds into `astro
// build`.
//
// Two steps, because they catch different things:
//   bundle()   is exactly what libs/parser.ts calls, so it fails on anything
//              that would break the build - an unresolvable $ref, bad YAML.
//   validate() additionally checks the document against the OpenAPI schema,
//              which catches the mistakes that build fine and reach the page
//              as a silently empty table.

import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { bundle, validate } from '@readme/openapi-parser';

const specPath = resolve(dirname(fileURLToPath(import.meta.url)), '../openapi.yaml');
const specUrl = pathToFileURL(specPath).href;

try {
  const document = await bundle(specUrl);

  const result = await validate(specUrl);
  if (result?.valid === false) {
    const detail =
      result.errors?.map((error) => `  ${error.instancePath || '/'}: ${error.message}`).join('\n') ??
      '  (no detail reported)';
    throw new Error(`does not validate against the OpenAPI schema:\n${detail}`);
  }

  const operations = Object.values(document.paths ?? {}).reduce(
    (count, item) =>
      count +
      Object.keys(item).filter((key) => !['parameters', 'summary', 'description', 'servers'].includes(key))
        .length,
    0
  );

  console.log(
    `openapi.yaml is valid - ${document.info.title} ${document.info.version}, ` +
      `${Object.keys(document.paths ?? {}).length} paths, ${operations} operations`
  );
} catch (error) {
  console.error(`openapi.yaml is invalid: ${error.message}`);
  process.exitCode = 1;
}
