import {
  CancellationToken,
  WebviewView,
  WebviewViewProvider,
  WebviewViewResolveContext,
  Webview,
  Uri,
  ExtensionContext,
} from 'vscode';
import { html, safeHtml } from 'common-tags';

const getNonce = () => {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const assetUri = (
  webview: Webview,
  context: ExtensionContext,
  ...pathSegments: string[]
) => webview.asWebviewUri(Uri.joinPath(context.extensionUri, ...pathSegments));

export abstract class BaseWebView implements WebviewViewProvider {
  constructor(
    private context: ExtensionContext,
    private jsAssets: Array<string>,
    private cssAssets: Array<string>
  ) {}

  resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext<unknown>,
    token: CancellationToken
  ): void | Thenable<void> {
    const { cspSource } = webviewView.webview;
    const nonce = getNonce();
    const { webview } = webviewView;
    const componentLib = assetUri(
      webview,
      this.context,
      'node_modules',
      '@bendera',
      'vscode-webview-elements',
      'dist',
      'bundled.js'
    );
    const cssLib = assetUri(
      webview,
      this.context,
      'node_modules',
      '@vscode',
      'codicons',
      'dist',
      'codicon.css'
    );
    const jsFiles = assetUri(
      webview,
      this.context,
      'media',
      'js',
      'welcome-webview.js'
    );

    const cssFiles = assetUri(
      webview,
      this.context,
      'media',
      'css',
      'main.css'
    );

    const body = this.getWebViewHtml(webviewView.webview);
    const webviewHtml = html`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>Appium Server Editor</title>
          <meta
            http-equiv="Content-Security-Policy"
            content="
        default-src 'none'; 
        img-src ${cspSource};
        script-src ${cspSource}
        nonce-${nonce}; 
        style-src 'unsafe-inline' ${cspSource};
        style-src-elem 'unsafe-inline' ${cspSource};
        font-src ${cspSource};
      "
          />
          <link
            rel="stylesheet"
            href="${cssLib}"
            nonce="${nonce}"
            id="vscode-codicon-stylesheet"
          />
          ${this.getCssFile(nonce, webview)}
        </head>
        <body>
          ${html`${body}`}
          <script src="${componentLib}" nonce="${nonce}" type="module"></script>
          ${this.getJsFile(nonce, webview)}
        </body>
      </html>
    `;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = webviewHtml;
  }

  abstract getWebViewHtml(webview: Webview): string;

  getCssFile(nonce: string, webview: Webview) {
    return ['main.css', ...this.cssAssets].map((f) => {
      const uri = assetUri(webview, this.context, 'media', 'css', f);
      return safeHtml` <link
       rel="stylesheet"
       href="${uri}"
       nonce="${nonce}"
       id="vscode-codicon-stylesheet"
     />`;
    });
  }

  getJsFile(nonce: string, webview: Webview) {
    return this.jsAssets.map((f) => {
      const uri = assetUri(webview, this.context, 'media', 'js', f);
      return safeHtml`<script src="${uri}" nonce="${nonce}"></script>`;
    });
  }
}
