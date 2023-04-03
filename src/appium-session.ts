import { AppiumSessionLog } from './interfaces/appium-session-log';

export class AppiumSession {
  private logs: AppiumSessionLog[] = [];
  private _running = true;

  constructor(
    private sessionId: string,
    private serverid: string,
    private capabilities: Record<string, any>
  ) {}

  public getSessionId() {
    return this.sessionId;
  }

  public getServerid() {
    return this.serverid;
  }

  public getLogs() {
    return this.sessionId;
  }

  public isRunning() {
    return this._running;
  }

  public setIsRunning(status: boolean) {
    this._running = status;
  }

  public addLog(log: AppiumSessionLog) {
    this.logs.push(log);
  }
}
