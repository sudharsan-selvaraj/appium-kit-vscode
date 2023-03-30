import { Command } from './command';
import { EventBus } from '../events/event-bus';
import { Pty } from '../pty';
import { AppiumHome, AppiumInstance } from '../types';
import { AppiumExtensionUpdatedEvent } from '../events/appium-extension-updated-event';

export interface UnInstallExtensionOptions {
  name: string;
  type: 'driver' | 'plugin';
}

export class UnInstallAppiumExtensionCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.extension.uninstall';

  constructor(private eventBus: EventBus) {
    super(UnInstallAppiumExtensionCommand.NAME);
  }

  public async excute(argss: [AppiumHome, AppiumInstance, UnInstallExtensionOptions]) {
    const [appiumHome, appiumInstance, options] = [...argss];

    const args = [appiumInstance.executable as string, options.type, 'uninstall', options.name];

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
          pty.write(`* Uninstalling ${options.name} ${options.type}`);
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
