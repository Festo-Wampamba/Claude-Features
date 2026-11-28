// Works out which paths a shell command deletes, moves or saves over, without
// running it. Anything it can't pin down lands in `unresolved`, and Undo Point
// blocks the command rather than guess.

export type Target = { path: string; cwd: string; isOnlyIfFile: boolean; hasGlob: boolean }

export type Plan = {
  targets: Target[]
  finds: { cwd: string; args: string[] }[]
  gitCleans: { cwd: string; args: string[] }[]
  gitResets: string[]
  unresolved: string[]
}

type Word = { text: string; hasGlob: boolean; hasSubst: boolean }
type Simple = { words: Word[]; redirects: Word[] }

const SEPARATORS = new Set(['\n', ';', '|', '&', '(', ')'])
const WRAPPERS = new Set(['sudo', 'doas', 'command', 'builtin', 'nohup', 'time', 'nice', 'exec', 'env'])
const DELETERS = new Set(['rm', 'unlink', 'shred', 'rmdir', 'srm', 'trash', 'trash-put'])
const DESTRUCTIVE_WORD = /\b(rm|mv|cp|unlink|shred|truncate|dd)\b/

export function emptyPlan(): Plan {
  return { targets: [], finds: [], gitCleans: [], gitResets: [], unresolved: [] }
}

export function isRisky(plan: Plan): boolean {
  return (
    plan.targets.length + plan.finds.length + plan.gitCleans.length + plan.gitResets.length + plan.unresolved.length > 0
  )
}

function closing(cmd: string, from: number, open: string, close: string): number {
  let depth = 0
  for (let i = from; i < cmd.length; i++) {
    if (cmd[i] === open) depth++
    if (cmd[i] === close && --depth === 0) return i
  }
  return cmd.length - 1
}

export function tokenize(cmd: string): Simple[] {
  const out: Simple[] = []
  let cur: Simple = { words: [], redirects: [] }
  let word: Word | null = null
  let pending: 'redirect' | 'skip' | null = null
  const open = (): Word => (word ??= { text: '', hasGlob: false, hasSubst: false })
  const push = () => {
    if (word === null) return
    if (pending === 'redirect') cur.redirects.push(word)
    else if (pending === null) cur.words.push(word)
    pending = null
    word = null
  }
  const end = () => {
    push()
    if (cur.words.length + cur.redirects.length > 0) out.push(cur)
    cur = { words: [], redirects: [] }
  }

  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i]!
    if (c === '\\') {
      open().text += cmd[i + 1] ?? ''
      i++
    } else if (c === "'") {
      const j = cmd.indexOf("'", i + 1)
      const stop = j < 0 ? cmd.length : j
      open().text += cmd.slice(i + 1, stop)
      i = stop
    } else if (c === '"') {
      const w = open()
      let j = i + 1
      while (j < cmd.length && cmd[j] !== '"') {
        if (cmd[j] === '\\' && j + 1 < cmd.length) {
          w.text += cmd[j + 1]
          j += 2
          continue
        }
        if (cmd[j] === '`' || (cmd[j] === '$' && cmd[j + 1] === '(')) w.hasSubst = true
        w.text += cmd[j]
        j++
      }
      i = j
    } else if (c === '$' && cmd[i + 1] === '(') {
      const j = closing(cmd, i + 1, '(', ')')
      const w = open()
      w.text += cmd.slice(i, j + 1)
      w.hasSubst = true
      i = j
    } else if (c === '`') {
      const j = cmd.indexOf('`', i + 1)
      const stop = j < 0 ? cmd.length - 1 : j
      const w = open()
      w.text += cmd.slice(i, stop + 1)
      w.hasSubst = true
      i = stop
    } else if (c === '#' && word === null) {
      const j = cmd.indexOf('\n', i)
      i = j < 0 ? cmd.length : j - 1
    } else if (c === ' ' || c === '\t') {
      push()
    } else if (c === '>' || (c === '&' && cmd[i + 1] === '>')) {
      if (word !== null && /^\d+$/.test((word as Word).text)) word = null
      push()
      if (c === '&') i++
      const next = cmd[i + 1]
      if (next === '>' || next === '&') {
        pending = 'skip'
        i++
      } else {
        if (next === '|') i++
        pending = 'redirect'
      }
    } else if (c === '<') {
      push()
      pending = 'skip'
    } else if (SEPARATORS.has(c)) {
      end()
    } else {
      if (c === '*' || c === '?' || c === '[') open().hasGlob = true
      open().text += c
    }
  }
  end()
  return out
}

