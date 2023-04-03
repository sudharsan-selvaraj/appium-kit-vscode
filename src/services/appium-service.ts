import { ChildProcess } from 'child_process';
import { AppiumLaunchOption } from '../http-server';
import { Pty } from '../pty';
import { AppiumIpcMessage } from '../appium-ipc-event';
import { AppiumSession } from '../appium-session';
// const { routeToCommandName } = require('@appium/base-driver');

export interface AppiumServerListener {
  onStarted?: (serverId: string) => void;
  onStoped?: (serverId: string) => void;
  onNeedsRefresh?: (serverId: string) => void;
}

export class AppiumServiceInstance {
  private _sessions: Map<string, any> = new Map();
  private _listeners: AppiumServerListener[] = [];
  private _process!: ChildProcess;

  constructor(private id: string, private pty: Pty, private launchOption: AppiumLaunchOption) {}

  ready() {
    this._process = this.pty.getChildProcess();
    this._process.on('message', this._messageHandler.bind(this));
  }

  addListener(listener: AppiumServerListener) {
    this._listeners.push(listener);
  }

  private _messageHandler(message: AppiumIpcMessage<any>) {
    const { event, data } = message;
    let needsRefresh = false;
    if (event === 'session-started') {
      const sessionId = data.value.sessionId;
      const capabilities: Record<string, any> = data.value.capabilities;
      needsRefresh = true;
      this._sessions.set(sessionId, new AppiumSession(sessionId, this.id, capabilities));
    } else if (event === 'session-stopped') {
      const session = this._sessions.get(data.sessionId);
      session?.setIsRunning(false);
      needsRefresh = true;
    } else {
      needsRefresh = true;
    }
    if (needsRefresh) {
      this._listeners.forEach((l) => l.onNeedsRefresh && l.onNeedsRefresh(this.id));
    }
  }
}
