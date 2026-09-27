import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Helpers for tests that inspect a component stylesheet as text (jsdom doesn't run CSS animations
// or :hover / :active, so the rules themselves are what we can lock in).

export type Block = { header: string; body: string; start: number; end: number }

/** Reads a stylesheet that sits next to this file, with comments stripped. */
export function readCss(fileName: string): string {
  // import.meta.url as a plain string: the jsdom environment's own URL class isn't accepted by node:url.
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), fileName), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Finds `@keyframes x { ... }` / `@media (...) { ... }` blocks, honouring nested braces. */
export function findAtBlocks(source: string, kind: 'keyframes' | 'media'): Block[] {
  const blocks: Block[] = []
  const re = kind === 'keyframes' ? /@keyframes\s+([\w-]+)\s*\{/g : /@media\s*([^{]+)\{/g
  let m: RegExpExecArray | null
  while ((m = re.exec(source))) {
    const open = m.index + m[0].length - 1
    let depth = 0
    let i = open
    for (; i < source.length; i++) {
      if (source[i] === '{') depth++
      else if (source[i] === '}' && --depth === 0) break
    }
    blocks.push({ header: m[1].trim(), body: source.slice(open + 1, i), start: m.index, end: i + 1 })
  }
  return blocks
}

/** All blocks must come from the same `source` (their offsets index into it), so they go in one pass. */
export function removeBlocks(source: string, blocks: Block[]): string {
  return [...blocks].sort((a, b) => b.start - a.start).reduce((acc, b) => acc.slice(0, b.start) + acc.slice(b.end), source)
}

/** Bodies of the rules (outside any at-rule block) whose selector list includes `selector`. */
export function rulesFor(source: string, selector: string): string[] {
  return Array.from(source.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    .filter(([, selectors]) => selectors.split(',').map(s => s.trim()).includes(selector))
    .map(([, , body]) => body)
}
