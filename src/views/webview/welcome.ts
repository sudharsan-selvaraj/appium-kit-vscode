import { ExtensionContext, Webview } from 'vscode';
import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import _ = require('lodash');
import { ViewProvider } from '../view-provider';
import { EventBus } from '../../events/event-bus';
import { RefreshAppiumInstancesCommand } from '../../commands/refresh-appium-instances';
import { AppiumBinaryUpdatedEvent } from '../../events/appium-binary-updated-event';
import { AppiumBinary } from '../../types';
import { DataStore } from '../../db/data-store';

export class WelcomeWebview extends BaseWebView implements ViewProvider {
  public static readonly jsFiles = ['welcome-webview.js'];
  private webview!: vscode.Webview;

  constructor(context: ExtensionContext, private eventBus: EventBus, private dataStore: DataStore) {
    super(context, 'welcome', WelcomeWebview.jsFiles, []);
    this.eventBus.addListener(
      AppiumBinaryUpdatedEvent.listener(this._onAppiumInstanceUpdated.bind(this))
    );
  }

  async register(viewId: string, context: ExtensionContext): Promise<ViewProvider> {
    this.context.subscriptions.push(vscode.window.registerWebviewViewProvider(viewId, this));
    return this;
  }

  async _onAppiumInstanceUpdated(appiumBinaries: AppiumBinary[]) {
    await this.updateWebView(appiumBinaries);
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

  async updateWebView(appiumBinaries: AppiumBinary[]) {
    if (_.isEmpty(appiumBinaries)) {
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
          this.updateWebView(this.dataStore.getAppiumBinaries());
          break;
        case 'refresh':
          vscode.commands.executeCommand(RefreshAppiumInstancesCommand.NAME);
          break;
      }
    });
  }

  getWebViewHtml(webview: Webview) {
    return null;
  }
}
