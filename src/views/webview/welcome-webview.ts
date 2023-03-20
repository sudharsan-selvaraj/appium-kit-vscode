import { ExtensionContext, Webview } from 'vscode';
import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';

export class WelcomeWebview extends BaseWebView {
  public static readonly jsFiles = ['welcome-webview.js'];
  private webview!: vscode.Webview;
  constructor(context: ExtensionContext) {
    super(context, WelcomeWebview.jsFiles, []);
  }

  initializeMessage(webview: Webview) {
    this.webview = webview;
    this.webview.onDidReceiveMessage((event) => {
      console.log(event);
      this.webview.postMessage({
        type: 'info',
        json: {
          version: '2.0.0-beta44',
          path: '/Users/sudharsanselvaraj/.nvm/versions/node/v18.15.0/bin/appium',
        },
      });
    });
  }

  getWebViewHtml(webview: Webview): string {
    this.initializeMessage(webview);
    return `
    <div class="container flex-column gap-15">
        <div class="card flex-columntext-center">
           <div class="content" id="appium-server-info">
           </div>
        </div>
        <div class="flex-row gap-5">
            <vscode-button>Set as default</vscode-button>
            <vscode-button secondary>Update Manullay</vscode-button>
        </div>
    </div>
    `;
  }
}
