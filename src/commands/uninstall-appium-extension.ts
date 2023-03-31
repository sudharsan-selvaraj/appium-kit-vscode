import { Command } from './command';
import { EventBus } from '../events/event-bus';
import { Pty } from '../pty';
import { AppiumHome, AppiumBinary, ExtensionType } from '../types';
import { AppiumExtensionUpdatedEvent } from '../events/appium-extension-updated-event';
import { DataStore } from '../db/data-store';

export interface UnInstallExtensionOptions {
  name: string;
  type: ExtensionType;
}

export class UnInstallAppiumExtensionCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.extension.uninstall';

  constructor(private eventBus: EventBus, private dataStore: DataStore) {
    super(UnInstallAppiumExtensionCommand.NAME);
  }

  public async excute(argss: [UnInstallExtensionOptions]) {
    const [options] = [...argss];
    const appiumBinary = this.dataStore.getActiveAppiumBinary();
    const appiumHome = this.dataStore.getActiveAppiumHome();
    if (!appiumBinary || !appiumHome) {
      return;
    }
    const args = [appiumBinary.executable as string, options.type, 'uninstall', options.name];

    const pty = new Pty(
      `Uninstall ${options.name} ${options.type}`,
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
          pty.write(`* Uninstalling ${options.name} ${options.type} in path ${appiumHome.path}`);
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
}
