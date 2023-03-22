import * as vscode from 'vscode';
import { WelcomeWebview } from './views/webview/welcome';
import {
  APPIUM_CONFIGURATION_VIEW,
  APPIUM_CONFIG_FILE_VIEW,
} from './constants';
import { AppiumEnvironment } from './views/webview/appium-environment';
import { ConfigProvider } from './views/treeview/config-provider';
import { ViewProvider } from './views/view-provider';

const disposables: vscode.Disposable[] = [];

export async function activate(context: vscode.ExtensionContext) {
  const welcomeViewProvider = new WelcomeWebview(context);
  const configViewProvider = new ConfigProvider();

  welcomeViewProvider.register(APPIUM_CONFIGURATION_VIEW, context);
  configViewProvider.register(APPIUM_CONFIG_FILE_VIEW, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'appium.environment',
      new AppiumEnvironment(context)
    )
  );
}

export function deactivate() {}
