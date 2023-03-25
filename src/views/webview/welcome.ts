import { ExtensionContext, Webview } from 'vscode';
import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import _ = require('lodash');
import { SUPPORTED_APPIUM_VERSION } from '../../appium';
import { ViewProvider } from '../view-provider';
import {
  AppiumEnvironmentProvider,
  AppiumStatusChangeListener,
} from '../../interfaces/appium-environment-provider';
import { AppiumStatus } from '../../services/appium-environment';
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

  async register(viewId: string, context: ExtensionContext): Promise<void> {
    vscode.window.registerWebviewViewProvider(viewId, this);
    this.appiumEnvironmentProvider.addStatusChangeListener(this);
  }

  async onAppiumStatusChange(appiumStatus: AppiumStatus | null) {
    await this.updateWebView(appiumStatus);
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

  async updateWebView(appiumStatus: AppiumStatus | null) {
    if (_.isNil(appiumStatus)) {
      this.webview.postMessage({
        type: 'update_view',
        section: 'appiumNotFound',
      });
    } else if (!appiumStatus.isSupported) {
      this.showAppiumNotSupportedView({
        version: appiumStatus.version,
        source: appiumStatus.source,
        requiredVersion: SUPPORTED_APPIUM_VERSION,
        path: appiumStatus.path,
      });
    }
  }

  onViewLoaded(webview: Webview) {
    this.webview = webview;
    this.webview.onDidReceiveMessage(async (event) => {
      switch (event.type) {
        case 'ready':
          this.showLoadingView();
          this.updateWebView(this.appiumEnvironmentProvider.getAppiumStatus());
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
