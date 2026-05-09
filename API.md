# MADE v2 — API Reference

Base URL: `http://localhost:3100`

Authentication (when `MADE_TOKEN` is set): include `Authorization: Bearer <token>` header or `?token=<token>` query parameter on any request.

All responses are JSON. Error responses follow this shape:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

---

## Table of Contents

1. [Health Check](#health-check)
2. [Agents](#agents)
3. [Sessions](#sessions)
4. [Messages](#messages)
5. [Agent Execution](#agent-execution)
6. [File Browser](#file-browser)
7. [Git Operations](#git-operations)
8. [WebSocket](#websocket)

---

## Health Check

### GET /health

Returns server status, version, and available agents.

**Response** `200`

```json
{
  "status": "ok",
  "version": "0.1.0",
  "agentsAvailable": ["hermes", "claude"]
}
```

**Example**

```bash
curl http://localhost:3100/health
```

---

## Agents

### GET /api/agents

Lists all registered agents with their availability status.

**Response** `200` — Array of agent objects:

```json
[
  {
    "id": "hermes",
    "name": "Hermes Agent",
    "available": true,
    "cliCommand": "hermes"
  },
  {
    "id": "claude",
    "name": "Claude Code",
    "available": false,
    "cliCommand": "claude"
  }
]
```

**Example**

```bash
curl http://localhost:3100/api/agents
```

---

## Sessions

### POST /api/sessions

Create a new coding session.

**Request Body**

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | string | `"Untitled"` | Display name for the session |
| `workDir` | string | `process.cwd()` | Absolute path to the project directory |
| `agentId` | string | `"hermes"` | Agent to use for this session |
| `userId` | string | `"anonymous"` | Creator identifier |

**Response** `201`

```json
{
  "id": "aBcDeFgH",
  "name": "My Project",
  "workDir": "/home/user/my-project",
  "agentId": "hermes",
  "createdBy": "anonymous",
  "status": "active",
  "createdAt": "2026-05-09T14:30:00.000Z",
  "updatedAt": "2026-05-09T14:30:00.000Z"
}
```

**Error** `400` — `INVALID_PATH` if workDir does not exist.

**Example**

```bash
curl -X POST http://localhost:3100/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Project",
    "workDir": "/home/user/my-project",
    "agentId": "claude"
  }'
```

### GET /api/sessions

List all sessions.

**Response** `200` — Array of session objects (see POST response for shape).

**Example**

```bash
curl http://localhost:3100/api/sessions
```

### GET /api/sessions/:id

Get a single session by ID.

**Response** `200` — Session object.

**Error** `404` — `SESSION_NOT_FOUND`.

**Example**

```bash
curl http://localhost:3100/api/sessions/aBcDeFgH
```

### DELETE /api/sessions/:id

Delete a session and its message history.

**Response** `204`

```json
{ "ok": true }
```

**Error** `404` — `SESSION_NOT_FOUND`.

**Example**

```bash
curl -X DELETE http://localhost:3100/api/sessions/aBcDeFgH
```

---

## Messages

### GET /api/sessions/:id/messages

Retrieve all messages for a session.

**Response** `200` — Array of message objects:

```json
[
  {
    "id": "xYz123456789",
    "sessionId": "aBcDeFgH",
    "type": "system",
    "userId": "system",
    "content": "Session \"My Project\" created. Agent: hermes. Project: /home/user/my-project",
    "timestamp": "2026-05-09T14:30:00.000Z",
    "metadata": {}
  }
]
```

Message types: `system`, `user`, `agent_start`, `agent_stream`, `agent_done`.

**Example**

```bash
curl http://localhost:3100/api/sessions/aBcDeFgH/messages
```

### POST /api/sessions/:id/messages

Send a user message to a session. The message is stored and broadcast to connected WebSocket clients.

**Request Body**

| Field | Type | Default | Description |
|---|---|---|---|
| `type` | string | `"user"` | Message type |
| `userId` | string | `"anonymous"` | Sender identifier |
| `content` | string | `""` | Message text |

**Response** `200`

```json
{ "ok": true }
```

**Example**

```bash
curl -X POST http://localhost:3100/api/sessions/aBcDeFgH/messages \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user",
    "content": "Please fix the bug in auth.ts"
  }'
```

---

## Agent Execution

### POST /api/sessions/:id/agent

Start an agent for the session. If an agent is already running for this session, it is killed first. Agent output is streamed via WebSocket and stored as messages.

**Request Body**

| Field | Type | Default | Description |
|---|---|---|---|
| `prompt` | string | *required* | The task/prompt for the agent |
| `userId` | string | `"anonymous"` | User identifier |
| `agentId` | string | session's agent | Override the session's default agent |

**Response** `200`

```json
{ "ok": true, "message": "Agent started" }
```

**Errors**

| Status | Code | When |
|---|---|---|
| `400` | `MISSING_PROMPT` | `prompt` field is missing |
| `400` | `UNSAFE_COMMAND` | Prompt matches a blocked pattern (sandbox mode) |
| `400` | `AGENT_UNAVAILABLE` | Requested agent is not installed |

**Streaming behavior** — After the agent starts, three types of messages are broadcast over WebSocket:

1. `agent_start` — agent process spawned
2. `agent_stream` — stdout/stderr chunks as they arrive
3. `agent_done` — agent process exited (includes `exitCode` in metadata)

**Example**

```bash
curl -X POST http://localhost:3100/api/sessions/aBcDeFgH/agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Add unit tests for the auth module",
    "agentId": "claude"
  }'
```

### POST /api/sessions/:id/exec/abort

Kill the currently running agent for a session.

**Response** `200`

```json
{ "ok": true }
```

If no agent is running:

```json
{ "ok": true, "message": "No agent running" }
```

**Example**

```bash
curl -X POST http://localhost:3100/api/sessions/aBcDeFgH/exec/abort
```

---

## File Browser

### GET /api/sessions/:id/files

List directory contents within the session's workspace.

**Query Parameters**

| Param | Default | Description |
|---|---|---|
| `path` | `""` (root) | Relative path within the workspace |

**Response** `200` — Array of entries:

```json
[
  { "name": "src", "type": "dir", "size": 0 },
  { "name": "package.json", "type": "file", "size": 1234 },
  { "name": "README.md", "type": "file", "size": 5678 }
]
```

**Errors**

| Status | Code | When |
|---|---|---|
| `403` | `FORBIDDEN` | Path is outside the workspace |
| `404` | `NOT_FOUND` | Directory does not exist |

**Example**

```bash
curl "http://localhost:3100/api/sessions/aBcDeFgH/files?path=src"
```

### GET /api/sessions/:id/file

Read the contents of a single file within the session's workspace.

**Query Parameters**

| Param | Default | Description |
|---|---|---|
| `path` | *(required)* | Relative path to the file |

**Response** `200`

```json
{
  "content": "export const hello = () => 'world';\n",
  "language": "js",
  "path": "src/index.js",
  "size": 36
}
```

**Errors**

| Status | Code | When |
|---|---|---|
| `403` | `FORBIDDEN` | Path is outside the workspace |
| `404` | `NOT_FOUND` | File does not exist |

**Example**

```bash
curl "http://localhost:3100/api/sessions/aBcDeFgH/file?path=src/index.js"
```

---

## Git Operations

All git operations run against the session's workspace directory.

### GET /api/sessions/:id/git/status

Get the current git status of the workspace.

**Response** `200`

```json
{
  "branch": "main",
  "modified": 3,
  "untracked": 0,
  "lastCommit": "a1b2c3d Initial commit",
  "raw": "M src/auth.ts\nM src/server.ts\n?? new-file.txt"
}
```

**Error** `500` — `GIT_ERROR` if the directory is not a git repo.

**Example**

```bash
curl http://localhost:3100/api/sessions/aBcDeFgH/git/status
```

### GET /api/sessions/:id/git/diff

Get the unstaged diff of the workspace.

**Response** `200`

```json
{
  "diff": "diff --git a/src/auth.ts ...\n..."
}
```

**Example**

```bash
curl http://localhost:3100/api/sessions/aBcDeFgH/git/diff
```

### POST /api/sessions/:id/git/commit

Stage all changes and commit.

**Request Body**

| Field | Type | Default | Description |
|---|---|---|---|
| `message` | string | `"Changes from MADE agent"` | Commit message |

**Response** `200`

```json
{ "ok": true, "sha": "a1b2c3d" }
```

**Error** `500` — `GIT_ERROR` on commit failure.

**Example**

```bash
curl -X POST http://localhost:3100/api/sessions/aBcDeFgH/git/commit \
  -H "Content-Type: application/json" \
  -d '{"message": "Add auth module tests"}'
```

### POST /api/sessions/:id/git/discard

Discard all uncommitted changes (both tracked and untracked files). Runs `git checkout -- .` followed by `git clean -fd`.

**Response** `200`

```json
{ "ok": true }
```

**Error** `500` — `GIT_ERROR` on failure.

**Example**

```bash
curl -X POST http://localhost:3100/api/sessions/aBcDeFgH/git/discard
```

---

## WebSocket

### WS /ws?sessionId=<id>&token=<token>

Connect to a session's real-time event stream.

**Parameters**

| Param | Required | Description |
|---|---|---|
| `sessionId` | yes | The session to subscribe to |
| `token` | if auth enabled | Bearer token for authentication |

**Connection lifecycle**

On connect, the server sends:

```json
{ "type": "connected", "sessionId": "aBcDeFgH" }
```

**Server-to-client messages**

All messages are JSON. Message types sent by the server:

| Type | When | Payload |
|---|---|---|
| `connected` | On connection | `sessionId` |
| `chat_message` | When a user message is posted via REST | `type`, `userId`, `content`, `ts` |
| `agent_start` | Agent process spawned | `id`, `sessionId`, `type`, `content` (the prompt), `metadata.agentId` |
| `agent_stream` | Agent stdout/stderr chunk | `id`, `sessionId`, `content` (text chunk), `metadata.stream` ("stderr" or absent) |
| `agent_done` | Agent process exited | `id`, `sessionId`, `content` ("Agent finished (exit code N)"), `metadata.exitCode` |

**Client-to-server messages**

Clients can send JSON messages. Currently supported:

| Type | Description |
|---|---|
| `prompt` | Triggers agent execution (equivalent to POST /api/sessions/:id/agent) |

**Close codes**

| Code | Meaning |
|---|---|
| `4001` | Unauthorized (invalid or missing token) |
| `4002` | Missing sessionId parameter |

**Example (JavaScript)**

```javascript
const ws = new WebSocket('ws://localhost:3100/ws?sessionId=aBcDeFgH');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log(msg.type, msg.content);
};

// Send a prompt
ws.send(JSON.stringify({ type: 'prompt', prompt: 'Fix the login bug' }));
```

**Example (wscat)**

```bash
wscat -c "ws://localhost:3100/ws?sessionId=aBcDeFgH"
```

---

## Error Codes Summary

| HTTP Status | Code | Description |
|---|---|---|
| 400 | `INVALID_PATH` | workDir does not exist |
| 400 | `MISSING_PROMPT` | prompt field is required |
| 400 | `UNSAFE_COMMAND` | Prompt blocked by sandbox |
| 400 | `AGENT_UNAVAILABLE` | Agent CLI not found in PATH |
| 401 | `UNAUTHORIZED` | Invalid or missing auth token |
| 403 | `FORBIDDEN` | Path traversal outside workspace |
| 404 | `NOT_FOUND` | Route, session, or file not found |
| 404 | `SESSION_NOT_FOUND` | Session ID does not exist |
| 500 | `READ_ERROR` | Filesystem read failure |
| 500 | `GIT_ERROR` | Git command failure |
