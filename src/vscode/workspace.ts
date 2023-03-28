import * as vscode from 'vscode';
import * as path from 'path';
import { AppiumHome } from '../types';
import _ = require('lodash');

export interface StoreOption {
  target: vscode.ConfigurationTarget;
}

export class VscodeWorkspace {
  private isWsValid: boolean = false;
  private wsRootDirectory!: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    if (vscode.workspace.workspaceFolders !== undefined) {
      this.isWsValid = true;
      this.wsRootDirectory = vscode.workspace.workspaceFolders[0].uri.fsPath;
      vscode.workspace.getConfiguration;
    }
  }

  isOpened() {
    return this.isWsValid;
  }

  getRootDirectory() {
    return this.wsRootDirectory;
  }

  getFilePath(fPath: string) {
    return path.join(this.wsRootDirectory, fPath);
  }

  localStore() {
    return new Store(this.context, {
      target: vscode.ConfigurationTarget.Workspace,
    });
  }

  globalStore() {
    return new Store(this.context, {
      target: vscode.ConfigurationTarget.Global,
    });
  }
}

export class Store {
  private state: vscode.Memento;
  constructor(private context: vscode.ExtensionContext, private options: StoreOption) {
    this.state =
      options.target === vscode.ConfigurationTarget.Workspace
        ? context.workspaceState
        : context.globalState;
  }

  getAppiumHomes(): Array<AppiumHome> {
    try {
      const homeFromState = this.state.get('appium.home') as [];
      return homeFromState || [];
    } catch (err) {
      return [];
    }
  }

  addAppiumHome(appiumHome: AppiumHome) {
    try {
      const homeFromState = this.state.get('appium.home') as any[];
      const parsed = homeFromState ?? [];
      parsed.push(appiumHome);
      this.state.update('appium.home', appiumHome);
    } catch (err) {
      return [];
    }
  }
}
