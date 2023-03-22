import { ExtensionContext, Webview } from 'vscode';
import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import _ = require('lodash');
import { Config } from '../../config';
import { Context } from '../../context';
import { Appium } from '../../appium';

export class WelcomeWebview extends BaseWebView {
  public static readonly jsFiles = ['welcome-webview.js'];
  private webview!: vscode.Webview;
  private _config: Config;
  private _context: Context;

  constructor(context: ExtensionContext) {
    super(context, 'welcome', WelcomeWebview.jsFiles, []);
    this._config = new Config();
    this._context = new Context();
  }

  async checkForAppium() {
    const appiumPathInConfig = this._config.appiumPath();
    const appiumLocalPath = Appium.getAppiumInstallationPath();

    if ([appiumPathInConfig, appiumLocalPath].every(_.isNull)) {
      this.webview.postMessage({
        type: 'update_view',
        section: 'appiumNotFound',
      });
    } else if (!_.isNull(appiumPathInConfig)) {
      const appiumDetails = await this.getAppiumDetails(appiumPathInConfig);
      if (_.isNil(appiumDetails)) {
        this.webview.postMessage({
          type: 'update_view',
          section: 'appiumNotFound',
        });
      } else {
        this._context.appiumPathUpdated();
      }
    } else if (!_.isNil(appiumLocalPath)) {
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
          this.webview.postMessage({ type: 'update_view', section: 'loading' });
          await this.checkForAppium();
          break;
      }
    });
  }

  getWebViewHtml(webview: Webview) {
    return null;
  }
}
