import { atom, read, update } from 'claude-code'
import type { Args, EngineInterface, EventResult } from 'claude-code'

import type { ContextView } from '../../types'
import { isOn, quietly } from '../lib/state'
import type { Step, Ui } from '../lib/state'

// Declared where it is read, so the engine can see which state this file touches.
const contextView = atom({ plugin: 'jarvis', key: 'context' } as const, null as ContextView | null, { shape: 'context-1' })
const usedTools = atom({ plugin: 'jarvis', key: 'usedTools' } as const, [] as string[], { shape: 'used-1' })

function k(tokens: number): string {
  return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens)
}

export function buildView(
  context: { tokens?: number; window: number; percent?: number },
  categories: { name: string; tokens: number; kind: string }[],
  mcpTools: { name: string; tokens: number; isLoaded: boolean }[],
  used: string[],
): ContextView {
  const items = categories
    .filter(c => c.tokens > 0 && c.kind !== 'free')
    .map(c => ({ name: c.name, tokens: c.tokens }))
    .sort((a, b) => b.tokens - a.tokens)
  const usedSet = new Set(used)
  const unused = mcpTools
    .filter(t => t.isLoaded && t.tokens > 0 && !usedSet.has(t.name))
    .map(t => ({ name: t.name, tokens: t.tokens }))
    .sort((a, b) => b.tokens - a.tokens)
  const tokens = context.tokens ?? items.reduce((n, i) => n + i.tokens, 0)
  const percent = context.percent ?? (context.window > 0 ? (tokens / context.window) * 100 : 0)
  return { percent: Math.round(percent), tokens, window: context.window, items, unused }
}

export function roomLeft(percent: number): string {
  if (percent < 50) return 'plenty of room left'
  if (percent < 80) return 'filling up'
  return 'nearly full: older things will be summarized soon'
}

async function measure($: EngineInterface) {
  const usage = await $.session.usage({ breakdown: 'summary' })
  const b = usage.context.breakdown
  const view = buildView(
    usage.context,
    (b?.categories ?? []).map(c => ({ name: c.name, tokens: c.tokens, kind: String(c.kind) })),
    b?.mcpTools ?? [],
    await read($, usedTools),
  )
  await update($, contextView, () => view)
}

export async function contextToolCall(
  $: EngineInterface,
  e: Args<'tool.call'>,
  next: Step<'tool.call'>,
): Promise<EventResult<'tool.call'>> {
  const tool = String(e.tool)
  await quietly(async () => {
    if (!(await read($, usedTools)).includes(tool)) await update($, usedTools, list => [...list, tool])
  })
  return next(e)
}

export async function contextTurnComplete($: EngineInterface, e: Args<'turn.complete'>, next: Step<'turn.complete'>) {
  const done = await next(e)
  if (e.agentId === undefined && (await isOn($, 'context'))) await quietly(() => measure($))
  return done
}

export async function contextTab($: EngineInterface, ui: Ui) {
  const { Box, Button, Text } = ui
  const view = await read($, contextView)
  const refresh = <Button key="context-refresh" label="Refresh" onPress={() => quietly(() => measure($))} />
  if (view === null) {
    return (
      <Box flexDirection="column">
        <Text dimColor>No reading yet. It updates after each reply.</Text>
        {refresh}
      </Box>
    )
  }
  return (
    <Box flexDirection="column">
      <Text bold>
        {view.percent}% full, {roomLeft(view.percent)}
      </Text>
      <Text dimColor>
        {k(view.tokens)} of {k(view.window)} tokens
      </Text>
      <Text bold>What's taking the space</Text>
      {view.items.map(i => (
        <Text key={`ctx-${i.name}`}>
          {i.name}: {k(i.tokens)}
        </Text>
      ))}
      {view.unused.length > 0 && (
        <Box flexDirection="column">
          <Text bold color="#ffb347">
            Loads on every message, never used
          </Text>
          {view.unused.slice(0, 15).map(t => (
            <Text key={`unused-${t.name}`} color="#ffb347">
              {t.name}: {k(t.tokens)} every message · not used
            </Text>
          ))}
        </Box>
      )}
      {refresh}
    </Box>
  )
}
