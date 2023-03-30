import * as vscode from 'vscode';

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
import { AppiumBinary, AppiumSource } from '../types';
import { EventBus } from '../events/event-bus';
import { DataStore } from '../db/data-store';
import { AppiumHomeUpdatedEvent } from '../events/appium-home-updated-event';
import { AppiumBinaryUpdatedEvent } from '../events/appium-binary-updated-event';
import { RefreshAppiumEnvironmentEvent } from '../events/refresh-appium-environment-event';

const APPIUM_NODE_MODULE_RELATIVE_PATH = 'node_modules/appium';

export class AppiumEnvironmentService implements vscode.Disposable {
  private isEnvironmentReady = false;

  constructor(
    private stateManager: StateManager,
    private dataStore: DataStore,
    private workspace: VscodeWorkspace,
    private eventBus: EventBus
  ) {
    this.eventBus.addListener(
      RefreshAppiumEnvironmentEvent.listener(async () => {
        await this.refresh();
      })
    );
  }

  async initialize() {
    await this._refreshAppiumEnvironment();
    return this;
  }

  private async _updateState(appiumBinaries: AppiumBinary[]) {
    if (_.isEmpty(appiumBinaries)) {
      this.stateManager.appiumNotConfigured();
      this.isEnvironmentReady = false;
    } else if (!this.isEnvironmentReady) {
      this.stateManager.appiumConfigured();
      this.isEnvironmentReady = true;
    }
  }

  private async _discoverAppiumBinaries(): Promise<AppiumBinary[]> {
    const binaries = await Promise.all([this.discoverLocalAppium(), this.discoverGlobalAppium()]);
    return binaries.filter((binary) => !_.isNil(binary) && binary.isSupported) as AppiumBinary[];
  }

  private async _discoverAppiumHomes() {
    return [getDefaultAppiumHome(), this.dataStore.getAppiumHomes()].flatMap((entry) => entry);
  }

  private async _refreshAppiumEnvironment() {
    const [newBinaries, newHomes] = await Promise.all([
      this._discoverAppiumBinaries(),
      this._discoverAppiumHomes(),
    ]);

    const isHomeChanged = this.dataStore.updateAppiumHome(newHomes);
    const isBinaryChanged = this.dataStore.updateAppiumBinary(newBinaries);
    if (isBinaryChanged) {
      this._updateState(newBinaries);
    }

    return {
      isHomeChanged,
      isBinaryChanged,
    };
  }

  private async discoverGlobalAppium(): Promise<AppiumBinary | null> {
    const appiumPath = getGlobalAppiumPath();
    if (!!appiumPath) {
      return this.getAppiumDetails(appiumPath, AppiumSource.global);
    } else {
      return null;
    }
  }

  private async discoverLocalAppium(): Promise<AppiumBinary | null> {
    const appiumPath = this.workspace.isOpened()
      ? this.workspace.getFilePath(APPIUM_NODE_MODULE_RELATIVE_PATH)
      : null;

    if (!!appiumPath && fs.existsSync(appiumPath)) {
      return this.getAppiumDetails(appiumPath, AppiumSource.workspace);
    }
    return null;
  }

  private async getAppiumDetails(path: string, source: AppiumSource): Promise<AppiumBinary | null> {
    try {
      const appiumVersion = await getAppiumVersion(path);
      const isVersionSupported = isAppiumVersionSupported(appiumVersion);

      return {
        version: appiumVersion,
        path: path,
        isSupported: isVersionSupported,
        executable: isVersionSupported ? getAppiumExecutablePath(path) : '',
        source,
      };
    } catch (err) {
      return null;
    }
  }

  async refresh() {
    const { isHomeChanged, isBinaryChanged } = await this._refreshAppiumEnvironment();

    isHomeChanged &&
      this.eventBus.fire(new AppiumHomeUpdatedEvent(this.dataStore.getAppiumHomes()));
    isBinaryChanged &&
      this.eventBus.fire(new AppiumBinaryUpdatedEvent(this.dataStore.getAppiumBinaries()));
  }

  dispose() {
    //not implemented
  }
}
