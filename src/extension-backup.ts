import * as vscode from 'vscode';
import { ChildProcess, spawn } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
  const writeEmitter = new vscode.EventEmitter<string>();
  let appiumProcess!: ChildProcess;
  const pty = {
    onDidWrite: writeEmitter.event,
    open: async () => {
      console.log('Open triggered');
      // writeEmitter.fire('Starting Appium Server');
      appiumProcess = spawn('appium', {
        env: process.env,
      });
      appiumProcess.stdout?.on('data', (data) => {
        console.log(data.toString());
        writeEmitter.fire(data.toString().replace(/\n/g, '\r\n'));
      });

      appiumProcess.stderr?.on('data', (data) => {
        writeEmitter.fire(data.toString());
      });

      appiumProcess.on('error', (data) => {
        writeEmitter.fire(data.toString());
      });
    },
    close: () => {
      if (appiumProcess) {
        appiumProcess.kill();
      }
    },
    handleInput: () => {},
  };

  const terminal = vscode.window.createTerminal({
    name: 'Appium',
    pty,
  });

  terminal.show();
}

export function deactivate() {}
