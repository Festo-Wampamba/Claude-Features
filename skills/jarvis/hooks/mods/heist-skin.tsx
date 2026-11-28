import { atom, read, update } from 'claude-code'
import type { Args, EngineInterface, EventResult, ThemeSetArgs } from 'claude-code'

import { makeColors } from '../lib/make-colors.js'
import { isOn, quietly, usd } from '../lib/state'
import type { Step, Ui } from '../lib/state'
import { isTestRun } from '../lib/text'

// Declared where it is read, so the engine can see which state this file touches.
const bannerUntil = atom({ plugin: 'jarvis', key: 'bannerUntil' } as const, 0)
const isHeist = atom({ plugin: 'jarvis', key: 'isHeist' } as const, false)
const spent = atom({ plugin: 'jarvis', key: 'spent' } as const, 0)

const BANNER_MS = 8_000

// An original neon crime-thriller look: violet night, hot pink and a sunset glow.
const { theme } = makeColors({
  label: 'Heist neon',
  only: 'dark',
  roles: { accent: '#ff2d95', danger: '#ff4757', success: '#39ff88', warning: '#ffb347', pro: '#b967ff' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#140a1f',
        'surface-1': '#1d0f2c',
        'surface-2': '#271539',
        'surface-3': '#311b46',
        'text-primary': '#fdf0ff',
        'text-secondary': '#e0c3f0',
        'text-muted': '#b18cc8',
      },
    },
  },
})

const LOOK: ThemeSetArgs = {
  colors: theme,
  overrideColorScheme: 'dark',
  backdrop: { gradient: { stops: ['#140a1f', '#2e0c3a', '#5a1838'] } },
}

async function wear($: EngineInterface, isWorn: boolean): Promise<string> {
  await update($, isHeist, () => isWorn)
  await $.store.set('heist', isWorn)
  if (!isWorn) {
    await $.theme.clear()
    return 'Heist Skin off.'
  }
  const set = await $.theme.set(LOOK)
  return set.isDrawn ? 'Heist Skin on. Pass a test for a JOB COMPLETE.' : `Heist Skin on, but this screen can't paint it: ${set.reason}`
}

async function celebrate($: EngineInterface) {
  if (!(await read($, isHeist))) return
  const at = await $.clock.now()
  await update($, bannerUntil, () => at + BANNER_MS)
  $.clock.after(BANNER_MS, () => void quietly(() => update($, bannerUntil, () => 0)))
}

export async function heistSessionStart($: EngineInterface, e: Args<'session.start'>, next: Step<'session.start'>) {
  await $.command.register({ name: 'heist', description: 'Heist Skin: turn the neon crime-thriller look on or off' })
  if ((await $.store.get('heist')) === true && (await isOn($, 'heist'))) await quietly(() => wear($, true))
  return next(e)
}

export async function heistCommand($: EngineInterface): Promise<EventResult<'command.run'>> {
  if (!(await isOn($, 'heist'))) return { text: 'Heist Skin is switched off in /jarvis. Switch it on there first.' }
  return { text: await wear($, !(await read($, isHeist))) }
}

export async function heistMeasure($: EngineInterface, e: Args<'session.measure'>, next: Step<'session.measure'>) {
  const usdNow = e.cost?.usd
  if (usdNow !== undefined) await quietly(() => update($, spent, () => usdNow))
  return next(e)
}

export async function heistToolCall($: EngineInterface, e: Args<'tool.call'>, next: Step<'tool.call'>): Promise<EventResult<'tool.call'>> {
  const ran = await next(e)
  const command = String((e as unknown as Record<string, unknown>).command ?? '')
  const isPass = String(e.tool) === 'Bash' && ran.deny === undefined && ran.isError !== true && isTestRun(command)
  if (isPass) await quietly(() => celebrate($))
  return ran
}

export async function heistBand($: EngineInterface, ui: Ui, now: number) {
  if (!(await read($, isHeist))) return null
  const { Box, Text } = ui
  const isBanner = (await read($, bannerUntil)) > now
  return (
    <Box flexDirection="column">
      {isBanner && (
        <Box borderStyle="double" borderColor="#ff2d95" justifyContent="center">
          <Text bold color="#ff2d95">
            ★ ★ ★ JOB COMPLETE ★ ★ ★
          </Text>
        </Box>
      )}
      <Text color="#39ff88" bold>
        {usd(await read($, spent))} on the meter this chat
      </Text>
    </Box>
  )
}
