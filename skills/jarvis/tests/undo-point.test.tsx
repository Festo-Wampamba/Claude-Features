import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

// The host is faked at its edges (files, processes); the mod and the engine kit are real.
type Ran = { exitCode: number; stdout: string; stderr: string }

const PANE = {
  plugin: 'jarvis',
  component: 'Pane',
  requestId: 'jarvis',
  surface: 'desktop',
  props: { title: 'Jarvis', isFocused: true, bodyColumns: 80, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

function hostAnswer(argv: readonly string[], isCopyBroken: boolean): Ran {
  const ok = { exitCode: 0, stdout: '', stderr: '' }
  if (argv[0] === 'du') return { ...ok, stdout: '12\t/work/photos-backup\n12\ttotal\n' }
  if (argv[0] === 'cp' && argv.includes('--parents') && isCopyBroken) {
    return { exitCode: 1, stdout: '', stderr: 'cp: error writing: No space left on device' }
  }
  // Three files inside the copied folder.
  if (argv[0] === 'find') return { ...ok, stdout: '...' }
  return ok
}

function fakeHost(on: On, isCopyBroken = false) {
  on('clock.now', () => ({ value: 1_764_000_000_000 }))
  on('store.get', () => ({ value: null }))
  on('store.set', () => ({ value: undefined }) as never)
  on('session.cwd', () => ({ value: '/work' }))
  on('process.hookEnv', () => ({ value: { CLAUDE_PLUGIN_DATA: '/data' } }))
  on('fs.stat', () => ({ value: { kind: 'directory', size: 0, mtimeMs: 0, isLink: false } }) as never)
  on('fs.exists', () => ({ value: true }))
  on('process.run', (_, e) => ({ value: hostAnswer(e.argv, isCopyBroken) }) as never)
  on('tool.call', () => ({ result: {} }) as never)
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
}

test('an rm -rf of a folder leaves a snapshot that counts every file in it', async ($, on) => {
  fakeHost(on)
  await $.tool.call({ tool: 'Bash', command: 'rm -rf photos-backup' })
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'tab-undo' })

  const row = await ui.find({ type: 'Text', text: /photos-backup/ })

  expect(row?.text).toContain('rm -rf photos-backup (3 files)')
})

test('when the snapshot fails, the delete is blocked and the reason is given', async ($, on) => {
  fakeHost(on, true)

  const ran = await $.tool.call({ tool: 'Bash', command: 'rm -rf photos-backup' })

  expect(ran.deny).toContain('No space left on device')
})

test('a command that changes no files runs without a snapshot', async ($, on) => {
  fakeHost(on)
  await $.tool.call({ tool: 'Bash', command: 'ls -la' })
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'tab-undo' })

  const empty = await ui.find({ type: 'Text', text: /No snapshots yet/ })

  expect(empty).toBeDefined()
})

test('/restore brings back the newest snapshot', async ($, on) => {
  fakeHost(on)
  await $.tool.call({ tool: 'Bash', command: 'rm -rf photos-backup' })

  const said = await $.command.run({ command: 'restore', args: '' } as never)

  expect(said.text).toBe('Restored 3 files from "rm -rf photos-backup".')
})

test('switched off in /jarvis, Undo Point no longer blocks', async ($, on) => {
  fakeHost(on, true)
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'switch-undo' })

  const ran = await $.tool.call({ tool: 'Bash', command: 'rm -rf photos-backup' })

  expect(ran.deny).toBeUndefined()
})
