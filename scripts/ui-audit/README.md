# UI Audit Tool

Crawls every public route on `user-web` and `admin-web`, captures full-page
screenshots in **light + dark**, and reports every text node whose contrast
ratio is below WCAG AA (4.5:1 for normal text, 3:1 for large text).

## One-time setup

`playwright` is installed at the workspace root as a devDependency, so the
only thing you need to do once is download Chromium:

```bash
pnpm exec playwright install chromium
```

## Run

Make sure the dev servers are up (they probably already are). If not:

```bash
pnpm dev:backend
pnpm dev:user-web
pnpm dev:admin-web
```

Then run the audit:

```bash
node scripts/ui-audit/snapshot.mjs
```

Override the targets if your ports differ:

```bash
USER_BASE=http://localhost:3000 ADMIN_BASE=http://localhost:3002 node scripts/ui-audit/snapshot.mjs
```

## Output

```
scripts/ui-audit/output/<timestamp>/
├── summary.md                       # one-page overview
├── user/light/<route>.png
├── user/light/<route>.contrast.json
├── user/dark/<route>.png
├── user/dark/<route>.contrast.json
├── admin/light/...
└── admin/dark/...
```

Open `summary.md` first to see which routes have contrast problems, then
inspect the matching `<route>.contrast.json` for the offending text nodes
(includes class list, foreground/background, and the visible text).

## Authenticated routes

Public-only by default. To audit `/profile`, `/notifications`, `/bookings`
while logged in, grab your `auth-token` cookie value from DevTools and
export it:

```bash
AUTH_COOKIE='eyJhbGciOi...' node scripts/ui-audit/snapshot.mjs
```
