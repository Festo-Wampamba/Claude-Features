import { atom, read, update } from 'claude-code'
import type { EngineInterface, On } from 'claude-code'

import { MODS, isModOn } from './lib/state'
import type { Render, Step, Ui } from './lib/state'
import { contextTab, contextToolCall, contextTurnComplete } from './mods/context-xray'
import { heistBand, heistCommand, heistMeasure, heistSessionStart, heistToolCall } from './mods/heist-skin'
import { missionModelFor, missionSessionStart, missionTab, missionTurnStart } from './mods/mission-control'
import { doctorTab } from './mods/mod-doctor'
import { pipBand, pipNotification, pipSessionStart, pipToolCall, pipTurnComplete } from './mods/pip'
import { proofBand, proofPromptSubmit, proofToolCall, proofTurnComplete } from './mods/proof-check'
import { rulesBand, rulesPromptSubmit } from './mods/rule-keeper'
import { slopAssistant, slopTab, slopToolCall } from './mods/slop-spotter'
import { streamAssistant, streamPromptSubmit, streamSessionStart, streamToolUse, streamUser } from './mods/stream-safe'
import { blockMessage, undoRestoreCommand, undoSessionStart, undoTab, undoToolCall } from './mods/undo-point'
import { welcomeBand, welcomeNotification, welcomePromptSubmit, welcomeSessionStart, welcomeToolCall } from './mods/welcome-back'

// Declared where it is read, so the engine can see which state this file touches.
const enabled = atom({ plugin: 'jarvis', key: 'enabled' } as const, {} as Record<string, boolean>, { shape: 'enabled-1' })
const tab = atom({ plugin: 'jarvis', key: 'tab' } as const, 'mods')

export const PANE = 'jarvis'

// The panel's tabs: the Jarvis cards, then one per mod that has a tab.
export const TABS = [
  { id: 'mods', label: 'Jarvis', mod: undefined },
  { id: 'undo', label: 'Undo', mod: 'undo' },
  { id: 'agents', label: 'Agents', mod: 'mission' },
  { id: 'writing', label: 'Writing', mod: 'slop' },
  { id: 'context', label: 'Context', mod: 'context' },
  { id: 'doctor', label: 'Mods', mod: 'doctor' },
] as const

function cards($: EngineInterface, ui: Ui, map: Record<string, boolean>) {
  const { Box, Button, Text } = ui
  return (
    <Box flexDirection="column">
      {MODS.map(m => {
        const isOn = isModOn(map, m.id)
        return (
          <Box key={`card-${m.id}`} borderStyle="round" flexDirection="row" justifyContent="space-between" paddingX={1}>
            <Box flexDirection="column" flexShrink={1}>
              <Text bold>{m.name}</Text>
              <Text dimColor>{m.blurb}</Text>
            </Box>
            <Button
              key={`switch-${m.id}`}
              label={isOn ? 'ON' : 'OFF'}
              variant={isOn ? 'primary' : 'secondary'}
              onPress={() => update($, enabled, current => ({ ...current, [m.id]: !isModOn(current, m.id) }))}
            />
          </Box>
        )
      })}
    </Box>
  )
}

async function drawTab($: EngineInterface, ui: Ui, id: string, now: number, map: Record<string, boolean>) {
  if (id === 'undo') return undoTab($, ui, now)
  if (id === 'agents') return missionTab($, ui)
  if (id === 'writing') return slopTab($, ui)
  if (id === 'context') return contextTab($, ui)
  if (id === 'doctor') return doctorTab($, ui)
  return cards($, ui, map)
}

// The row above the chat box: each switched-on mod's part, top to bottom.
async function bandParts($: EngineInterface, ui: Ui, now: number, map: Record<string, boolean>) {
  const parts = [
    isModOn(map, 'heist') ? await heistBand($, ui, now) : null,
    isModOn(map, 'welcome') ? await welcomeBand($, ui) : null,
    isModOn(map, 'proof') ? await proofBand($, ui) : null,
    isModOn(map, 'rules') ? await rulesBand($, ui) : null,
    isModOn(map, 'pip') ? await pipBand($, ui, now) : null,
  ]
  return parts.filter(part => part !== null && part !== undefined)
}

