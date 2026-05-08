# TECH STACK — MADE v2

**DATE:** May 8, 2026

## Stack Decision

```
RUNTIME:        Node.js 22 LTS
LANGUAGE:       JavaScript (ESM modules, .mjs)
FRONTEND:       Vanilla HTML + CSS + JS (no framework, no build step)
REAL-TIME:      ws (WebSocket)
TERMINAL:       node-pty (pseudo-terminal capture)
SYNTAX HL:      highlight.js (CDN)
DIFF VIEW:      diff2html (CDN)
STORAGE:        File-based JSON (no database)
TESTS:          vitest
CI/CD:          GitHub Actions
CONTAINER:      Docker (node:22-slim)
```

## Dependencies (minimal)

```
PRODUCTION:
  ws            — WebSocket server
  node-pty      — PTY for agent process capture

DEV:
  vitest        — Test runner

CDN (no install):
  highlight.js  — Syntax highlighting in file viewer
  diff2html     — Diff rendering
```

## Key Decisions

```
DECISION: Vanilla JS, no React/Vue/Svelte
REASON: Zero build step. Zero framework lock-in. Proven in v1.
        The UI is not complex enough to justify a framework.
TRADE-OFF: More manual DOM manipulation. Acceptable for this UI size.

DECISION: highlight.js + diff2html via CDN
REASON: No npm install needed. Loaded from CDN.
        Reduces bundle size and build complexity.
TRADE-OFF: Requires internet on first load. Can cache with service worker later.

DECISION: File-based JSON storage
REASON: Already decided in DATA-MODEL.md. Zero-config, portable.
TRADE-OFF: No concurrent writes, no queries. Migration path exists.
```
