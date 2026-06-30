# MCP Servers

MCP servers installed in this Claude Code setup. Re-add via `claude mcp add` after fresh install.

## Active MCP Servers

| Server | Source | Purpose |
|---|---|---|
| `claude-in-chrome` | Claude plugin | Browser automation, screenshots, Chrome devtools |
| `figma` | Claude plugin | Figma design read/write, Code Connect |
| `github` | Claude plugin | GitHub issues, PRs, repos, code search |
| `playwright` | Claude plugin | Headless browser testing |
| `context7` | Claude plugin | Library docs lookup |
| `neon` | Claude plugin | Neon Postgres database operations |
| `Canva` | Claude plugin | Canva design creation |
| `vercel` | Claude plugin | Vercel deployment, logs, projects |
| `sentry` | Claude plugin | Error tracking, issue analysis |
| `zapier` | Claude plugin | Workflow automation |
| `refero` | Claude plugin | Design reference screenshots |
| `magic` | Claude plugin | 21st.dev component builder |
| `flowstep` | Claude plugin | Flowstep design tool |
| `firecrawl` | Claude plugin | Web scraping, search |
| `tavily` | Claude plugin | Web research |

## Restore

Most servers are managed via Claude Code plugins — re-enable in Claude Code settings after install.

For manually added servers:
```bash
claude mcp add <name> <command>
```

> API keys for MCP servers are stored in environment variables — never in this repo.
> Add them to ~/.bashrc or a secrets manager.
