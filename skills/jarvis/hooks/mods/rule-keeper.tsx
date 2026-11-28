import { atom, read, update } from 'claude-code'
import type { Args, EngineInterface } from 'claude-code'

import type { RuleOffer } from '../../types'
import { isOn, quietly } from '../lib/state'
import type { Step, Ui } from '../lib/state'
import { appendRule, isCorrection, isSameCorrection, toRule } from '../lib/text'

// Declared where it is read, so the engine can see which state this file touches.
const ruleOffer = atom({ plugin: 'jarvis', key: 'ruleOffer' } as const, null as RuleOffer | null, { shape: 'rule-1' })

type Correction = { text: string; at: number }

const KEEP = 50

export async function saveRule($: EngineInterface, rule: string): Promise<string> {
  const home = await $.env.get('HOME')
  if (!home) return 'Rule Keeper could not find your home folder, so nothing was saved.'
  const path = `${home}/.claude/CLAUDE.md`
  const current = await $.fs.read(path).catch(() => '')
  const next = appendRule(current, rule)
  if (next !== current) await $.fs.write(path, next)
  const saved = ((await $.store.get('savedRules')) as string[] | null) ?? []
  await $.store.set('savedRules', [...saved, rule])
  return `Saved to ~/.claude/CLAUDE.md: ${rule}`
}

async function watch($: EngineInterface, text: string) {
  const past = ((await $.store.get('corrections')) as Correction[] | null) ?? []
  const saved = ((await $.store.get('savedRules')) as string[] | null) ?? []
  const isRepeat = past.some(c => isSameCorrection(c.text, text))
  const isSaved = saved.some(r => isSameCorrection(r, text))
  await $.store.set('corrections', [...past, { text, at: await $.clock.now() }].slice(-KEEP))
  if (isRepeat && !isSaved) await update($, ruleOffer, () => ({ rule: toRule(text) }))
}

export async function rulesPromptSubmit($: EngineInterface, e: Args<'prompt.submit'>, next: Step<'prompt.submit'>) {
  if (e.isMeta !== true && isCorrection(e.text) && (await isOn($, 'rules'))) await quietly(() => watch($, e.text))
  return next(e)
}

export async function rulesBand($: EngineInterface, ui: Ui) {
  const offer = await read($, ruleOffer)
  if (offer === null) return null
  const { Box, Button, Text } = ui
  return (
    <Box flexDirection="row" justifyContent="space-between">
      <Text color="#82aaff" wrap="truncate">
        You've corrected this twice: "{offer.rule}" Save it as a rule?
      </Text>
      <Box flexDirection="row">
        <Button
          key="rule-save"
          label="Save to CLAUDE.md"
          variant="primary"
          onPress={async () => {
            await update($, ruleOffer, () => null)
            $.ui.toast(await saveRule($, offer.rule))
          }}
        />
        <Button key="rule-dismiss" label="Not now" onPress={() => update($, ruleOffer, () => null)} />
      </Box>
    </Box>
  )
}
