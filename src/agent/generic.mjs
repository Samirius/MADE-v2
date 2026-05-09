import { spawn } from 'node:child_process';
import { AgentAdapter } from './adapter.mjs';

// H-08 fix: allowlist of safe commands for generic adapter
const SAFE_COMMANDS = ['echo', 'cat', 'ls', 'pwd', 'date', 'whoami', 'wc', 'sort', 'uniq', 'head', 'tail', 'grep', 'find', 'node', 'python3', 'ruby'];

export class GenericAdapter extends AgentAdapter {
  constructor(workDir, command) {
    super(workDir);
    this.id = 'generic';
    this.name = 'Generic CLI';
    this.cliCommand = command || 'echo';
    this._userCommand = command;
  }

  detect() {
    return {
      id: this.id,
      name: this.name,
      available: true,
      cliCommand: this.cliCommand,
    };
  }

  start(prompt) {
    const parts = this._userCommand
      ? this._userCommand.split(' ')
      : ['echo', 'No command configured'];
    const cmd = parts[0];
    const baseArgs = parts.slice(1);

    // H-08 fix: block dangerous commands
    if (!SAFE_COMMANDS.includes(cmd)) {
      const err = new Error(`Command "${cmd}" not in allowlist. Safe commands: ${SAFE_COMMANDS.join(', ')}`);
      this.process = null;
      // Emit error via event-like pattern
      const fake = spawn('echo', [`Error: ${err.message}`], { cwd: this.workDir });
      this.process = fake;
      return fake;
    }

    const args = [...baseArgs, prompt];
    this.process = spawn(cmd, args, {
      cwd: this.workDir,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return this.process;
  }
}
