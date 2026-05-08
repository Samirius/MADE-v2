/**
 * Base AgentAdapter interface.
 * Every concrete adapter extends this class.
 */
export class AgentAdapter {
  /**
   * @param {string} workDir - Absolute path to the project working directory
   */
  constructor(workDir) {
    if (new.target === AgentAdapter) {
      throw new Error('AgentAdapter is abstract — use a concrete subclass');
    }
    this.workDir = workDir;
    this.process = null;
  }

  /**
   * Detect whether this agent CLI is available on the system.
   * @returns {{ id: string, name: string, available: boolean, cliCommand: string }}
   */
  detect() {
    throw new Error('detect() not implemented');
  }

  /**
   * Spawn the agent CLI with the given prompt.
   * @param {string} prompt
   * @returns {import('child_process').ChildProcess}
   */
  start(prompt) {
    throw new Error('start() not implemented');
  }

  /**
   * Kill the running agent process (if any).
   */
  stop() {
    if (this.process && !this.process.killed) {
      try {
        this.process.kill('SIGTERM');
        // Force kill after grace period handled by caller if needed
      } catch (_) {
        // process may have already exited
      }
    }
    this.process = null;
  }
}
