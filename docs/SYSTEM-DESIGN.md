# SYSTEM DESIGN — MADE v2

**DATE:** May 8, 2026

---

## System Context

```
                    +------------+
                    | Developer  |
                    | (browser)  |
                    +-----+------+
                          |
                    WebSocket + HTTP
                          |
                          v
+-------+   HTTP    +-------------------+   spawn    +------------------+
| Git   +---------->|                   +----------->| Agent CLI        |
| Provider         |    MADE Server     |            | (hermes/opencode/ |
| (GitHub/etc)     |                    |<-----------|  claude/codex)    |
+-------+          |  - HTTP API        |  stdout/   +------------------+
                   |  - WebSocket hub   |  stderr
                   |  - File browser    |
                   |  - Agent adapters  |   read/    +------------------+
                   |  - Session manager |  write     | Project Directory|
                   +-------------------+----------->| (user's repo)    |
                                                |   +------------------+
                                                |
                                                v
                                           +----------+
                                           | .made-data/
                                           | (sessions,
                                           |  messages)
                                           +----------+
```

---

## Components

### 1. HTTP Server
- **Responsibility:** REST API, static file serving, auth
- **Protocol:** HTTP (Express-style manual routing)
- **Maps to:** REQ-001 (auth), REQ-002 (repo connect), REQ-009 (sessions)

### 2. WebSocket Hub
- **Responsibility:** Real-time bidirectional communication
- **Protocol:** WebSocket (ws library)
- **Maps to:** REQ-005 (real-time output), REQ-004 (prompting)

### 3. Session Manager
- **Responsibility:** CRUD sessions, persist state, manage lifecycle
- **Storage:** .made-data/sessions.json
- **Maps to:** REQ-009 (session management)

### 4. Agent Adapter Layer
- **Responsibility:** Detect, start, stop, stream output from agent CLIs
- **Pattern:** One adapter per agent CLI, common interface
- **Interface:** `detect() → {available}`, `start(prompt) → ChildProcess`, `stop() → void`
- **Maps to:** REQ-003 (agent selection), REQ-004 (prompt), REQ-005 (streaming)

### 5. File Browser
- **Responsibility:** Read directory tree, read file contents, serve uploads
- **Security:** Path traversal protection, workDir sandbox
- **Maps to:** REQ-007 (file browser), REQ-031 (path traversal)

### 6. Diff Engine
- **Responsibility:** Detect file changes, generate diffs, present for review
- **Maps to:** REQ-006 (file change visualization)

### 7. Git Integration
- **Responsibility:** Branch info, status, clone repos, commit approved changes
- **Maps to:** REQ-002 (repo connect), REQ-010 (git status)

### 8. Frontend (SPA)
- **Responsibility:** UI — chat, file tree, diff viewer, session list, settings
- **Tech:** Vanilla HTML/CSS/JS, single index.html
- **Maps to:** All UI-facing requirements

---

## API Endpoints

### Auth & Setup
```
GET  /health                     → { status, version, agentsAvailable }
GET  /api/agents                 → [ { id, name, available, cliCommand } ]
GET  /api/git/providers          → [ { id, name, authMethod } ]
POST /api/git/clone              → { url, token?, provider? } → { path }
```

### Sessions
```
POST /api/sessions               → { name, workDir, agentId } → Session
GET  /api/sessions               → [ Session ]
GET  /api/sessions/:id           → Session
DELETE /api/sessions/:id         → 204
```

### Agent Interaction
```
POST /api/sessions/:id/agent     → { prompt, userId } → { ok }
POST /api/sessions/:id/exec/abort → { ok }
```

### Files
```
GET  /api/sessions/:id/files?path= → [ { name, type, size } ]
GET  /api/sessions/:id/file?path=  → { content, language }
POST /api/sessions/:id/upload      → { url, fileName }
```

### Git
```
GET  /api/sessions/:id/git/status  → { branch, modified, untracked, lastCommit }
GET  /api/sessions/:id/git/diff    → [ { file, additions, deletions, content } ]
POST /api/sessions/:id/git/commit  → { message, files? } → { ok, sha }
```

### Messages
```
GET  /api/sessions/:id/messages   → [ Message ]
```

### WebSocket
```
WS /ws?sessionId=X&token=Y
  Client → Server:  { type: "prompt", content: "...", agentId: "..." }
  Client → Server:  { type: "abort" }
  Server → Client:  { type: "agent_start", agentId: "..." }
  Server → Client:  { type: "agent_stream", content: "..." }
  Server → Client:  { type: "agent_done", exitCode, filesChanged }
  Server → Client:  { type: "agent_error", error: "..." }
  Server → Client:  { type: "presence", users: [...] }
```

---

## Cross-Cutting Concerns

### Auth
```
Strategy: MADE_TOKEN env var (shared secret)
If set: all /api/* endpoints require Authorization: Bearer <token>
If not set: warning on startup, all access allowed (development mode)
WebSocket: token in query param or connection header
```

### Error Handling
```
Format: { "error": { "code": "SESSION_NOT_FOUND", "message": "..." } }
Logging: console.error with structured messages
```

### Configuration
```
All via environment variables:
  MADE_PORT        (default: 3100)
  MADE_TOKEN       (auth token, optional)
  MADE_HOST        (default: 0.0.0.0)
  MADE_DATA_DIR    (default: ./.made-data)
  MADE_CORS_ORIGIN (default: same-origin)
  MADE_SANDBOX     (default: false)
```

---

## Deployment

```
Docker single container:
  FROM node:22-slim
  + build-essential + python3 + make + g++ (for node-pty)
  
  docker run -p 3100:3100 \
    -v /path/to/projects:/projects \
    -e MADE_TOKEN=secret \
    made:latest

  Cost: $5/month VPS (1 vCPU, 1GB RAM, 25GB disk)
```

---

## Requirement Traceability

| REQ | Component | Interface |
|-----|-----------|-----------|
| 001 Auth | HTTP Server | MADE_TOKEN check |
| 002 Repo | Git Integration | POST /api/git/clone, local path |
| 003 Agent Select | Agent Adapters | GET /api/agents |
| 004 Prompt | WebSocket Hub | WS { type: "prompt" } |
| 005 Real-time | WebSocket Hub | WS { type: "agent_stream" } |
| 006 Diff | Diff Engine | GET /git/diff, POST /git/commit |
| 007 File Browser | File Browser | GET /files, GET /file |
| 008 Terminal Log | Frontend | Collapsible cards in chat |
| 009 Sessions | Session Manager | CRUD /api/sessions |
| 010 Git Status | Git Integration | GET /git/status |
| 020 Performance | All | <3s load, <512MB idle |
| 021 Self-host | Docker | Dockerfile |
| 030 Auth Token | HTTP Server | Bearer header |
| 031 Path Traversal | File Browser | workDir sandbox |
| 032 Command Safety | Agent Adapters | Pattern blocking |
