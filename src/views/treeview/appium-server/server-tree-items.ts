import * as vscode from 'vscode';
import { AppiumServiceInstance } from '../../../services/appium-service';
import { ICON_BASH_TERMINAL, ICON_LOADING, ICON_TICK } from '../../../icons';
import { AppiumSession } from '../../../appium-session';

export class AppiumSessionTreeItem extends vscode.TreeItem {
  constructor(private session: AppiumSession) {
    super({ label: session.getSessionId() }, vscode.TreeItemCollapsibleState.None);

    this.iconPath = session.isRunning() ? ICON_LOADING : ICON_TICK;
    this.description = this._getDescription();
    this.contextValue = `appium-session${this.session.isRunning() ? '-running' : ''}`;
  }

  private _getDescription() {
    const timeDiff = this.getTimeDiff();
    if (this.session.isRunning()) {
      return timeDiff;
    } else {
      return 'Took ' + timeDiff;
    }
  }

  private getTimeDiff() {
    const startTime = this.session.getStartTime();
    const endTime = this.session.getEndTime() || new Date();
    var seconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    const time = {
      d: Math.floor(seconds / 86400),
      h: Math.floor(seconds / 3600) % 24,
      m: Math.floor(seconds / 60) % 60,
      s: seconds % 60,
    };

    return Object.entries(time)
      .filter((val) => val[1] !== 0)
      .map((val) => val[1] + val[0])
      .join(' ');
  }
}

export class AppiumServerTreeItem extends vscode.TreeItem {
  constructor(private server: AppiumServiceInstance) {
    super({ label: server.getAddress() }, vscode.TreeItemCollapsibleState.Expanded);

    this.iconPath = ICON_BASH_TERMINAL;
    this.description = this._getDescription();
    this.contextValue = `appium-server${this.server.isRunning() ? '-running' : ''}`;
  }

  private _getDescription() {
    if (!this.server.isRunning()) {
      return 'Stopped';
    }
    const activeSessions = this.server.getSessions().filter((s) => s.isRunning());
    return activeSessions.length > 0 ? `${activeSessions.length} active sessions` : undefined;
  }
}
