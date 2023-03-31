import * as vscode from 'vscode';
import * as fs from 'fs';
import { DataStore } from '../db/data-store';
import { EventBus } from '../events/event-bus';
import { Command } from './command';
import { AppiumHomeUpdatedEvent } from '../events/appium-home-updated-event';
import { AppiumHome } from '../types';

export interface DeleteAppiumHomeOptions {
  appiumHome: AppiumHome;
}

export class DeleteAppiumHomeCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.environment.delete-appium-home';

  constructor(private eventBus: EventBus, private dataStore: DataStore) {
    super(DeleteAppiumHomeCommand.NAME);
  }

  public async excute(args: [DeleteAppiumHomeOptions]) {
    const [options] = [...args];
    if (!!options.appiumHome) {
      if (options.appiumHome.name === 'default') {
        return vscode.window.showInformationMessage('Cannot delete default appiumhome');
      }
      // const deleteFolder = await vscode.window.showInformationMessage(
      //   'Do you want also want to remove all drivers and plugins?',
      //   'Yes',
      //   'No'
      // );

      // if (deleteFolder === 'Yes') {
      //   fs.rmSync(options.appiumHome.path, { recursive: true, force: true });
      // }
      this.dataStore.deleteAppiumHome(options.appiumHome);

      this.eventBus.fire(new AppiumHomeUpdatedEvent(this.dataStore.getAppiumHomes()));
    }
  }
}
