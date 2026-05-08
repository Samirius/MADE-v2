import { execSync, spawn } from 'node:child_process';
import { AgentAdapter } from './adapter.mjs';

export class OpenCodeAdapter extends AgentAdapter {
  constructor(workDir) {
    super(workDir);
    this.id = 'opencode';
    this.name = 'OpenCode';
    this.cliCommand = 'opencode';
  }

  detect() {
    let available = false;
    try {
      execSync('which opencode', { stdio: 'pipe' });
      available = true;
    } catch (_) {
      // not found
    }
    return {
      id: this.id,
      name: this.name,
      available,
      cliCommand: this.cliCommand,
    };
  }

  start(prompt) {
    this.process = spawn('opencode', ['run', prompt], {
      cwd: this.workDir,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return this.process;
  }
}
