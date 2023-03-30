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
import { readFileSync } from 'fs';
import { NodeModulesAccessor, NodeModulesKeys } from '../../build';

const getNonce = () => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const assetUri = (webview: Webview, context: ExtensionContext, ...pathSegments: string[]) =>
  webview.asWebviewUri(Uri.joinPath(context.extensionUri, ...pathSegments));

export abstract class BaseWebView implements WebviewViewProvider {
  private webviewView!: WebviewView;

  constructor(
    protected context: ExtensionContext,
    private componentName: string,
    private jsAssets: Array<string>,
    private cssAssets: Array<string>
  ) {}

  protected render(body: string) {
    const { cspSource } = this.webviewView.webview;
    const nonce = getNonce();
    const { webview } = this.webviewView;
    const componentLib = assetUri(
      webview,
      this.context,
      ...NodeModulesAccessor.getPathToOutputFile(NodeModulesKeys.webviewElementJs)
    );

    const cssLib = assetUri(
      webview,
      this.context,
      ...NodeModulesAccessor.getPathToOutputFile(NodeModulesKeys.codiconCss)
    );

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
        img-src ${cspSource};
        script-src 'unsafe-inline' ${cspSource} 
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
          <script
            src="${componentLib}"
            nonce="${nonce}"
            type="module"
          ></script>
          ${this.getJsFile(nonce, webview)}
        </body>
      </html>
    `;

    this.webviewView.webview.html = webviewHtml;
  }

  resolveWebviewView(
    webviewView: WebviewView,
    context: WebviewViewResolveContext<unknown>,
    token: CancellationToken
  ): void | Thenable<void> {
    this.webviewView = webviewView;

    this.onViewLoaded(webviewView.webview);

    webviewView.webview.options = {
      enableScripts: true,
    };

    const body =
      this.getWebViewHtml(this.webviewView.webview) ||
      this.getTemplateFromFile(this.webviewView.webview);

    this.render(body);
  }

  protected getAssetUri(webview: Webview, fileName: string) {
    return assetUri(webview, this.context, 'components', this.componentName, fileName);
  }

  getTemplateFromFile(webview: Webview, fileName: string = 'template.html') {
    const uri = this.getAssetUri(webview, fileName);
    return readFileSync(uri.fsPath, { encoding: 'utf-8' });
  }

  getCssFile(nonce: string, webview: Webview) {
    const defaultCssFiles = ['main.css'].map((file) =>
      assetUri(webview, this.context, 'components', 'css', file)
    );

    const templateCssFiles = this.cssAssets.map((cssFile) => {
      return this.getAssetUri(webview, cssFile);
    });

    return [defaultCssFiles, templateCssFiles].map((uri) => {
      return safeHtml` <link
       rel="stylesheet"
       href="${uri}"
       nonce="${nonce}"
     />`;
    });
  }

  getJsFile(nonce: string, webview: Webview) {
    return this.jsAssets.map((jsFile) => {
      return safeHtml`<script src="${this.getAssetUri(
        webview,
        jsFile
      )}" nonce="${nonce}"></script>`;
    });
  }

  abstract getWebViewHtml(webview: Webview): string | null;
  abstract onViewLoaded(webview: Webview): void;
}
