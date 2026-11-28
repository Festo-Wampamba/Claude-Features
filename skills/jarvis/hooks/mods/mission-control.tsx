import { atom, read, update } from 'claude-code'
import type { AgentInfo, Args, EngineInterface } from 'claude-code'

import type { AgentCard } from '../../types'
import { isOn, quietly, usd } from '../lib/state'
import type { Step, Ui } from '../lib/state'

// Declared where it is read, so the engine can see which state this file touches.
const agents = atom({ plugin: 'jarvis', key: 'agents' } as const, [] as AgentCard[], { shape: 'agents-1' })
const overrides = atom({ plugin: 'jarvis', key: 'overrides' } as const, {} as Record<string, string>, { shape: 'overrides-1' })

const POLL_MS = 2_000
export const MODELS = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5' } as const

// The turn each helper is on, so Stop can end it.
const turns = new Map<string, string>()

export function totalLine(cards: AgentCard[]): string {
  const total = cards.reduce((sum, c) => sum + c.usd, 0)
  return `${cards.length} ${cards.length === 1 ? 'agent' : 'agents'} • ${usd(total)} so far`
}

export function toCard(info: AgentInfo, forced: Record<string, string>, turnId: string | null): AgentCard {
  return {
    id: info.id,
    description: info.description || info.type,
    status: info.taskStatus,
    usd: info.cost?.usd ?? 0,
    model: forced[info.id] ?? info.model ?? '',
    turnId,
  }
}

async function poll($: EngineInterface) {
  if (!(await isOn($, 'mission'))) return
  const forced = await read($, overrides)
  const cards = (await $.agent.list()).map(info => toCard(info, forced, turns.get(info.id) ?? null))
  const before = await read($, agents)
  if (JSON.stringify(before) !== JSON.stringify(cards)) await update($, agents, () => cards)
}

async function stop($: EngineInterface, card: AgentCard) {
  if (card.turnId === null) {
    $.ui.toast('Jarvis has not seen this helper start a turn yet; try again in a moment.')
    return
  }
  await $.turn.abort({ turnId: card.turnId })
}

export async function missionSessionStart($: EngineInterface, e: Args<'session.start'>, next: Step<'session.start'>) {
  const started = await next(e)
  $.clock.every(POLL_MS, () => void quietly(() => poll($)))
  return started
}

export async function missionTurnStart($: EngineInterface, e: Args<'turn.start'>, next: Step<'turn.start'>) {
  const started = await next(e)
  if (e.agentId !== undefined) turns.set(e.agentId, started.turnId)
  return started
}

// Switching a helper's model takes effect from its next model request.
export async function missionModelFor($: EngineInterface, agentId: string | undefined): Promise<string | undefined> {
  if (agentId === undefined) return undefined
  return (await read($, overrides))[agentId]
}

export async function missionTab($: EngineInterface, ui: Ui) {
  const { Box, Button, Text } = ui
  const cards = await read($, agents)
  if (cards.length === 0) return <Text dimColor>No helper agents yet. When Claude starts one, its card shows here.</Text>
  return (
    <Box flexDirection="column">
      <Text bold>{totalLine(cards)}</Text>
      {cards.map(c => {
        const isRunning = c.status === 'running' || c.status === 'pending'
        return (
          <Box key={`agent-${c.id}`} flexDirection="column" borderStyle="round" paddingX={1}>
            <Text wrap="truncate">
              {c.description} <Text dimColor>({isRunning ? 'running' : c.status})</Text>
            </Text>
            <Text dimColor>
              {usd(c.usd)} · {c.model || 'default model'}
            </Text>
            {isRunning && (
              <Box flexDirection="row">
                <Button key={`haiku-${c.id}`} label="→ Haiku" onPress={() => update($, overrides, o => ({ ...o, [c.id]: MODELS.haiku }))} />
                <Button key={`sonnet-${c.id}`} label="→ Sonnet" onPress={() => update($, overrides, o => ({ ...o, [c.id]: MODELS.sonnet }))} />
                <Button key={`stop-${c.id}`} label="Stop" onPress={() => stop($, c)} />
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
