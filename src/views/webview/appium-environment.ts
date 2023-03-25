import { ExtensionContext, Webview } from 'vscode';
import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import _ = require('lodash');

import { Appium } from '../../appium';

export class AppiumEnvironment extends BaseWebView {
  public static readonly jsFiles = ['welcome-webview.js'];
  private webview!: vscode.Webview;

  constructor(context: ExtensionContext) {
    super(context, 'appium-environment', [], []);
  }

  onViewLoaded(webview: Webview) {
    this.webview = webview;
  }

  getWebViewHtml(webview: Webview) {
    return '<h1>Appium Environment</h1>';
    //return `<iframe height="100%" width="100%" src="https://inspector.appiumpro.com"/>`;
  }
}
