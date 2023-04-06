import { Command } from './command';
import { AppiumEnvironmentService } from '../services/environment';
import { AppiumSession } from '../models/appium-session';
import * as vscode from 'vscode';
import { html } from 'common-tags';
import _ = require('lodash');

interface OpenSessionDetailsCommandOptions {
  session: AppiumSession;
}

export class OpenSessionDetailsCommand extends Command {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public static readonly NAME = 'appium.session.view';

  constructor() {
    super(OpenSessionDetailsCommand.NAME);
  }

  public async excute(args: [OpenSessionDetailsCommandOptions] | AppiumSession) {
    const [option] = _.isArray(args) ? [...args] : [{ session: args }];

    if (!option.session.isRunning()) {
      return vscode.window.showInformationMessage(
        'Unable view session details for completed sessions'
      );
    }

    const panel = vscode.window.createWebviewPanel('Webview', 'Appium', vscode.ViewColumn.One);
    panel.webview.options = {
      enableScripts: true,
    };

    panel.webview.html = html`<html style="height:100%;width:100%">
      <body style="height:100%;width:100%;display:flex;align-items:center;justify-content:center;">
        <img src="http://localhost:${option.session.getCapability('mjpegServerPort')}" />
      </body>
    </html>`;
  }
}
