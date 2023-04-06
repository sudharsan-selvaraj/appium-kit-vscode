import { ChildProcess } from 'child_process';
import { AppiumLaunchOption } from '../appium-proxy-server';
import { Pty } from '../pty';
import { AppiumIpcMessage } from '../appium-ipc-event';
import { AppiumSession } from '../models/appium-session';
import { getCommandLog } from '../appium-command-parser';

export interface AppiumServerListener {
  onStarted?: (serverId: string) => void;
  onStoped?: (serverId: string) => void;
  onNeedsRefresh?: (serverId: string) => void;
}

export class AppiumServiceInstance {
  private _sessions: Map<string, AppiumSession> = new Map();
  private _listeners: AppiumServerListener[] = [];
  private _process!: ChildProcess;
  private running: boolean = false;

  constructor(private id: string, private pty: Pty, private launchOption: AppiumLaunchOption) {}

  ready() {
    this.running = true;
    this._process = this.pty.getChildProcess();
    this._process.on('message', this._messageHandler.bind(this));
    this._process.on('exit', () => {
      this.running = false;
      this._sessions.forEach((session) => session.setIsRunning(false));
      this.emitRefresh();
    });
  }

  getId() {
    return this.id;
  }

  getAddress() {
    return `${this.launchOption.address === '0.0.0.0' ? '127.0.0.1' : this.launchOption.address}:${
      this.launchOption.appiumPort
    }${this.launchOption.basePath === '/' ? '' : this.launchOption.basePath}`;
  }

  isRunning() {
    return this.running;
  }

  addListener(listener: AppiumServerListener) {
    this._listeners.push(listener);
  }

  getSessions() {
    return [...this._sessions.values()];
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
      session?.setEndTime(new Date());
      needsRefresh = true;
    } else {
      const session = this._sessions.get(data.sessionId);
      if (session) {
        const log = getCommandLog(
          data.path,
          this.launchOption.basePath,
          data.method,
          data.response
        );
        log.sessionId = session.getSessionId();
        session.addLog(log);
        needsRefresh = true;
      }
    }
    if (needsRefresh) {
      this.emitRefresh();
    }
  }

  private emitRefresh() {
    this._listeners.forEach((l) => l.onNeedsRefresh && l.onNeedsRefresh(this.id));
  }
}
