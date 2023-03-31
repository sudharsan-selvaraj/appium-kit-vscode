import { Command } from './command';
import { EventBus } from '../events/event-bus';
import { Pty } from '../pty';
import { AppiumHome, AppiumBinary, ExtensionType } from '../types';
import * as vscode from 'vscode';
import * as fs from 'fs';
import _ = require('lodash');
import { AppiumExtensionUpdatedEvent } from '../events/appium-extension-updated-event';
import { DataStore } from '../db/data-store';

export interface InstallExtensionOptions {
  type: ExtensionType;
}

export class InstallAppiumExtensionCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.extension.install';

  constructor(private eventBus: EventBus, private dataStore: DataStore) {
    super(InstallAppiumExtensionCommand.NAME);
  }

  public async excute(argss: [InstallExtensionOptions]) {
    const [options] = [...argss];
    const appiumBinary = this.dataStore.getActiveAppiumBinary();
    const appiumHome = this.dataStore.getActiveAppiumHome();
    if (!appiumBinary || !appiumHome) {
      return;
    }
    const installationSpec = await this.getInstallationSpec(options.type);

    if (_.isNil(installationSpec)) {
      return vscode.window.showInformationMessage(`Skipping installation of ${options.type}`);
    }

    const args = [
      appiumBinary.executable as string,
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
          pty.write(
            `* Installing ${installationSpec.name} ${options.type} in path ${appiumHome.path}`
          );
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
      if (name.endsWith('.git')) {
        source = 'git';
      } else {
        source = await this.getSource(type);
        if (!source) {
          return null;
        }
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

  private async getExtensionName(type: ExtensionType) {
    const name = await vscode.window.showInputBox({
      title: `Enter the name of ${type} to be installed`,
      placeHolder: 'Eg: appium-xcuitest-driver',
    });

    return name;
  }

  private async getSource(type: ExtensionType) {
    const source = await vscode.window.showQuickPick(['npm', 'github', 'local', 'git'], {
      canPickMany: false,
      title: `Pick the installation source of the ${type}`,
    });

    return source;
  }

  private async getPackageName(type: ExtensionType) {
    const packageName = await vscode.window.showInputBox({
      title: `Enter the name of package`,
      placeHolder: 'Eg: appium-xcuitest-driver',
    });

    return packageName;
  }
}
