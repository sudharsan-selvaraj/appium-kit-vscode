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
  private _isEnvironmentInitialized = false;

  constructor(
    private stateManager: StateManager,
    private dataStore: DataStore,
    private workspace: VscodeWorkspace,
    private eventBus: EventBus
  ) {
    this.eventBus.addListener(
      RefreshAppiumEnvironmentEvent.listener(async () => {
        await this.refreshAppiumEnvironment();
      })
    );
  }

  async initialize() {
    this.stateManager.appiumNotConfigured();
    await this.refreshAppiumEnvironment();
    return this;
  }

  private async _updateState(appiumBinaries: AppiumBinary[]) {
    if (_.isEmpty(appiumBinaries)) {
      this.stateManager.appiumNotConfigured();
      this._isEnvironmentInitialized = false;
    } else if (!this._isEnvironmentInitialized) {
      this.stateManager.appiumConfigured();
      this._isEnvironmentInitialized = true;
    }
  }

  private async _discoverAppiumBinaries(): Promise<AppiumBinary[]> {
    const binaries = await Promise.all([this.discoverLocalAppium(), this.discoverGlobalAppium()]);
    return binaries.filter((binary) => !_.isNil(binary) && binary.isSupported) as AppiumBinary[];
  }

  private async _discoverAppiumHomes() {
    return [getDefaultAppiumHome(), this.dataStore.getAppiumHomes()]
      .flatMap((entry) => entry)
      .filter((home) => fs.existsSync(home.path));
  }

  async refreshAppiumEnvironment() {
    const [newBinaries, newHomes] = await Promise.all([
      this._discoverAppiumBinaries(),
      this._discoverAppiumHomes(),
    ]);

    const isHomeChanged = this.dataStore.updateAppiumHome(newHomes);
    const isBinaryChanged = this.dataStore.updateAppiumBinary(newBinaries);

    if (isHomeChanged || !this._isEnvironmentInitialized) {
      this.eventBus.fire(new AppiumHomeUpdatedEvent(this.dataStore.getAppiumHomes()));
    }

    if (isBinaryChanged || !this._isEnvironmentInitialized) {
      this.eventBus.fire(new AppiumBinaryUpdatedEvent(this.dataStore.getAppiumBinaries()));
    }
    this._updateState(newBinaries);
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

  dispose() {
    //not implemented
  }
}
