import { ExtensionContext, Webview } from 'vscode';
import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import _ = require('lodash');
import { Config } from '../../config';
import { Context } from '../../context';
import { Appium } from '../../appium';
import { ViewProvider } from '../view-provider';

export class WelcomeWebview extends BaseWebView implements ViewProvider {
  public static readonly jsFiles = ['welcome-webview.js'];
  private webview!: vscode.Webview;
  private _config: Config;
  private _context: Context;

  constructor(context: ExtensionContext) {
    super(context, 'welcome', WelcomeWebview.jsFiles, []);
    this._config = new Config();
    this._context = new Context();
  }

  async register(viewId: string, context: ExtensionContext): Promise<void> {
    vscode.window.registerWebviewViewProvider(viewId, this);
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

  async checkForAppium() {
    const appiumPathInConfig = this._config.getAppiumPath();
    if (!!appiumPathInConfig) {
      this.showLoadingView('Found appium executable in configuration');
    }
    const appiumLocalPath = Appium.getAppiumInstallationPath();
    if (!!appiumLocalPath) {
      this.showLoadingView('Found locally installed appium executable');
    }
    if ([appiumPathInConfig, appiumLocalPath].every(_.isEmpty)) {
      this.webview.postMessage({
        type: 'update_view',
        section: 'appiumNotFound',
      });
    } else if (!_.isEmpty(appiumPathInConfig)) {
      if (!!this.context.globalState.get('isAppiumConfigured', false)) {
        return this._context.appiumPathUpdated();
      }

      this.showLoadingView(
        'Fetching the version of appium from configuration... '
      );
      const appiumDetails = await this.getAppiumDetails(appiumPathInConfig);

      if (_.isNil(appiumDetails)) {
        this.webview.postMessage({
          type: 'update_view',
          section: 'appiumNotFound',
        });
      } else {
        this.onAppiumConfigured();
      }
    } else if (!_.isEmpty(appiumLocalPath)) {
      this.showLoadingView(
        'Fetching the version of globally installed appium... '
      );
      const appiumDetails = await this.getAppiumDetails(appiumLocalPath);
      if (_.isNil(appiumDetails)) {
        this.webview.postMessage({
          type: 'update_view',
          section: 'appiumNotFound',
        });
      } else {
        this.webview.postMessage({
          type: 'update_view',
          section: 'configureAppiumPath',
          data: appiumDetails,
        });
      }
    }
  }

  async onAppiumConfigured() {
    this.context.globalState.update('isAppiumConfigured', true);
    this._context.appiumPathUpdated();
  }

  async getAppiumDetails(appiumPath: string) {
    const appiumVersion = await Appium.getAppiumVersion(appiumPath);
    const isVersionSupported = !!appiumVersion
      ? Appium.isVersionSupported(appiumVersion)
      : false;
    return isVersionSupported
      ? { version: appiumVersion, path: appiumPath }
      : null;
  }

  onViewLoaded(webview: Webview) {
    this.webview = webview;
    this.webview.onDidReceiveMessage(async (event) => {
      switch (event.type) {
        case 'ready':
        case 'refresh':
          this.showLoadingView();
          await this.checkForAppium();
          break;
        case 'save-appium-path':
          this.updateAppiumPathInSettings(event.data.path);
          break;
      }
    });
  }

  updateAppiumPathInSettings(path: string) {
    this._config.setAppiumPath(path);
    this._context.appiumPathUpdated();
  }

  getWebViewHtml(webview: Webview) {
    return null;
  }
}
