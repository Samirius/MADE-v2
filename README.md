# MADE v2 — Multiplayer Agentic Development Environment

Self-hosted, multi-agent, real-time coding workspace. Connect any repo, pick an AI agent, prompt it, review the diff, and commit — all from the browser.

## Features

- **Multi-agent support** — Hermes, Claude Code, OpenCode, Codex, or any custom command
- **Real-time streaming** — See agent output as it happens via WebSocket
- **File browser** — Navigate and read project files in-browser
- **Git integration** — Status, diff viewer, commit, and discard changes
- **Session-based** — Each workspace is an isolated session
- **Token auth** — Optional Bearer token for secure access
- **Docker-ready** — Single container, one command to run

## Quick Start

### Docker (recommended)

```bash
cp .env.example .env   # edit as needed
docker compose up -d
```

Open http://localhost:3100

### Manual

Requires Node.js >= 22.

```bash
git clone https://github.com/YOUR_USER/made-v2.git
cd made-v2
npm install
cp .env.example .env   # edit as needed
npm start
```

## Configuration

Environment variables (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `MADE_PORT` | `3100` | HTTP port |
| `MADE_HOST` | `127.0.0.1` | Bind address (use `0.0.0.0` in Docker) |
| `MADE_TOKEN` | *(empty)* | Auth token. Leave empty to disable auth |
| `MADE_CORS_ORIGIN` | *(empty)* | Allowed CORS origin |
| `MADE_DATA_DIR` | `.made-data` | Where sessions/messages are stored |
| `MADE_SANDBOX` | `false` | Block dangerous commands (rm -rf, sudo, etc.) |

## Agent Setup

MADE detects available agents on startup. Install the ones you want:

| Agent | Install |
|---|---|
| Hermes | `pip install hermes` or see hermes-agent.nousresearch.com |
| Claude Code | `npm i -g @anthropic-ai/claude-code` |
| OpenCode | `go install github.com/opencode-ai/opencode@latest` |
| Codex | `npm i -g @openai/codex` |

Then check availability:
```bash
curl http://localhost:3100/api/agents
```

## API

See [docs/API.md](docs/API.md) for the full API reference.

## Development

```bash
npm install
npm test          # vitest
npm run test:watch
```

## Architecture

- **Server**: Node.js 22, ESM, `ws` for WebSocket, `node-pty` for agent processes
- **Frontend**: Vanilla JS SPA in `static/`
- **Storage**: JSON files in `.made-data/` (sessions + messages)
- **Agents**: Adapter pattern in `src/agent/` — each agent has detect/start/stop

## License

MIT
