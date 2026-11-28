import { atom, read } from 'claude-code'
import type { Args, Elements, EngineInterface, EventName, EventResult } from 'claude-code'



export const enabled = atom({ plugin: 'jarvis', key: 'enabled' } as const, {} as Record<string, boolean>, { shape: 'enabled-1' })

export const MODS = [
  { id: 'undo', name: 'Undo Point', blurb: 'Backup before every delete, move or overwrite', isDefaultOn: true },
  { id: 'proof', name: 'Proof Check', blurb: 'Flags code changes nobody tested', isDefaultOn: true },
  { id: 'stream', name: 'Stream Safe', blurb: 'Hides names, emails, phones and keys on screen', isDefaultOn: false },
  { id: 'welcome', name: 'Welcome Back', blurb: 'What happened while you were gone', isDefaultOn: true },
  { id: 'mission', name: 'Mission Control', blurb: 'What every helper agent costs', isDefaultOn: true },
  { id: 'slop', name: 'Slop Spotter', blurb: 'Marks robotic writing', isDefaultOn: true },
  { id: 'rules', name: 'Rule Keeper', blurb: 'Saves a rule after two corrections', isDefaultOn: true },
  { id: 'context', name: 'Context X-Ray', blurb: "How full Claude's memory is", isDefaultOn: true },
  { id: 'pip', name: 'Pip', blurb: "A pixel dog whose mood is Claude's status", isDefaultOn: true },
  { id: 'doctor', name: 'Mod Doctor', blurb: 'What every mod can touch', isDefaultOn: true },
  { id: 'heist', name: 'Heist Skin', blurb: 'A neon look, just for fun: /heist', isDefaultOn: true },
] as const

export type ModId = (typeof MODS)[number]['id']

export function isModOn(map: Record<string, boolean>, id: ModId): boolean {
  return map[id] ?? MODS.find(m => m.id === id)!.isDefaultOn
}

export async function isOn($: EngineInterface, id: ModId): Promise<boolean> {
  return isModOn(await read($, enabled), id)
}

export type Ui = Pick<Elements['terminal'], 'Box' | 'Text' | 'Button'>

// What a mod's handler takes as `next`: the rest of the chain core.tsx builds.
export type Step<N extends EventName> = (e: Args<N>) => Promise<EventResult<N>>

export type Render<C extends string> = Extract<Args<'ui.render'>, { component: C }>

export function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.round(s / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

export function usd(value: number): string {
  return `$${value.toFixed(2)}`
}

// Runs a side job of a hook without letting its failure stop the action it watches.
export async function quietly(job: () => Promise<unknown>): Promise<void> {
  try {
    await job()
  } catch {
    // ponytail: a watcher that fails must never block the tool call it watches
  }
}
