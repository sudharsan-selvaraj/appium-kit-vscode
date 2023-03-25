import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';

export class InfoPanelWebview extends BaseWebView {
  public static readonly jsFiles = ['welcome-webview.js'];
  private webview!: vscode.Webview;

  constructor(context: vscode.ExtensionContext) {
    super(context, 'appium-environment', [], []);
  }

  onViewLoaded(webview: vscode.Webview) {
    this.webview = webview;
  }

  getWebViewHtml(webview: vscode.Webview) {
    return '<h1>Appium Environment</h1>';
    //return `<iframe height="100%" width="100%" src="https://inspector.appiumpro.com"/>`;
  }
}
