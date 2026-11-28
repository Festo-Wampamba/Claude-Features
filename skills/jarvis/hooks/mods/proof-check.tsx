import { atom, read, update } from 'claude-code'
import type { Args, EngineInterface, EventResult } from 'claude-code'

import type { Unverified } from '../../types'
import { isOn, quietly } from '../lib/state'
import type { Step, Ui } from '../lib/state'
import { isBrowserTool, isCheckCommand, isCodeFile } from '../lib/text'

// Declared where it is read, so the engine can see which state this file touches.
const unverified = atom({ plugin: 'jarvis', key: 'unverified' } as const, null as Unverified | null, { shape: 'unverified-1' })

const EDIT_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])

// Per turn of the main conversation; a reload mid-turn starts the count over.
let changed = new Set<string>()
let isChecked = false

export function unverifiedLine(files: string[]): string {
  const names = files.map(f => f.slice(f.lastIndexOf('/') + 1))
  const shown = names.length > 3 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.join(', ')
  return `Unverified: changed ${shown} but ran no test, build or browser check`
}

export function verifyPrompt(files: string[]): string {
  return `Go back and check your work on ${files.join(', ')}. Run a test, a build or a browser check that proves it works, then tell me what you ran and what it showed.`
}

export async function proofPromptSubmit($: EngineInterface, e: Args<'prompt.submit'>, next: Step<'prompt.submit'>) {
  if (e.isMeta !== true) {
    changed = new Set()
    isChecked = false
    await quietly(() => update($, unverified, () => null))
  }
  return next(e)
}

export async function proofToolCall(
  $: EngineInterface,
  e: Args<'tool.call'>,
  next: Step<'tool.call'>,
): Promise<EventResult<'tool.call'>> {
  const ran = await next(e)
  const tool = String(e.tool)
  const input = e as unknown as Record<string, unknown>
  if (ran.deny !== undefined) return ran
  if (EDIT_TOOLS.has(tool) && ran.isError !== true) {
    const path = String(input.file_path ?? input.notebook_path ?? '')
    if (isCodeFile(path)) changed.add(path)
  } else if (tool === 'Bash' && isCheckCommand(String(input.command ?? ''))) {
    isChecked = true
  } else if (isBrowserTool(tool)) {
    isChecked = true
  }
  return ran
}

export async function proofTurnComplete($: EngineInterface, e: Args<'turn.complete'>, next: Step<'turn.complete'>) {
  const done = await next(e)
  if (e.agentId !== undefined) return done
  await quietly(async () => {
    const needsProof = changed.size > 0 && !isChecked && (await isOn($, 'proof'))
    const at = await $.clock.now()
    await update($, unverified, () => (needsProof ? { files: [...changed], at } : null))
  })
  return done
}

export async function proofBand($: EngineInterface, ui: Ui) {
  const flagged = await read($, unverified)
  if (flagged === null) return null
  const { Box, Button, Text } = ui
  return (
    <Box flexDirection="row" justifyContent="space-between">
      <Text color="#ffb347" wrap="truncate">
        ⚠ {unverifiedLine(flagged.files)}
      </Text>
      <Button
        key="proof-verify"
        label="Verify now"
        variant="primary"
        onPress={async () => {
          await update($, unverified, () => null)
          await $.prompt.submit({ text: verifyPrompt(flagged.files) })
        }}
      />
    </Box>
  )
}
