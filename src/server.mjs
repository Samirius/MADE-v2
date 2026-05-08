import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join, resolve, relative, extname, basename } from "node:path";
import { execSync, spawn } from "node:child_process";
import { WebSocketServer } from "ws";
import { randomBytes } from "node:crypto";
import { createGzip } from "node:zlib";

import { resolveAdapter, detectAll } from "./agent/registry.mjs";

// ─── Config ──────────────────────────────────────────────
const PORT = parseInt(process.env.MADE_PORT || "3100", 10);
const HOST = process.env.MADE_HOST || "127.0.0.1";
const TOKEN = process.env.MADE_TOKEN || "";
const CORS_ORIGIN = process.env.MADE_CORS_ORIGIN || "";
const DATA_DIR = process.env.MADE_DATA_DIR || ".made-data";
const SANDBOX = process.env.MADE_SANDBOX === "true";
const VERSION = "0.1.0";

// ─── Data Store ──────────────────────────────────────────
function ensureDataDir() {
  mkdirSync(join(DATA_DIR, "messages"), { recursive: true });
  if (!existsSync(join(DATA_DIR, "sessions.json"))) {
    writeFileSync(join(DATA_DIR, "sessions.json"), "[]");
  }
}

function loadSessions() {
  try { return JSON.parse(readFileSync(join(DATA_DIR, "sessions.json"), "utf-8")); }
  catch { return []; }
}

function saveSessions(sessions) {
  writeFileSync(join(DATA_DIR, "sessions.json"), JSON.stringify(sessions, null, 2));
}

function loadMessages(sessionId) {
  const path = join(DATA_DIR, "messages", `${sessionId}.json`);
  try { return JSON.parse(readFileSync(path, "utf-8")); }
  catch { return []; }
}

function saveMessages(sessionId, messages) {
  writeFileSync(join(DATA_DIR, "messages", `${sessionId}.json`), JSON.stringify(messages, null, 2));
}

function appendMessage(sessionId, msg) {
  const messages = loadMessages(sessionId);
  messages.push(msg);
  saveMessages(sessionId, messages);
}

function nanoid(len = 8) {
  return randomBytes(len).toString("base64url").slice(0, len);
}

// ─── Security ────────────────────────────────────────────
function isPathSafe(workDir, requestedPath) {
  const resolved = resolve(workDir, requestedPath);
  return resolved.startsWith(resolve(workDir));
}

const DANGEROUS_PATTERNS = [/\brm\s+-rf\s+\//i, /\bsudo\b/i, /\bmkfs\b/i, /\bdd\s+if=/i];
function isCommandSafe(cmd) {
  if (!SANDBOX) return true;
  return !DANGEROUS_PATTERNS.some(p => p.test(cmd));
}

function checkAuth(req) {
  if (!TOKEN) return true;
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ") && header.slice(7) === TOKEN) return true;
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.searchParams.get("token") === TOKEN) return true;
  return false;
}

// ─── HTTP Helpers ────────────────────────────────────────
function json(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function corsHeaders(req, res) {
  const origin = CORS_ORIGIN || req.headers.origin || "";
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  }
}

// ─── MIME Types ──────────────────────────────────────────
const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif",
  ".webp": "image/webp", ".ico": "image/x-icon", ".svg": "image/svg+xml",
  ".woff": "font/woff", ".woff2": "font/woff2",
};

// ─── Running Agents ──────────────────────────────────────
const runningAgents = new Map(); // sessionId → { process, adapter }

