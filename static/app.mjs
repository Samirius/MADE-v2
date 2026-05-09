// MADE v2 — Frontend Application (complete rewrite)
// Vanilla ES module — no framework, no build step, no globals for onclick

const API = ""; // same origin
let currentUser = null;
let currentSession = null;
let ws = null;
let agents = [];
let currentFilePath = ""; // breadcrumb tracker for file browser
let selectedAgent = null;
let lastStreamDiv = null;
let currentStreamOutput = "";

// ─── Utility ───────────────────────────────────────────────
function escapeHtml(text) {
  if (text == null) return "";
  const el = document.createElement("span");
  el.textContent = String(text);
  return el.innerHTML;
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatSize(bytes) {
  if (bytes == null) return "";
  if (bytes < 1024) return bytes + "B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + "KB";
  return (bytes / (1024 * 1024)).toFixed(1) + "MB";
}

function $(id) { return document.getElementById(id); }

// ─── Toast notifications ───────────────────────────────────
function showToast(message, type = "info", duration = 4000) {
  const container = $("toast-container") || createToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function createToastContainer() {
  const c = document.createElement("div");
  c.id = "toast-container";
  c.style.cssText = "position:fixed;top:16px;right:16px;z-index:999;display:flex;flex-direction:column;gap:8px;";
  document.body.appendChild(c);
  return c;
}

// ─── Init ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Health check
  try {
    const res = await fetch(`${API}/health`);
    const data = await res.json();
    if (data.status !== "ok") throw new Error("unhealthy");
  } catch (e) {
    showToast("Server unreachable — check if MADE is running", "error", 10000);
    return;
  }

  // 2. Onboarding check
  const stored = localStorage.getItem("made-user");
  if (stored) {
    try { currentUser = JSON.parse(stored); } catch { currentUser = null; }
  }

  if (!currentUser) {
    $("onboard-overlay").style.display = "flex";
    $("user-name").focus();
    return;
  }

  await init();
});

// ─── FEATURE 1: Onboarding Flow ────────────────────────────
function completeOnboarding() {
  const input = $("user-name");
  const name = input.value.trim();

  if (!name) {
    input.style.borderColor = "var(--red)";
    input.focus();
    return;
  }

  currentUser = { name, joinedAt: new Date().toISOString() };
  localStorage.setItem("made-user", JSON.stringify(currentUser));
  $("onboard-overlay").style.display = "none";
  showToast(`Welcome, ${name}!`, "success");
  init();
}

function showNameChangeModal() {
  const newName = prompt("Change your name:", currentUser?.name || "");
  if (newName && newName.trim()) {
    currentUser.name = newName.trim();
    localStorage.setItem("made-user", JSON.stringify(currentUser));
    updateSidebarUser();
    showToast(`Name updated to ${newName.trim()}`, "success");
  }
}

function updateSidebarUser() {
  const el = $("sidebar-username");
  if (el && currentUser) el.textContent = currentUser.name;
}

// ─── Core Init ─────────────────────────────────────────────
async function init() {
  // Load agents
  try {
    const res = await fetch(`${API}/api/agents`);
    agents = await res.json();
  } catch (e) {
    console.error("Failed to load agents:", e);
    showToast("Failed to load agents", "error");
  }

  updateSidebarUser();
  await loadSessions();

  // Restore last session
  const lastId = localStorage.getItem("made-last-session");
  if (lastId) {
    try {
      const res = await fetch(`${API}/api/sessions`);
      const sessions = await res.json();
      const found = sessions.find(s => s.id === lastId);
      if (found) selectSession(found.id);
    } catch {}
  }
}

// ─── FEATURE 2: Session List ───────────────────────────────
async function loadSessions() {
  try {
    const res = await fetch(`${API}/api/sessions`);
    const sessions = await res.json();
    const list = $("session-list");
    const sidebarEmpty = $("sidebar-empty");

    list.innerHTML = "";

    if (sessions.length > 0) {
      if (sidebarEmpty) sidebarEmpty.style.display = "none";
    } else {
      if (sidebarEmpty) sidebarEmpty.style.display = "";
    }

    sessions.forEach(s => {
      const div = document.createElement("div");
      div.className = `session-item${currentSession?.id === s.id ? " active" : ""}`;
      div.innerHTML = `
        <span class="session-name">${escapeHtml(s.name)}</span>
        <span class="session-meta">${escapeHtml(s.agentId)} · ${new Date(s.createdAt).toLocaleDateString()}</span>
        <button class="session-delete" title="Delete session">&times;</button>
      `;
      div.addEventListener("click", (e) => {
        if (e.target.classList.contains("session-delete")) return;
        selectSession(s.id);
      });
      // Delete button
      const delBtn = div.querySelector(".session-delete");
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteSession(s.id, s.name);
      });
      list.appendChild(div);
    });
  } catch (e) {
    console.error("Failed to load sessions:", e);
  }
}

