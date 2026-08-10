import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const themeSrc = readFileSync(resolve('src/styles/base/_theme.scss'), 'utf8');
const variablesSrc = readFileSync(resolve('src/styles/abstracts/_variables.scss'), 'utf8');

function tokensIn(block: string): Set<string> {
  return new Set([...block.matchAll(/(--rv-[a-z0-9-]+)\s*:/g)].map((match) => match[1]));
}

const lightBlock = themeSrc.slice(0, themeSrc.indexOf('@media'));
const darkBlock = themeSrc.slice(themeSrc.indexOf('@media'));

describe('theme tokens', () => {
  // The dark theme is an override, not a second palette. Any token it fails to
  // redeclare silently keeps its light value - which is how a "dark mode" ends
  // up with one white panel in it.
  it('overrides every colour token the light theme declares', () => {
    const light = tokensIn(lightBlock);
    const dark = tokensIn(darkBlock);
    const missing = [...light].filter((token) => !dark.has(token));
    expect(missing).toEqual([]);
  });

  it('adds no token in dark that light does not define', () => {
    const light = tokensIn(lightBlock);
    const dark = tokensIn(darkBlock);
    const extra = [...dark].filter((token) => !light.has(token));
    expect(extra).toEqual([]);
  });

  it('follows the system preference rather than a stored choice', () => {
    expect(themeSrc).toContain('@media (prefers-color-scheme: dark)');
  });

  // Without this the browser paints its own furniture - scrollbars, form
  // control interiors - in the wrong scheme.
  it('declares color-scheme so native controls follow too', () => {
    expect(themeSrc).toMatch(/color-scheme:\s*light dark/);
  });

  it('uses the design system grounds at each end', () => {
    expect(lightBlock).toMatch(/--rv-bg:\s*#fdfcfc/);
    expect(darkBlock).toMatch(/--rv-bg:\s*#201d1d/);
  });

  // The single rule the palette is built on. Every neutral carries a warm
  // lift, and one pure #000 or #ffffff dropped in goes visibly blue against
  // everything around it - which is exactly the failure this catches, because
  // a pure neutral is what anyone reaches for by reflex.
  it('never uses a pure neutral', () => {
    const pureNeutrals = [...themeSrc.matchAll(/(--rv-[a-z0-9-]+):\s*(#fff(?:fff)?|#000(?:000)?)\b/gi)];
    expect(pureNeutrals.map(([, token]) => token)).toEqual([]);
  });
});

describe('colour variables', () => {
  // A Sass colour literal here would be baked at build time and could never
  // follow the preference, so every colour token has to be an indirection.
  it('resolves every colour token through a custom property', () => {
    const declarations = [...variablesSrc.matchAll(/^\$color-[a-z-]+:\s*(.+);$/gm)];
    expect(declarations.length).toBeGreaterThan(10);
    declarations.forEach(([line, value]) => {
      expect(value.trim(), line).toMatch(/^var\(--rv-[a-z0-9-]+\)$/);
    });
  });

  it('routes the chart chrome through the theme as well', () => {
    ['$viz-empty', '$viz-grid', '$viz-axis', '$viz-primary'].forEach((token) => {
      expect(variablesSrc).toMatch(
        new RegExp(`\\${token}:\\s*var\\(--rv-viz-[a-z]+\\);`)
      );
    });
  });
});
