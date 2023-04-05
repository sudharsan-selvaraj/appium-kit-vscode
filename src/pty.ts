import { ChildProcess, fork, ForkOptions, spawn, SpawnOptions } from 'child_process';
import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { SanitizedPtyEventEmitter } from './pty-sanitized-log-emitter';

export interface PtyProcessHandler {
  onStarted?: (process: ChildProcess, teminal: vscode.Terminal) => void;
  onError?: (data: Error) => string;
  onStdout?: (data: Buffer) => string;
  onStdErr?: (data: Buffer) => string;
  onComplete?: () => void;
  onTerminalClosed?: (process: ChildProcess) => void;
  onUserInput?: (input: string) => void;
}

export interface TerminalProcessOptions extends SpawnOptions, ForkOptions {
  killOnTerminalClosed?: boolean;
  killOnUserInput?: boolean;
  useFork?: boolean;
  args?: string[];
}

enum ExitKeyCodes {
  cmdC = '\x03',
  cmdD = '\x04',
}

export class Pty extends EventEmitter implements vscode.Pseudoterminal {
  private writeEmitter = new SanitizedPtyEventEmitter();
  public onDidWrite = this.writeEmitter.event;
  private process!: ChildProcess;
  private terminal!: vscode.Terminal;
  private processCompleted = false;

  constructor(
    private terminalName: string,
    private cmd: string,
    private options: TerminalProcessOptions,
    private handler: PtyProcessHandler
  ) {
    super();
  }

  public open() {
    if (this.options.useFork) {
      this.process = fork(this.cmd, this.options.args || [], this.options);
    } else {
      this.process = spawn(this.cmd, this.options.args || [], this.options);
    }

    if (this.handler.onStarted) {
      this.handler.onStarted(this.process, this.terminal);
    }

    this.process.stdout?.on('data', (data) => {
      if (this.handler.onStdout) {
        this.writeEmitter.fire(this.handler.onStdout(data));
      } else {
        this.writeEmitter.fire(data.toString());
      }
    });

    this.process.stderr?.on('data', (data) => {
      if (this.handler.onStdErr) {
        this.writeEmitter.fire(this.handler.onStdErr(data));
      } else {
        this.writeEmitter.fire(data.toString());
      }
    });

    this.process.on('error', (data) => {
      if (this.handler.onError) {
        this.writeEmitter.fire(this.handler.onError(data));
      } else {
        this.writeEmitter.fire(data.toString());
      }
    });

    this.process.on('exit', () => {
      if (this.handler.onComplete) {
        this.handler.onComplete();
      }
      this.writeEmitter.fire('\n* Process stopped..\n');
      this.processCompleted = true;
    });
  }

  public handleInput(data: string): void {
    if (this.handler.onUserInput) {
      this.handler.onUserInput(data);
    }
    this.writeEmitter.fire(data);
    if (
      this.options.killOnUserInput &&
      !this.processCompleted &&
      (data === ExitKeyCodes.cmdC || data === ExitKeyCodes.cmdD)
    ) {
      this.stop();
    }
  }

  public write(data: string) {
    this.writeEmitter.fire(`${data}\r\n`);
  }

  public stop() {
    if (!!this.process && !this.process.killed) {
      this.process.kill(1);
    }
  }

  public close() {
    if (!!this.options.killOnTerminalClosed && !!this.process && !this.process?.killed) {
      this.process.kill(1);
    }

    if (this.handler.onComplete && !this.processCompleted) {
      this.handler.onComplete();
    }
  }

  public startProcess() {
    this.terminal = vscode.window.createTerminal({
      name: this.terminalName,
      pty: {
        onDidWrite: this.writeEmitter.event,
        open: this.open.bind(this),
        close: this.close.bind(this),
        handleInput: this.handleInput.bind(this),
      },
    });

    this.revealterminal();
  }

  public revealterminal() {
    this.terminal?.show();
  }

  public getChildProcess() {
    return this.process;
  }
}
