import { ExtensionContext, Webview } from 'vscode';
import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import _ = require('lodash');
import { Config } from '../../config';
import { Context } from '../../context';
import { Appium, SUPPORTED_APPIUM_VERSION } from '../../appium';
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
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration('appium.appiumPath')) {
        await this.checkForAppium();
      }
    });
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

  async checkForAppium() {
    const appiumPathInConfig = this._config.getAppiumPath();
    const appiumLocalPath = Appium.getAppiumInstallationPath();

    if ([appiumPathInConfig, appiumLocalPath].every(_.isEmpty)) {
      this.onAppiumNotConfigured();
      this.webview.postMessage({
        type: 'update_view',
        section: 'appiumNotFound',
      });
    } else if (!_.isEmpty(appiumPathInConfig)) {
      const appiumDetails = await this.getAppiumDetails(appiumPathInConfig);
      if (!appiumDetails.isSupported) {
        this.onAppiumNotConfigured();
        this.showAppiumNotSupportedView({
          version: appiumDetails.version,
          source: 'config',
          requiredVersion: SUPPORTED_APPIUM_VERSION,
        });
      } else {
        this.onAppiumConfigured();
      }
    } else if (!_.isEmpty(appiumLocalPath)) {
      const appiumDetails = await this.getAppiumDetails(appiumLocalPath);
      if (!appiumDetails.isSupported) {
        this.onAppiumNotConfigured();
        this.showAppiumNotSupportedView({
          version: appiumDetails.version,
          source: 'installed',
          requiredVersion: SUPPORTED_APPIUM_VERSION,
        });
      } else {
        this.onAppiumNotConfigured();
        this.webview.postMessage({
          type: 'update_view',
          section: 'configureAppiumPath',
          data: appiumDetails,
        });
      }
    }
  }

  async onAppiumConfigured() {
    this._context.appiumPathUpdated();
  }

  async onAppiumNotConfigured() {
    this._context.appiumNotAvailbale();
  }

  async getAppiumDetails(appiumPath: string) {
    const appiumVersion = await Appium.getAppiumVersion(appiumPath);
    const isVersionSupported = !!appiumVersion
      ? Appium.isVersionSupported(appiumVersion)
      : false;

    return {
      version: appiumVersion,
      path: appiumPath,
      isSupported: isVersionSupported,
    };
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
