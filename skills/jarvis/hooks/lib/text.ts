import type { SlopKind } from '../../types'

// ---- Stream Safe: what is drawn on screen, never what Claude reads ----

const SECRET =
  /\bsk-ant-[\w-]{6,}|\b(?:sk|pk|rk)-[A-Za-z0-9_-]{6,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bgithub_pat_\w{20,}|\bxox[abprs]-[\w-]{10,}|\bAKIA[0-9A-Z]{16}\b|\bAIza[\w-]{35}\b|\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}/g
const KEYED_SECRET = /\b((?:api[_-]?key|secret|token|password|passwd)\s*[:=]\s*)["']?[^\s"']{6,}["']?/gi
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const PHONE =
  /(?<![\w-])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)\s?|\d{2,4}[\s.-])?\d{3}[\s.-]\d{4}(?![\w-])|\+\d{9,14}\b/g
const NAME_CUE =
  /\b(client|customer|patient|contact|colleague|boss|manager|named|called|dear|hi|hello|hey|mr\.?|mrs\.?|ms\.?|dr\.?|to|for|with|from|cc)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g
const STRONG_CUE = /^(client|customer|patient|named|called|dear|hi|hello|hey|mr\.?|mrs\.?|ms\.?|dr\.?)$/i
const NOT_NAMES = new Set(
  'I The A An Claude Jarvis Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December LinkedIn Google GitHub Slack Stream Safe Client API Undo Point'.split(
    ' ',
  ),
)

export function findNames(text: string): string[] {
  const found: string[] = []
  for (const m of text.matchAll(NAME_CUE)) {
    const words = m[2]!.split(/\s+/).filter(w => !NOT_NAMES.has(w))
    if (words.length === 0) continue
    if (words.length === 1 && !STRONG_CUE.test(m[1]!)) continue
    found.push(words.join(' '))
  }
  return found
}

export function aliasFor(index: number): string {
  let n = index
  let letters = ''
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return `Client ${letters}`
}

