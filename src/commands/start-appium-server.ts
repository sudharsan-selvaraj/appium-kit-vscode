import * as vscode from 'vscode';
import { ConfigFile } from '../types';
import { Command } from './command';
import { EventBus } from '../events/event-bus';
import { DataStore } from '../db/data-store';
import { findFreePort, isPortFree } from '../utils/net';
import _ = require('lodash');
import { AppiumLaunchOption } from '../http-server';
import { Pty } from '../pty';
import path = require('path');
import { AppiumServiceInstance } from '../services/appium-service';
import { v4 as uuid } from 'uuid';
import { AppiumServerStartedEvent } from '../events/appium-server-started-event';

const DEFAULT_APPIUM_PORT = 4723;
const APPIUM_SERVER_PROCESS = 'http-server.js';

export interface StartAppiumServerOptions {
  configFile: ConfigFile;
}

export class StartAppiumServerCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.server.start';

  constructor(private eventBus: EventBus, private dataStore: DataStore) {
    super(StartAppiumServerCommand.NAME);
  }

  public async excute(argss: [StartAppiumServerOptions] | ConfigFile) {
    let options;
    if (_.isArray(argss)) {
      options = argss[0];
    } else {
      options = {
        configFile: argss,
      };
    }

    if (options.configFile.isValid) {
      const serverConfig = options.configFile.config?.server || {};
      const port = await this._getPort(serverConfig);
      if (!_.isNil(port)) {
        await this._startAppium(options.configFile, port);
      }
    }
  }

  private async _getPort(serverConfig: Record<string, any>): Promise<number | null> {
    const portFromConfig = serverConfig?.port || DEFAULT_APPIUM_PORT;

    if (!!portFromConfig && (await isPortFree(portFromConfig))) {
      return portFromConfig;
    } else {
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
  }

  private async _startAppium(configFile: ConfigFile, port: number) {
    const serverConfig = configFile.config?.server || {};
    const proxyPort = await findFreePort();

    const launchOptions: AppiumLaunchOption = {
      appiumPort: port,
      address: serverConfig.address || '127.0.0.1',
      appiumHome: <string>this.dataStore.getActiveAppiumHome()?.path,
      appiumModulePath: <string>this.dataStore.getActiveAppiumBinary()?.executable,
      basePath: serverConfig.basePath || '/',
      configPath: configFile.uri.fsPath,
      proxyPort: proxyPort,
    };
    const launchArgs = Object.entries(launchOptions).map(([key, value]) => {
      return [`--${key}`, value];
    });

    const pty = new Pty(
      'Appium server',
      path.join(__dirname, APPIUM_SERVER_PROCESS),
      {
        killOnTerminalClosed: true,
        args: _.flatMap(launchArgs),
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        useFork: true,
        execArgv: [],
        cwd: __dirname,
      },
      {
        onStdout: (data) => {
          if (data.toString().toLowerCase().includes('http interface listener started')) {
            appiumServiceInstance.ready();
            this.eventBus.fire(new AppiumServerStartedEvent(appiumServiceInstance));
            return data
              .toString()
              .replace(`:${launchOptions.proxyPort}`, `:${launchOptions.appiumPort}`);
          }
          return data.toString();
        },
        onStdErr: (error) => {
          pty.close();
          return error.toString();
        },
      }
    );
    const appiumServiceInstance = new AppiumServiceInstance(uuid(), pty, launchOptions);
    pty.startProcess();
  }
}
