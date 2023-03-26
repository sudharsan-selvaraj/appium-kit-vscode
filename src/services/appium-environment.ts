import * as vscode from 'vscode';
import {
  AppiumEnvironmentProvider,
  AppiumStatusChangeListener,
} from '../interfaces/appium-environment-provider';
import { StateManager } from '../vscode/state-manager';
import _ = require('lodash');
import { VscodeWorkspace } from '../vscode/workspace';
import * as fs from 'fs';
import {
  getAppiumExecutablePath,
  getAppiumVersion,
  getDefaultAppiumHome,
  getGlobalAppiumPath,
  isAppiumVersionSupported,
} from '../utils/appium';
import { AppiumHome } from '../types';

export enum AppiumSource {
  global = 'global',
  workspace = 'workspace',
}

export interface AppiumInstance {
  version: string;
  path: string;
  executable?: string;
  source: AppiumSource;
  isSupported: boolean;
}

export class AppiumEnvironmentService implements AppiumEnvironmentProvider, vscode.Disposable {
  private appiumInstances: Array<AppiumInstance> = [];
  private statusChangeListeners: AppiumStatusChangeListener[] = [];

  constructor(private stateManager: StateManager, private workspace: VscodeWorkspace) {}

  async initialize() {
    await this.refresh();
    return this;
  }

  getAppiumHomes(): AppiumHome[] {
    return [
      [getDefaultAppiumHome()],
      this.workspace.localStore().getAppiumHomes(),
      this.workspace.globalStore().getAppiumHomes(),
    ].flatMap((entry) => entry);
  }

  getAppiumInstances(): AppiumInstance[] {
    return this.appiumInstances;
  }

  private notify() {
    this.statusChangeListeners.forEach((listener) =>
      listener.onAppiumStatusChange(this.appiumInstances)
    );
  }

  private async updateState() {
    if (_.isEmpty(this.appiumInstances)) {
      this.stateManager.appiumNotConfigured();
    } else {
      this.stateManager.appiumConfigured();
    }
  }

  private async refreshAppiumInstances() {
    this.appiumInstances = [];
    const instances = await Promise.all([
      await this.discoverLocalAppium(),
      await this.discoverGlobalAppium(),
    ]);

    instances
      .filter((instance) => !_.isNil(instance) && instance.isSupported)
      .forEach((instance) => this.appiumInstances.push(<AppiumInstance>instance));

    this.notify();
  }

  private async discoverGlobalAppium(): Promise<AppiumInstance | null> {
    const appiumPath = getGlobalAppiumPath();
    if (!!appiumPath) {
      return this.getAppiumDetails(appiumPath, AppiumSource.global);
    } else {
      return null;
    }
  }

  private async discoverLocalAppium(): Promise<AppiumInstance | null> {
    if (
      this.workspace.isOpened() &&
      fs.existsSync(this.workspace.getFilePath('node_modules/appium'))
    ) {
      return this.getAppiumDetails(
        this.workspace.getFilePath('node_modules/appium'),
        AppiumSource.workspace
      );
    } else {
      return null;
    }
  }

  private async getAppiumDetails(
    appiumPath: string | null,
    source: AppiumSource
  ): Promise<AppiumInstance | null> {
    try {
      if (!appiumPath) {
        return null;
      } else {
        const appiumVersion = await getAppiumVersion(appiumPath);
        const isVersionSupported = !!appiumVersion
          ? isAppiumVersionSupported(appiumVersion)
          : false;

        return {
          version: appiumVersion,
          path: appiumPath,
          isSupported: isVersionSupported,
          executable: isVersionSupported ? getAppiumExecutablePath(appiumPath) : '',
          source,
        };
      }
    } catch (err) {
      return null;
    }
  }

  addStatusChangeListener(listener: AppiumStatusChangeListener): void {
    this.statusChangeListeners.push(listener);
  }

  async refresh(): Promise<AppiumInstance[]> {
    await this.refreshAppiumInstances();
    await this.updateState();
    return this.appiumInstances;
  }

  dispose() {
    //not implemented
  }
}
