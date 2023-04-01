import * as vscode from 'vscode';
import * as fs from 'fs';
import { Command } from './command';
import { ConfigFile } from '../views/treeview/config-files/config-tree-tems';

export class DeleteAppiumConfigCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.config.delete';

  constructor() {
    super(DeleteAppiumConfigCommand.NAME);
  }

  public async excute(configFile: ConfigFile) {
    const confirmation = await vscode.window.showInformationMessage(
      'Are you sure? do you want to delete the config file?',
      {
        modal: true,
      },
      'Yes',
      'No'
    );
    if (confirmation === 'Yes') {
      fs.rmSync(configFile.uri.fsPath);
    }
  }
}
