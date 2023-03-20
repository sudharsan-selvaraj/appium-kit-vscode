import * as vscode from 'vscode';
import { WelcomeWebview } from './views/webview/welcome-webview';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'appium.welcome',
      new WelcomeWebview(context)
    )
  );
}

export function deactivate() {}
