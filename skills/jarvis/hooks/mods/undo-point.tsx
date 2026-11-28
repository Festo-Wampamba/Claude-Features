import { atom, read, update } from 'claude-code'
import type { Args, EngineInterface, EventResult } from 'claude-code'

import type { Snapshot } from '../../types'
import { absolute, expand, isRisky, isSafeGlob, plan, variablesIn } from '../lib/shell'
import type { Plan } from '../lib/shell'
import { ago, isOn, quietly } from '../lib/state'
import type { Step, Ui } from '../lib/state'

// Declared where it is read, so the engine can see which state this file touches.
const snapshots = atom({ plugin: 'jarvis', key: 'snapshots' } as const, [] as Snapshot[], { shape: 'snapshots-1' })

const LIMIT_BYTES = 1024 ** 3
const KEEP = 100
const COPY_TIMEOUT_MS = 120_000
const FILE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit'])

type Taken = { snapshot: Snapshot } | { error: string }

export function filesLabel(n: number): string {
  return `${n} ${n === 1 ? 'file' : 'files'}`
}

export function blockMessage(reason: string): string {
  return `Undo Point blocked this because it couldn't save a snapshot first: ${reason}. Nothing was changed. Use plain file paths, or switch Undo Point off in /jarvis to run it anyway.`
}

function firstLine(text: string): string {
  return text.trim().split('\n')[0] ?? ''
}

// Drops paths that sit inside another listed path; cp copies them with it.
export function outermost(paths: string[]): string[] {
  const unique = [...new Set(paths)].sort()
  return unique.filter(p => !unique.some(q => q !== p && p.startsWith(`${q}/`)))
}

function triggerOf(command: string): string {
  const line = command.trim().split('\n')[0] ?? command
  return line.length > 60 ? `${line.slice(0, 57)}...` : line
}

export function pick(list: Snapshot[], arg: string): Snapshot | undefined {
  if (arg === '') return list[0]
  const n = Number(arg)
  if (Number.isInteger(n) && n >= 1) return list[n - 1]
  return list.find(s => s.id === arg)
}

async function dataDir($: EngineInterface): Promise<string> {
  const env = await $.process.hookEnv()
  const dir = env.CLAUDE_PLUGIN_DATA
  if (!dir) throw new Error('Claude Code gave Jarvis no data folder')
  return dir
}

async function nulList($: EngineInterface, argv: string[], cwd: string): Promise<string[] | string> {
  const ran = await $.process.run(argv, { cwd })
  if (ran.exitCode !== 0) return firstLine(ran.stderr) || `${argv[0]} failed`
  return ran.stdout.split('\0').filter(Boolean)
}

// The variables a command's paths may use; any other one makes Undo Point block rather than guess.
async function shellEnv($: EngineInterface, cwd: string): Promise<Record<string, string | undefined>> {
  return {
    HOME: await $.env.get('HOME'),
    TMPDIR: await $.env.get('TMPDIR'),
    USER: await $.env.get('USER'),
    XDG_CONFIG_HOME: await $.env.get('XDG_CONFIG_HOME'),
    XDG_CACHE_HOME: await $.env.get('XDG_CACHE_HOME'),
    XDG_DATA_HOME: await $.env.get('XDG_DATA_HOME'),
    PWD: cwd,
  }
}