// ─── FEATURE 3: Session Select ─────────────────────────────
async function selectSession(id) {
  try {
    const res = await fetch(`${API}/api/sessions/${id}`);
    currentSession = await res.json();
    localStorage.setItem("made-last-session", id);
  } catch { return; }

  // Show session view
  $("no-session").style.display = "none";
  $("session-view").style.display = "flex";
  $("session-name").textContent = currentSession.name;
  $("session-agent").textContent = currentSession.agentId;

  // Agent selector
  const select = $("agent-select");
  select.innerHTML = agents.map(a =>
    `<option value="${a.id}" ${!a.available ? "disabled" : ""} ${a.id === currentSession.agentId ? "selected" : ""}>${escapeHtml(a.name)} ${a.available ? "✓" : "(not installed)"}</option>`
  ).join("");

  // Reset file path
  currentFilePath = "";

  // Connect WebSocket
  connectWS(id);

  // Load data
  await loadMessages(id);
  await loadFiles(id, "");
  await loadGitStatus(id);

  // Hide diff panel
  $("diff-panel").style.display = "none";

  // Refresh sidebar highlight
  await loadSessions();
}

// ─── FEATURE 4: Session Delete ─────────────────────────────
async function deleteSession(id, name) {
  if (!confirm(`Delete session "${name}"?\nThis cannot be undone.`)) return;

  try {
    await fetch(`${API}/api/sessions/${id}`, { method: "DELETE" });

    if (currentSession?.id === id) {
      currentSession = null;
      $("session-view").style.display = "none";
      $("no-session").style.display = "";
      if (ws) ws.close();
    }

    localStorage.removeItem("made-last-session");
    await loadSessions();
    showToast(`Session "${name}" deleted`, "success");
  } catch (e) {
    showToast(`Failed to delete: ${e.message}`, "error");
  }
}

// ─── FEATURE 5: WebSocket ──────────────────────────────────
function connectWS(sessionId) {
  if (ws) ws.close();

  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${proto}//${location.host}/ws?sessionId=${sessionId}`);

  ws.onopen = () => {
    setConnectionStatus("connected");
  };

  ws.onerror = () => {
    setConnectionStatus("error");
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "agent_start") {
      appendMessage(msg);
      setAgentStatus("working");
      currentStreamOutput = "";
      lastStreamDiv = null;
    } else if (msg.type === "agent_stream") {
      appendStream(msg);
      currentStreamOutput += msg.content || "";
    } else if (msg.type === "agent_done") {
      handleAgentDone(msg, sessionId);
    } else if (msg.type === "chat_message") {
      if (msg.userId !== currentUser?.name) appendMessage(msg);
    } else if (msg.type === "connected") {
      setConnectionStatus("connected");
    }
  };

  ws.onclose = () => {
    setConnectionStatus("disconnected");
    setTimeout(() => {
      if (currentSession?.id === sessionId) connectWS(sessionId);
    }, 3000);
  };
}

function setConnectionStatus(status) {
  const el = $("connection-status");
  if (!el) return;
  el.className = `conn-${status}`;
  el.textContent = status === "connected" ? "● Live" :
                   status === "disconnected" ? "○ Reconnecting..." :
                   "● Error";
}

// ─── FEATURE 6: Agent Run / Abort ─────────────────────────
function handleAgentDone(msg, sessionId) {
  setAgentStatus("idle");
  $("btn-stop").style.display = "none";
  $("btn-agent").style.display = "";
  lastStreamDiv = null;

  const exitCode = msg.metadata?.exitCode ?? 0;
  const output = currentStreamOutput || msg.content || "";
  currentStreamOutput = "";

  appendCommandCard(exitCode, output);

  // Auto-refresh after agent completes
  loadGitStatus(sessionId);
  loadFiles(sessionId, currentFilePath);
}

