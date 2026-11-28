import { atom, read, update } from 'claude-code'
import type { EngineInterface } from 'claude-code'

import type { DoctorReport, ModReport } from '../../types'
import { MODS, isModOn } from '../lib/state'
import type { Ui } from '../lib/state'

// Declared where it is read, so the engine can see which state this file touches.
const doctor = atom({ plugin: 'jarvis', key: 'doctor' } as const, null as DoctorReport | null, { shape: 'doctor-1' })
const enabled = atom({ plugin: 'jarvis', key: 'enabled' } as const, {} as Record<string, boolean>, { shape: 'enabled-1' })

const MAX_SOURCE_BYTES = 1_000_000

const CALL_RISKS: [RegExp, string, boolean][] = [
  [/^fs\.write$/, 'can change your files', true],
  [/^process\./, 'can run programs on your computer', true],
  [/^http\./, 'can reach the internet', true],
  [/^settings\./, 'can read your settings', true],
  [/^env\./, 'can read environment variables (keys live there)', true],
  [/^model\./, 'can spend your Claude usage', false],
  [/^session\.(messages|send)$/, 'can read or send messages', false],
  [/^fs\.read$/, 'can read your files', false],
  [/^shell$/, 'runs shell commands on events', true],
]

const EVENT_RISKS: [RegExp, string, boolean][] = [
  [/^tool\.(check|judge)$/, 'can approve or refuse actions for you', true],
  [/^tool\.call$|^classic\.PreToolUse$/, 'can block or rewrite what Claude does', true],
  [/^prompt\.submit$|^classic\.UserPromptSubmit$/, 'sees and can change what you send', false],
]

const WATCHES: Record<string, string> = {
  'tool.call': 'watch tool calls like file deletes',
  'classic.PreToolUse': 'watch tool calls like file deletes',
  'prompt.submit': 'change what you send',
  'turn.step': 'change model requests',
  'session.append': 'change the saved conversation',
}

export function risksOf(events: string[], calls: string[]): { text: string; isRisky: boolean }[] {
  const out = new Map<string, boolean>()
  for (const c of calls) for (const [re, text, isRisky] of CALL_RISKS) if (re.test(c)) out.set(text, isRisky)
  for (const ev of events) for (const [re, text, isRisky] of EVENT_RISKS) if (re.test(ev)) out.set(text, isRisky)
  return [...out].map(([text, isRisky]) => ({ text, isRisky }))
}

export function clashesOf(mods: ModReport[]): string[] {
  const byEvent = new Map<string, string[]>()
  for (const m of mods) {
    for (const ev of new Set(m.events)) {
      if (WATCHES[ev] !== undefined) byEvent.set(ev, [...(byEvent.get(ev) ?? []), m.name])
    }
  }
  return [...byEvent]
    .filter(([, owners]) => owners.length > 1)
    .map(([ev, owners]) => `${owners.join(' and ')} all ${WATCHES[ev]} (${ev}); they could fight over the same moment`)
}