function base(text: string): string {
  return text.slice(text.lastIndexOf('/') + 1)
}

function join(dir: string, name: string): string {
  if (name.startsWith('/') || name.startsWith('~')) return name
  return `${dir.replace(/\/+$/, '')}/${name}`
}

// Splits options from operands; `valued` lists short options that take the next word.
function operands(args: Word[], valued = ''): { ops: Word[]; opts: Map<string, string> } {
  const ops: Word[] = []
  const opts = new Map<string, string>()
  let isDone = false
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!
    if (isDone || !a.text.startsWith('-') || a.text === '-') {
      ops.push(a)
    } else if (a.text === '--') {
      isDone = true
    } else if (a.text.startsWith('--')) {
      const [k, v] = a.text.split('=', 2)
      opts.set(k!, v ?? '')
    } else {
      const flag = a.text[1]!
      if (valued.includes(flag) && a.text.length === 2) {
        opts.set(`-${flag}`, args[++i]?.text ?? '')
      } else {
        for (const f of a.text.slice(1)) opts.set(`-${f}`, '')
      }
    }
  }
  return { ops, opts }
}

function add(plan: Plan, w: Word, cwd: string, isOnlyIfFile: boolean, verb: string) {
  if (w.hasSubst) {
    plan.unresolved.push(`${verb} uses a computed path (${w.text})`)
    return
  }
  plan.targets.push({ path: w.text, cwd, isOnlyIfFile, hasGlob: w.hasGlob })
}

function moveLike(plan: Plan, args: Word[], cwd: string, isMove: boolean) {
  const { ops, opts } = operands(args, 'tS')
  const tdir = opts.get('-t') ?? opts.get('--target-directory')
  const dest = tdir !== undefined ? { text: tdir, hasGlob: false, hasSubst: false } : ops.at(-1)
  const sources = tdir !== undefined ? ops : ops.slice(0, -1)
  if (dest === undefined || sources.length === 0) return
  const verb = isMove ? 'mv' : 'cp'
  if (isMove) for (const s of sources) add(plan, s, cwd, false, verb)
  add(plan, dest, cwd, true, verb)
  for (const s of sources) {
    if (s.hasGlob || s.hasSubst || dest.hasSubst) continue
    add(plan, { ...dest, text: join(dest.text, base(s.text.replace(/\/+$/, ''))) }, cwd, false, verb)
  }
}

function git(plan: Plan, args: Word[], cwd: string) {
  let dir = cwd
  let i = 0
  while (i < args.length && args[i]!.text.startsWith('-')) {
    if (args[i]!.text === '-C') dir = join(dir, args[++i]?.text ?? '.')
    i++
  }
  const sub = args[i]?.text
  const rest = args.slice(i + 1)
  const texts = rest.map(w => w.text)
  if (sub === 'clean' && !texts.some(t => t === '-n' || t === '--dry-run')) {
    plan.gitCleans.push({ cwd: dir, args: texts })
  } else if (sub === 'reset' && texts.includes('--hard')) {
    plan.gitResets.push(dir)
  } else if (sub === 'rm') {
    for (const w of operands(rest).ops) add(plan, w, dir, false, 'git rm')
  } else if (sub === 'checkout' || sub === 'restore') {
    if (sub === 'restore' && texts.includes('--staged') && !texts.includes('--worktree')) return
    const dash = texts.indexOf('--')
    const paths =
      dash >= 0 ? rest.slice(dash + 1) : sub === 'restore' ? operands(rest, 's').ops : rest.filter(w => w.text === '.')
    if (paths.some(w => w.text === '.')) plan.gitResets.push(dir)
    else for (const w of paths) add(plan, w, dir, false, `git ${sub}`)
  }
}

function merge(into: Plan, from: Plan) {
  into.targets.push(...from.targets)
  into.finds.push(...from.finds)
  into.gitCleans.push(...from.gitCleans)
  into.gitResets.push(...from.gitResets)
  into.unresolved.push(...from.unresolved)
}

