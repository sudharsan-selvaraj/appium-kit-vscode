import { ExtensionContext } from 'vscode';
import { ViewProvider } from '../view-provider';
import * as vscode from 'vscode';
import { html } from 'common-tags';

const getNonce = () => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

export class AppiumInspector implements ViewProvider {
  async register(viewId: string, context: ExtensionContext): Promise<ViewProvider> {
    const webviewPanel = vscode.window.createWebviewPanel('AppiumInpector', 'inspector', {
      viewColumn: vscode.ViewColumn.One,
    });

    const { cspSource } = webviewPanel.webview;
    const nonce = getNonce();
    const webviewHtml = html`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Appium Server Editor</title>
          <meta
            http-equiv="Content-Security-Policy"
            content="
      img-src ${cspSource};
      script-src 'unsafe-inline' ${cspSource} 
      nonce-${nonce}; 
      style-src 'unsafe-inline' ${cspSource};
      style-src-elem 'unsafe-inline' ${cspSource};
      font-src ${cspSource};
    " />
        </head>
        <body>
          <iframe width="100%" height="100%" src="http://localhost:3000/" />
        </body>
      </html>
    `;

    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = webviewHtml;

    return this;
  }
  dispose() {
    //not implemented
  }
}