// ─── Route Handler ──────────────────────────────────────
function handleAPI(req, res, urlPath, method) {
  // CORS preflight
  if (method === "OPTIONS") { corsHeaders(req, res); res.writeHead(204); res.end(); return; }
  corsHeaders(req, res);

  // Auth check
  if (TOKEN && !checkAuth(req)) return json(res, { error: { code: "UNAUTHORIZED", message: "Invalid or missing token" } }, 401);

  // Read body for POST
  const readBody = () => new Promise((resolve) => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });

  // ── Health
  if (urlPath === "/health" && method === "GET") {
    const agents = detectAll().map(a => a.id);
    return json(res, { status: "ok", version: VERSION, agentsAvailable: agents });
  }

  // ── Agents
  if (urlPath === "/api/agents" && method === "GET") {
    return json(res, detectAll());
  }

  // ── Sessions CRUD
  if (urlPath === "/api/sessions" && method === "GET") {
    return json(res, loadSessions());
  }

  if (urlPath === "/api/sessions" && method === "POST") {
    return readBody().then(body => {
      const name = body.name || "Untitled";
      const workDir = body.workDir || process.cwd();
      const agentId = body.agentId || "hermes";
      const userId = body.userId || "anonymous";

      // Validate workDir exists
      if (!existsSync(workDir)) return json(res, { error: { code: "INVALID_PATH", message: `Path does not exist: ${workDir}` } }, 400);

      const session = {
        id: nanoid(8),
        name,
        workDir: resolve(workDir),
        agentId,
        createdBy: userId,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const sessions = loadSessions();
      sessions.push(session);
      saveSessions(sessions);
      saveMessages(session.id, [{
        id: nanoid(12),
        sessionId: session.id,
        type: "system",
        userId: "system",
        content: `Session "${name}" created. Agent: ${agentId}. Project: ${workDir}`,
        timestamp: new Date().toISOString(),
        metadata: {},
      }]);

      return json(res, session, 201);
    });
  }

  // Session-specific routes: extract sessionId
  const sessionMatch = urlPath.match(/^\/api\/sessions\/([^/]+)(.*)/);
  if (!sessionMatch) return json(res, { error: { code: "NOT_FOUND", message: "Not found" } }, 404);

  const sessionId = sessionMatch[1];
  const subPath = sessionMatch[2];
  const sessions = loadSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return json(res, { error: { code: "SESSION_NOT_FOUND", message: `Session ${sessionId} not found` } }, 404);

  // GET session
  if (subPath === "" && method === "GET") return json(res, session);

  // DELETE session
  if (subPath === "" && method === "DELETE") {
    const filtered = sessions.filter(s => s.id !== sessionId);
    saveSessions(filtered);
    try { unlinkSync(join(DATA_DIR, "messages", `${sessionId}.json`)); } catch {}
    return json(res, { ok: true }, 204);
  }

  // GET messages
  if (subPath === "/messages" && method === "GET") return json(res, loadMessages(sessionId));

  // ── Agent start
  if (subPath === "/agent" && method === "POST") {
    return readBody().then(body => {
      const prompt = body.prompt;
      const userId = body.userId || "anonymous";
      const agentId = body.agentId || session.agentId;

      if (!prompt) return json(res, { error: { code: "MISSING_PROMPT", message: "Prompt is required" } }, 400);
      if (!isCommandSafe(prompt)) return json(res, { error: { code: "UNSAFE_COMMAND", message: "Prompt contains blocked pattern" } }, 400);

      // Kill existing agent if running
      if (runningAgents.has(sessionId)) {
        try { runningAgents.get(sessionId).process.kill(); } catch {}
        runningAgents.delete(sessionId);
      }

      const adapter = resolveAdapter(agentId);
      if (!adapter || !adapter.detect().available) {
        return json(res, { error: { code: "AGENT_UNAVAILABLE", message: `Agent ${agentId} not available` } }, 400);
      }

      adapter.workDir = session.workDir;
      const proc = adapter.start(prompt);
      runningAgents.set(sessionId, { process: proc, adapter });

      // Log start
      const startMsg = { id: nanoid(12), sessionId, type: "agent_start", userId: "system", content: prompt, timestamp: new Date().toISOString(), metadata: { agentId } };
      appendMessage(sessionId, startMsg);
      broadcast(sessionId, startMsg);

      // Stream stdout
      proc.stdout.on("data", chunk => {
        const content = chunk.toString();
        const msg = { id: nanoid(12), sessionId, type: "agent_stream", userId: "agent", content, timestamp: new Date().toISOString(), metadata: {} };
        appendMessage(sessionId, msg);
        broadcast(sessionId, msg);
      });

      // Stream stderr
      proc.stderr.on("data", chunk => {
        const content = chunk.toString();
        const msg = { id: nanoid(12), sessionId, type: "agent_stream", userId: "agent", content, timestamp: new Date().toISOString(), metadata: { stream: "stderr" } };
        appendMessage(sessionId, msg);
        broadcast(sessionId, msg);
      });

      // Agent done
      proc.on("close", code => {
        runningAgents.delete(sessionId);
        const doneMsg = { id: nanoid(12), sessionId, type: "agent_done", userId: "agent", content: `Agent finished (exit code ${code})`, timestamp: new Date().toISOString(), metadata: { exitCode: code } };
        appendMessage(sessionId, doneMsg);
        broadcast(sessionId, doneMsg);
      });

      return json(res, { ok: true, message: "Agent started" });
    });
  }

  // ── Agent abort
  if (subPath === "/exec/abort" && method === "POST") {
    if (runningAgents.has(sessionId)) {
      try { runningAgents.get(sessionId).process.kill(); } catch {}
      runningAgents.delete(sessionId);
      return json(res, { ok: true });
    }
    return json(res, { ok: true, message: "No agent running" });
  }

  // ── File browser
  if (subPath === "/files" && method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const dirPath = url.searchParams.get("path") || "";
    const fullDir = join(session.workDir, dirPath);
    if (!isPathSafe(session.workDir, dirPath || ".")) return json(res, { error: { code: "FORBIDDEN", message: "Path outside workDir" } }, 403);
    if (!existsSync(fullDir)) return json(res, { error: { code: "NOT_FOUND", message: "Directory not found" } }, 404);

    try {
      const entries = readdirSync(fullDir, { withFileTypes: true }).map(e => ({
        name: e.name,
        type: e.isDirectory() ? "dir" : "file",
        size: e.isFile() ? statSync(join(fullDir, e.name)).size : 0,
      }));
      return json(res, entries);
    } catch (e) { return json(res, { error: { code: "READ_ERROR", message: e.message } }, 500); }
  }

  // ── Read file
  if (subPath === "/file" && method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const filePath = url.searchParams.get("path") || "";
    if (!isPathSafe(session.workDir, filePath)) return json(res, { error: { code: "FORBIDDEN", message: "Path outside workDir" } }, 403);
    const fullPath = join(session.workDir, filePath);
    if (!existsSync(fullPath)) return json(res, { error: { code: "NOT_FOUND", message: "File not found" } }, 404);

    try {
      const content = readFileSync(fullPath, "utf-8");
      const ext = extname(filePath);
      return json(res, { content, language: ext.replace(".", ""), path: filePath, size: content.length });
    } catch (e) { return json(res, { error: { code: "READ_ERROR", message: e.message } }, 500); }
  }

  // ── Git status
  if (subPath === "/git/status" && method === "GET") {
    try {
      const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: session.workDir, encoding: "utf-8" }).trim();
      const statusRaw = execSync("git status --porcelain", { cwd: session.workDir, encoding: "utf-8" }).trim();
      const lastCommit = execSync("git log -1 --oneline", { cwd: session.workDir, encoding: "utf-8" }).trim();
      const modified = statusRaw.split("\n").filter(l => l.trim()).length;
      return json(res, { branch, modified, untracked: 0, lastCommit, raw: statusRaw });
    } catch (e) { return json(res, { error: { code: "GIT_ERROR", message: e.message } }, 500); }
  }

  // ── Git diff
  if (subPath === "/git/diff" && method === "GET") {
    try {
      const diff = execSync("git diff", { cwd: session.workDir, encoding: "utf-8", maxBuffer: 5 * 1024 * 1024 });
      return json(res, { diff });
    } catch (e) { return json(res, { error: { code: "GIT_ERROR", message: e.message } }, 500); }
  }

  // ── Git commit
  if (subPath === "/git/commit" && method === "POST") {
    return readBody().then(body => {
      const message = body.message || "Changes from MADE agent";
      try {
        execSync("git add -A", { cwd: session.workDir });
        execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: session.workDir });
        const sha = execSync("git rev-parse --short HEAD", { cwd: session.workDir, encoding: "utf-8" }).trim();
        return json(res, { ok: true, sha });
      } catch (e) { return json(res, { error: { code: "GIT_ERROR", message: e.message } }, 500); }
    });
  }

  return json(res, { error: { code: "NOT_FOUND", message: "Not found" } }, 404);
}

