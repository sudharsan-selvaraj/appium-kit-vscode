import { Command } from './command';
import { EventBus } from '../events/event-bus';
import { Pty } from '../pty';
import { AppiumHomeChangedEvent } from '../events/appium-home-changed-event';
import { AppiumHome, AppiumInstance } from '../types';
import * as vscode from 'vscode';
import * as fs from 'fs';
import _ = require('lodash');
import { AppiumExtensionUpdatedEvent } from '../events/appium-extension-updated-event';

export interface InstallExtensionOptions {
  type: 'driver' | 'plugin';
}

export class InstallAppiumExtensionCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.extension.install';

  constructor(private eventBus: EventBus) {
    super(InstallAppiumExtensionCommand.NAME);
  }

  public async excute(argss: [AppiumHome, AppiumInstance, InstallExtensionOptions]) {
    const [appiumHome, appiumInstance, options] = [...argss];
    const installationSpec = await this.getInstallationSpec(options.type);

    if (_.isNil(installationSpec)) {
      return vscode.window.showInformationMessage(`Skipping installation of ${options.type}`);
    }

    const args = [
      appiumInstance.executable as string,
      options.type,
      'install',
      installationSpec.name,
      '--source',
      installationSpec.source,
    ];

    if (installationSpec.package) {
      args.push('--package', installationSpec.package);
    }

    const pty = new Pty(
      `Install ${installationSpec.name} ${options.type}`,
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
          pty.write(`* Installing ${installationSpec.name} ${options.type}`);
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

  private async getInstallationSpec(type: 'driver' | 'plugin'): Promise<{
    name: string;
    source: string;
    package?: string;
  } | null> {
    let name, source, packageName;

    name = await this.getExtensionName(type);

    if (!name) {
      return null;
    }

    if (fs.existsSync(name)) {
      return {
        name,
        source: 'local',
      };
    } else {
      source = await this.getSource(type);
      if (!source) {
        return null;
      }

      if (source === 'github' || source === 'git') {
        packageName = await this.getPackageName(type);
        if (!packageName) {
          return null;
        } else {
          return {
            name,
            source,
            package: packageName,
          };
        }
      } else {
        return {
          name,
          source,
        };
      }
    }
  }

  private async getExtensionName(type: 'driver' | 'plugin') {
    const name = await vscode.window.showInputBox({
      title: `Enter the name of ${type} to be installed`,
      placeHolder: 'Eg: appium-xcuitest-driver',
    });

    return name;
  }

  private async getSource(type: 'driver' | 'plugin') {
    const source = await vscode.window.showQuickPick(['npm', 'github', 'local', 'git'], {
      canPickMany: false,
      title: `Pick the installation source of the ${type}`,
    });

    return source;
  }

  private async getPackageName(type: 'driver' | 'plugin') {
    const packageName = await vscode.window.showInputBox({
      title: `Enter the name of package`,
      placeHolder: 'Eg: appium-xcuitest-driver',
    });

    return packageName;
  }
}
