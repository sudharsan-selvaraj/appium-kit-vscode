import * as vscode from 'vscode';

export class Context {
  appiumPathUpdated() {
    this._setContext('appium.available', true);
    this._setContext('appium.pathUpdated', true);
  }

  appiumPathNotUpdated() {
    this._setContext('appium.available', true);
    this._setContext('appium.pathUpdated', false);
  }

  appiumNotAvailbale() {
    this._setContext('appium.available', false);
    this._setContext('appium.pathUpdated', false);
  }

  private _setContext(name: string, value: any) {
    vscode.commands.executeCommand('setContext', name, value);
  }
}
