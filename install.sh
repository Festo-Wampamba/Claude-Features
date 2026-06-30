#!/usr/bin/env bash
# claude-features — full restore script
# Restores all hooks, skills, agents, rules on any machine.
#
# Usage (after cloning):  bash install.sh
# Remote one-liner:       bash <(curl -fsSL https://raw.githubusercontent.com/Festo-Wampamba/Claude-Features/main/install.sh)

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-install.sh}")" 2>/dev/null && pwd || echo "$HOME/claude-features")"
CLAUDE_DIR="$HOME/.claude"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   claude-features installer          ║"
echo "╚══════════════════════════════════════╝"
echo "  Source: $REPO_DIR"
echo "  Target: $CLAUDE_DIR"
echo ""

# ── Prerequisites ────────────────────────────────────────────────────────────
echo "▸ Checking prerequisites..."

command -v git >/dev/null || { echo "ERROR: git not found"; exit 1; }
command -v claude >/dev/null || {
  echo "ERROR: Claude Code not found."
  echo "  Install: https://claude.ai/code  or  npm install -g @anthropic-ai/claude-code"
  exit 1
}
command -v jq >/dev/null || {
  echo "  Installing jq..."
  if command -v apt-get >/dev/null; then
    sudo apt-get install -y jq libnotify-bin 2>/dev/null
  elif command -v brew >/dev/null; then
    brew install jq
  else
    echo "ERROR: install jq manually: https://stedolan.github.io/jq/download/"; exit 1
  fi
}
command -v node >/dev/null || echo "  WARNING: node not found — some hooks may not work"
command -v pnpm >/dev/null || {
  echo "  Installing pnpm..."
  curl -fsSL https://get.pnpm.io/install.sh | sh -
  export PNPM_HOME="$HOME/.local/share/pnpm"
  export PATH="$PNPM_HOME/bin:$PATH"
}

echo "  ✓ Prerequisites OK"

# ── Backup ───────────────────────────────────────────────────────────────────
echo ""
echo "▸ Backing up existing config..."
mkdir -p "$CLAUDE_DIR/backups"
TS=$(date +%F-%H%M%S)
[ -f "$CLAUDE_DIR/settings.json" ] && cp "$CLAUDE_DIR/settings.json" "$CLAUDE_DIR/backups/settings.json.$TS.bak" && echo "  ✓ settings.json backed up"
[ -f "$CLAUDE_DIR/CLAUDE.md" ] && cp "$CLAUDE_DIR/CLAUDE.md" "$CLAUDE_DIR/backups/CLAUDE.md.$TS.bak" && echo "  ✓ CLAUDE.md backed up"

# ── Directories ──────────────────────────────────────────────────────────────
mkdir -p "$CLAUDE_DIR/hooks" "$CLAUDE_DIR/rules" "$CLAUDE_DIR/agents" "$CLAUDE_DIR/skills" "$CLAUDE_DIR/vendor"

# ── Hooks ────────────────────────────────────────────────────────────────────
echo ""
echo "▸ Installing hooks..."
cp "$REPO_DIR/hooks/"*.sh "$CLAUDE_DIR/hooks/"
chmod +x "$CLAUDE_DIR/hooks/"*.sh
echo "  ✓ $(ls "$CLAUDE_DIR/hooks/"*.sh | wc -l) hooks installed"

# ── Rules ────────────────────────────────────────────────────────────────────
echo ""
echo "▸ Installing rules..."
cp "$REPO_DIR/rules/"*.md "$CLAUDE_DIR/rules/"
echo "  ✓ $(ls "$CLAUDE_DIR/rules/" | wc -l) rules installed"

# ── Agents ───────────────────────────────────────────────────────────────────
echo ""
echo "▸ Installing agents..."
for agent_dir in "$REPO_DIR/agents/"/*/; do
  [ -d "$agent_dir" ] || continue
  name=$(basename "$agent_dir")
  mkdir -p "$CLAUDE_DIR/agents/$name"
  cp -r "$agent_dir"* "$CLAUDE_DIR/agents/$name/" 2>/dev/null || true
done
echo "  ✓ $(ls "$CLAUDE_DIR/agents/" | wc -l) agents installed"

# ── Skills ───────────────────────────────────────────────────────────────────
echo ""
echo "▸ Installing skills..."
for skill_dir in "$REPO_DIR/skills/"/*/; do
  [ -d "$skill_dir" ] || continue
  name=$(basename "$skill_dir")
  mkdir -p "$CLAUDE_DIR/skills/$name"
  cp -r "$skill_dir"* "$CLAUDE_DIR/skills/$name/" 2>/dev/null || true
