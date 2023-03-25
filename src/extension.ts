import * as vscode from 'vscode';
import { WelcomeWebview } from './views/webview/welcome';
import {
  APPIUM_CONFIGURATION_VIEW,
  APPIUM_CONFIG_FILE_VIEW,
} from './constants';
import { AppiumEnvironment } from './views/webview/appium-environment';
import { ConfigViewProvider } from './views/treeview/config-provider';
import { AppiumEnvironmentService } from './services/appium-environment';
import { ConfigManager } from './vscode/config-manager';
import { StateManager } from './vscode/state-manager';
import { OpenSettingsCommand } from './commands/open-settings';
import { CommandManager } from './vscode/command-manager';

const disposables: vscode.Disposable[] = [];

function getCommands() {
  return [new OpenSettingsCommand()];
}

export async function activate(context: vscode.ExtensionContext) {
  const configManager = new ConfigManager();
  const stateManager = new StateManager();

  CommandManager.registerCommands(getCommands());
  const appiumEnvironmentProvider = new AppiumEnvironmentService(
    context,
    configManager,
    stateManager
  );

  const welcomeViewProvider = new WelcomeWebview(
    context,
    appiumEnvironmentProvider
  );
  const configViewProvider = new ConfigViewProvider();

  /* Initialize Views */
  welcomeViewProvider.register(APPIUM_CONFIGURATION_VIEW, context);
  configViewProvider.register(APPIUM_CONFIG_FILE_VIEW, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'appium.environment',
      new AppiumEnvironment(context)
    )
  );

  /* Initialize Services */
  await appiumEnvironmentProvider.initialize();
}

export function deactivate() {}
