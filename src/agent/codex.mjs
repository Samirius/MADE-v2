import { execSync, spawn } from 'node:child_process';
import { AgentAdapter } from './adapter.mjs';

export class CodexAdapter extends AgentAdapter {
  constructor(workDir) {
    super(workDir);
    this.id = 'codex';
    this.name = 'Codex';
    this.cliCommand = 'codex';
  }

  detect() {
    let available = false;
    try {
      execSync('which codex', { stdio: 'pipe' });
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
    this.process = spawn('codex', [prompt, '--full-auto'], {
      cwd: this.workDir,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return this.process;
  }
}
