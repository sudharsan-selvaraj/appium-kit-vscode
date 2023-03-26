import * as vscode from 'vscode';
import { WelcomeWebview } from './views/webview/welcome';
import {
  APPIUM_CONFIGURATION_VIEW,
  APPIUM_CONFIG_FILE_VIEW,
  APPIUM_ENVIRONMENT_VIEW,
  APPIUM_EXTENSIONS_VIEW,
} from './constants';
import { AppiumEnvironmentWebView } from './views/webview/appium-environment';
import { ConfigViewProvider } from './views/treeview/config-provider';
import { AppiumEnvironmentService } from './services/appium-environment';
import { StateManager } from './vscode/state-manager';
import { OpenSettingsCommand } from './commands/open-settings';
import { CommandManager } from './vscode/command-manager';
import { VscodeWorkspace } from './vscode/workspace';
import { EventBus } from './events/event-bus';
import { AppiumExtensions } from './views/webview/appium-extensions';

let disposables: vscode.Disposable[] = [];

function getCommands() {
  return [new OpenSettingsCommand()];
}

export async function activate(context: vscode.ExtensionContext) {
  const eventBus = new EventBus();
  const stateManager = new StateManager();
  const workspace = new VscodeWorkspace(context);

  CommandManager.registerCommands(getCommands());

  const appiumEnvironmentService = await new AppiumEnvironmentService(
    stateManager,
    workspace
  ).initialize();

  const welcomeViewProvider = new WelcomeWebview(context, appiumEnvironmentService);
  const configViewProvider = new ConfigViewProvider();
  const environmentViewProvider = new AppiumEnvironmentWebView(
    context,
    eventBus,
    appiumEnvironmentService
  );
  const appiumExtensionsView = new AppiumExtensions(context, eventBus, appiumEnvironmentService);

  /* Initialize Views */
  disposables = [
    await welcomeViewProvider.register(APPIUM_CONFIGURATION_VIEW, context),
    await configViewProvider.register(APPIUM_CONFIG_FILE_VIEW, context),
    await environmentViewProvider.register(APPIUM_ENVIRONMENT_VIEW, context),
    await appiumExtensionsView.register(APPIUM_EXTENSIONS_VIEW, context),
  ];
}

export function deactivate() {
  disposables.forEach((disposable) => disposable.dispose());
}
