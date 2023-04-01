import * as vscode from 'vscode';
import * as fs from 'fs';
import { Command } from './command';
import { ConfigDirectory } from '../views/treeview/config-files/config-tree-tems';
import * as path from 'path';
import * as yaml from 'yaml';

const DEFAULT_CONFIG = {
  server: {
    port: 4723,
  },
};

const jsonConfigProvider = () => {
  return JSON.stringify(DEFAULT_CONFIG, null, 2);
};

const yamlConfigProvider = () => {
  return yaml.stringify(DEFAULT_CONFIG);
};

export class CreateNewAppiumConfigCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.config.create-new';

  constructor() {
    super(CreateNewAppiumConfigCommand.NAME);
  }

  public async excute(configDirectory: ConfigDirectory) {
    const prompt = 'Only json and yaml files are supported';
    const fileName = await vscode.window.showInputBox({
      title: 'Enter the file name',
      placeHolder: 'appium.conf.json',
      prompt: prompt,
      validateInput: (value) => {
        const ext = path.extname(value);
        if (!!ext && !new RegExp(/json|yaml/).test(ext)) {
          return prompt;
        } else if (fs.existsSync(path.join(configDirectory.uri.fsPath, value))) {
          return 'File with the name already exists';
        }
      },
    });

    if (fileName) {
      const ext = path.extname(fileName);
      fs.writeFileSync(
        path.join(configDirectory.uri.fsPath, fileName),
        this._getDefaultConfig(ext)
      );
    }
  }

  private _getDefaultConfig(extension: string) {
    if (!extension || extension === '.json') {
      return jsonConfigProvider();
    } else {
      return yamlConfigProvider();
    }
  }
}
