// Official provider marks from @lobehub/icons-static-svg (MIT). Each file is a
// 24x24 mark filled with `currentColor`.
//
// Imported with ?raw and injected downstream: this is a static build-time
// asset from a dependency, never user input, so there is nothing to sanitise.
import openai from '@lobehub/icons-static-svg/icons/openai.svg?raw';
import claude from '@lobehub/icons-static-svg/icons/claude.svg?raw';
import kimi from '@lobehub/icons-static-svg/icons/kimi.svg?raw';
import gemini from '@lobehub/icons-static-svg/icons/gemini.svg?raw';
import deepseek from '@lobehub/icons-static-svg/icons/deepseek.svg?raw';
import mistral from '@lobehub/icons-static-svg/icons/mistral.svg?raw';
import qwen from '@lobehub/icons-static-svg/icons/qwen.svg?raw';
import grok from '@lobehub/icons-static-svg/icons/grok.svg?raw';
import metaai from '@lobehub/icons-static-svg/icons/metaai.svg?raw';
import cohere from '@lobehub/icons-static-svg/icons/cohere.svg?raw';

/** The mark drawn at 24x24, plus who it belongs to. */
export interface ProviderLogo {
  /** The complete <svg> element, for placing in an HTML document. */
  svg: string;
  /** Just the drawing, for nesting inside an existing <svg>. */
  glyph: string;
  /** Needed by marks drawn with overlapping subpaths, e.g. OpenAI's knot. */
  fillRule?: string;
  label: string;
}

/**
 * Strip the wrapper so the drawing can be dropped into an <svg> we already
 * have. The wrapper carries fill-rule for some marks, so that comes with it -
 * losing it fills OpenAI's knot in solid.
 */
function toGlyph(svg: string): { glyph: string; fillRule?: string } {
  const openTag = /^<svg\b([^>]*)>/.exec(svg);
  const fillRule = openTag ? /fill-rule="([^"]+)"/.exec(openTag[1])?.[1] : undefined;
  const glyph = svg
    .replace(/^<svg\b[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .trim();
  return { glyph, fillRule };
}

function entry(svg: string, label: string): ProviderLogo {
  return { svg, label, ...toGlyph(svg) };
}

/** Model family -> the mark people actually recognise it by. */
const FAMILY_LOGO: Record<string, ProviderLogo> = {
  gpt: entry(openai, 'OpenAI'),
  claude: entry(claude, 'Anthropic'),
  kimi: entry(kimi, 'Moonshot AI'),
  gemini: entry(gemini, 'Google'),
  deepseek: entry(deepseek, 'DeepSeek'),
  mistral: entry(mistral, 'Mistral AI'),
  qwen: entry(qwen, 'Alibaba Qwen'),
  grok: entry(grok, 'xAI'),
  llama: entry(metaai, 'Meta'),
  command: entry(cohere, 'Cohere'),
};

export function logoForFamily(family: string | null | undefined): ProviderLogo | undefined {
  return family ? FAMILY_LOGO[family] : undefined;
}
