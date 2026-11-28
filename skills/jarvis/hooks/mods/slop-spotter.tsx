import { atom, read, update } from 'claude-code'
import type { Args, EngineInterface, EventResult } from 'claude-code'

import type { SlopFlag } from '../../types'
import { isOn, quietly } from '../lib/state'
import type { Render, Step, Ui } from '../lib/state'
import { redact, scanSlop, slopSpans } from '../lib/text'

// Declared where it is read, so the engine can see which state this file touches.
const names = atom({ plugin: 'jarvis', key: 'names' } as const, {} as Record<string, string>, { shape: 'names-1' })
const slop = atom({ plugin: 'jarvis', key: 'slop' } as const, [] as SlopFlag[], { shape: 'slop-1' })

const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit'])
const PROSE_FILE = /(\.(md|mdx|markdown|txt|rst|adoc|html?|tex|eml)|\/[^./]+)$/i
const MAX_BYTES = 1_000_000

// One line with its giveaways marked: yellow hype words, orange long dashes, underlined lists of three.
export function marked(ui: Ui, line: string, key: string) {
  const { Text } = ui
  const parts = []
  let at = 0
  for (const span of slopSpans(line)) {
    if (span.start < at) continue
    if (span.start > at) parts.push(line.slice(at, span.start))
    const text = line.slice(span.start, span.end)
    if (span.kind === 'hype') {
      parts.push(
        <Text backgroundColor="#ffd84d" color="#1a1a1a">
          {text}
        </Text>,
      )
    } else if (span.kind === 'dash') {
      parts.push(
        <Text backgroundColor="#ff9f43" color="#1a1a1a">
          {text}
        </Text>,
      )
    } else {
      parts.push(
        <Text underline color="#c792ea">
          {text}
        </Text>,
      )
    }
    at = span.end
  }
  parts.push(line.slice(at))
  return (
    <Text key={key} wrap="wrap">
      {parts}
    </Text>
  )
}

export function rewritePrompt(flags: SlopFlag[]): string {
  const lines = flags.map(f => `${f.file}:${f.line}: ${f.text}`).join('\n')
  return `Rewrite these flagged lines so they sound like a person wrote them: no hype words (game-changer and the like), no em dashes, no neat lists of three. Keep the meaning and change nothing else.\n\n${lines}`
}

async function rescan($: EngineInterface, path: string) {
  const stat = await $.fs.stat(path).catch(() => undefined)
  if (stat === undefined || stat.size > MAX_BYTES) return
  const flags = scanSlop(await $.fs.read(path)).map(f => ({ file: path, ...f }))
  await update($, slop, list => [...list.filter(f => f.file !== path), ...flags])
}

export async function slopToolCall(
  $: EngineInterface,
  e: Args<'tool.call'>,
  next: Step<'tool.call'>,
): Promise<EventResult<'tool.call'>> {
  const ran = await next(e)
  if (!EDIT_TOOLS.has(String(e.tool)) || ran.deny !== undefined || ran.isError === true) return ran
  const path = String((e as unknown as Record<string, unknown>).file_path ?? '')
  if (PROSE_FILE.test(path) && (await isOn($, 'slop'))) await quietly(() => rescan($, path))
  return ran
}

// One plain line about a reply. Copying flagged lines under the reply showed raw markdown and read as a garbled duplicate.
export function slopSummary(text: string): string | undefined {
  const spans = text.split('\n').flatMap(line => slopSpans(line).map(s => ({ ...s, word: line.slice(s.start, s.end) })))
  if (spans.length === 0) return undefined
  const words = [...new Set(spans.filter(s => s.kind === 'hype').map(s => `"${s.word.toLowerCase()}"`))]
  const dashes = spans.filter(s => s.kind === 'dash').length
  const triads = spans.filter(s => s.kind === 'triad').length
  const parts = [
    ...(words.length > 0 ? [`hype ${words.join(', ')}`] : []),
    ...(dashes > 0 ? [`${dashes} long ${dashes === 1 ? 'dash' : 'dashes'}`] : []),
    ...(triads > 0 ? [`${triads} ${triads === 1 ? 'list' : 'lists'} of three`] : []),
  ]
  return `Slop Spotter: ${parts.join('; ')}`
}

// Claude's replies: drawn untouched, with one summary line underneath.
export async function slopAssistant($: EngineInterface, e: Render<'AssistantMessage'>, next: Step<'ui.render'>) {
  const drawn = await next(e)
  if (!(await isOn($, 'slop'))) return drawn
  const isMasked = await isOn($, 'stream')
  const text = isMasked ? redact(e.props.text, await read($, names)) : e.props.text
  const summary = slopSummary(text)
  if (summary === undefined) return drawn
  const { Box, Text } = $.ui.resolve(e) as Ui
  return (
    <Box flexDirection="column">
      {drawn}
      <Text dimColor>{summary}</Text>
    </Box>
  )
}

export async function slopTab($: EngineInterface, ui: Ui) {
  const { Box, Button, Text } = ui
  const flags = await read($, slop)
  if (flags.length === 0) return <Text color="#7bd88f">No giveaways in files Claude wrote this session.</Text>
  const count = flags.reduce((n, f) => n + slopSpans(f.text).length, 0)
  const files = new Set(flags.map(f => f.file)).size
  return (
    <Box flexDirection="column">
      <Text bold>
        {count} giveaways in {files} {files === 1 ? 'file' : 'files'} Claude wrote
      </Text>
      {flags.slice(0, 40).map(f => (
        <Box key={`flag-${f.file}-${f.line}`} flexDirection="column">
          <Text dimColor>
            {f.file.slice(f.file.lastIndexOf('/') + 1)}:{f.line}
          </Text>
          {marked(ui, f.text, `line-${f.file}-${f.line}`)}
        </Box>
      ))}
      <Button key="slop-rewrite" label="Rewrite flagged lines" variant="primary" onPress={() => $.prompt.submit({ text: rewritePrompt(flags) })} />
    </Box>
  )
}