// Adds new names to the map, each with the next stand-in; returns a new map.
export function learnNames(names: Record<string, string>, text: string): Record<string, string> {
  const next = { ...names }
  const aliases = new Set(Object.values(next))
  for (const name of findNames(text)) {
    const key = name.toLowerCase()
    if (next[key] !== undefined) continue
    const alias = aliasFor(aliases.size)
    next[key] = alias
    aliases.add(alias)
    const first = key.split(' ')[0]!
    if (key.includes(' ') && next[first] === undefined) next[first] = alias
  }
  return next
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function redact(text: string, names: Record<string, string>): string {
  let out = text
    .replace(SECRET, '[secret]')
    .replace(KEYED_SECRET, '$1[secret]')
    .replace(EMAIL, '[email]')
    .replace(PHONE, '[phone]')
  const longestFirst = Object.keys(names).sort((a, b) => b.length - a.length)
  for (const name of longestFirst) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(name)}\\b`, 'gi'), names[name]!)
  }
  return out
}

// ---- Slop Spotter ----

export const HYPE = [
  'game-changer',
  'game changer',
  'game-changing',
  'revolutionize',
  'revolutionary',
  'cutting-edge',
  'next-level',
  'groundbreaking',
  'seamless',
  'seamlessly',
  'supercharge',
  'unleash',
  'unlock',
  'elevate',
  'empower',
  'transformative',
  'delve',
  'leverage',
  'synergy',
  'world-class',
  'best-in-class',
  'paradigm shift',
  'robust',
  'harness the power',
  "in today's fast-paced",
  'thrilled to announce',
  'excited to announce',
  'look no further',
  'take it to the next level',
]

const HYPE_RE = new RegExp(`\\b(${HYPE.map(escapeRegExp).join('|')})\\w*`, 'gi')
const TRIAD = /\b[\w'-]+(?:\s[\w'-]+){0,2},\s[\w'-]+(?:\s[\w'-]+){0,2},?\s(?:and|or)\s[\w'-]+/i

export type SlopSpan = { start: number; end: number; kind: SlopKind }

export function slopSpans(line: string): SlopSpan[] {
  const spans: SlopSpan[] = []
  for (const m of line.matchAll(HYPE_RE)) spans.push({ start: m.index, end: m.index + m[0].length, kind: 'hype' })
  for (const m of line.matchAll(/—/g)) spans.push({ start: m.index, end: m.index + 1, kind: 'dash' })
  const triad = TRIAD.exec(line)
  if (triad) spans.push({ start: triad.index, end: triad.index + triad[0].length, kind: 'triad' })
  return spans.sort((a, b) => a.start - b.start)
}

export function scanSlop(text: string): { line: number; text: string; kinds: SlopKind[] }[] {
  const out: { line: number; text: string; kinds: SlopKind[] }[] = []
  text.split('\n').forEach((line, i) => {
    const kinds = [...new Set(slopSpans(line).map(s => s.kind))]
    if (kinds.length > 0) out.push({ line: i + 1, text: line.trim(), kinds })
  })
  return out
}

export function countGiveaways(text: string): number {
  return slopSpans(text).length
}

// ---- Rule Keeper ----

const CORRECTION =
  /^\s*(no[,.!\s]|nope|don'?t|do not|never|stop|please (don'?t|stop|never)|avoid|quit|i (said|told you)|you (keep|still|again)|that'?s (wrong|not)|wrong|not like that|again[,!]|instead)|\b(don'?t|do not|never|stop) (use|using|add|adding|put|write|do)\b/i
const STOP = new Set(
  "don't dont do not never please stop use using i said told you again the a an any in it its of to for with your my me this that like no more instead keep still be is are was any ever just and or but so".split(
    ' ',
  ),
)

export function isCorrection(text: string): boolean {
  return text.length < 400 && CORRECTION.test(text)
}

export function keywords(text: string): string[] {
  const unified = text
    .toLowerCase()
    .replace(/—/g, ' emdash ')
    .replace(/\b(long|em)[\s-]?dash(es)?\b/g, ' emdash ')
    .replace(/[^a-z0-9\s]/g, ' ')
  const words = unified
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP.has(w))
    .map(w => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))
  return [...new Set(words)]
}

export function isSameCorrection(a: string, b: string): boolean {
  const ka = keywords(a)
  const kb = new Set(keywords(b))
  const shared = ka.filter(w => kb.has(w)).length
  const union = new Set([...ka, ...kb]).size
  return shared > 0 && union > 0 && shared / union >= 0.5
}

export function toRule(text: string): string {
  const first = (text.trim().split(/(?<=[.!?])\s/)[0] ?? text).trim().slice(0, 160)
  const capped = first.charAt(0).toUpperCase() + first.slice(1)
  return /[.!?]$/.test(capped) ? capped : `${capped}.`
}

export function appendRule(claudeMd: string, rule: string): string {
  const line = `- ${rule}`
  if (claudeMd.split('\n').some(l => l.trim() === line)) return claudeMd
  const heading = '## Rules saved by Rule Keeper'
  const body = claudeMd.replace(/\s*$/, '')
  return body.includes(heading) ? `${body}\n${line}\n` : `${body}\n\n${heading}\n${line}\n`
}

// ---- Proof Check and Pip ----

const CODE_FILE =
  /\.(html?|css|scss|js|jsx|mjs|cjs|ts|tsx|py|go|rs|java|kt|rb|php|c|cc|cpp|h|hpp|cs|swift|vue|svelte|astro|sh|sql|lua|dart|ex|exs)$/i
const CHECK =
  /\b(test|tests|pytest|jest|vitest|mocha|playwright|cypress|go test|cargo (test|build|check)|tsc|eslint|lint|build|make|gradle|mvn|rspec|phpunit|dotnet (test|build)|swift (test|build)|flutter test|npx? (test|run)|pnpm (test|run|build)|yarn (test|run|build)|bun (test|run)|node --test|curl\s+(-\S+\s+)*https?:\/\/(localhost|127\.0\.0\.1))\b/i
const TEST_RUN =
  /\b(pytest|jest|vitest|mocha|go test|cargo test|rspec|phpunit|node --test|(pnpm|npm|yarn|bun) (run )?test|claude plugin test|dotnet test|swift test|flutter test)\b/i

export function isCodeFile(path: string): boolean {
  return CODE_FILE.test(path)
}

export function isCheckCommand(command: string): boolean {
  return CHECK.test(command)
}

export function isTestRun(command: string): boolean {
  return TEST_RUN.test(command)
}

export function isBrowserTool(tool: string): boolean {
  return /browser|playwright|preview|chrome|puppeteer|devtools/i.test(tool)
}