export async function resolveTargets($: EngineInterface, p: Plan, cwd: string): Promise<{ paths: string[]; problem?: string }> {
  const texts = [...p.targets.flatMap(t => [t.path, t.cwd]), ...p.finds.map(f => f.cwd)]
  const env = texts.some(t => variablesIn(t).length > 0) ? await shellEnv($, cwd) : {}
  const dirOf = (raw: string) => absolute(expand(raw, env) ?? raw, cwd)
  const paths: string[] = []

  for (const t of p.targets) {
    const text = expand(t.path, env)
    if (text === undefined) return { paths, problem: `it can't tell which file ${t.path} names` }
    const dir = dirOf(t.cwd)
    if (t.hasGlob) {
      if (!isSafeGlob(text)) return { paths, problem: `the pattern ${t.path} is too complex to expand safely` }
      const script = `for f in ${text}; do printf '%s\\0' "$f"; done`
      const found = await nulList($, ['bash', '-O', 'nullglob', '-O', 'dotglob', '-c', script], dir)
      if (typeof found === 'string') return { paths, problem: found }
      paths.push(...found.map(f => absolute(f, dir)))
      continue
    }
    const abs = absolute(text, dir)
    const stat = await $.fs.stat(abs).catch(() => undefined)
    if (stat === undefined) continue
    if (t.isOnlyIfFile && stat.kind !== 'file') continue
    paths.push(abs)
  }

  for (const f of p.finds) {
    const dir = dirOf(f.cwd)
    const found = await nulList($, ['find', ...f.args, '-print0'], dir)
    if (typeof found === 'string') return { paths, problem: found }
    paths.push(...found.map(x => absolute(x, dir)))
  }

  for (const g of p.gitCleans) {
    const dir = dirOf(g.cwd)
    const flags = g.args
      .map(a => (/^-[a-zA-Z]+$/.test(a) ? a.replace(/f/g, '') : a))
      .filter(a => a !== '-' && a !== '--force')
    const ran = await $.process.run(['git', 'clean', '-n', ...flags], { cwd: dir })
    if (ran.exitCode !== 0) return { paths, problem: firstLine(ran.stderr) || 'git clean -n failed' }
    for (const line of ran.stdout.split('\n')) {
      const m = /^Would remove (.+)$/.exec(line)
      if (m) paths.push(absolute(m[1]!, dir))
    }
  }

  for (const raw of p.gitResets) {
    const top = await $.process.run(['git', 'rev-parse', '--show-toplevel'], { cwd: dirOf(raw) })
    if (top.exitCode !== 0) return { paths, problem: firstLine(top.stderr) || 'not a git repository' }
    const root = top.stdout.trim()
    const changed = await nulList($, ['git', 'diff', '--name-only', '-z', 'HEAD'], root)
    if (typeof changed === 'string') return { paths, problem: changed }
    for (const rel of changed) {
      const abs = absolute(rel, root)
      if (await $.fs.exists(abs)) paths.push(abs)
    }
  }

  return { paths: outermost(paths) }
}

