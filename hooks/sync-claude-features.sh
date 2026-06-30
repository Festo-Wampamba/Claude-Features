#!/usr/bin/env bash
# Auto-sync ~/.claude/ changes to ~/claude-features and push to GitHub.
# Wired to the Stop hook — runs after every Claude session.
# Detects: new/changed skills, hooks, agents, rules, CLAUDE.md
# Skips push if nothing changed.

set -euo pipefail

REPO="$HOME/claude-features"
CLAUDE="$HOME/.claude"

# Bail if repo not set up
[ -d "$REPO/.git" ] || exit 0
git -C "$REPO" remote get-url origin >/dev/null 2>&1 || exit 0

# ── Sync skills ──────────────────────────────────────────────────────────────
mkdir -p "$REPO/skills"
for skill_dir in "$CLAUDE/skills/"/*/; do
  name=$(basename "$skill_dir")
  # Skip gstack internal dirs (symlink farms, not portable)
  [[ "$name" == "gstack" || "$name" == "_gstack-command" || "$name" == "open-gstack-browser" ]] && continue
  dest="$REPO/skills/$name"
  mkdir -p "$dest"
  rsync -a --delete "$skill_dir" "$dest/" 2>/dev/null || cp -r "$skill_dir"* "$dest/" 2>/dev/null || true
done

# ── Sync hooks ───────────────────────────────────────────────────────────────
mkdir -p "$REPO/hooks"
for f in "$CLAUDE/hooks/"*.sh; do
  [ -f "$f" ] && cp "$f" "$REPO/hooks/"
done

# ── Sync rules ───────────────────────────────────────────────────────────────
mkdir -p "$REPO/rules"
for f in "$CLAUDE/rules/"*.md; do
  [ -f "$f" ] && cp "$f" "$REPO/rules/"
done

# ── Sync agents ──────────────────────────────────────────────────────────────
mkdir -p "$REPO/agents"
for agent_dir in "$CLAUDE/agents/"/*/; do
  [ -d "$agent_dir" ] || continue
  name=$(basename "$agent_dir")
  mkdir -p "$REPO/agents/$name"
  cp -r "$agent_dir"* "$REPO/agents/$name/" 2>/dev/null || true
done

# ── Sync CLAUDE.md → config/CLAUDE.template.md ───────────────────────────────
[ -f "$CLAUDE/CLAUDE.md" ] && cp "$CLAUDE/CLAUDE.md" "$REPO/config/CLAUDE.template.md"

# ── Sync sanitized settings template ─────────────────────────────────────────
if [ -f "$CLAUDE/settings.json" ] && command -v python3 >/dev/null; then
  python3 - << 'PYEOF'
import json, os
with open(os.path.expanduser('~/.claude/settings.json')) as f:
    s = json.load(f)
# Keep only hooks, marketplaces, plugins — strip env/permissions (contain secrets)
safe = {}
if 'hooks' in s:
    safe['hooks'] = s['hooks']
if 'extraKnownMarketplaces' in s:
    safe['extraKnownMarketplaces'] = s['extraKnownMarketplaces']
if 'enabledPlugins' in s:
    safe['enabledPlugins'] = s['enabledPlugins']
repo = os.path.expanduser('~/claude-features')
with open(f'{repo}/config/settings.template.json', 'w') as f:
    json.dump(safe, f, indent=2)
PYEOF
fi

# ── Commit + push if anything changed ────────────────────────────────────────
cd "$REPO"

if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git add -A

  # Build a meaningful commit message from what changed
  CHANGED=$(git diff --cached --name-only | head -20)
  SKILLS_ADDED=$(echo "$CHANGED" | grep '^skills/' | awk -F'/' '{print $2}' | sort -u | tr '\n' ', ' | sed 's/,$//')
  HOOKS_CHANGED=$(echo "$CHANGED" | grep '^hooks/' | wc -l)
  RULES_CHANGED=$(echo "$CHANGED" | grep '^rules/' | wc -l)
  OTHER=$(echo "$CHANGED" | grep -v '^skills/\|^hooks/\|^rules/' | head -5 | tr '\n' ', ' | sed 's/,$//')

  MSG="chore: auto-sync $(date +%Y-%m-%d)"
  [ -n "$SKILLS_ADDED" ]     && MSG="$MSG — skills: $SKILLS_ADDED"
  [ "$HOOKS_CHANGED" -gt 0 ] && MSG="$MSG — hooks updated"
  [ "$RULES_CHANGED" -gt 0 ] && MSG="$MSG — rules updated"
  [ -n "$OTHER" ]             && MSG="$MSG — $OTHER"

  git -c user.name="Festo-Wampamba" -c user.email="festougtech@gmail.com" \
    commit -m "$MSG" --quiet

  # Push using tracking branch (avoids naming 'main' directly)
  git push --quiet
  echo "[claude-features] synced to GitHub: $MSG"
else
  echo "[claude-features] no changes to sync"
fi
