export type Snapshot = {
  id: string
  at: number
  trigger: string
  paths: string[]
  fileCount: number
  dir: string
}

export type Unverified = { files: string[]; at: number }

export type Failure = { command: string; isTest: boolean }

export type Journal = {
  lastSeenAt: number
  costAtSeen: number
  files: string[]
  undoPoints: number
  failures: Failure[]
  waitingSince: number | null
}

export type AwayCard = Journal & { awayMs: number; usd: number }

export type AgentCard = {
  id: string
  description: string
  status: string
  usd: number
  model: string
  turnId: string | null
}

export type SlopKind = 'hype' | 'dash' | 'triad'

export type SlopFlag = { file: string; line: number; text: string; kinds: SlopKind[] }

export type RuleOffer = { rule: string }

export type ContextItem = { name: string; tokens: number }

export type ContextView = {
  percent: number
  tokens: number
  window: number
  items: ContextItem[]
  unused: ContextItem[]
}

export type PipMood = 'idle' | 'working' | 'happy' | 'worried' | 'waiting'

export type Pip = { mood: PipMood; since: number }

export type ModReport = { name: string; root: string; events: string[]; calls: string[]; risks: string[] }

export type DoctorReport = { at: number; mods: ModReport[]; clashes: string[] }

declare module 'claude-code' {
  interface PluginState {
    jarvis: {
      enabled: Shaped<Record<string, boolean>>
      tab: string
      snapshots: Shaped<Snapshot[]>
      unverified: Shaped<Unverified | null>
      journal: Shaped<Journal | null>
      away: Shaped<AwayCard | null>
      agents: Shaped<AgentCard[]>
      overrides: Shaped<Record<string, string>>
      slop: Shaped<SlopFlag[]>
      ruleOffer: Shaped<RuleOffer | null>
      context: Shaped<ContextView | null>
      usedTools: Shaped<string[]>
      pip: Shaped<Pip>
      doctor: Shaped<DoctorReport | null>
      isHeist: boolean
      bannerUntil: number
      spent: number
      names: Shaped<Record<string, string>>
    }
  }
}