export async function takeSnapshot($: EngineInterface, paths: string[], trigger: string): Promise<Taken> {
  try {
    const data = await dataDir($)
    const kept = paths.filter(p => !p.startsWith(`${data}/`))
    if (kept.length === 0) return { error: 'there was nothing outside its own backups to save' }
    const size = await $.process.run(['du', '-sbc', '--', ...kept])
    if (size.exitCode !== 0) return { error: firstLine(size.stderr) || 'it could not measure the files' }
    const total = Number(size.stdout.trim().split('\n').at(-1)?.split('\t')[0] ?? 'NaN')
    if (!Number.isFinite(total)) return { error: 'it could not measure the files' }
    if (total > LIMIT_BYTES) return { error: `the files add up to ${(total / LIMIT_BYTES).toFixed(1)} GB, over its 1 GB limit` }

    const at = await $.clock.now()
    const id = `${at}-${Math.random().toString(36).slice(2, 6)}`
    const dir = `${data}/undo/${id}`
    const made = await $.process.run(['mkdir', '-p', `${dir}/files`])
    if (made.exitCode !== 0) return { error: firstLine(made.stderr) || 'it could not make its backup folder' }
    const copied = await $.process.run(['cp', '-a', '--parents', '--', ...kept, `${dir}/files`], { timeoutMs: COPY_TIMEOUT_MS })
    if (copied.exitCode !== 0) return { error: firstLine(copied.stderr) || 'the copy failed' }
    const counted = await $.process.run(['find', `${dir}/files`, '-mindepth', '1', '(', '-type', 'f', '-o', '-type', 'l', ')', '-printf', '.'])
    if (counted.exitCode !== 0) return { error: firstLine(counted.stderr) || 'it could not count the copy' }

    const snapshot: Snapshot = { id, at, trigger, paths: kept, fileCount: counted.stdout.length, dir }
    const old = await read($, snapshots)
    const list = [snapshot, ...old].slice(0, KEEP)
    await update($, snapshots, () => list)
    // The copy is safe on disk; failing to remember it for later sessions must not block the action.
    await quietly(() => $.store.set('snapshots', list))
    for (const gone of old.slice(KEEP - 1)) {
      if (gone.dir.startsWith(`${data}/undo/`)) await $.process.run(['rm', '-rf', '--', gone.dir])
    }
    return { snapshot }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

export async function restore($: EngineInterface, snapshot: Snapshot): Promise<string> {
  const present: string[] = []
  for (const p of snapshot.paths) if (await $.fs.exists(p)) present.push(p)
  if (present.length > 0) {
    const before = await takeSnapshot($, present, `before restoring "${snapshot.trigger}"`)
    if ('error' in before) return `Restore stopped: ${before.error}, so the current files were left alone.`
  }
  for (const p of snapshot.paths) {
    const src = `${snapshot.dir}/files${p}`
    if (!(await $.fs.exists(src))) continue
    const parent = p.slice(0, p.lastIndexOf('/')) || '/'
    await $.process.run(['mkdir', '-p', '--', parent])
    const copied = await $.process.run(['cp', '-a', '--', src, `${parent}/`], { timeoutMs: COPY_TIMEOUT_MS })
    if (copied.exitCode !== 0) return `Restore failed for ${p}: ${firstLine(copied.stderr)}`
  }
  return `Restored ${filesLabel(snapshot.fileCount)} from "${snapshot.trigger}".`
}

export async function undoSessionStart($: EngineInterface, e: Args<'session.start'>, next: Step<'session.start'>) {
  await $.command.register({
    name: 'restore',
    description: 'Undo Point: restore the newest snapshot, or `/restore 2`, `/restore list`',
    argumentHint: '[number|list]',
  })
  const stored = await $.store.get('snapshots')
  if (Array.isArray(stored) && (await read($, snapshots)).length === 0) await update($, snapshots, () => stored as Snapshot[])
  return next(e)
}

// The guard: snapshot first, run second, block when the snapshot can't be made.
export async function undoToolCall(
  $: EngineInterface,
  e: Args<'tool.call'>,
  next: Step<'tool.call'>,
): Promise<EventResult<'tool.call'>> {
  const tool = String(e.tool)
  if (tool !== 'Bash' && !FILE_TOOLS.has(tool)) return next(e)
  if (!(await isOn($, 'undo'))) return next(e)
  const input = e as unknown as Record<string, unknown>
  const cwd = await $.session.cwd()

  if (tool === 'Bash') {
    const command = String(input.command ?? '')
    const p = plan(command, cwd)
    if (!isRisky(p)) return next(e)
    if (p.unresolved.length > 0) return { deny: blockMessage(`${p.unresolved[0]}, so it can't tell which files will go`) }
    const { paths, problem } = await resolveTargets($, p, cwd)
    if (problem !== undefined) return { deny: blockMessage(problem) }
    if (paths.length === 0) return next(e)
    const taken = await takeSnapshot($, paths, triggerOf(command))
    return 'error' in taken ? { deny: blockMessage(taken.error) } : next(e)
  }

  const target = String(input.file_path ?? input.notebook_path ?? '')
  if (target === '') return next(e)
  const abs = absolute(target, cwd)
  if (!(await $.fs.exists(abs))) return next(e)
  const taken = await takeSnapshot($, [abs], `${tool} ${abs.slice(abs.lastIndexOf('/') + 1)}`)
  return 'error' in taken ? { deny: blockMessage(taken.error) } : next(e)
}

export async function undoRestoreCommand($: EngineInterface, e: Args<'command.run'>): Promise<EventResult<'command.run'>> {
  const list = await read($, snapshots)
  const arg = e.args.trim()
  if (list.length === 0) return { text: 'Undo Point has no snapshots yet.' }
  if (arg === 'list') {
    const now = await $.clock.now()
    const lines = list.slice(0, 20).map((s, i) => `${i + 1}. ${s.trigger} (${filesLabel(s.fileCount)}), ${ago(now - s.at)} ago`)
    return { text: `Snapshots, newest first:\n${lines.join('\n')}\n\nRestore one with /restore <number>.` }
  }
  const chosen = pick(list, arg)
  if (chosen === undefined) return { text: `No snapshot "${arg}". Try /restore list.` }
  return { text: await restore($, chosen) }
}

export async function undoTab($: EngineInterface, ui: Ui, now: number) {
  const { Box, Button, Text } = ui
  const list = await read($, snapshots)
  if (list.length === 0) return <Text dimColor>No snapshots yet. Undo Point saves one before every delete, move or overwrite.</Text>
  return (
    <Box flexDirection="column">
      <Text dimColor>{list.length} snapshots, newest first</Text>
      {list.slice(0, 30).map(s => (
        <Box key={`snap-${s.id}`} flexDirection="row" justifyContent="space-between">
          <Text wrap="truncate">
            {s.trigger} ({filesLabel(s.fileCount)}) <Text dimColor>{ago(now - s.at)} ago</Text>
          </Text>
          <Button
            key={`restore-${s.id}`}
            label="Restore"
            onPress={async () => {
              $.ui.toast(await restore($, s))
            }}
          />
        </Box>
      ))}
    </Box>
  )
}