export function statusLine(map: Record<string, boolean>): string {
  const active = MODS.filter(m => isModOn(map, m.id))
  const names = active.filter(m => m.id !== 'stream').map(m => m.name)
  const prefix = isModOn(map, 'stream') ? 'Stream Safe ON · ' : ''
  return `${prefix}Jarvis ${active.length}/${MODS.length} on: ${names.join(' · ')} · /jarvis`
}

// A mod may hook each event once without a matcher, so every event the mods
// share is hooked here once and handed down each mod's handler in turn.
export function registerCore(on: On) {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'jarvis',
      description: 'Open the Jarvis panel: every mod with its on/off switch, plus their tabs',
      argumentHint: '[tab]',
    })
    return undoSessionStart($, e, a =>
      streamSessionStart($, a, b =>
        welcomeSessionStart($, b, c => missionSessionStart($, c, d => pipSessionStart($, d, f => heistSessionStart($, f, next)))),
      ),
    )
  })

  // Undo Point runs first: it is the guard, and a guard that fails blocks.
  on('tool.call', ($, e, next) =>
    undoToolCall($, e, a =>
      proofToolCall($, a, b =>
        welcomeToolCall($, b, c => slopToolCall($, c, d => contextToolCall($, d, f => pipToolCall($, f, g => heistToolCall($, g, next))))),
      ),
    ),
  ).catch(($, e, next) => (next.called ? next(e) : { deny: blockMessage('its own check failed') }))

  on('prompt.submit', ($, e, next) =>
    proofPromptSubmit($, e, a => streamPromptSubmit($, a, b => welcomePromptSubmit($, b, c => rulesPromptSubmit($, c, next)))),
  )
  on('turn.start', ($, e, next) => missionTurnStart($, e, next))
  on('turn.complete', ($, e, next) => proofTurnComplete($, e, a => contextTurnComplete($, a, b => pipTurnComplete($, b, next))))
  on('classic.Notification', ($, e, next) => welcomeNotification($, e, a => pipNotification($, a, next)))
  on('session.measure', ($, e, next) => heistMeasure($, e, next))

  // Stream Safe masks a reply before Slop Spotter marks it.
  on('ui.render', { component: 'AssistantMessage' }, ($, e, next) =>
    slopAssistant($, e, a => streamAssistant($, a as Render<'AssistantMessage'>, next as Step<'ui.render'>)),
  )
  on('ui.render', { component: 'UserMessage' }, ($, e, next) => streamUser($, e, next as Step<'ui.render'>))
  on('ui.render', { component: 'ToolUse' }, ($, e, next) => streamToolUse($, e, next as Step<'ui.render'>))

  on('command.run', { command: 'restore' }, ($, e) => undoRestoreCommand($, e))
  on('command.run', { command: 'heist' }, $ => heistCommand($))

  // Mission Control's model switch: a helper's next request goes to the model picked for it.
  on('turn.step', async function* ($, e, next) {
    const model = await missionModelFor($, e.agentId)
    return yield* next(model === undefined ? e : { ...e, model })
  })

  on('command.run', { command: 'jarvis' }, async ($, e) => {
    const want = e.args.trim().toLowerCase()
    const match = TABS.find(t => t.id === want || t.label.toLowerCase() === want)
    if (match !== undefined) await update($, tab, () => match.id)
    await $.ui.open({ id: PANE, title: 'Jarvis' })
    return { text: 'Jarvis panel opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e) as Ui
    const { Box, Button } = ui
    const map = await read($, enabled)
    const shown = TABS.filter(t => t.mod === undefined || isModOn(map, t.mod))
    const wanted = await read($, tab)
    const active = shown.some(t => t.id === wanted) ? wanted : 'mods'
    const body = await drawTab($, ui, active, await $.clock.now(), map)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          {shown.map(t => (
            <Button
              key={`tab-${t.id}`}
              label={t.label}
              variant={t.id === active ? 'primary' : 'secondary'}
              onPress={() => update($, tab, () => t.id)}
            />
          ))}
        </Box>
        {body}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const ui = $.ui.resolve(e) as Ui
    const { Box, Text } = ui
    const map = await read($, enabled)
    const parts = await bandParts($, ui, await $.clock.now(), map)
    return (
      <Box flexDirection="column">
        {parts}
        <Text dimColor wrap="truncate">
          {statusLine(map)}
        </Text>
      </Box>
    )
  })
}
