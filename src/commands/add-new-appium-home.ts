import * as vscode from 'vscode';
import * as fs from 'fs';
import { DataStore } from '../db/data-store';
import { EventBus } from '../events/event-bus';
import { Command } from './command';
import { AppiumHomeUpdatedEvent } from '../events/appium-home-updated-event';

export class AddNewAppiumHomeCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.environment.add-home';

  constructor(private eventBus: EventBus, private dataStore: DataStore) {
    super(AddNewAppiumHomeCommand.NAME);
  }

  public async excute() {
    const existingPaths = this.dataStore.getAppiumHomes();

    const homePath = await vscode.window.showInputBox({
      placeHolder: 'eg: ~/.appium/',
      prompt: 'Enter the path for new Appium Home',
      value: '',
      validateInput: (value) => {
        if (existingPaths.some((p) => p.path === value)) {
          return 'Path already added to appium home';
        } else if (!fs.existsSync(value) || !fs.statSync(value).isDirectory()) {
          return 'Path is not a valid directory';
        }
        return null;
      },
    });

    if (!!homePath) {
      const name = await vscode.window.showInputBox({
        placeHolder: 'Eg: MyPersonalProjectHome',
        prompt: 'Give a name to the appium home',
        value: '',
      });

      if (!!name) {
        this.dataStore.addNewAppiumHome({ name, path: homePath });
        this.eventBus.fire(new AppiumHomeUpdatedEvent(this.dataStore.getAppiumHomes()));
      }
    }
  }
}
