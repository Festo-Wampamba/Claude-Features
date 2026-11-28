# Jarvis

Eleven Claude Code mods in one pack, from the "Claude Code mods · 11 builds" kit.
Installed at `~/.claude/skills/jarvis`, so it loads in every new chat.

## Use it

| Type | What happens |
| --- | --- |
| `/jarvis` | Opens the Jarvis panel: a card with an ON/OFF switch for every mod, plus tabs |
| `/jarvis undo` (or `agents`, `writing`, `context`, `doctor`) | Opens the panel on that tab |
| `/restore` | Restores the newest Undo Point snapshot. `/restore list` lists them, `/restore 2` picks one |
| `/heist` | Turns the Heist Skin look on or off |

The line above the chat box shows which mods are on, plus Pip, Proof Check,
Rule Keeper and Welcome Back when they have something to say.

## The mods

1. **Undo Point**: saves a snapshot before Claude deletes, moves or saves over your files; blocks the action and says why if the snapshot fails. Undo tab and `/restore`.
2. **Proof Check**: an "Unverified" line with a Verify now button when Claude changed code and ran no test, build or browser check.
3. **Stream Safe** (off by default): hides names, emails, phone numbers and keys on screen only. Turn it on from the panel.
4. **Welcome Back**: after 3 minutes away, a card with time away, files changed, undo points, cost, failures and anything waiting for you.
5. **Mission Control**: Agents tab with every helper's cost, → Haiku / → Sonnet and Stop.
6. **Slop Spotter**: marks hype words (yellow), long dashes (orange) and lists of three. Writing tab with Rewrite flagged lines.
7. **Rule Keeper**: after you correct the same thing twice, offers to save it to `~/.claude/CLAUDE.md`.
8. **Context X-Ray**: Context tab with how full the context window is and tools that load but are never used.
9. **Pip**: a pixel dog above the chat box whose mood follows Claude.
10. **Mod Doctor**: Mods tab with switches and Scan mods, which lists what every installed mod can touch and possible clashes.
11. **Heist Skin**: an original neon look with a cost meter and a JOB COMPLETE banner when a test passes.

## Where things live

- `hooks/core.tsx`: the panel, the status line, and the one place each event is hooked.
- `hooks/mods/<mod>.tsx`: one file per mod.
- `hooks/lib/`: shared helpers (shell parsing, text checks, state).
- `tests/`: run with `claude plugin test ~/.claude/skills/jarvis`.
- Undo Point snapshots: the plugin's data folder under `~/.claude/plugins/data/`, newest 100 kept, 1 GB limit per snapshot.

Mods run with your own permissions (they are not sandboxed). Mod Doctor shows what each one can touch.
