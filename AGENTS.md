# Overline Agent Instructions

## Project Context
- **Name**: Overline
- **Type**: Multi-tenant appointment & queue management system
- **Monorepo**: pnpm workspaces
- **Apps**: `backend` (NestJS/Prisma), `user-web` (Next.js), `admin-web` (Next.js), `mobile-admin` (React Native/Expo), `mobile-user` (React Native/Expo)

## Important Documentation Links
- **Database Schema**: [DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md)
- **Deployment**: [DEPLOYMENT.md](docs/DEPLOYMENT.md), [DEPLOYMENT_CHECKLIST.md](docs/DEPLOYMENT_CHECKLIST.md)
- **Authentication**: Google OAuth requires strict brand verification matching domain, logo, and sensitive scopes documentation. Check Google Search Console for domain ownership.
- **Mobile Details**: [MOBILE_APP_GUIDE.md](docs/MOBILE_APP_GUIDE.md)

## Development Commands
- Run all apps: `pnpm dev`
- Database: `pnpm db:generate`, `pnpm db:migrate`
- Build APKs: `bash build-apks.sh release`

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
