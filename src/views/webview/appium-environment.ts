import { ExtensionContext, Webview } from 'vscode';
import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import _ = require('lodash');
import { Config } from '../../config';
import { Context } from '../../context';
import { Appium } from '../../appium';

export class AppiumEnvironment extends BaseWebView {
  public static readonly jsFiles = ['welcome-webview.js'];
  private webview!: vscode.Webview;
  private _config: Config;
  private _context: Context;

  constructor(context: ExtensionContext) {
    super(context, 'appium-environment', [], []);
    this._config = new Config();
    this._context = new Context();
  }

  onViewLoaded(webview: Webview) {
    this.webview = webview;
  }

  getWebViewHtml(webview: Webview) {
    return `<h1>This is appium Environment</h1>`;
  }
}
