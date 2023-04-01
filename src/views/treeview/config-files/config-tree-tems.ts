import * as vscode from 'vscode';
import * as path from 'path';
import { ICON_DIRECTORY, ICON_INVALID, ICON_VALID } from '../../../icons';

export type ConfigDirectorName = 'global' | 'workspace';

export interface ConfigDirectory {
  name: ConfigDirectorName;
  uri: vscode.Uri;
  pattern: vscode.GlobPattern;
}

export interface ConfigFile {
  uri: vscode.Uri;
  isValid: boolean;
  config: any;
  directory: ConfigDirectory['name'];
}

export class ConfigFiletreeItem extends vscode.TreeItem {
  constructor(config: ConfigFile) {
    super(
      {
        label: path.basename(config.uri.fsPath),
        highlights: config.isValid ? [] : [[0, path.basename(config.uri.fsPath).length]],
      },
      vscode.TreeItemCollapsibleState.None
    );

    this.iconPath = config.isValid ? ICON_VALID : ICON_INVALID;
    this.description = `${this._getDescription(config)}`;
    this.command = {
      title: 'Open file',
      command: 'vscode.open',
      arguments: [config.uri],
    };

    this.contextValue = this._getContextValue(config);
  }

  _getDescription(config: ConfigFile) {
    return vscode.workspace
      .asRelativePath(config.uri)
      .replace(path.basename(config.uri.fsPath), '');
  }

  _getContextValue(config: ConfigFile) {
    const validState = `config-file-${config.isValid ? 'valid' : 'invalid'}`;
    return [validState].join();
  }
}

export class ConfigDirectoryTreeItem extends vscode.TreeItem {
  constructor(private directory: ConfigDirectory) {
    super({ label: directory.name }, vscode.TreeItemCollapsibleState.Collapsed);

    this.iconPath = ICON_DIRECTORY;
    this.contextValue = `config-directory`;
  }
}