// ─── WebSocket ───────────────────────────────────────────
const wss = new WebSocketServer({ noServer: true });
const clients = new Map(); // ws → { sessionId }

function broadcast(sessionId, msg) {
  for (const [ws, info] of clients) {
    if (info.sessionId === sessionId && ws.readyState === 1) {
      ws.send(JSON.stringify(msg));
    }
  }
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get("sessionId");
  const token = url.searchParams.get("token");

  if (TOKEN && token !== TOKEN) { ws.close(4001, "Unauthorized"); return; }
  if (!sessionId) { ws.close(4002, "Missing sessionId"); return; }

  clients.set(ws, { sessionId });
  ws.send(JSON.stringify({ type: "connected", sessionId }));

  ws.on("message", raw => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === "prompt") {
        // Forward to agent endpoint logic
        handleAPI.__agentFromWS(sessionId, msg);
      }
    } catch {}
  });

  ws.on("close", () => clients.delete(ws));
});

// ─── Static File Server ──────────────────────────────────
function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  const fullPath = join("static", filePath);

  if (!existsSync(fullPath) || statSync(fullPath).isDirectory()) {
    // SPA fallback
    const fallback = join("static", "index.html");
    if (existsSync(fallback)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(readFileSync(fallback));
    }
    return json(res, { error: "Not found" }, 404);
  }

  const ext = extname(fullPath);
  const contentType = MIME[ext] || "application/octet-stream";
  const content = readFileSync(fullPath);

  // Cache static assets for 1 day, HTML no-cache
  const cacheControl = ext === ".html" ? "no-cache" : "public, max-age=86400";

  // Gzip compression for text files
  if ([".html", ".css", ".js", ".mjs", ".json", ".svg"].includes(ext)) {
    res.writeHead(200, { "Content-Type": contentType, "Cache-Control": cacheControl, "Content-Encoding": "gzip" });
    const gz = createGzip();
    gz.end(content);
    gz.pipe(res);
  } else {
    res.writeHead(200, { "Content-Type": contentType, "Cache-Control": cacheControl });
    res.end(content);
  }
}

// ─── Main Server ─────────────────────────────────────────
ensureDataDir();

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const urlPath = url.pathname;
  const method = req.method;

  // API routes
  if (urlPath.startsWith("/api/") || urlPath === "/health") {
    return handleAPI(req, res, urlPath, method);
  }

  // Static files
  return serveStatic(req, res);
});

// WebSocket upgrade
server.on("upgrade", (req, socket, head) => {
  if (new URL(req.url, `http://${req.headers.host}`).pathname === "/ws") {
    wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws, req));
  }
});

server.listen(PORT, HOST, () => {
  if (!TOKEN) console.log("⚠ WARNING: MADE_TOKEN not set — authentication disabled.");
  const agents = detectAll().filter(a => a.available).map(a => a.id);
  console.log(`MADE v${VERSION} — http://${HOST}:${PORT}`);
  console.log(`Agents available: ${agents.length ? agents.join(", ") : "none"}`);
});

export { handleAPI, broadcast };
