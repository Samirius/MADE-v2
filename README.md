# MADE v2

**Multiplayer Agentic Development Environment**

A self-hosted, multi-agent, real-time coding workspace. MADE lets you spawn AI coding agents (Hermes, Claude Code, Codex, OpenCode, or any CLI tool) inside project workspaces and interact with them through a browser-based UI or a REST/WebSocket API.

---

## What is MADE?

MADE is a lightweight Node.js server that manages **sessions** — each session is a project directory paired with an AI coding agent. You chat with the agent, it edits files in your project, and you see changes in real time through a built-in file browser and git integration.

Key design goals:

- Self-hosted, single binary-style deployment (one Node process)
- Pluggable agent adapters — bring your own CLI tool
- Real-time streaming via WebSocket
- Zero-config defaults, fully configurable via environment variables

## Features

- **Multi-agent support** — Hermes Agent, Claude Code, OpenAI Codex, OpenCode, or any generic CLI
- **Real-time streaming** — agent output streamed over WebSocket as it arrives
- **Session management** — create, list, delete coding sessions, each tied to a project directory
- **File browser** — list directories and read file contents from the workspace
- **Git integration** — status, diff, commit, and discard changes
- **Token-based auth** — optional Bearer token for all API and WebSocket connections
- **Sandbox mode** — block dangerous commands (rm -rf /, sudo, mkfs, dd)
- **Docker-ready** — Dockerfile and docker-compose.yml included
- **Vanilla frontend** — single-page HTML/CSS/JS app, no build step required

## Architecture

```
                    +------------------+
                    |   Browser UI     |
                    |  (static HTML/   |
                    |   CSS / JS)      |
                    +--------+---------+
                             |
                     HTTP / WebSocket
                             |
                    +--------v---------+
                    |   MADE Server    |
                    |  (Node.js 22)    |
                    |                  |
                    |  - REST API      |
                    |  - WebSocket     |
                    |  - Static files  |
                    |  - Session store |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  Agent Adapters  |
                    |                  |
                    |  hermes  claude  |
                    |  codex  opencode |
                    |  generic (any)   |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  Project Dir     |
                    |  (workspace)     |
                    |                  |
                    |  files + git     |
                    +------------------+
```

## Quick Start (Docker)

The fastest way to run MADE is with Docker Compose:

```bash
git clone https://github.com/your-org/made-v2.git
cd made-v2
docker compose up --build
```

This starts MADE on **http://localhost:3100**.

To persist session data and mount a project directory, the compose file already includes:

- `made-data` volume for session storage
- `./projects` bind mount for your code

Place your projects in `./projects/` and reference them when creating sessions.

**With authentication** — uncomment the `MADE_TOKEN` line in `docker-compose.yml`:

```yaml
environment:
  - MADE_TOKEN=your-secret-token
```

## Manual Install

Requirements: Node.js >= 22, npm, and git.

```bash
# Clone the repository
git clone https://github.com/your-org/made-v2.git
cd made-v2

# Install dependencies
npm install

# Start the server
node src/server.mjs
```

The server starts on **http://127.0.0.1:3100** by default.

For development with auto-restart, use nodemon or similar:

```bash
npx nodemon src/server.mjs
```

## Configuration

All configuration is via environment variables. No config files needed.

| Variable | Default | Description |
|---|---|---|
| `MADE_PORT` | `3100` | HTTP server port |
| `MADE_HOST` | `127.0.0.1` | Bind address (use `0.0.0.0` for Docker/LAN) |
| `MADE_TOKEN` | *(empty)* | Bearer token for auth. If empty, auth is disabled. |
| `MADE_CORS_ORIGIN` | *(empty)* | Allowed CORS origin. If empty, reflects request origin. |
| `MADE_DATA_DIR` | `.made-data` | Directory for session and message storage |
| `MADE_SANDBOX` | `false` | Set to `true` to block dangerous shell commands |

### Authentication

When `MADE_TOKEN` is set, all API requests must include the token:

- **HTTP**: `Authorization: Bearer <token>` header, or `?token=<token>` query param
- **WebSocket**: `?token=<token>` query param on the WS URL

If `MADE_TOKEN` is empty or unset, authentication is disabled (open access).

## Supported Agents

Agents are detected automatically at startup based on whether their CLI is found in `$PATH`.

| Agent ID | Name | CLI Command | How It's Invoked |
|---|---|---|---|
| `hermes` | Hermes Agent | `hermes` | `hermes chat -q <prompt> -Q --yolo` |
| `opencode` | OpenCode | `opencode` | `opencode run <prompt>` |
| `claude` | Claude Code | `claude` | `claude --print <prompt>` |
| `codex` | Codex | `codex` | `codex <prompt> --full-auto` |
| `generic` | Generic CLI | *(configurable)* | Any command; prompt appended as last arg |

To install an agent, install its CLI tool on the same machine/container and ensure it's in `$PATH`. For example:

```bash
# Claude Code
npm install -g @anthropic-ai/claude-code

# OpenAI Codex
npm install -g @openai/codex
```

The `generic` adapter is always available and can run any CLI command.

## API Reference

See **[API.md](./API.md)** for the complete API reference with all endpoints, request/response formats, and curl examples.

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Start the server
npm start
```

Project structure:

```
made-v2/
  src/
    server.mjs          # HTTP + WebSocket server, all route handlers
    agent/
      adapter.mjs       # Base adapter class
      registry.mjs      # Agent detection and resolution
      hermes.mjs        # Hermes Agent adapter
      opencode.mjs      # OpenCode adapter
      claude.mjs        # Claude Code adapter
      codex.mjs         # Codex adapter
      generic.mjs       # Generic CLI adapter
  static/
    index.html          # SPA frontend
    style.css           # Styles
    app.mjs             # Frontend logic
  test/                 # Test suite
  Dockerfile
  docker-compose.yml
  package.json
```

## License

MIT
