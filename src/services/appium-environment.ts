import * as vscode from 'vscode';
import {
  AppiumEnvironmentProvider,
  AppiumStatusChangeListener,
} from '../interfaces/appium-environment-provider';
import { ConfigManager } from '../vscode/config-manager';
import { StateManager } from '../vscode/state-manager';
import { Appium } from '../appium';
import _ = require('lodash');

export enum AppiumSource {
  settings = 'settings',
  installed = 'installed',
}

export interface AppiumStatus {
  version: string;
  path: string;
  source: AppiumSource;
  isSupported: boolean;
}

export class AppiumEnvironmentService
  implements AppiumEnvironmentProvider, vscode.Disposable
{
  private appiumStatus: AppiumStatus | null = null;
  private statusChangeListeners: AppiumStatusChangeListener[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private configManager: ConfigManager,
    private stateManager: StateManager
  ) {}

  async initialize() {
    await this.refresh();
    this.addConfigChangeListener();
    return this;
  }

  private addConfigChangeListener() {
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration('appium.appiumPath')) {
        const appiumPath = this.configManager.getAppiumPath();
        if (this.isAppiumPathChanged(appiumPath)) {
          const currentStatus = _.clone(this.appiumStatus);
          await this.refresh();
          if (!_.isEqual(currentStatus, this.appiumStatus)) {
            this.notify();
          }
        }
      }
    });
  }

  private isAppiumPathChanged(newAppiumpath: string) {
    return (
      !_.isEmpty(newAppiumpath) &&
      (_.isNil(this.appiumStatus) ||
        !_.isEqual(this.appiumStatus.path, newAppiumpath))
    );
  }

  private notify() {
    this.statusChangeListeners.forEach((listener) =>
      listener.onAppiumStatusChange(this.appiumStatus)
    );
  }

  private async updateState() {
    if (_.isNil(this.appiumStatus) || !this.appiumStatus.isSupported) {
      this.stateManager.appiumNotConfigured();
    } else {
      this.stateManager.appiumConfigured();
    }
  }

  private async refreshAppiumStatus() {
    const currentAppiumPathInConfig = this.configManager.getAppiumPath();
    this.appiumStatus = !_.isEmpty(this.configManager.getAppiumPath())
      ? await this.discoverAppiumFromConfig()
      : await this.discoverInstalledAppium();

    if (
      !_.isNil(this.appiumStatus) &&
      this.appiumStatus.isSupported &&
      currentAppiumPathInConfig !== this.appiumStatus.path
    ) {
      this.configManager.setAppiumPath(this.appiumStatus.path);
    }
  }

  private async discoverAppiumFromConfig(): Promise<AppiumStatus | null> {
    const appiumPath = this.configManager.getAppiumPath();
    if (!!appiumPath) {
      return this.getAppiumDetails(appiumPath, AppiumSource.settings);
    } else {
      return null;
    }
  }

  private async discoverInstalledAppium(): Promise<AppiumStatus | null> {
    const appiumPath = Appium.getAppiumInstallationPath();
    if (!!appiumPath) {
      return this.getAppiumDetails(appiumPath, AppiumSource.installed);
    } else {
      return null;
    }
  }

  private async getAppiumDetails(
    appiumPath: string | null,
    source: AppiumSource
  ): Promise<AppiumStatus | null> {
    try {
      if (!appiumPath) {
        return null;
      } else {
        const appiumVersion = await Appium.getAppiumVersion(appiumPath);
        const isVersionSupported = !!appiumVersion
          ? Appium.isVersionSupported(appiumVersion)
          : false;

        return {
          version: appiumVersion,
          path: appiumPath,
          isSupported: isVersionSupported,
          source,
        };
      }
    } catch (err) {
      return null;
    }
  }

  getAppiumStatus(): AppiumStatus | null {
    return this.appiumStatus;
  }

  addStatusChangeListener(listener: AppiumStatusChangeListener): void {
    this.statusChangeListeners.push(listener);
  }

  async refresh(): Promise<AppiumStatus | null> {
    await this.refreshAppiumStatus();
    await this.updateState();
    return this.appiumStatus;
  }

  dispose() {
    //not implemented
  }
}
