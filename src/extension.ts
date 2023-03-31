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
import { AppiumEnvironmentService } from './services/environment';
import { StateManager } from './vscode/state-manager';
import { OpenSettingsCommand } from './commands/open-settings';
import { CommandManager } from './vscode/command-manager';
import { VscodeWorkspace } from './vscode/workspace';
import { EventBus } from './events/event-bus';
import { AppiumExtensionsWebView } from './views/webview/appium-extensions';
import { RefreshAppiumInstancesCommand } from './commands/refresh-appium-instances';
import { AddNewAppiumHomeCommand } from './commands/add-new-appium-home';
import { InstallAppiumExtensionCommand } from './commands/install-appium-extension';
import { UnInstallAppiumExtensionCommand } from './commands/uninstall-appium-extension';
import { UpdateAppiumExtensionCommand } from './commands/update-appium-extension';
import { DataStore } from './db/data-store';
import { initializeDb } from './db';
import { DeleteAppiumHomeCommand } from './commands/delete-appium-home';
import { AppiumInspector } from './views/webview/inspector';
import { AppiumServerView } from './views/webview/servers';

let disposables: vscode.Disposable[] = [];

export async function activate(context: vscode.ExtensionContext) {
  const collections = await initializeDb(context);
  const datastore = new DataStore(collections);
  const eventBus = new EventBus();
  const stateManager = new StateManager();
  const workspace = new VscodeWorkspace(context);
  const appiumEnvironmentService = new AppiumEnvironmentService(
    stateManager,
    datastore,
    workspace,
    eventBus
  );

  CommandManager.registerCommands([
    new OpenSettingsCommand(),
    new RefreshAppiumInstancesCommand(appiumEnvironmentService),
    new AddNewAppiumHomeCommand(eventBus, datastore),
    new InstallAppiumExtensionCommand(eventBus, datastore),
    new UnInstallAppiumExtensionCommand(eventBus, datastore),
    new UpdateAppiumExtensionCommand(eventBus, datastore),
    new DeleteAppiumHomeCommand(eventBus, datastore),
  ]);

  const welcomeViewProvider = new WelcomeWebview(context, eventBus, datastore);
  const configViewProvider = new ConfigViewProvider();
  const environmentViewProvider = new AppiumEnvironmentWebView(context, eventBus, datastore);
  const appiumExtensionsView = new AppiumExtensionsWebView(context, eventBus, datastore);
  const serverView = new AppiumServerView(datastore);
  // const inspector = new AppiumInspector();

  /* Initialize Views */
  disposables = [
    await welcomeViewProvider.register(APPIUM_CONFIGURATION_VIEW, context),
    await configViewProvider.register(APPIUM_CONFIG_FILE_VIEW, context),
    await environmentViewProvider.register(APPIUM_ENVIRONMENT_VIEW, context),
    await appiumExtensionsView.register(APPIUM_EXTENSIONS_VIEW, context),
    await serverView.register('', context),
    // await inspector.register(APPIUM_EXTENSIONS_VIEW, context),
  ];

  await appiumEnvironmentService.initialize();
}

export function deactivate() {
  disposables.forEach((disposable) => disposable.dispose());
}