async function runAgent() {
  if (!currentSession) return;

  const input = $("agent-input");
  const prompt = input.value.trim();
  if (!prompt) return;

  const agentId = $("agent-select").value;
  input.value = "";

  appendMessage({ type: "user", userId: currentUser.name, content: `→ ${agentId}: ${prompt}` });

  lastStreamDiv = null;
  currentStreamOutput = "";
  $("btn-agent").style.display = "none";
  $("btn-stop").style.display = "";
  setAgentStatus("working");

  try {
    // Collect recent chat history for context
    const msgElements = $("messages").querySelectorAll(".msg");
    const history = [];
    msgElements.forEach(el => {
      const content = el.querySelector(".msg-content")?.textContent || "";
      const label = el.querySelector(".msg-label")?.textContent || "";
      const isAgent = el.classList.contains("msg-agent");
      if (content && content.length < 500) {
        history.push({
          userId: isAgent ? "agent" : label,
          content: content.slice(0, 200),
          type: isAgent ? "agent_stream" : "chat"
        });
      }
    });
    // Keep last 20 messages max
    const trimmedHistory = history.slice(-20);

    await fetch(`${API}/api/sessions/${currentSession.id}/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, userId: currentUser.name, agentId, history: trimmedHistory }),
    });
  } catch (e) {
    appendMessage({ type: "error", userId: "system", content: `Agent failed: ${e.message}` });
    $("btn-agent").style.display = "";
    $("btn-stop").style.display = "none";
    setAgentStatus("error");
  }
}

async function abortAgent() {
  if (!currentSession) return;
  try {
    await fetch(`${API}/api/sessions/${currentSession.id}/exec/abort`, { method: "POST" });
  } catch {}
  $("btn-stop").style.display = "none";
  $("btn-agent").style.display = "";
  setAgentStatus("idle");
  showToast("Agent stopped", "info");
}

function setAgentStatus(status) {
  const el = $("agent-status");
  el.className = `status-${status}`;
  el.textContent = status === "working" ? "Agent working..." :
                   status === "error" ? "Agent error" : "Agent idle";
}

// ─── FEATURE 7: Command Output Cards ──────────────────────
function appendCommandCard(exitCode, output) {
  const container = $("messages");
  const lines = output.split("\n");
  const isLong = lines.length > 10;
  const success = exitCode === 0;

  const card = document.createElement("div");
  card.className = "cmd-card";

  // Header
  const header = document.createElement("div");
  header.className = "cmd-card-header";

  const badge = document.createElement("span");
  badge.className = `exit-badge ${success ? "success" : "failure"}`;
  badge.textContent = `exit ${exitCode}`;

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "cmd-card-toggle";
  toggleBtn.textContent = isLong ? "▶ Show output" : "▼ Hide output";

  header.appendChild(badge);
  header.appendChild(toggleBtn);

  // Body
  const body = document.createElement("div");
  body.className = "cmd-card-body";
  if (isLong) body.classList.add("collapsed");
  body.textContent = output;

  // Toggle
  header.addEventListener("click", () => {
    const collapsed = body.classList.toggle("collapsed");
    toggleBtn.textContent = collapsed ? "▶ Show output" : "▼ Hide output";
  });

  card.appendChild(header);
  card.appendChild(body);
  container.appendChild(card);
  container.scrollTop = container.scrollHeight;
}

function appendAgentCard(prompt, output, exitCode) {
  const container = $("messages");
  const success = exitCode === 0;
  const lines = output.split("\n");
  const isLong = lines.length > 10;

  // User's prompt as a message
  const promptDiv = document.createElement("div");
  promptDiv.className = "msg msg-user";
  promptDiv.innerHTML =
    `<div class="msg-header"><span class="msg-label">${escapeHtml(currentUser?.name || "user")}</span></div>` +
    `<div class="msg-content">${escapeHtml(prompt)}</div>`;
  container.appendChild(promptDiv);

  // Agent response card
  const card = document.createElement("div");
  card.className = "msg msg-agent";

  const header = document.createElement("div");
  header.className = "msg-header";

  const badge = document.createElement("span");
  badge.className = `exit-badge ${success ? "success" : "failure"}`;
  badge.textContent = `exit ${exitCode}`;

  const label = document.createElement("span");
  label.className = "msg-label";
  label.textContent = "agent";

  const toggleBtn = document.createElement("span");
  toggleBtn.className = "cmd-card-toggle";
  toggleBtn.textContent = isLong ? "▶" : "";
  toggleBtn.style.cursor = isLong ? "pointer" : "default";

  header.appendChild(label);
  header.appendChild(badge);
  if (isLong) header.appendChild(toggleBtn);

  const body = document.createElement("div");
  body.className = "msg-content";
  if (isLong) {
    body.classList.add("collapsed");
    header.addEventListener("click", () => {
      const collapsed = body.classList.toggle("collapsed");
      toggleBtn.textContent = collapsed ? "▶" : "▼";
    });
  }
  body.textContent = output;

  card.appendChild(header);
  card.appendChild(body);
  container.appendChild(card);
  container.scrollTop = container.scrollHeight;
}

// ─── FEATURE 8: Chat Messages with Timestamps ─────────────
async function loadMessages(sessionId) {
  try {
    const res = await fetch(`${API}/api/sessions/${sessionId}/messages`);
    const data = await res.json();
    const container = $("messages");
    container.innerHTML = "";

    const raw = Array.isArray(data) ? data : (data.messages || []);
    if (raw.length === 0) {
      container.innerHTML = '<div class="msg-empty">No messages yet. Say something or run an agent.</div>';
      return;
    }

    // Merge consecutive agent_stream messages into single blocks
    const merged = [];
    for (const msg of raw) {
      const type = msg.type === "chat_message" ? "chat" : msg.type;
      const last = merged[merged.length - 1];
      if (type === "agent_stream" && last && last.type === "agent_stream") {
        // Append content to previous stream block
        last.content += msg.content || "";
      } else {
        merged.push({ ...msg, type });
      }
    }

    // Render: group agent_start + agent_stream + agent_done into one card
    let i = 0;
    while (i < merged.length) {
      const msg = merged[i];

      if (msg.type === "agent_start") {
        // Collect the full agent response: start + streams + done
        const prompt = msg.content || "";
        let output = "";
        let exitCode = 0;
        i++;
        while (i < merged.length && merged[i].type !== "agent_start" && merged[i].type !== "chat" && merged[i].type !== "system") {
          if (merged[i].type === "agent_stream") {
            output += merged[i].content || "";
          } else if (merged[i].type === "agent_done") {
            exitCode = merged[i].metadata?.exitCode ?? 0;
          }
          i++;
        }
        // Render as one card
        appendAgentCard(prompt, output, exitCode);
      } else {
        appendMessage(msg);
        i++;
      }
    }

    container.scrollTop = container.scrollHeight;
  } catch {}
}

function appendMessage(msg) {
  const container = $("messages");
  // Remove empty state if present
  const emptyEl = container.querySelector(".msg-empty");
  if (emptyEl) emptyEl.remove();

  const div = document.createElement("div");

  const typeClass =
    msg.type === "user" ? "msg-user" :
    msg.type === "agent_stream" ? "msg-agent msg-stream" :
    msg.type === "agent_done" ? "msg-agent" :
    msg.type === "agent_start" ? "msg-agent" :
    msg.type === "error" ? "msg-error" : "msg-system";

  const label = msg.userId === currentUser?.name ? currentUser.name : (msg.userId || "system");
  const time = formatTime(msg.timestamp || msg.ts);

  div.className = `msg ${typeClass}`;
  div.innerHTML =
    `<div class="msg-header">` +
      `<span class="msg-label">${escapeHtml(label)}</span>` +
      `<span class="msg-time">${time}</span>` +
    `</div>` +
    `<div class="msg-content">${escapeHtml(msg.content)}</div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendStream(msg) {
  if (lastStreamDiv && msg.type === "agent_stream") {
    lastStreamDiv.querySelector(".msg-content").textContent += msg.content || "";
    const container = $("messages");
    container.scrollTop = container.scrollHeight;
  } else {
    const container = $("messages");
    const div = document.createElement("div");
    div.className = "msg msg-agent msg-stream";
    div.innerHTML =
      `<div class="msg-header">` +
        `<span class="msg-label">agent</span>` +
        `<span class="msg-time">${formatTime(new Date().toISOString())}</span>` +
      `</div>` +
      `<div class="msg-content">${escapeHtml(msg.content)}</div>`;
    container.appendChild(div);
    lastStreamDiv = div;
    container.scrollTop = container.scrollHeight;
  }
}

async function sendChat() {
  if (!currentSession) return;

  const input = $("chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  const msg = {
    type: "user",
    userId: currentUser.name,
    content: text,
    timestamp: new Date().toISOString(),
  };

  appendMessage(msg);

  try {
    await fetch(`${API}/api/sessions/${currentSession.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    });
  } catch {}
}

// ─── FEATURE 9: File Browser with Breadcrumb ──────────────
async function loadFiles(sessionId, path) {
  currentFilePath = path;
  const tree = $("file-tree");

  try {
    const res = await fetch(`${API}/api/sessions/${sessionId}/files?path=${encodeURIComponent(path)}`);
    const entries = await res.json();

    if (!Array.isArray(entries)) {
      const errMsg = entries?.error?.message || "Unable to load files";
      tree.innerHTML = `<div class="file-error">⚠ ${escapeHtml(errMsg)}</div>`;
      updateBreadcrumb(path);
      return;
    }

    tree.innerHTML = "";
    updateBreadcrumb(path);

    // "Go up" entry if we're in a subdirectory
    if (path) {
      const up = document.createElement("div");
      up.className = "file-entry dir";
      up.textContent = "📁 ..";
      up.addEventListener("click", () => {
        const parent = path.split("/").slice(0, -1).join("/");
        loadFiles(sessionId, parent);
      });
      tree.appendChild(up);
    }

    const visible = entries.filter(e => !e.name.startsWith(".") && e.name !== "node_modules");
    if (visible.length === 0 && !path) {
      tree.innerHTML = '<div class="file-empty">Empty directory</div>';
      return;
    }

    visible.forEach(e => {
      const fullPath = path ? `${path}/${e.name}` : e.name;
      const isChanged = changedFileList.some(cf => cf.path === fullPath || cf.path === `/${fullPath}`);
      const div = document.createElement("div");
      div.className = `file-entry ${e.type === "dir" ? "dir" : ""} ${isChanged ? "changed" : ""}`;

      const icon = e.type === "dir" ? "📁" : getFileIcon(e.name);
      const size = e.size ? ` (${formatSize(e.size)})` : "";
      div.textContent = `${icon} ${e.name}${size}`;

      div.addEventListener("click", () => fileClick(sessionId, fullPath, e.type === "dir"));
      tree.appendChild(div);
    });
  } catch (e) {
    tree.innerHTML = `<div class="file-error">⚠ ${escapeHtml(e.message)}</div>`;
  }
}

function updateBreadcrumb(path) {
  const bc = $("file-breadcrumb");
  if (!bc) return;

  if (!path) {
    bc.innerHTML = '<span class="bc-root">root</span>';
    return;
  }

  let html = '<span class="bc-root" data-path="">root</span>';
  const parts = path.split("/");
  parts.forEach((part, i) => {
    const crumbPath = parts.slice(0, i + 1).join("/");
    html += ` <span class="bc-sep">/</span> <span class="bc-part" data-path="${escapeHtml(crumbPath)}">${escapeHtml(part)}</span>`;
  });
  bc.innerHTML = html;

  // Wire breadcrumb clicks
  bc.querySelectorAll("[data-path]").forEach(el => {
    el.addEventListener("click", () => {
      if (currentSession) loadFiles(currentSession.id, el.dataset.path);
    });
  });
}

function getFileIcon(name) {
  const ext = name.split(".").pop().toLowerCase();
  const icons = {
    js: "📜", mjs: "📜", ts: "📜", jsx: "⚛️", tsx: "⚛️",
    py: "🐍", rb: "💎", go: "🔵", rs: "🦀", java: "☕",
    html: "🌐", css: "🎨", scss: "🎨", json: "📋", yaml: "📋", yml: "📋", toml: "📋",
    md: "📝", txt: "📄", sh: "🔧", bash: "🔧",
    png: "🖼️", jpg: "🖼️", gif: "🖼️", svg: "🖼️",
    lock: "🔒", env: "🔐",
  };
  return icons[ext] || "📄";
}

function fileClick(sessionId, path, isDir) {
  if (isDir) {
    loadFiles(sessionId, path);
  } else {
    fetch(`${API}/api/sessions/${sessionId}/file?path=${encodeURIComponent(path)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          showToast(data.error.message, "error");
          return;
        }
        const content = data.content || "";
        // Check for binary-like content
        if (isBinaryContent(content, path)) {
          appendMessage({ type: "system", userId: "system", content: `📄 ${path}\n(Binary file — ${formatSize(data.size)})` });
        } else {
          const truncated = content.length > 2000;
          const display = truncated ? content.slice(0, 2000) + "\n... (truncated)" : content;
          appendMessage({ type: "system", userId: "system", content: `📄 ${path}\n${display}` });
        }
      })
      .catch(e => showToast(`Failed to read file: ${e.message}`, "error"));
  }
}

function isBinaryContent(content, filename) {
  // Check by extension first
  const binaryExts = ["png", "jpg", "jpeg", "gif", "webp", "ico", "woff", "woff2", "ttf", "eot", "zip", "gz", "tar", "mp3", "mp4", "wav", "avi", "mov", "pdf"];
  const ext = filename.split(".").pop().toLowerCase();
  if (binaryExts.includes(ext)) return true;

  // Check for null bytes in first 8KB
  const sample = content.slice(0, 8192);
  for (let i = 0; i < sample.length; i++) {
    if (sample.charCodeAt(i) === 0) return true;
  }
  return false;
}

// ─── FEATURE 10: Git Status + Diff + Commit ───────────────
let changedFileList = [];

async function loadGitStatus(sessionId) {
  try {
    const res = await fetch(`${API}/api/sessions/${sessionId}/git/status`);
    const data = await res.json();

    if (data.error) {
      $("git-branch").textContent = "Git unavailable";
      $("git-status").textContent = data.error.message || "Git error";
      changedFileList = [];
      renderChangedFiles(changedFileList);
      return;
    }

    if (data.branch) {
      $("git-branch").textContent = `${data.branch} (${data.modified} changed)`;
    }

    changedFileList = parseGitStatus(data.raw || "");
    renderChangedFiles(changedFileList);

    const statusEl = $("git-status");
    statusEl.textContent = data.lastCommit || "";
  } catch (e) {
    $("git-branch").textContent = "Git unavailable";
    $("git-status").textContent = e.message || "Failed to load git status";
    changedFileList = [];
    renderChangedFiles(changedFileList);
  }
}

function parseGitStatus(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.split("\n").filter(l => l.trim()).map(line => {
    const statusCode = line.slice(0, 2);
    const filePath = line.slice(3).trim();
    let changeType = "modified";
    if (statusCode.includes("A")) changeType = "added";
    else if (statusCode.includes("D")) changeType = "deleted";
    else if (statusCode.includes("M")) changeType = "modified";
    else if (statusCode.trim() === "??") changeType = "untracked";
    return { path: filePath, status: statusCode.trim(), changeType };
  });
}

function renderChangedFiles(files) {
  const container = $("changed-files");
  if (!files.length) {
    container.innerHTML = '<div class="no-changes">No changes detected</div>';
    return;
  }
  container.innerHTML = "";
  files.forEach(f => {
    const entry = document.createElement("div");
    entry.className = "changed-file-entry";

    const badge = document.createElement("span");
    badge.className = `change-badge ${f.changeType}`;
    badge.textContent = f.changeType.toUpperCase();

    const name = document.createElement("span");
    name.textContent = f.path;

    entry.appendChild(badge);
    entry.appendChild(name);
    entry.addEventListener("click", () => showDiff(f.path));
    container.appendChild(entry);
  });
}

// ─── FEATURE 11: Diff Viewer ──────────────────────────────
async function showDiff(filePath) {
  if (!currentSession) return;
  const panel = $("diff-panel");
  const content = $("diff-content");
  const diffTitle = $("diff-title");

  panel.style.display = "block";
  if (diffTitle) diffTitle.textContent = `Diff: ${filePath}`;
  content.innerHTML = "Loading diff...";

  try {
    const res = await fetch(`${API}/api/sessions/${currentSession.id}/git/diff`);
    const data = await res.json();

    if (data.error) {
      content.innerHTML = `<div class="diff-line" style="color:var(--red)">Error: ${escapeHtml(data.error.message || "Failed to load diff")}</div>`;
      return;
    }

    const filtered = filterDiffForFile(data.diff || "", filePath);
    content.innerHTML = "";

    if (!filtered.trim()) {
      content.innerHTML = `<div class="diff-line" style="color:var(--text2)">No diff available for ${escapeHtml(filePath)}</div>`;
      return;
    }

    filtered.split("\n").forEach(line => {
      const span = document.createElement("span");
      span.className = "diff-line";
      if (line.startsWith("+++") || line.startsWith("---")) {
        span.classList.add("hunk");
      } else if (line.startsWith("@@")) {
        span.classList.add("hunk");
      } else if (line.startsWith("+")) {
        span.classList.add("added");
      } else if (line.startsWith("-")) {
        span.classList.add("removed");
      } else {
        span.classList.add("context");
      }
      span.textContent = line;
      content.appendChild(span);
      content.appendChild(document.createTextNode("\n"));
    });
  } catch (e) {
    content.innerHTML = `<div class="diff-line" style="color:var(--red)">Error: ${escapeHtml(e.message)}</div>`;
  }
}

function filterDiffForFile(diff, filePath) {
  const lines = diff.split("\n");
  const result = [];
  let inFile = false;
  const basename = filePath.split("/").pop();

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      inFile = line.includes(filePath) || line.includes(basename);
    }
    if (inFile) result.push(line);
  }

  return result.length > 0 ? result.join("\n") : diff;
}

