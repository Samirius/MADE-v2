import { execSync, spawn } from 'node:child_process';
import { AgentAdapter } from './adapter.mjs';

export class HermesAdapter extends AgentAdapter {
  constructor(workDir) {
    super(workDir);
    this.id = 'hermes';
    this.name = 'Hermes Agent';
    this.cliCommand = 'hermes';
  }

  detect() {
    let available = false;
    try {
      execSync('which hermes', { stdio: 'pipe' });
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
    this.process = spawn('hermes', ['chat', '-q', prompt, '-Q', '--yolo'], {
      cwd: this.workDir,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return this.process;
  }
}
