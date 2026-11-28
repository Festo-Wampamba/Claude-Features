import { atom, read, update } from 'claude-code'
import type { Args, EngineInterface, EventResult } from 'claude-code'

import type { Pip, PipMood } from '../../types'
import { quietly } from '../lib/state'
import type { Step, Ui } from '../lib/state'
import { isTestRun } from '../lib/text'

// Declared where it is read, so the engine can see which state this file touches.
const isHeist = atom({ plugin: 'jarvis', key: 'isHeist' } as const, false)
const pip = atom({ plugin: 'jarvis', key: 'pip' } as const, { mood: 'idle', since: 0 } as Pip, { shape: 'pip-1' })

// 12x8, # a filled pixel, o his eye, . empty.
export const PIP_GRID = [
  '........#...',
  '........###.',
  '........#o##',
  '##......###.',
  '.########...',
  '.########...',
  '.#.#...#.#..',
  '.#.#...#.#..',
]

const FUR: Record<PipMood, string> = {
  idle: '#e8e8e8',
  working: '#7fdbff',
  happy: '#7bd88f',
  worried: '#ff6b6b',
  waiting: '#ffd84d',
}

type Cell = { char: string; color?: string; backgroundColor?: string }

export function pipSays(mood: PipMood, seconds: number): string {
  if (mood === 'happy') return 'Verified! Nice work'
  if (mood === 'worried') return 'Uh oh - a command failed'
  if (mood === 'waiting') return `Waiting with you... ${seconds}s`
  if (mood === 'working') return 'On it...'
  return 'Ready when you are'
}

// Two pixel rows per text row, using half blocks, so Pip stays four lines tall.
export function pipRows(fur: string, isShades: boolean): Cell[][] {
  const eye = isShades ? '#000000' : '#202020'
  const colorAt = (r: number, c: number): string | undefined => {
    const px = PIP_GRID[r]?.[c]
    if (px === '#') return isShades && r === 2 && c === 8 ? eye : fur
    if (px === 'o') return eye
    return undefined
  }
  const rows: Cell[][] = []
  for (let r = 0; r < PIP_GRID.length; r += 2) {
    const row: Cell[] = []
    for (let c = 0; c < 12; c++) {
      const top = colorAt(r, c)
      const bottom = colorAt(r + 1, c)
      if (top && bottom) row.push({ char: '▀', color: top, backgroundColor: bottom })
      else if (top) row.push({ char: '▀', color: top })
      else if (bottom) row.push({ char: '▄', color: bottom })
      else row.push({ char: ' ' })
    }
    rows.push(row)
  }
  return rows
}

async function feel($: EngineInterface, mood: PipMood) {
  const since = await $.clock.now()
  await update($, pip, current => (current.mood === mood ? current : { mood, since }))
}

async function tick($: EngineInterface) {
  if ((await read($, pip)).mood === 'waiting') $.ui.invalidate('ui.render')
}

export async function pipSessionStart($: EngineInterface, e: Args<'session.start'>, next: Step<'session.start'>) {
  const started = await next(e)
  // Counts the seconds while Pip waits for your okay.
  $.clock.every(1000, () => void quietly(() => tick($)))
  return started
}

export async function pipToolCall($: EngineInterface, e: Args<'tool.call'>, next: Step<'tool.call'>): Promise<EventResult<'tool.call'>> {
  await quietly(() => feel($, 'working'))
  const ran = await next(e)
  if (String(e.tool) !== 'Bash' || ran.deny !== undefined) return ran
  const command = String((e as unknown as Record<string, unknown>).command ?? '')
  if (ran.isError === true) await quietly(() => feel($, 'worried'))
  else if (isTestRun(command)) await quietly(() => feel($, 'happy'))
  return ran
}

export async function pipNotification($: EngineInterface, e: Args<'classic.Notification'>, next: Step<'classic.Notification'>) {
  if (JSON.stringify(e).toLowerCase().includes('permission')) await quietly(() => feel($, 'waiting'))
  return next(e)
}

export async function pipTurnComplete($: EngineInterface, e: Args<'turn.complete'>, next: Step<'turn.complete'>) {
  const done = await next(e)
  if (e.agentId === undefined) {
    await quietly(async () => {
      const { mood } = await read($, pip)
      if (mood === 'working' || mood === 'waiting') await feel($, 'idle')
    })
  }
  return done
}

export async function pipBand($: EngineInterface, ui: Ui, now: number) {
  const { mood, since } = await read($, pip)
  const { Box, Text } = ui
  const rows = pipRows(FUR[mood], await read($, isHeist))
  const seconds = Math.max(0, Math.round((now - since) / 1000))
  return (
    <Box flexDirection="row">
      <Box flexDirection="column">
        {rows.map((row, i) => (
          <Text key={`pip-${i}`}>
            {row.map(cell => (
              <Text color={cell.color} backgroundColor={cell.backgroundColor}>
                {cell.char}
              </Text>
            ))}
          </Text>
        ))}
      </Box>
      <Box flexDirection="column" justifyContent="center" paddingX={1}>
        <Text color={FUR[mood]} bold>
          {pipSays(mood, seconds)}
        </Text>
      </Box>
    </Box>
  )
}