// ─── Commit / Discard ─────────────────────────────────────
async function commitChanges() {
  if (!currentSession) return;

  const message = prompt("Enter commit message:");
  if (!message) return;

  if (!confirm(`Approve and commit changes?\n\nMessage: ${message}`)) return;

  try {
    const res = await fetch(`${API}/api/sessions/${currentSession.id}/git/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (data.ok) {
      appendMessage({ type: "system", userId: "system", content: `Committed: ${data.sha}` });
      showToast(`Committed ${data.sha}`, "success");
      loadGitStatus(currentSession.id);
      loadFiles(currentSession.id, currentFilePath);
      $("diff-panel").style.display = "none";
    } else {
      showToast(`Commit failed: ${data.error?.message || "Unknown error"}`, "error");
    }
  } catch (e) {
    showToast(`Commit failed: ${e.message}`, "error");
  }
}

async function discardChanges() {
  if (!currentSession) return;

  if (!confirm("Discard ALL uncommitted changes?\nThis cannot be undone.")) return;

  try {
    const res = await fetch(`${API}/api/sessions/${currentSession.id}/git/discard`, { method: "POST" });
    const data = await res.json();
    if (data.ok) {
      appendMessage({ type: "system", userId: "system", content: "Changes discarded." });
      showToast("Changes discarded", "info");
      loadGitStatus(currentSession.id);
      loadFiles(currentSession.id, currentFilePath);
      $("diff-panel").style.display = "none";
    } else {
      showToast(`Discard failed: ${data.error?.message || "Unknown error"}`, "error");
    }
  } catch (e) {
    showToast(`Discard failed: ${e.message}`, "error");
  }
}

// ─── FEATURE 12: New Session Modal ────────────────────────
function showNewSessionModal() {
  const overlay = $("modal-overlay");
  overlay.style.display = "flex";

  // Reset all fields
  $("new-name").value = "";
  $("new-workdir").value = "";
  $("new-clone-url").value = "";
  $("new-workdir").style.display = "none";
  $("new-clone-url").style.display = "none";
  selectedAgent = null;

  // Reset radio to "fresh"
  const freshRadio = document.querySelector('input[name="proj-type"][value="fresh"]');
  if (freshRadio) freshRadio.checked = true;

  // Populate agent picker
  const picker = $("agent-picker");
  picker.innerHTML = "";
  agents.forEach(a => {
    const div = document.createElement("div");
    div.className = `agent-option ${a.available ? "available" : "unavailable"}`;
    div.dataset.agent = a.id;
    div.innerHTML =
      `<span class="dot ${a.available ? "on" : "off"}"></span>` +
      `<span>${escapeHtml(a.name)}</span>` +
      `<span style="color:var(--text2);font-size:10px">${escapeHtml(a.cliCommand || "")}</span>`;
    if (a.available) {
      div.addEventListener("click", () => selectAgent(a.id, div));
    }
    picker.appendChild(div);
  });

  // Focus the name input
  setTimeout(() => $("new-name").focus(), 50);
}

function selectAgent(id, el) {
  selectedAgent = id;
  document.querySelectorAll(".agent-option").forEach(opt => opt.style.borderColor = "var(--border)");
  el.style.borderColor = "var(--accent)";
}

function hideModal() {
  $("modal-overlay").style.display = "none";
}

async function createSession() {
  const name = $("new-name").value.trim() || "Untitled";
  const projectType = document.querySelector('input[name="proj-type"]:checked')?.value || "fresh";
  const agentId = selectedAgent || agents.find(a => a.available)?.id || "generic";

  let workDir;
  if (projectType === "local") {
    workDir = $("new-workdir").value.trim();
    if (!workDir) {
      $("new-workdir").style.borderColor = "var(--red)";
      $("new-workdir").focus();
      return;
    }
  } else if (projectType === "clone") {
    const url = $("new-clone-url").value.trim();
    if (!url) {
      $("new-clone-url").style.borderColor = "var(--red)";
      $("new-clone-url").focus();
      return;
    }
    showToast("Clone not yet implemented. Clone manually and use local path.", "error", 6000);
    return;
  } else {
    // Fresh project: create a workspace directory under MADE_DATA_DIR/workspaces/
    workDir = "__fresh__";
  }

  try {
    const res = await fetch(`${API}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, workDir, agentId, userId: currentUser?.name || "anonymous" }),
    });

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error?.message || "Failed to create session", "error");
      return;
    }

    const session = await res.json();
    hideModal();
    await loadSessions();
    await selectSession(session.id);
    showToast(`Session "${name}" created`, "success");
  } catch (e) {
    showToast(`Failed: ${e.message}`, "error");
  }
}

