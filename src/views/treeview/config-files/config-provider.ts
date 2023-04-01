import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { APPIUM_CONF_FILE_GLOB, EXTENSIONS_FILES_RETAIVE_PATH } from '../../../constants';
import { ViewProvider } from '../../view-provider';
import { readConfigFile } from '../../../config-parser';
import { VscodeWorkspace } from '../../../vscode/workspace';
import {
  ConfigDirectory,
  ConfigDirectoryTreeItem,
  ConfigFile,
  ConfigFiletreeItem,
} from './config-tree-tems';
import _ = require('lodash');

const CONFIG_FILES_RELATIVE_PATH = path.join(EXTENSIONS_FILES_RETAIVE_PATH, 'config');

type ConfigTreeItemTypes = ConfigDirectory | ConfigFile;

const isDirectory = (value: any): value is ConfigDirectory => {
  return value && typeof value === 'object' && 'name' in value && 'uri' in value;
};

export class ConfigViewProvider
  implements vscode.TreeDataProvider<ConfigTreeItemTypes>, ViewProvider
{
  private readonly configFiles: Map<string, ConfigFile> = new Map();
  private extistingFilesLoaded = false;
  private configWatchers: vscode.FileSystemWatcher[] = [];
  private _configDirectories: ConfigDirectory[] = [];

  private _onDidChangeTreeData: vscode.EventEmitter<ConfigFile | undefined | null | void> =
    new vscode.EventEmitter<ConfigFile | undefined | null | void>();

  onDidChangeTreeData:
    | vscode.Event<void | ConfigFile | ConfigFile[] | null | undefined>
    | undefined = this._onDidChangeTreeData.event;

  constructor(private workspace: VscodeWorkspace) {}

  public async register(viewId: string, context: vscode.ExtensionContext) {
    this._initializeConfigDirectories(context);
    context.subscriptions.push(vscode.window.registerTreeDataProvider(viewId, this));
    this.startFilewatcher();
    return this;
  }

  private _initializeConfigDirectories(context: vscode.ExtensionContext) {
    if (this.workspace.isOpened()) {
      this._configDirectories.push({
        name: 'workspace',
        uri: vscode.Uri.file(this.workspace.getRootDirectory()),
        pattern: APPIUM_CONF_FILE_GLOB,
      });
    }
    const globalConfDirPath = path.join(context.extensionUri.fsPath, CONFIG_FILES_RELATIVE_PATH);
    if (!fs.existsSync(globalConfDirPath)) {
      fs.mkdirSync(globalConfDirPath, { recursive: true });
    }
    this._configDirectories.push({
      name: 'global',
      uri: vscode.Uri.file(globalConfDirPath),
      pattern: new vscode.RelativePattern(globalConfDirPath, '*'),
    });
  }

  public async loadExistingFiles() {
    const configFiles = await Promise.all(
      this._configDirectories.map((dir) =>
        vscode.workspace.findFiles(dir.pattern, '**/node_modules/**/*').then((files) => {
          return files.map((file) => ({
            file: file,
            location: dir.name,
          }));
        })
      )
    );

    await Promise.all(
      _.flatMap(configFiles).map((conf) => this.onFileEvent(conf.location, conf.file, false))
    );

    this.extistingFilesLoaded = true;
  }

  public startFilewatcher() {
    this._configDirectories.forEach((directory) => {
      const watcher = vscode.workspace.createFileSystemWatcher(directory.pattern);

      watcher.onDidChange((uri: vscode.Uri) => this.onFileEvent(directory.name, uri));
      watcher.onDidCreate((uri: vscode.Uri) => this.onFileEvent(directory.name, uri));

      watcher.onDidDelete((uri: vscode.Uri) => this.onFileDeleteEvent(uri));
      this.configWatchers.push(watcher);
    });
  }

  dispose() {
    this.configWatchers.forEach((watcher) => watcher.dispose());
  }

  getTreeItem(element: ConfigTreeItemTypes): vscode.TreeItem | Thenable<vscode.TreeItem> {
    if (isDirectory(element)) {
      return new ConfigDirectoryTreeItem(element);
    } else {
      return new ConfigFiletreeItem(element);
    }
  }

  async onFileEvent(directory: ConfigDirectory['name'], uri: vscode.Uri, notify: boolean = true) {
    try {
      const newConfig = await readConfigFile(uri.fsPath);
      const confFile = this.configFiles.get(uri.toString()) as ConfigFile;

      if (!confFile) {
        this.configFiles.set(uri.toString(), {
          uri,
          isValid: !!newConfig,
          config: newConfig,
          directory,
        });
      } else if (confFile.isValid !== !!newConfig) {
        confFile.isValid = !!newConfig;
        confFile.config = newConfig;
      }
      if (notify) {
        this._onDidChangeTreeData.fire();
      }
    } catch (err) {
      console.log(err);
    }
  }

  onFileDeleteEvent(uri: vscode.Uri) {
    this.configFiles.delete(uri.toString());
    this._onDidChangeTreeData.fire();
  }

  async getChildren(element?: ConfigTreeItemTypes | undefined): Promise<ConfigTreeItemTypes[]> {
    if (!this.extistingFilesLoaded) {
      await this.loadExistingFiles();
    }
    if (!element) {
      return this._configDirectories;
    } else if (isDirectory(element)) {
      return [...this.configFiles.values()].filter((config) => config.directory === element.name);
    } else {
      return [];
    }
  }
}
