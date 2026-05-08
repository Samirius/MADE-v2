/**
 * Agent Registry — collects all adapter classes, runs detection,
 * and provides a resolveAdapter() factory.
 */

import { HermesAdapter } from './hermes.mjs';
import { OpenCodeAdapter } from './opencode.mjs';
import { ClaudeAdapter } from './claude.mjs';
import { CodexAdapter } from './codex.mjs';
import { GenericAdapter } from './generic.mjs';

/** Adapter classes in priority order (generic always last as fallback) */
const ADAPTER_CLASSES = [
  HermesAdapter,
  OpenCodeAdapter,
  ClaudeAdapter,
  CodexAdapter,
  GenericAdapter,
];

/** Cache of detection results keyed by id */
let _detectionCache = null;

/**
 * Run detection for all adapters and return the list.
 * Results are cached after first call; call forceRedetect() to re-run.
 * @returns {Array<{ id: string, name: string, available: boolean, cliCommand: string }>}
 */
export function detectAll() {
  if (_detectionCache) return _detectionCache;

  const results = [];
  for (const Cls of ADAPTER_CLASSES) {
    // Work dir doesn't matter for detection
    const adapter = new Cls('/tmp');
    results.push(adapter.detect());
  }
  _detectionCache = results;
  return results;
}

/** Clear the detection cache so next detectAll() re-checks */
export function forceRedetect() {
  _detectionCache = null;
}

/**
 * Create an adapter instance for the given agent id and workDir.
 * @param {string} agentId
 * @param {string} workDir
 * @returns {import('./adapter.mjs').AgentAdapter}
 */
export function resolveAdapter(agentId, workDir) {
  for (const Cls of ADAPTER_CLASSES) {
    if (Cls === GenericAdapter) continue; // check concrete ones first
    const tmp = new Cls(workDir);
    if (tmp.id === agentId) {
      return new Cls(workDir);
    }
  }
  // Fallback to generic
  return new GenericAdapter(workDir);
}

export default { detectAll, forceRedetect, resolveAdapter };
