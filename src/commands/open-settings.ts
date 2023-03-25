import { Command } from './command';
import * as vscode from 'vscode';

export class OpenSettingsCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.openSettings';

  constructor() {
    super(OpenSettingsCommand.NAME);
  }

  public excute(settingsPrefix: string = 'appium') {
    vscode.commands.executeCommand(
      'workbench.action.openSettings',
      settingsPrefix
    );
  }
}
