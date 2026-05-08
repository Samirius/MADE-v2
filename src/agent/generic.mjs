import { spawn } from 'node:child_process';
import { AgentAdapter } from './adapter.mjs';

export class GenericAdapter extends AgentAdapter {
  constructor(workDir, command) {
    super(workDir);
    this.id = 'generic';
    this.name = 'Generic CLI';
    this.cliCommand = command || 'echo';
    this._userCommand = command;
  }

  detect() {
    // Generic adapter is always available as a fallback.
    // If a custom command is provided it may or may not work at runtime.
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
    // Append the prompt as the last argument
    const args = [...baseArgs, prompt];

    this.process = spawn(cmd, args, {
      cwd: this.workDir,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return this.process;
  }
}
