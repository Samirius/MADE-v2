import { execSync, spawn } from 'node:child_process';
import { AgentAdapter } from './adapter.mjs';

export class ClaudeAdapter extends AgentAdapter {
  constructor(workDir) {
    super(workDir);
    this.id = 'claude';
    this.name = 'Claude Code';
    this.cliCommand = 'claude';
  }

  detect() {
    let available = false;
    try {
      execSync('which claude', { stdio: 'pipe' });
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
    this.process = spawn('claude', ['--print', prompt], {
      cwd: this.workDir,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return this.process;
  }
}
