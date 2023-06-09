import * as vscode from 'vscode';

export class ConfigManager {
  constructor(private prefix: string = 'appium') {}

  getAppiumPath() {
    return this.getOrDefault<string>('appiumPath', '');
  }

  setAppiumPath(path: string) {
    return this.set('appiumPath', path);
  }

  get<T>(key: string): T {
    return vscode.workspace.getConfiguration(this.prefix).get(key) as T;
  }

  getOrDefault<T>(key: string, defaultValue: T): T {
    return vscode.workspace
      .getConfiguration(this.prefix)
      .get(key, defaultValue);
  }

  set(key: string, value: any, global: boolean = true) {
    vscode.workspace
      .getConfiguration(this.prefix)
      .update(
        key,
        value,
        global
          ? vscode.ConfigurationTarget.Global
          : vscode.ConfigurationTarget.WorkspaceFolder
      );
  }
}
