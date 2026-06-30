# Claude-Features

> Global Claude Code configuration — hooks, skills, agents, rules.
> One-command restore on any machine or Claude account.

## Quick restore

```bash
git clone git@github.com:Festo-Wampamba/Claude-Features.git ~/claude-features
cd ~/claude-features && bash install.sh
```

Or without cloning:
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Festo-Wampamba/Claude-Features/main/install.sh)
```

Restart Claude Code after running.

---

## What's included

### Hooks (8)

| Script | Event | Does |
|---|---|---|
| `protect-files.sh` | PreToolUse Edit\|Write | Blocks edits to `.env`, secrets, lockfiles, `.git/` |
| `scan-secrets.sh` | PreToolUse Edit\|Write | Blocks hardcoded API keys/tokens in written content |
| `block-dangerous-commands.sh` | PreToolUse Bash | Blocks `rm -rf ~`, force push to main, `DROP` without `WHERE`, `curl\|bash` |
| `format-on-save.sh` | PostToolUse Edit\|Write | Auto-formats via Prettier / Ruff / gofmt / Biome |
| `auto-test.sh` | PostToolUse Edit\|Write | Runs matching test file silently after edits |
| `notify.sh` | Notification | Desktop notification when Claude needs attention |
| `session-start.sh` | SessionStart startup\|resume | Injects git context (branch, status, staged diff, PR) |
| `compact-reminder.sh` | SessionStart compact | Re-injects operating rules after context compaction |

### Skills (70+)

**Design stack:**
- Impeccable (23 commands: critique, polish, audit, layout, animate...)
- Emil Kowalski: `emil-design-eng`, `animation-vocabulary`, `review-animations`
- Taste Skill stack: `taste-skill`, `redesign-skill`, `soft-skill`, `minimalist-skill`, `brutalist-skill`, `stitch-skill`, `brandkit`, `image-to-code-skill`, `output-skill`
- `ui-ux-pro-max`

**gstack workflow:** `autoplan`, `ship`, `review`, `qa`, `retro`, `cso`, `office-hours`, `plan-eng-review`, `plan-design-review`, `land-and-deploy`, and more

**Utilities:** `graphify`, `diagram`, `investigate`, `learn`, `make-pdf`, `scrape`, `browse`, `codex`, and more

### Agents (7, invoke with `@name`)

`@code-reviewer` · `@security-reviewer` · `@performance-reviewer` · `@doc-reviewer` · `@frontend-designer` · `@pr-test-analyzer` · `@silent-failure-hunter`

### Rules (6)

Always-loaded: `code-quality`, `testing`
Path-scoped: `database`, `error-handling`, `security`, `frontend`

### Config

| File | Purpose |
|---|---|
| `config/settings.template.json` | Hook wiring template (no secrets) |
| `config/CLAUDE.template.md` | Full CLAUDE.md with all skill/hook guidance |
| `config/plugins.json` | List of enabled Claude Code plugins |
| `config/mcp-servers.md` | MCP server inventory (re-add manually after fresh install) |

---

## Prerequisites

| Tool | Install |
|---|---|
| `git` | `sudo apt install git` |
| `jq` | `sudo apt install jq libnotify-bin` |
| `claude` | [claude.ai/code](https://claude.ai/code) |
| `node` | [nodejs.org](https://nodejs.org) |
| `pnpm` | `curl -fsSL https://get.pnpm.io/install.sh \| sh -` |

---

## Manual steps after install

1. Set API keys in `~/.bashrc`:
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   export GITHUB_TOKEN=ghp_...
   ```
2. Re-enable plugins in Claude Code settings (see `config/plugins.json`)
3. Re-add MCP servers (see `config/mcp-servers.md`)
4. Restart Claude Code

---

## Keeping in sync

When you add a new skill, hook, or config — update this repo:

```bash
cd ~/claude-features
# copy updated file(s), then:
git add -A
git commit -m "feat: <what changed>"
git push
```

Hooks: sourced from [poshan0126/dotclaude](https://github.com/poshan0126/dotclaude) (MIT)
Skills: Impeccable, Emil Kowalski, Taste Skill, gstack, ui-ux-pro-max