export function scanSource(text: string): { events: string[]; calls: string[] } {
  const events = [...text.matchAll(/\bon\(\s*['"`]([\w.*:-]+)['"`]/g)].map(m => m[1]!)
  const calls = [...text.matchAll(/\$\.(\w+)\.(\w+)\s*\(/g)].map(m => `${m[1]}.${m[2]}`)
  return { events: [...new Set(events)], calls: [...new Set(calls)] }
}

async function found($: EngineInterface, argv: string[]): Promise<string[]> {
  const ran = await $.process.run(argv, { timeoutMs: 60_000 })
  return ran.stdout.split('\0').filter(Boolean)
}

async function inspect($: EngineInterface, root: string): Promise<ModReport | undefined> {
  const manifest = JSON.parse(await $.fs.read(`${root}/.claude-plugin/plugin.json`)) as { name?: string }
  const name = manifest.name ?? root.slice(root.lastIndexOf('/') + 1)
  const hooksFile = `${root}/hooks/hooks.json`
  if (!(await $.fs.exists(hooksFile))) return undefined
  const hooks = JSON.parse(await $.fs.read(hooksFile)) as { modules?: string[]; hooks?: Record<string, unknown> }
  if (hooks.hooks !== undefined && hooks.modules === undefined) {
    return { name, root, events: Object.keys(hooks.hooks).map(k => `classic.${k}`), calls: ['shell'], risks: [] }
  }
  const sources = await found($, [
    'find', `${root}/hooks`, '-type', 'f',
    '(', '-name', '*.ts', '-o', '-name', '*.tsx', '-o', '-name', '*.js', '-o', '-name', '*.mjs', ')',
    '-not', '-name', '*.d.ts', '-not', '-name', 'make-colors.js', '-print0',
  ])
  const events = new Set<string>()
  const calls = new Set<string>()
  for (const file of sources) {
    const stat = await $.fs.stat(file).catch(() => undefined)
    if (stat === undefined || stat.size > MAX_SOURCE_BYTES) continue
    const seen = scanSource(await $.fs.read(file))
    seen.events.forEach(ev => events.add(ev))
    seen.calls.forEach(c => calls.add(c))
  }
  return { name, root, events: [...events], calls: [...calls], risks: [] }
}

// Read only: lists every mod and hooked plugin under ~/.claude and what each can touch.
export async function scanMods($: EngineInterface): Promise<DoctorReport> {
  const home = (await $.env.get('HOME')) ?? ''
  const places = [`${home}/.claude/skills`, `${home}/.claude/dev-mods`, `${home}/.claude/plugins/cache`]
  const manifests = await found($, ['find', ...places, '-maxdepth', '6', '-path', '*/.claude-plugin/plugin.json', '-print0'])
  const byName = new Map<string, ModReport>()
  for (const manifest of manifests.sort()) {
    const root = manifest.slice(0, -'/.claude-plugin/plugin.json'.length)
    const report = await inspect($, root).catch(() => undefined)
    if (report === undefined) continue
    const risks = risksOf(report.events, report.calls).map(r => (r.isRisky ? `⚠ ${r.text}` : r.text))
    byName.set(report.name, { ...report, risks })
  }
  const mods = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
  return { at: await $.clock.now(), mods, clashes: clashesOf(mods) }
}

async function rescan($: EngineInterface) {
  const report = await scanMods($)
  await update($, doctor, () => report)
}

export async function doctorTab($: EngineInterface, ui: Ui) {
  const { Box, Button, Text } = ui
  const map = await read($, enabled)
  const report = await read($, doctor)
  return (
    <Box flexDirection="column">
      <Text bold>Jarvis mods</Text>
      {MODS.map(m => {
        const isOn = isModOn(map, m.id)
        return (
          <Box key={`doc-${m.id}`} flexDirection="row" justifyContent="space-between">
            <Text>{m.name}</Text>
            <Button
              key={`doc-switch-${m.id}`}
              label={isOn ? 'ON' : 'OFF'}
              variant={isOn ? 'primary' : 'secondary'}
              onPress={() => update($, enabled, current => ({ ...current, [m.id]: !isModOn(current, m.id) }))}
            />
          </Box>
        )
      })}
      <Button key="doc-scan" label="Scan mods" variant="primary" onPress={() => rescan($)} />
      {report !== null && (
        <Box flexDirection="column">
          <Text bold>{report.mods.length} installed mods and plugins with hooks</Text>
          {report.clashes.map(c => (
            <Text key={`clash-${c}`} color="#ffd84d">
              Possible clash: {c}
            </Text>
          ))}
          {report.mods.map(m => (
            <Box key={`mod-${m.name}`} flexDirection="column" borderStyle="round" paddingX={1}>
              <Text bold>{m.name}</Text>
              <Text dimColor wrap="truncate">
                {m.root}
              </Text>
              {m.risks.length === 0 ? (
                <Text dimColor>Nothing risky found</Text>
              ) : (
                m.risks.map(r => (
                  <Text key={`risk-${m.name}-${r}`} color={r.startsWith('⚠') ? '#ff6b6b' : undefined}>
                    {r}
                  </Text>
                ))
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
