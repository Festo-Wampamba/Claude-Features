import { atom, read, update } from 'claude-code'
import type { Args, EngineInterface } from 'claude-code'

import { isOn, quietly } from '../lib/state'
import type { Render, Step } from '../lib/state'
import { learnNames, redact } from '../lib/text'

// Declared where it is read, so the engine can see which state this file touches.
const names = atom({ plugin: 'jarvis', key: 'names' } as const, {} as Record<string, string>, { shape: 'names-1' })

// Rewrites only what is drawn: the model, files and sent messages keep the real details.
export function deepRedact(value: unknown, map: Record<string, string>): unknown {
  if (typeof value === 'string') return redact(value, map)
  if (Array.isArray(value)) return value.map(v => deepRedact(v, map))
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, deepRedact(v, map)]))
  }
  return value
}

export async function streamSessionStart($: EngineInterface, e: Args<'session.start'>, next: Step<'session.start'>) {
  await quietly(async () => {
    const stored = await $.store.get('names')
    if (stored !== null && typeof stored === 'object') await update($, names, () => stored as Record<string, string>)
  })
  return next(e)
}

// Learns who is who from what you type, so each person keeps one stand-in.
export async function streamPromptSubmit($: EngineInterface, e: Args<'prompt.submit'>, next: Step<'prompt.submit'>) {
  await quietly(async () => {
    const before = await read($, names)
    const after = learnNames(before, e.text)
    if (Object.keys(after).length === Object.keys(before).length) return
    await update($, names, () => after)
    await $.store.set('names', after)
  })
  return next(e)
}

export async function streamAssistant($: EngineInterface, e: Render<'AssistantMessage'>, next: Step<'ui.render'>) {
  if (!(await isOn($, 'stream'))) return next(e)
  return next({ ...e, props: { ...e.props, text: redact(e.props.text, await read($, names)) } })
}

export async function streamUser($: EngineInterface, e: Render<'UserMessage'>, next: Step<'ui.render'>) {
  if (!(await isOn($, 'stream'))) return next(e)
  const map = learnNames(await read($, names), e.props.text)
  return next({ ...e, props: { ...e.props, text: redact(e.props.text, map) } })
}

export async function streamToolUse($: EngineInterface, e: Render<'ToolUse'>, next: Step<'ui.render'>) {
  if (!(await isOn($, 'stream'))) return next(e)
  const map = await read($, names)
  const props = { ...e.props, input: deepRedact(e.props.input, map) }
  return next({ ...e, props: e.props.output === undefined ? props : { ...props, output: deepRedact(e.props.output, map) } })
}
