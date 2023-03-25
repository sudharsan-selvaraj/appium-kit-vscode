import * as vscode from 'vscode';

export class StateManager {
  // appiumPathUpdated() {
  //   this._setContext('appium.available', true);
  //   this._setContext('appium.pathUpdated', true);
  // }

  // appiumPathNotUpdated() {
  //   this._setContext('appium.available', true);
  //   this._setContext('appium.pathUpdated', false);
  // }

  // appiumNotAvailbale() {
  //   this._setContext('appium.available', false);
  //   this._setContext('appium.pathUpdated', false);
  // }

  appiumNotConfigured() {
    this._setContext('appium.configured', false);
  }

  appiumConfigured() {
    this._setContext('appium.configured', true);
  }

  private _setContext(name: string, value: any) {
    vscode.commands.executeCommand('setContext', name, value);
  }
}
