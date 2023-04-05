import { AppiumSessionLog } from './interfaces/appium-session-log';

export class AppiumSession {
  private logs: AppiumSessionLog[] = [];
  private startTime: Date;
  private endTime!: Date;
  private _running = true;

  constructor(
    private sessionId: string,
    private serverid: string,
    private capabilities: Record<string, any>
  ) {
    this.startTime = new Date();
  }

  public getSessionId() {
    return this.sessionId;
  }

  public getServerid() {
    return this.serverid;
  }

  public getLogs() {
    return this.logs;
  }

  public isRunning() {
    return this._running;
  }

  public getStartTime() {
    return this.startTime;
  }

  public getEndTime() {
    return this.endTime;
  }

  public setIsRunning(status: boolean) {
    this._running = status;
  }

  public setEndTime(endTime: Date) {
    this.endTime = endTime;
  }

  public addLog(log: AppiumSessionLog) {
    this.logs.push(log);
  }
}
