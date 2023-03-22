import * as vscode from 'vscode';
import { WelcomeWebview } from './views/webview/welcome';
import { sync as which } from 'which';
import { Config } from './config';
import { Context } from './context';
import { exec } from 'teen_process';
import * as semver from 'semver';
import _ = require('lodash');
import { APPIUM_VERIFY_INSTALLATION_COMMAND } from './commands';

export async function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'appium.welcome',
      new WelcomeWebview(context)
    )
  );

  // context.subscriptions.push(
  //   vscode.commands.registerCommand(APPIUM_VERIFY_INSTALLATION_COMMAND, () => {
  //     checkForAppium(context);
  //   })
  // );
  // await checkForAppium(context);
}

export function deactivate() {}
