import { ExtensionContext, Webview } from 'vscode';
import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import _ = require('lodash');
import { SUPPORTED_APPIUM_VERSION } from '../../utils/appium';
import { ViewProvider } from '../view-provider';
import {
  AppiumEnvironmentProvider,
  AppiumStatusChangeListener,
} from '../../interfaces/appium-environment-provider';
import { AppiumInstance } from '../../services/appium-environment';
import { OpenSettingsCommand } from '../../commands/open-settings';

export class WelcomeWebview
  extends BaseWebView
  implements ViewProvider, AppiumStatusChangeListener
{
  public static readonly jsFiles = ['welcome-webview.js'];
  private webview!: vscode.Webview;

  constructor(
    context: ExtensionContext,
    private appiumEnvironmentProvider: AppiumEnvironmentProvider
  ) {
    super(context, 'welcome', WelcomeWebview.jsFiles, []);
  }

  async register(viewId: string, context: ExtensionContext): Promise<ViewProvider> {
    this.context.subscriptions.push(vscode.window.registerWebviewViewProvider(viewId, this));
    this.appiumEnvironmentProvider.addStatusChangeListener(this);
    return this;
  }

  async onAppiumStatusChange(appiumInstances: AppiumInstance[]) {
    await this.updateWebView(appiumInstances);
  }

  dispose() {
    //no action required
  }

  async updateView(section: string, data: any) {
    this.webview.postMessage({
      type: 'update_view',
      section: section,
      data,
    });
  }

  async showLoadingView(message?: string) {
    this.updateView('loading', { message: message });
  }

  async showAppiumNotSupportedView(data?: any) {
    this.updateView('appiumVersionNotSupported', data);
  }

  async updateWebView(appiumInstances: AppiumInstance[]) {
    if (_.isEmpty(appiumInstances)) {
      this.webview.postMessage({
        type: 'update_view',
        section: 'appiumNotFound',
      });
    }
  }

  onViewLoaded(webview: Webview) {
    this.webview = webview;
    this.webview.onDidReceiveMessage(async (event) => {
      switch (event.type) {
        case 'ready':
          this.showLoadingView();
          this.updateWebView(this.appiumEnvironmentProvider.getAppiumInstances());
          break;
        case 'refresh':
          this.showLoadingView();
          const appiumStatus = await this.appiumEnvironmentProvider.refresh();
          this.updateWebView(appiumStatus);
          break;
        case 'openSettings':
          vscode.commands.executeCommand(OpenSettingsCommand.NAME);
          break;
      }
    });
  }

  getWebViewHtml(webview: Webview) {
    return null;
  }
}
