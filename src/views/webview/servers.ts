import * as vscode from 'vscode';
import { ExtensionContext } from 'vscode';
import { AppiumLocalServer } from '../../services/local-server';
import { ViewProvider } from '../view-provider';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import { isPortFree } from '../../utils/net';
import { DataStore } from '../../db/data-store';
import { AppiumBinary, AppiumHome } from '../../types';
import { AppiumServerService } from '../../services/appium-proxy-server';
import { ConfigFile } from '../treeview/config-files/config-tree-tems';

const DEFAULT_APPIUM_PORT = 4723;
const DEFAULT_APPIUM_ADDRESS = '0.0.0.0';

export class AppiumServerView implements ViewProvider {
  private _busyPorts: number[] = [];
  private _runningServers: Map<string, AppiumServerService> = new Map();

  constructor(private dataStore: DataStore) {}

  async register(viewId: string, context: ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand('appium.server.start', this._startServer.bind(this))
    );
    return this;
  }

  private async _startServer(config: ConfigFile) {
    if (config.isValid) {
      const appiumOptions = this._getPortAndAddressFromConfig(config);
      if (this._portOccupied(appiumOptions.port)) {
        const portFromUser = await this._getPortFromUser();
        if (!!portFromUser) {
          this._startAppiumService(appiumOptions.address, portFromUser, config);
        }
      } else {
        this._startAppiumService(appiumOptions.address, appiumOptions.port, config);
      }
    } else {
      vscode.window.showErrorMessage('Selected config in not valid');
    }
  }

  private _startAppiumService(address: string, port: number, config: ConfigFile) {
    const appiumService = new AppiumServerService(uuid(), {
      appiumHome: <AppiumHome>this.dataStore.getActiveAppiumHome(),
      appiumBinary: <AppiumBinary>this.dataStore.getActiveAppiumBinary(),
      address: address,
      configPath: config.uri.fsPath,
      originalPort: port,
      overridePort: 5555,
    });

    appiumService.addServerListener({
      onStarted: (serverId: string) => {
        this._runningServers.set(serverId, appiumService);
      },
      onStoped: (serverId: string) => {
        // if (this._runningServers.has(serverId)) {
        //     this._runningServers.de(serverId, appiumService);
        // }
      },
    });

    appiumService.start();
  }

  private _getPortAndAddressFromConfig(config: ConfigFile) {
    const content = fs.readFileSync(config.uri.fsPath, { encoding: 'utf-8' });
    let json = {} as any;
    try {
      json = JSON.parse(content);
    } catch (err) {}
    return {
      port: json?.server && json?.server?.port ? json?.server?.port : DEFAULT_APPIUM_PORT,
      address:
        json?.address && json?.server?.address ? json?.server?.address : DEFAULT_APPIUM_ADDRESS,
    };
  }

  private _portOccupied(port: number) {
    return this._busyPorts.indexOf(port) >= 0;
  }

  private async _getPortFromUser(): Promise<number | null> {
    const newPort = await vscode.window.showInputBox({
      title: 'The port in the config is busy. Please enter a different port',
      validateInput: async (value) => {
        if (!new RegExp(/^\d+$/).test(value)) {
          return 'Not a valid port';
        } else if (!(await isPortFree(parseInt(value)))) {
          return 'Port already in use';
        }
        return null;
      },
    });

    return !!newPort ? parseInt(newPort) : null;
  }

  dispose() {
    throw new Error('Method not implemented.');
  }
}
