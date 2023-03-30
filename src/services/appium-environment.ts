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
import { AppiumHome, AppiumInstance, AppiumSource } from '../types';
import { EventBus } from '../events/event-bus';
import { DatabaseService } from '../db';
import { AppiumHomeUpdatedEvent } from '../events/appium-home-updated-event';
import { AppiumInstanceUpdatedEvent } from '../events/appium-instance-updated-event';
import { AppiumHomeChangedEvent } from '../events/appium-home-changed-event';
import { AppiumVersionChangedEvent } from '../events/appium-version-changed-event';

export class AppiumEnvironmentService implements vscode.Disposable {
  constructor(
    private stateManager: StateManager,
    private workspace: VscodeWorkspace,
    private eventBus: EventBus
  ) {
    this.eventBus.addListener(
      AppiumHomeChangedEvent.listener(async (appiumHome: AppiumHome) => {
        await this.updateDefaultAppiumHome(appiumHome);
      })
    );

    this.eventBus.addListener(
      AppiumVersionChangedEvent.listener(async (appiumInstance: AppiumInstance) => {
        await this.updateDefaultAppiumVersion(appiumInstance);
      })
    );
  }

  async initialize() {
    await this.refreshAppiumEnvironment();
    await this.updateState();
    return this;
  }

  private async updateState() {
    const appiumInstances = DatabaseService.getAppiumInstances();
    if (_.isEmpty(appiumInstances)) {
      this.stateManager.appiumNotConfigured();
    } else {
      this.stateManager.appiumConfigured();
    }
  }

  private async discoverAppiumInstances(): Promise<AppiumInstance[]> {
    const instances = await Promise.all([
      await this.discoverLocalAppium(),
      await this.discoverGlobalAppium(),
    ]);

    return instances.filter(
      (instance) => !_.isNil(instance) && instance.isSupported
    ) as AppiumInstance[];
  }

  private async discoverAppiumHomes() {
    return [
      getDefaultAppiumHome(),
      this.workspace.localStore().getAppiumHomes(),
      this.workspace.globalStore().getAppiumHomes(),
    ].flatMap((entry) => entry);
  }

  private async refreshAppiumEnvironment() {
    const newAppiumInstances = await this.discoverAppiumInstances();
    const newAppiumHomes = await this.discoverAppiumHomes();

    DatabaseService.insertAppiumHome(newAppiumHomes, { reset: true });
    DatabaseService.insertAppiumInstance(newAppiumInstances, { reset: true });
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

  async refresh() {
    await this.refreshAppiumEnvironment();
    await this.updateState();

    this.eventBus.fire(new AppiumHomeUpdatedEvent(DatabaseService.getAppiumHomes()));
    this.eventBus.fire(new AppiumInstanceUpdatedEvent(DatabaseService.getAppiumInstances()));
  }

  async createNewAppiumHome() {
    const existingPaths = DatabaseService.getAppiumHomes();

    const homePath = await vscode.window.showInputBox({
      placeHolder: 'eg: ~/.appium/',
      prompt: 'Enter the path for new Appium Home',
      value: '',
    });

    if (!!homePath) {
      const pathAlreadyExists = existingPaths.find((p) => p.path === homePath);

      if (!!pathAlreadyExists) {
        vscode.window.showErrorMessage(
          `Provided path is already added to appium home with name ${pathAlreadyExists.name}`
        );
      } else if (!fs.existsSync(homePath) || !fs.statSync(homePath).isDirectory()) {
        vscode.window.showErrorMessage(`Provided path is not a valid directory ${homePath}`);
      } else {
        const name = await vscode.window.showInputBox({
          placeHolder: 'Eg: MyPersonalProjectHome',
          prompt: 'Give a name to the appium home',
          value: '',
        });

        if (!!name) {
          await this.workspace.globalStore().addAppiumHome({
            name,
            path: homePath,
          });
          this.refreshAppiumEnvironment();
          this.eventBus.fire(new AppiumHomeUpdatedEvent(DatabaseService.getAppiumHomes()));
        }
      }
    }
  }

  private async updateDefaultAppiumVersion(appiumInstance: AppiumInstance) {
    if (!appiumInstance) {
      return;
    }
    const allAppiumInstances = DatabaseService.getAppiumInstances();
    allAppiumInstances.forEach((instance) => {
      if (instance.path === appiumInstance.path) {
        instance.isActive = true;
      } else {
        instance.isActive = false;
      }
    });

    DatabaseService.insertAppiumInstance(allAppiumInstances, { reset: true });
  }

  private async updateDefaultAppiumHome(selectedAppiumHome: AppiumHome) {
    if (!selectedAppiumHome) {
      return;
    }
    const allAppiumHomes = DatabaseService.getAppiumHomes();
    allAppiumHomes.forEach((home) => {
      if (home.path === selectedAppiumHome.path) {
        home.isActive = true;
      } else {
        home.isActive = false;
      }
    });

    DatabaseService.insertAppiumHome(allAppiumHomes, { reset: true });
  }

  dispose() {
    //not implemented
  }
}
