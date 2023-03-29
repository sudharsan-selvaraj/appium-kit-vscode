import { Command } from './command';
import { AppiumHome, AppiumInstance } from '../types';
import { ExtensionContext } from 'vscode';
import { EventBus } from '../events/event-bus';
import { Pty } from '../pty';
import { AppiumHomeUpdatedEvent } from '../events/appium-home-updated-event';
import { AppiumHomeChangedEvent } from '../events/appium-home-changed-event';

export interface InstallExtensionOptions {
  name: string;
  source: string;
  package?: string;
  type: 'driver' | 'plugin';
}

export class InstallAppiumExtensionCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.extension.install';

  constructor(private eventBus: EventBus) {
    super(InstallAppiumExtensionCommand.NAME);
  }

  public async excute(arggs: any[]) {
    const [appiumHome, appiumInstance, options] = [...arggs];
    const args = [
      appiumInstance.path,
      options.type,
      'install',
      options.name,
      '--source',
      options.source,
    ];

    if (options.package) {
      args.push('--package', options.package);
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
        onComplete: () => {
          this.eventBus.fire(new AppiumHomeChangedEvent(appiumHome));
        },
      }
    );

    pty.startProcess();
  }
}