export function plan(cmd: string, cwd: string, depth = 0): Plan {
  const out = emptyPlan()
  let dir = cwd
  for (const simple of tokenize(cmd)) {
    for (const r of simple.redirects) {
      if (!r.text.startsWith('/dev/')) add(out, r, dir, true, 'a > redirect')
    }
    let words = simple.words
    while (words.length > 0 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0]!.text)) words = words.slice(1)
    while (words.length > 0 && WRAPPERS.has(base(words[0]!.text))) {
      words = words.slice(1)
      while (words[0]?.text.startsWith('-')) words = words.slice(1)
    }
    const head = words[0]
    if (head === undefined) continue
    const name = base(head.text)
    const args = words.slice(1)

    if (name === 'cd') {
      const to = args[0]
      if (to?.hasSubst) out.unresolved.push(`cd uses a computed path (${to.text})`)
      else dir = to === undefined ? '~' : join(dir, to.text)
    } else if (DELETERS.has(name)) {
      for (const w of operands(args).ops) add(out, w, dir, false, name)
    } else if (name === 'mv' || name === 'cp') {
      moveLike(out, args, dir, name === 'mv')
    } else if (name === 'truncate') {
      for (const w of operands(args, 'sr').ops) add(out, w, dir, true, name)
    } else if (name === 'tee') {
      const { ops, opts } = operands(args)
      if (!opts.has('-a') && !opts.has('--append')) for (const w of ops) add(out, w, dir, true, name)
    } else if (name === 'sed' || name === 'perl') {
      const { ops, opts } = operands(args, 'ef')
      const isInPlace = [...opts.keys()].some(k => k === '-i' || k.startsWith('--in-place'))
      if (isInPlace) {
        const files = opts.has('-e') || opts.has('-f') ? ops : ops.slice(1)
        for (const w of files) add(out, w, dir, true, `${name} -i`)
      }
    } else if (name === 'find') {
      const texts = args.map(w => w.text)
      const exec = texts.findIndex(t => t === '-exec' || t === '-execdir' || t === '-ok' || t === '-okdir')
      const isExecDelete = exec >= 0 && DESTRUCTIVE_WORD.test(texts.slice(exec + 1).join(' '))
      if (texts.includes('-delete') || isExecDelete) {
        const kept = (exec >= 0 ? texts.slice(0, exec) : texts).filter(t => t !== '-delete')
        out.finds.push({ cwd: dir, args: kept })
      }
    } else if (name === 'git') {
      git(out, args, dir)
    } else if ((name === 'bash' || name === 'sh' || name === 'zsh') && args[0]?.text === '-c' && args[1]) {
      if (depth < 3) merge(out, plan(args[1].text, dir, depth + 1))
    } else if (
      (name === 'xargs' || name === 'eval' || name === 'parallel') &&
      DESTRUCTIVE_WORD.test(args.map(w => w.text).join(' '))
    ) {
      out.unresolved.push(`${name} decides its files at run time`)
    } else if (name === 'dd') {
      const of = args.find(w => w.text.startsWith('of='))
      if (of) add(out, { ...of, text: of.text.slice(3) }, dir, true, 'dd')
    }
  }
  return out
}

// `~`, `$VAR` and `${VAR}`; undefined when a variable isn't set.
export function expand(text: string, env: Record<string, string | undefined>): string | undefined {
  let isMissing = false
  const home = env.HOME
  let out = text.replace(/^~(?=\/|$)/, () => {
    if (home === undefined) isMissing = true
    return home ?? ''
  })
  out = out.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
    (_, a: string | undefined, b: string | undefined) => {
      const value = env[(a ?? b)!]
      if (value === undefined) isMissing = true
      return value ?? ''
    },
  )
  return isMissing ? undefined : out
}

export function variablesIn(text: string): string[] {
  const names = [...text.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g)].map(m => (m[1] ?? m[2])!)
  return text.startsWith('~') ? [...names, 'HOME'] : names
}

export function normalize(path: string): string {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return `/${parts.join('/')}`
}

export function absolute(path: string, cwd: string): string {
  return normalize(path.startsWith('/') ? path : `${cwd}/${path}`)
}

// Only plain glob characters reach a shell for expansion.
export function isSafeGlob(pattern: string): boolean {
  return /^[\w./*?[\]@%+,:=~ -]+$/.test(pattern)
}
