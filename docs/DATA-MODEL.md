# DATA MODEL — MADE v2

**DATE:** May 8, 2026  
**STORAGE:** File-based JSON (no database for MVP)

---

## Entities

### Session
```
id              STRING      PK (nanoid, 8 chars)
name            STRING      NOT NULL (user-given name)
workDir         STRING      NOT NULL (absolute path to project dir)
agentId         STRING      NOT NULL (hermes|opencode|claude|codex|generic)
createdAt       ISO8601     NOT NULL
updatedAt       ISO8601     NOT NULL
createdBy       STRING      NOT NULL (user name)
status          ENUM        active|archived
```

### Message
```
id              STRING      PK (nanoid, 12 chars)
sessionId       STRING      FK → Session.id
type            ENUM        user|agent_start|agent_stream|agent_done|system|error
userId          STRING      who sent it (user name or "agent")
content         STRING      message text or streamed chunk
timestamp       ISO8601     NOT NULL
metadata        OBJECT      { exitCode, filesChanged, duration, command }
```

### User (client-side only, localStorage)
```
name            STRING      NOT NULL
avatar          STRING      URL or emoji
joinedAt        ISO8601     
```

### AgentConfig (server-side, from detection)
```
id              STRING      PK (hermes|opencode|claude|codex|generic)
name            STRING      display name
cliCommand      STRING      the binary (hermes, opencode, claude, codex)
available       BOOLEAN     detected on this machine?
adapterPath     STRING      path to adapter .mjs file
```

---

## Relationships

```
User (localStorage)  ──creates──→  Session
Session              1:N          Message
Session              1:1          AgentConfig (current agent)
Session              1:1          GitRepo (workDir)
```

```
User 1──N Session 1──N Message
                      │
                      └──1 AgentConfig
```

---

## Storage

```
.made-data/
  sessions.json       — Array of Session objects
  messages/
    {sessionId}.json   — Array of Message objects for each session
  
localStorage (browser):
  made-user           — User object { name, avatar, joinedAt }
  made-settings       — UI preferences (theme, last session, etc.)
```

---

## Key Decisions

```
DECISION: File-based JSON storage, no database
REASON: MVP, single-user self-hosted. JSON files are portable, 
        inspectable, zero-config. Migration path: SQLite → PostgreSQL.
TRADE-OFF: No concurrent write safety, no queries. Acceptable for MVP.

DECISION: Nanoid for IDs instead of UUID
REASON: Shorter (8 chars), URL-safe, unique enough for single-instance.
TRADE-OFF: Not globally unique. Fine for single-server MVP.

DECISION: Messages stored per-session file
REASON: A session might accumulate 1000+ messages. One big file gets slow.
TRADE-OFF: More files to manage. Acceptable trade-off.
```
