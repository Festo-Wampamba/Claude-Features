# Claude-Features

**Global Claude Code configuration — auto-synced.**
Hooks, skills, agents, rules, and a one-command restore for any machine or Claude account.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Skills](https://img.shields.io/badge/skills-70%2B-purple)](skills/)
[![Hooks](https://img.shields.io/badge/hooks-9-green)](hooks/)
[![Auto-sync](https://img.shields.io/badge/auto--sync-enabled-brightgreen)](#auto-sync)

---

## What this is

This repo is a living backup of the Claude Code setup on `Festo-Wampamba`'s machine. Every time a Claude Code session ends, a `Stop` hook automatically detects changes to `~/.claude/` and pushes them here. No manual steps needed — install a skill, it appears in this repo within minutes.

**Restore on any machine in one command:**
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Festo-Wampamba/Claude-Features/main/install.sh)
```

---

## Contents

```
Claude-Features/
├── hooks/          ← 9 shell scripts (safety + automation)
├── skills/         ← 70+ skills (design, workflow, utilities)
├── agents/         ← 7 specialist agents
├── rules/          ← 6 modular code quality rules
├── config/
│   ├── CLAUDE.template.md        ← Full CLAUDE.md (skill/hook guidance)
│   ├── settings.template.json    ← Hook wiring (no secrets)
│   ├── plugins.json              ← Enabled Claude Code plugins
│   └── mcp-servers.md            ← MCP server inventory
└── install.sh      ← One-command restore script
```

---

## Hooks

Hooks are shell scripts wired to Claude Code lifecycle events. They fire automatically — no invocation needed.

### Safety (PreToolUse — runs BEFORE Claude acts)

| Script | Triggers on | What it does |
|---|---|---|
| `protect-files.sh` | Edit or Write | Blocks edits to `.env`, `.pem`, `.key`, lockfiles, `.git/`, `secrets/`, and `~/.claude/hooks/` itself |
| `scan-secrets.sh` | Edit or Write | Scans written content for hardcoded API keys (AWS, GitHub, Anthropic, OpenAI, Stripe, RSA keys, DB connection strings) |
| `block-dangerous-commands.sh` | Bash | Blocks `rm -rf ~`, `rm -rf /`, force push to `main`/`master`, `git reset --hard`, `DROP TABLE` without `WHERE`, `curl \| bash`, `wget \| sh`, `chmod 777` |

**Fail posture:** `protect-files.sh` and `block-dangerous-commands.sh` are **fail-closed** (deny if `jq` missing). `scan-secrets.sh` is fail-open. All use `exit 2` to block.

### Automation (PostToolUse — runs AFTER Claude edits)

| Script | Triggers on | What it does |
|---|---|---|
| `format-on-save.sh` | Edit or Write | Auto-detects and runs the right formatter. Supports Biome (JS/TS), Prettier (JS/TS/JSON/CSS/MD), Ruff (Python), Black (Python), rustfmt (Rust), gofmt (Go). Requires both the binary AND a config file to be present |
| `auto-test.sh` | Edit or Write | Finds and runs the matching test file for the edited file. Silent on success (only output on failure). 120s timeout |

### Session (SessionStart)

| Script | Fires when | What it does |
|---|---|---|
| `session-start.sh` | Startup or resume | Injects current git context: branch name, uncommitted file count, staged diff, open PR number/title if `gh` is installed |
| `compact-reminder.sh` | After context compaction | Re-injects operating rules so Claude doesn't forget them after a `/compact` |

### Notifications & Sync

| Script | Fires when | What it does |
|---|---|---|
| `notify.sh` | Claude needs attention | Desktop notification via `notify-send` (Linux), `osascript` (macOS), or PowerShell (WSL) |
| `sync-claude-features.sh` | Session ends (Stop) | Detects changes to `~/.claude/`, copies to this repo, commits with a descriptive message, and pushes to GitHub automatically |

---

## Skills

Skills are slash commands loaded by Claude Code. Invoke with `/skill-name` or referenced automatically by CLAUDE.md rules.

### Design Stack

| Skill | Invoke | Purpose |
|---|---|---|
| **Impeccable** | `/impeccable` | 23 design commands: `/critique`, `/polish`, `/audit`, `/layout`, `/animate`, `/typeset`, `/colorize`, `/harden`, `/distill`, `/craft` and more. Structured design workflows with deterministic detector rules |
| **Emil Design Eng** | `skill: "emil-design-eng"` | UI polish, interaction feel, motion quality, component design from Emil Kowalski's philosophy |
| **Animation Vocabulary** | `skill: "animation-vocabulary"` | Reverse-lookup glossary — turn a vague description into the exact animation term |
| **Review Animations** | `skill: "review-animations"` | Audit animation quality against defined standards |
| **Taste Skill** | `skill: "taste-skill"` | Anti-generic frontend guidance. Pushes output away from AI-looking, templated UI |
| **Redesign Skill** | `skill: "redesign-skill"` | Upgrades existing designs to premium quality |
| **Soft Skill** | `skill: "soft-skill"` | High-end agency feel — specific fonts, spacing, shadows, animations |
| **Minimalist Skill** | `skill: "minimalist-skill"` | Clean editorial interfaces, warm monochrome, typographic contrast |
| **Brutalist Skill** | `skill: "brutalist-skill"` | Raw mechanical interfaces for data-heavy dashboards |
| **Stitch Skill** | `skill: "stitch-skill"` | Generates `DESIGN.md` design system files |
| **Brandkit** | `skill: "brandkit"` | Brand identity, logo systems, visual world presentations |
| **Image-to-Code** | `skill: "image-to-code-skill"` | Implements a design from an image reference |
| **Output Skill** | `skill: "output-skill"` | Forces complete, untruncated code generation |
| **UI/UX Pro Max** | `skill: "ui-ux-pro-max"` | Auto-triggered on any UI task |

**Preferred design workflow:**
1. `taste-skill` — set direction early, avoid generic output
2. `emil-design-eng` — during implementation and interaction refinement
3. `impeccable` — critique, audit, polish before shipping

### gstack Workflow Skills

| Skill | Purpose |
|---|---|
| `/office-hours` | Clarify scope before starting a new feature |
| `/autoplan` | Generate an implementation plan |
| `/review` | Code review before shipping |
| `/qa` | Quality assurance pass |
| `/cso` | Chief Strategy Officer review |
| `/ship` | Commit + push + PR workflow |
| `/land-and-deploy` | Merge and deploy |
| `/retro` | Retrospective after a feature |
| `/plan-eng-review` | Engineering plan review |
| `/plan-design-review` | Design plan review |

**Sprint workflow:** `/office-hours` → `/autoplan` → build → `/review` → `/qa` → `/cso` → `/ship` → `/land-and-deploy` → `/retro`

### Utility Skills

| Skill | Purpose |
|---|---|
| `/graphify` | Convert any codebase or document set into a knowledge graph |
| `/diagram` | Generate architecture or flow diagrams |
| `/investigate` | Deep-dive investigation into a bug or unknown |
| `/learn` | Structured learning session on a topic |
| `/make-pdf` | Generate a PDF from content |
| `/scrape` | Web scraping workflows |
| `/browse` | Web browsing (gstack-managed, always use this over raw browser tools) |
| `/codex` | Codex-specific workflows |
| `/spec` | Write a technical specification |
| `/context-save` / `/context-restore` | Save and restore session context |
| `/freeze` / `/unfreeze` | Freeze project state |
| `/health` | Project health check |
| `/guard` | Enable defensive mode |

### Remotion Skills

Full Remotion video creation skill set with rule files for: 3D, audio, captions, charts, fonts, Lottie, sequencing, transitions, voiceover, FFmpeg, and more. Auto-triggered when working in any Remotion project.

---

## Agents

Specialist agents invoked with `@name` inside Claude Code, or auto-delegated by `/pr-review`.

| Agent | Best for |
|---|---|
| `@code-reviewer` | Code correctness, patterns, edge cases |
| `@security-reviewer` | Security vulnerabilities, auth, input validation |
| `@performance-reviewer` | Bottlenecks, bundle size, render performance |
| `@doc-reviewer` | Documentation quality, completeness, accuracy |
| `@frontend-designer` | UI/UX critique and redesign suggestions |
| `@pr-test-analyzer` | Analyze what tests a PR needs |
| `@silent-failure-hunter` | Find error paths that fail silently |

---

## Rules

Rules are markdown files loaded into Claude's context. Always-loaded rules cost tokens every turn; path-scoped rules only load near matched files.

| Rule | Scope | Purpose |
|---|---|---|
| `code-quality.md` | Always | Code standards, naming, structure |
| `testing.md` | Always | Test coverage expectations, patterns |
| `database.md` | Path-scoped | Database query patterns, migrations, safety |
| `error-handling.md` | Path-scoped | Error handling patterns, logging |
| `security.md` | Path-scoped | Security checks, input validation |
| `frontend.md` | Path-scoped | Frontend patterns, component structure |

---

## Auto-Sync

This repo stays current automatically. Every time a Claude Code session ends:

1. `sync-claude-features.sh` fires (Stop hook)
2. Detects changes in `~/.claude/skills/`, `hooks/`, `rules/`, `agents/`, `CLAUDE.md`
3. Copies changed files to `~/claude-features/`
4. Generates a commit message describing what changed (e.g., `chore: auto-sync 2026-06-30 — skills: impeccable, taste-skill`)
5. Commits and pushes to `main`

**You never need to run `git push` manually.**

To manually trigger a sync:
```bash
bash ~/.claude/hooks/sync-claude-features.sh
```

---

## Install on a New Machine

### Prerequisites

```bash
# Ubuntu / Debian
sudo apt install git jq libnotify-bin

# macOS
brew install git jq

# Claude Code CLI
npm install -g @anthropic-ai/claude-code   # or visit claude.ai/code

# pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### One-command install

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Festo-Wampamba/Claude-Features/main/install.sh)
```

### What the install script does

1. Checks prerequisites (git, jq, claude, node, pnpm)
2. Backs up existing `~/.claude/settings.json` and `CLAUDE.md`
3. Copies all hook scripts to `~/.claude/hooks/` and makes them executable
4. Copies all skills to `~/.claude/skills/`
5. Copies all agents to `~/.claude/agents/`
6. Copies all rules to `~/.claude/rules/`
7. Merges hook wiring into `~/.claude/settings.json` without overwriting existing config
8. Installs Impeccable CLI via `npx impeccable install`

### After install — manual steps

```bash
# 1. Set your API keys in ~/.bashrc
export ANTHROPIC_API_KEY=sk-ant-...
export GITHUB_TOKEN=ghp_...
export GOOGLE_API_KEY=...
source ~/.bashrc

# 2. Restart Claude Code
# 3. Re-enable plugins in Claude Code settings (see config/plugins.json)
# 4. Re-add MCP servers (see config/mcp-servers.md)
```

---

## MCP Servers

See [`config/mcp-servers.md`](config/mcp-servers.md) for the full inventory. Key servers:

- **claude-in-chrome** — browser automation
- **figma** — design read/write
- **github** — issues, PRs, code search
- **playwright** — headless browser testing
- **neon** — Postgres database operations
- **vercel** — deployments, logs
- **firecrawl / tavily** — web research and scraping
- **sentry** — error tracking
- **context7** — live library documentation

> MCP API keys are stored in `~/.bashrc` only — never committed here.

---

## Plugins

See [`config/plugins.json`](config/plugins.json) for the full list of enabled Claude Code plugins. Key ones:

`superpowers` · `frontend-design` · `code-review` · `feature-dev` · `github` · `playwright` · `neon` · `vercel` · `context7` · `caveman` · `ui-ux-pro-max` · `andrej-karpathy-skills` · `claude-mem` · `coderabbit` · `impeccable`

---

## Sources

| Component | Source |
|---|---|
| Safety hooks | [poshan0126/dotclaude](https://github.com/poshan0126/dotclaude) (MIT) |
| Emil Kowalski skills | [emilkowalski/skill](https://github.com/emilkowalski/skill) |
| Taste Skill stack | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) |
| Impeccable | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) |
| gstack skills | [gstack](https://github.com/gstack) workflow |
| Remotion skills | [remotion-dev/skills](https://github.com/remotion-dev/skills) |

---

*Maintained by [@Festo-Wampamba](https://github.com/Festo-Wampamba) · Auto-synced after every Claude Code session*
