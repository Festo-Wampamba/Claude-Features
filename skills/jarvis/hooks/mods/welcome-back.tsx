import { atom, read, update } from 'claude-code'
import type { Args, EngineInterface, EventResult } from 'claude-code'

import type { AwayCard, Journal, Snapshot } from '../../types'
import { ago, isOn, quietly, usd } from '../lib/state'
import type { Step, Ui } from '../lib/state'
import { isTestRun } from '../lib/text'

// Declared where it is read, so the engine can see which state this file touches.
const away = atom({ plugin: 'jarvis', key: 'away' } as const, null as AwayCard | null, { shape: 'away-1' })
const journal = atom({ plugin: 'jarvis', key: 'journal' } as const, null as Journal | null, { shape: 'journal-1' })
const snapshots = atom({ plugin: 'jarvis', key: 'snapshots' } as const, [] as Snapshot[], { shape: 'snapshots-1' })

const AWAY_AFTER_MS = 3 * 60_000
const TICK_MS = 15_000
const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])

export function hasNews(j: Journal, undoPoints: number): boolean {
  return j.files.length + j.failures.length + undoPoints > 0 || j.waitingSince !== null
}

export function fixPrompt(command: string): string {
  return `While I was away, \`${command}\` failed. Look at the failure, fix the cause, and run it again until it passes.`
}

async function cost($: EngineInterface): Promise<number> {
  return (await $.session.usage()).cost?.usd ?? 0
}

async function seen($: EngineInterface) {
  const j: Journal = { lastSeenAt: await $.clock.now(), costAtSeen: await cost($), files: [], undoPoints: 0, failures: [], waitingSince: null }
  await update($, journal, () => j)
  await update($, away, () => null)
}

async function note($: EngineInterface, fn: (j: Journal) => Journal) {
  const current = await read($, journal)
  if (current !== null) await update($, journal, () => fn(current))
}

// Every 15 seconds: if you've been gone 3 minutes and something happened, the card goes up.
async function check($: EngineInterface) {
  const j = await read($, journal)
  if (j === null || !(await isOn($, 'welcome'))) return
  const now = await $.clock.now()
  const points = (await read($, snapshots)).filter(s => s.at > j.lastSeenAt).length
  if (now - j.lastSeenAt < AWAY_AFTER_MS || !hasNews(j, points)) return
  const spentSince = Math.max(0, (await cost($)) - j.costAtSeen)
  await update($, away, () => ({ ...j, undoPoints: points, awayMs: now - j.lastSeenAt, usd: spentSince }))
}

export async function welcomeSessionStart($: EngineInterface, e: Args<'session.start'>, next: Step<'session.start'>) {
  const started = await next(e)
  await quietly(() => seen($))
  $.clock.every(TICK_MS, () => void quietly(() => check($)))
  return started
}

export async function welcomePromptSubmit($: EngineInterface, e: Args<'prompt.submit'>, next: Step<'prompt.submit'>) {
  if (e.isMeta !== true) await quietly(() => seen($))
  return next(e)
}

export async function welcomeToolCall(
  $: EngineInterface,
  e: Args<'tool.call'>,
  next: Step<'tool.call'>,
): Promise<EventResult<'tool.call'>> {
  await quietly(() => note($, j => ({ ...j, waitingSince: null })))
  const ran = await next(e)
  if (ran.deny !== undefined) return ran
  const tool = String(e.tool)
  const input = e as unknown as Record<string, unknown>
  if (EDIT_TOOLS.has(tool) && ran.isError !== true) {
    const path = String(input.file_path ?? input.notebook_path ?? '')
    await quietly(() => note($, j => ({ ...j, files: j.files.includes(path) ? j.files : [...j.files, path] })))
  }
  if (tool === 'Bash' && ran.isError === true) {
    const command = String(input.command ?? '')
    await quietly(() => note($, j => ({ ...j, failures: [...j.failures, { command, isTest: isTestRun(command) }].slice(-10) })))
  }
  return ran
}

// Claude Code raises this when it stops to ask for your okay.
export async function welcomeNotification($: EngineInterface, e: Args<'classic.Notification'>, next: Step<'classic.Notification'>) {
  if (JSON.stringify(e).toLowerCase().includes('permission')) {
    await quietly(async () => {
      const now = await $.clock.now()
      await note($, j => ({ ...j, waitingSince: j.waitingSince ?? now }))
    })
  }
  return next(e)
}

export async function welcomeBand($: EngineInterface, ui: Ui) {
  const card = await read($, away)
  if (card === null) return null
  const { Box, Button, Text } = ui
  const failed = card.failures.at(-1)
  const fileWord = card.files.length === 1 ? 'file' : 'files'
  const pointWord = card.undoPoints === 1 ? 'undo point' : 'undo points'
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text bold>Welcome back. While you were away ({ago(card.awayMs)})</Text>
      <Text>
        {card.files.length} {fileWord} changed · {card.undoPoints} {pointWord} · {usd(card.usd)} spent
      </Text>
      {failed && <Text color="#ff6b6b">Failed: {failed.command}</Text>}
      {card.waitingSince !== null && <Text color="#ffd84d">Still waiting for your okay</Text>}
      <Box flexDirection="row">
        {failed?.isTest && (
          <Button
            key="welcome-fix"
            label="Fix failed test"
            variant="primary"
            onPress={async () => {
              await update($, away, () => null)
              await $.prompt.submit({ text: fixPrompt(failed.command) })
            }}
          />
        )}
        <Button key="welcome-dismiss" label="Got it" onPress={() => seen($)} />
      </Box>
    </Box>
  )
}