// ─── Keyboard + Event Wiring ──────────────────────────────
document.addEventListener("keydown", (e) => {
  // Enter on chat input → send
  if (e.key === "Enter" && document.activeElement === $("chat-input")) {
    e.preventDefault();
    sendChat();
  }
  // Enter on agent input → run
  if (e.key === "Enter" && document.activeElement === $("agent-input")) {
    e.preventDefault();
    runAgent();
  }
  // Enter on onboarding input → complete
  if (e.key === "Enter" && document.activeElement === $("user-name")) {
    e.preventDefault();
    completeOnboarding();
  }
  // Enter on modal name → create
  if (e.key === "Enter" && document.activeElement === $("new-name")) {
    e.preventDefault();
    createSession();
  }
  // Escape → close modal only (NOT onboarding)
  if (e.key === "Escape") {
    if ($("modal-overlay").style.display === "flex") {
      hideModal();
    }
    if ($("diff-panel").style.display === "block") {
      $("diff-panel").style.display = "none";
    }
  }
});

// Wire all buttons via data-action (ES modules — no onclick in HTML)
document.addEventListener("DOMContentLoaded", () => {
  // Primary action buttons
  $("btn-send")?.addEventListener("click", sendChat);
  $("btn-agent")?.addEventListener("click", runAgent);
  $("btn-stop")?.addEventListener("click", abortAgent);
  $("btn-new-session")?.addEventListener("click", showNewSessionModal);

  // Data-action delegation
  const actions = {
    "onboard": completeOnboarding,
    "new-session": showNewSessionModal,
    "cancel": hideModal,
    "create": createSession,
    "commit": commitChanges,
    "discard": discardChanges,
    "close-diff": () => { $("diff-panel").style.display = "none"; },
    "change-name": showNameChangeModal,
  };

  for (const [action, handler] of Object.entries(actions)) {
    document.querySelectorAll(`[data-action="${action}"]`).forEach(el => {
      el.addEventListener("click", handler);
    });
  }

  // Project source radio toggle
  document.querySelectorAll('input[name="proj-type"]').forEach(r => {
    r.addEventListener("change", () => {
      const val = r.value;
      $("new-workdir").style.display = val === "local" ? "" : "none";
      $("new-clone-url").style.display = val === "clone" ? "" : "none";
    });
  });
});
