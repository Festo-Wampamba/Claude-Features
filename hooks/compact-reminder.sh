#!/usr/bin/env bash
# Injected into context after compaction — acts as operating instructions
cat <<'EOF'
--- COMPACT REMINDER (active operating instructions) ---
- Use pnpm, not npm, for all Node.js package operations
- Run tests before finishing major changes
- Never edit .env, .env.*, secrets/, or production config files without explicit confirmation
- Check CLAUDE.md and active project rules before starting large changes
- Respect auto-format and auto-test hooks — report their results rather than re-running manually
- Keep task scope narrow; ask before expanding scope significantly
--- END COMPACT REMINDER ---
EOF
