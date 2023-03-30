import { Command } from './command';
import { EventBus } from '../events/event-bus';
import { Pty } from '../pty';
import { AppiumHome, AppiumInstance, ExtensionType } from '../types';
import * as vscode from 'vscode';
import * as fs from 'fs';
import _ = require('lodash');
import { AppiumExtensionUpdatedEvent } from '../events/appium-extension-updated-event';

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

  constructor(private eventBus: EventBus) {
    super(UpdateAppiumExtensionCommand.NAME);
  }

  public async excute(argss: [AppiumHome, AppiumInstance, UpdateExtensionOptions]) {
    const [appiumHome, appiumInstance, options] = [...argss];
    let unsafe = await this.getUnsafeUpdateStatus(options.versions);

    const args = [appiumInstance.executable as string, options.type, 'update', options.name];

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

  async getUnsafeUpdateStatus(updates: { safe?: string; force?: string }) {
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
      if (selectedVersion?.label === updates.force) {
        return true;
      }
    } else if (!!updates.safe) {
      return false;
    } else {
      return true;
    }
  }
}