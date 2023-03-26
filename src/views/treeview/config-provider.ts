import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { APPIUM_CONF_FILE_GLOB } from '../../constants';
import { ICON_APPIUM, ICON_INVALID } from '../../icons';
import { ViewProvider } from '../view-provider';

export interface ConfigFile {
  uri: vscode.Uri;
  isValid: boolean;
}

export class ConfigtreeItem extends vscode.TreeItem {
  constructor(config: ConfigFile) {
    super(
      {
        label: path.basename(config.uri.fsPath),
        highlights: config.isValid ? [] : [[0, path.basename(config.uri.fsPath).length]],
      },
      vscode.TreeItemCollapsibleState.None
    );

    this.iconPath = ICON_APPIUM;
    this.description = `/${this.getDescription(config)}`;
    this.command = {
      title: 'Open file',
      command: 'vscode.open',
      arguments: [config.uri],
    };
  }

  getDescription(config: ConfigFile) {
    return vscode.workspace
      .asRelativePath(config.uri)
      .replace(path.basename(config.uri.fsPath), '');
  }
}

export class ConfigViewProvider implements vscode.TreeDataProvider<ConfigFile>, ViewProvider {
  private readonly configFiles: Map<string, ConfigFile> = new Map();
  private configWatcher!: vscode.FileSystemWatcher;

  public async register(viewId: string, context: vscode.ExtensionContext) {
    await this.loadExistingFiles();
    context.subscriptions.push(vscode.window.registerTreeDataProvider(viewId, this));
    this.startFilewatcher();
    return this;
  }

  public async loadExistingFiles() {
    const existingFiles = await vscode.workspace.findFiles(
      APPIUM_CONF_FILE_GLOB,
      '**/node_modules/**/*'
    );
    existingFiles.forEach((f) => this.onFileEvent(f, false));
  }

  public startFilewatcher() {
    this.configWatcher = vscode.workspace.createFileSystemWatcher(APPIUM_CONF_FILE_GLOB);

    this.configWatcher.onDidChange(this.onFileEvent.bind(this));
    this.configWatcher.onDidCreate(this.onFileEvent.bind(this));
    this.configWatcher.onDidDelete(this.onFileDeleteEvent.bind(this));
  }

  dispose() {
    this.configWatcher?.dispose();
  }

  private _onDidChangeTreeData: vscode.EventEmitter<ConfigFile | undefined | null | void> =
    new vscode.EventEmitter<ConfigFile | undefined | null | void>();

  onDidChangeTreeData:
    | vscode.Event<void | ConfigFile | ConfigFile[] | null | undefined>
    | undefined = this._onDidChangeTreeData.event;

  getTreeItem(element: ConfigFile): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return new ConfigtreeItem(element);
  }

  onFileEvent(uri: vscode.Uri, notify: boolean = true) {
    try {
      const ext = path.extname(uri.fsPath);
      const content = fs.readFileSync(uri.fsPath, { encoding: 'utf-8' });
      const confFile = this.configFiles.get(uri.toString()) as ConfigFile;
      const isValid = new RegExp(/(yaml|yml)/g).test(ext)
        ? this.isValidYaml(content)
        : this.isValidJson(content);
      if (!confFile) {
        this.configFiles.set(uri.toString(), { uri, isValid });
      } else if (confFile.isValid !== isValid) {
        confFile.isValid = isValid;
      }
      if (notify) {
        this._onDidChangeTreeData.fire();
      }
    } catch (err) {}
  }

  onFileDeleteEvent(uri: vscode.Uri) {
    this.configFiles.delete(uri.toString());
    this._onDidChangeTreeData.fire();
  }

  isValidYaml(content: string) {
    try {
      yaml.parse(content);
      return true;
    } catch (err) {
      return false;
    }
  }

  isValidJson(content: string) {
    try {
      JSON.parse(content);
      return true;
    } catch (err) {
      return false;
    }
  }

  async getChildren(element?: ConfigFile | undefined): Promise<ConfigFile[]> {
    return [...this.configFiles.values()];
  }
}