done
echo "  ✓ $(ls "$CLAUDE_DIR/skills/" | wc -l) skills installed"

# Impeccable CLI install
if ! command -v impeccable >/dev/null 2>&1; then
  echo ""
  echo "▸ Installing Impeccable CLI..."
  npx impeccable install --providers=claude --scope=global 2>&1 | tail -3 || echo "  WARNING: Impeccable install failed — run manually: npx impeccable install"
fi

# ── Settings merge ───────────────────────────────────────────────────────────
echo ""
echo "▸ Merging hooks into settings.json..."

if [ ! -f "$CLAUDE_DIR/settings.json" ]; then
  cp "$REPO_DIR/config/settings.template.json" "$CLAUDE_DIR/settings.json"
  echo "  ✓ Created settings.json from template"
else
  python3 - << PYEOF
import json, os
settings_path = os.path.expanduser('~/.claude/settings.json')
H = os.path.expanduser('~/.claude/hooks')

with open(settings_path) as f:
    s = json.load(f)

hooks = s.setdefault('hooks', {})

def add_hook(event, matcher, command, timeout=10, status=None):
    lst = hooks.setdefault(event, [])
    cmd_base = os.path.basename(command)
    for entry in lst:
        for h in entry.get('hooks', []):
            if os.path.basename(h.get('command', '')) == cmd_base:
                return
    hook_obj = {'type': 'command', 'command': command, 'timeout': timeout}
    if status:
        hook_obj['statusMessage'] = status
    entry = {'hooks': [hook_obj]}
    if matcher:
        entry['matcher'] = matcher
    lst.append(entry)

add_hook('Notification',  '',              f'{H}/notify.sh',                    10,  'Notifying...')
add_hook('SessionStart',  'compact',       f'{H}/compact-reminder.sh',           5,  'Restoring context...')
add_hook('SessionStart',  'startup|resume',f'{H}/session-start.sh',             10,  'Loading project context...')
add_hook('PreToolUse',    'Edit|Write',    f'{H}/protect-files.sh',             10,  'Checking file protections...')
add_hook('PreToolUse',    'Edit|Write',    f'{H}/scan-secrets.sh',              10,  'Scanning for secrets...')
add_hook('PreToolUse',    'Bash',          f'{H}/block-dangerous-commands.sh',  10,  'Checking command safety...')
add_hook('PostToolUse',   'Edit|Write',    f'{H}/format-on-save.sh',            30,  'Formatting...')
add_hook('PostToolUse',   'Edit|Write',    f'{H}/auto-test.sh',                120,  'Running matching tests...')

with open(settings_path, 'w') as f:
    json.dump(s, f, indent=2)
print('  ✓ settings.json updated')
PYEOF
fi

# ── CLAUDE.md ────────────────────────────────────────────────────────────────
if [ ! -f "$CLAUDE_DIR/CLAUDE.md" ]; then
  cp "$REPO_DIR/config/CLAUDE.template.md" "$CLAUDE_DIR/CLAUDE.md"
  echo "  ✓ CLAUDE.md installed from template"
fi

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Install complete!                  ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "  Active hooks:"
echo "  • protect-files     (PreToolUse  Edit|Write)"
echo "  • scan-secrets      (PreToolUse  Edit|Write)"
echo "  • block-dangerous   (PreToolUse  Bash)"
echo "  • format-on-save    (PostToolUse Edit|Write)"
echo "  • auto-test         (PostToolUse Edit|Write)"
echo "  • notify            (Notification)"
echo "  • session-start     (SessionStart startup|resume)"
echo "  • compact-reminder  (SessionStart compact)"
echo ""
echo "  Manual steps still needed:"
echo "  1. Set API keys in ~/.bashrc:"
echo "       export ANTHROPIC_API_KEY=..."
echo "       export GITHUB_TOKEN=..."
echo "  2. Re-enable Claude Code plugins in the app settings"
echo "  3. Re-add MCP servers (see config/mcp-servers.md)"
echo "  4. Restart Claude Code"
echo ""
