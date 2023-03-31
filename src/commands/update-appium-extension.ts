import { Command } from './command';
import { EventBus } from '../events/event-bus';
import { Pty } from '../pty';
import { AppiumBinary, ExtensionType } from '../types';
import * as vscode from 'vscode';
import * as fs from 'fs';
import _ = require('lodash');
import { AppiumExtensionUpdatedEvent } from '../events/appium-extension-updated-event';
import { DataStore } from '../db/data-store';

export interface UpdateExtensionOptions {
  type: ExtensionType;
  name: string;
  versions: {
    safe?: string;
    force?: string;
  };
}

export class UpdateAppiumExtensionCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.extension.update';

  constructor(private eventBus: EventBus, private dataStore: DataStore) {
    super(UpdateAppiumExtensionCommand.NAME);
  }

  public async excute(argss: [UpdateExtensionOptions]) {
    const [options] = [...argss];
    const appiumBinary = this.dataStore.getActiveAppiumBinary();
    const appiumHome = this.dataStore.getActiveAppiumHome();
    if (!appiumBinary || !appiumHome) {
      return;
    }

    let unsafe = await this.isUnsafeUpdate(options.versions);

    const args = [appiumBinary.executable as string, options.type, 'update', options.name];

    if (!!unsafe) {
      args.push('--unsafe');
    }

    const pty = new Pty(
      `Install ${options.name} ${options.type}`,
      'node',
      {
        args: args,
        cwd: appiumHome.path,
        env: {
          ...process.env,
          APPIUM_HOME: appiumHome.path,
        },
      },
      {
        onStarted: () => {
          pty.write(`* Updating ${options.name} ${options.type}`);
          pty.write(`> node ${args.join(' ')}`);
        },
        onComplete: () => {
          pty.write(`* Process is completed. You can now close the terminal`);
          this.eventBus.fire(new AppiumExtensionUpdatedEvent());
        },
      }
    );

    pty.startProcess();
  }

  async isUnsafeUpdate(updates: { safe?: string; force?: string }) {
    if (!!updates.safe && !!updates.force) {
      const quickPickItem = [
        {
          label: updates.safe,
          description: 'Safe update',
          kind: vscode.QuickPickItemKind.Default,
        },
        {
          label: updates.force,
          description: 'Unsafe update',
          detail: 'This is a major update and might have some breaking changes',
          kind: vscode.QuickPickItemKind.Default,
        },
      ] as vscode.QuickPickItem[];
      const selectedVersion = await vscode.window.showQuickPick(quickPickItem, {
        canPickMany: false,
      });
      return selectedVersion?.label === updates.force;
    }
    return _.isEmpty(updates.safe) || _.isNil(updates.safe);
  }
}
