import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import { AppiumEnvironmentProvider } from '../../interfaces/appium-environment-provider';
import { EventBus } from '../../events/event-bus';
import { AppiumHomeChangedEvent } from '../../events/appium-home-changed-event';
import { AppiumHome } from '../../types';
import { ViewProvider } from '../view-provider';

export class AppiumExtensions extends BaseWebView implements ViewProvider {
  public static readonly jsFiles = ['welcome-webview.js'];
  private webview!: vscode.Webview;
  private appiumHome: AppiumHome | null = null;

  constructor(
    context: vscode.ExtensionContext,
    private eventBus: EventBus,
    private appiumEnvironmentProvider: AppiumEnvironmentProvider
  ) {
    super(context, 'extensions', [], []);
    this.eventBus.addListener(
      AppiumHomeChangedEvent.listener((appiumHome) => {
        this.appiumHome = appiumHome;
        if (!!this.webview) {
          this.render(this.getWebViewHtml(this.webview));
        }
      })
    );
  }

  async register(viewId: string, context: vscode.ExtensionContext): Promise<ViewProvider> {
    this.context.subscriptions.push(vscode.window.registerWebviewViewProvider(viewId, this));
    return this;
  }

  dispose() {
    //not implemented
  }

  onViewLoaded(webview: vscode.Webview) {
    this.webview = webview;
  }

  getWebViewHtml(webview: vscode.Webview) {
    return `<div>${this.appiumHome?.path}<div>`;
    //return `<iframe height="100%" width="100%" src="https://inspector.appiumpro.com"/>`;
  }
}
