import { ExtensionContext, Webview } from 'vscode';
import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import _ = require('lodash');
import { ViewProvider } from '../view-provider';
import { OpenSettingsCommand } from '../../commands/open-settings';
import { EventBus } from '../../events/event-bus';
import { AppiumInstanceUpdatedEvent } from '../../events/appium-binary-updated-event';
import { AppiumInstance } from '../../types';
import { DatabaseService } from '../../db';
import { RefreshAppiumInstancesCommand } from '../../commands/refresh-appium-instances';

export class WelcomeWebview extends BaseWebView implements ViewProvider {
  public static readonly jsFiles = ['welcome-webview.js'];
  private webview!: vscode.Webview;

  constructor(context: ExtensionContext, private eventBus: EventBus) {
    super(context, 'welcome', WelcomeWebview.jsFiles, []);
    this.eventBus.addListener(AppiumInstanceUpdatedEvent.listener(this.onAppiumInstanceUpdated.bind(this)));
  }

  async register(viewId: string, context: ExtensionContext): Promise<ViewProvider> {
    this.context.subscriptions.push(vscode.window.registerWebviewViewProvider(viewId, this));
    return this;
  }

  async onAppiumInstanceUpdated(appiumInstances: AppiumInstance[]) {
    await this.updateWebView(appiumInstances);
  }

  dispose() {
    //no action required
  }

  async updateView(section: string, data: any) {
    this.webview?.postMessage({
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
      this.webview?.postMessage({
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
          this.updateWebView(DatabaseService.getAppiumInstances());
          break;
        case 'refresh':
          vscode.commands.executeCommand(RefreshAppiumInstancesCommand.NAME);
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
