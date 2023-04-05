import * as vscode from 'vscode';
import { ViewProvider } from '../../view-provider';
import { EventBus } from '../../../events/event-bus';
import { AppiumServiceInstance } from '../../../services/appium-service';
import { AppiumServerStartedEvent } from '../../../events/appium-server-started-event';
import { AppiumSession } from '../../../models/appium-session';
import { AppiumSessionLog } from '../../../models/appium-session-log';
import { AppiumServerTreeItem, AppiumSessionTreeItem } from './server-tree-items';

type AppiumServerTreeItemtypes = AppiumServiceInstance | AppiumSession | AppiumSessionLog;

export class AppiumServerProviderView
  implements ViewProvider, vscode.TreeDataProvider<AppiumServerTreeItemtypes>
{
  private _servers: Map<string, AppiumServiceInstance> = new Map();

  private _onDidChangeTreeData: vscode.EventEmitter<
    AppiumServerTreeItemtypes | undefined | null | void
  > = new vscode.EventEmitter<AppiumServerTreeItemtypes | undefined | null | void>();

  onDidChangeTreeData:
    | vscode.Event<
        void | AppiumServerTreeItemtypes | AppiumServerTreeItemtypes[] | null | undefined
      >
    | undefined = this._onDidChangeTreeData.event;

  constructor(private eventBus: EventBus) {}

  async register(viewId: string, context: vscode.ExtensionContext): Promise<ViewProvider> {
    context.subscriptions.push(vscode.window.registerTreeDataProvider(viewId, this));
    this.eventBus.addListener(
      AppiumServerStartedEvent.listener((appiumService) => {
        this.onServerCreated(appiumService);
        vscode.commands.executeCommand(`${viewId}.focus`);
      })
    );
    return this;
  }

  dispose() {
    //not implemented
  }

  private onServerCreated(appiumService: AppiumServiceInstance) {
    this._servers.set(appiumService.getId(), appiumService);
    this.refresh();
    appiumService.addListener({
      onNeedsRefresh: this.refresh.bind(this),
      onStoped: (serverId: string) => {
        // this._servers.delete(serverId);
        this.refresh();
      },
    });
  }

  private refresh() {
    this._onDidChangeTreeData.fire();
  }

  async getChildren(
    element?: AppiumServerTreeItemtypes | undefined
  ): Promise<AppiumServerTreeItemtypes[]> {
    if (!element) {
      return [...this._servers.values()];
    } else if (element instanceof AppiumServiceInstance) {
      return element.getSessions();
    } else if (element instanceof AppiumSession) {
      return element.getLogs();
    }
    return [];
  }

  getTreeItem(element: AppiumServerTreeItemtypes): vscode.TreeItem | Thenable<vscode.TreeItem> {
    if (element instanceof AppiumServiceInstance) {
      return new AppiumServerTreeItem(element);
    } else if (element instanceof AppiumSession) {
      return new AppiumSessionTreeItem(element);
    } else {
      return new vscode.TreeItem('');
    }
  }
}
