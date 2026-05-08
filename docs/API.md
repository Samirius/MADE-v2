# API Reference — MADE v0.1.0

Base URL: `http://HOST:3100`

All endpoints return JSON. Authentication via `Authorization:Bearer TOKEN` header or `?token=` query param (when `MADE_TOKEN` is set).

---

## Health

### GET /health

Returns server status and available agents.

**Response 200:**
```json
{
  "status": "ok",
  "version": "0.1.0",
  "agentsAvailable": ["hermes"]
}
```

---

## Agents

### GET /api/agents

List all detected agent adapters with availability.

**Response 200:**
```json
[
  { "id": "hermes", "name": "Hermes", "available": true, "command": "hermes" },
  { "id": "claude", "name": "Claude Code", "available": false, "command": "claude" }
]
```

---

## Sessions

### GET /api/sessions

List all sessions.

**Response 200:** Array of session objects.

### POST /api/sessions

Create a new session.

**Body:**
```json
{
  "name": "My Project",
  "workDir": "/home/user/project",
  "agentId": "hermes",
  "userId": "anonymous"
}
```

**Response 201:**
```json
{
  "id": "aBcD1234",
  "name": "My Project",
  "workDir": "/home/user/project",
  "agentId": "hermes",
  "createdBy": "anonymous",
  "status": "active",
  "createdAt": "2026-05-08T12:00:00.000Z",
  "updatedAt": "2026-05-08T12:00:00.000Z"
}
```

### GET /api/sessions/:id

Get session details.

### DELETE /api/sessions/:id

Delete a session and its messages.

---

## Messages

### GET /api/sessions/:id/messages

List all messages for a session.

**Response 200:** Array of message objects with types: `system`, `agent_start`, `agent_stream`, `agent_done`.

---

## Agent Control

### POST /api/sessions/:id/agent

Start an agent for a session.

**Body:**
```json
{
  "prompt": "Fix the login bug",
  "agentId": "hermes",
  "userId": "anonymous"
}
```

**Response 200:** `{ "ok": true, "message": "Agent started" }`

Agent output streams via WebSocket and is stored as messages.

### POST /api/sessions/:id/exec/abort

Kill the running agent for a session.

**Response 200:** `{ "ok": true }`

---

## File Browser

### GET /api/sessions/:id/files?path=subdir

List files in a directory within the session workDir.

**Response 200:**
```json
[
  { "name": "index.js", "type": "file", "size": 1024 },
  { "name": "src", "type": "dir", "size": 0 }
]
```

### GET /api/sessions/:id/file?path=src/index.js

Read a file's content.

**Response 200:**
```json
{
  "content": "console.log('hello')",
  "language": "js",
  "path": "src/index.js",
  "size": 22
}
```

---

## Git

### GET /api/sessions/:id/git/status

Returns branch, modified file count, and last commit.

### GET /api/sessions/:id/git/diff

Returns unified diff of working tree changes.

### POST /api/sessions/:id/git/commit

**Body:** `{ "message": "fix: login bug" }`

Stages all changes and commits. Returns `{ "ok": true, "sha": "abc1234" }`.

### POST /api/sessions/:id/git/discard

Resets working tree to last commit (`git checkout -- .` + `git clean -fd`).

---

## WebSocket

Connect to `ws://HOST:3100/ws?sessionId=ID[&token=TOKEN]`

### Incoming messages (server → client)

```json
{ "type": "connected", "sessionId": "..." }
{ "type": "agent_stream", "content": "...", ... }
{ "type": "agent_done", "content": "Agent finished (exit code 0)", ... }
```

### Outgoing messages (client → server)

```json
{ "type": "prompt", "prompt": "Fix the bug" }
```

---

## Error Responses

All errors follow this shape:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Human-readable description"
  }
}
```

Common codes: `UNAUTHORIZED`, `NOT_FOUND`, `SESSION_NOT_FOUND`, `MISSING_PROMPT`, `AGENT_UNAVAILABLE`, `UNSAFE_COMMAND`, `FORBIDDEN`, `INVALID_PATH`, `GIT_ERROR`, `READ_ERROR`.
