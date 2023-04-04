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
    var seconds = Math.floor((new Date().getTime() - this.session.getStartTime().getTime()) / 1000);
    var interval = Math.floor(seconds / 31536000);
    if (interval > 1) {
      return interval + ' years';
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
      return interval + ' months';
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
      return interval + ' days';
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
      return interval + ' hours';
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
      return interval + ' minutes';
    }
    return Math.floor(seconds) + ' seconds';
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
