import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import { EventBus } from '../../events/event-bus';
import { AppiumHomeChangedEvent } from '../../events/appium-home-changed-event';
import { AppiumExtension, AppiumHome } from '../../types';
import { ViewProvider } from '../view-provider';
import { getInstalledDrivers, getInstalledPlugins } from '../../utils/appium';
import { DatabaseService } from '../../db';
import _ = require('lodash');
import { html } from 'common-tags';

export class AppiumExtensionsWebView extends BaseWebView implements ViewProvider {
  private webview!: vscode.Webview;
  private appiumHome: AppiumHome | null = null;
  private drivers: AppiumExtension[] = [];
  private plugins: AppiumExtension[] = [];
  private loading: boolean = false;

  constructor(context: vscode.ExtensionContext, private eventBus: EventBus) {
    super(context, 'extensions', ['extension.js'], ['extension.css']);
    this.eventBus.addListener(
      AppiumHomeChangedEvent.listener((appiumHome) => {
        if (!this.appiumHome || this.appiumHome?.path !== appiumHome.path) {
          this.appiumHome = appiumHome;
          this.loadExtensions();
        }
      })
    );
  }

  async register(viewId: string, context: vscode.ExtensionContext): Promise<ViewProvider> {
    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(viewId, this, {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      })
    );
    return this;
  }

  dispose() {
    //not implemented
  }

  onViewLoaded(webview: vscode.Webview) {
    this.webview = webview;
  }

  getWebViewHtml(webview: vscode.Webview) {
    let body = '';
    if (this.loading) {
      body = this.getLoadingViewTemplate();
    } else {
      const driverList = this.getExtensionListTemplate('Drivers', this.drivers, 'driver');
      const pluginList = this.getExtensionListTemplate('Plugins', this.plugins, 'plugin');
      body = `<vscode-tabs class="full-width tab-container">${driverList} ${pluginList}</vscode-tabs>`;
    }
    return `<div class="container flex-column">${body}</body>`;

    //return `<iframe height="100%" width="100%" src="https://inspector.appiumpro.com"/>`;
  }

  getLoadingViewTemplate() {
    return `<div class="section flex-column" id="loading" style="display: block">
    <div class="flex-row gap-5">
      <i class="codicon codicon-sync codicon-modifier-spin"></i>
      <p>Loading extension details..</p>
    </div>
  </div>`;
  }

  getExtensionListTemplate(
    extensionTitle: string,
    extensions: AppiumExtension[],
    type: 'driver' | 'plugin'
  ) {
    const header = `<vscode-tab-header slot="header">
                        ${extensionTitle} <vscode-badge variant="counter" slot="content-after">${extensions.length}</vscode-badge>
                  </vscode-tab-header>`;

    const addNewExtension = `<vscode-button class="full-width" id="add-new-${type}">Install new ${type}</vscode-button>`;

    const list = !extensions.length
      ? `<div class="full-width" style="height:100%;text-align:center;padding-top:20px">
          <p>No ${extensionTitle} installed<p>
           ${addNewExtension}
         </div>`
      : `<div>${addNewExtension}
      <div class="extension-container">
        <div class="extension-scroll-area">
             ${extensions.map((ext) => this.getExtensionCardTemplate(ext)).join('')}
        </div>
      </div>
      </div>`;

    return header + `<vscode-tab-panel class="tab-body">${list}</vscode-tab-panel>`;
  }

  private getExtensionIcon(ext: AppiumExtension) {
    if (ext.source === 'npm') {
      return this.getAssetUri(this.webview, 'npm.svg');
    } else if (ext.source === 'local') {
      return this.getAssetUri(this.webview, 'folder.svg');
    } else if (ext.source === 'github') {
      return this.getAssetUri(this.webview, 'github.svg');
    } else {
      return null;
    }
  }

  private getExtensionCardTemplate(ext: AppiumExtension) {
    const extensionIcon = this.getExtensionIcon(ext);

    const header = html`<div class="header">
      <span class="name">${ext.name}</span>
      ${!!extensionIcon ? `<img class="extension-icon" src="${extensionIcon}"></img>` : ''}
      <vscode-badge
        variant="counter"
        slot="content-after"
        >${ext.version}</vscode-badge
      >
    </div>`;

    const packageName = html` <div class="row">
      <span class="label">package:</span>
      <span class="value">${ext.packageName}</span>
    </div>`;
    const platforms =
      ext.type === 'drivers'
        ? `<div class="row">
    <span class="label">platforms:</span>
      <div class="platform-container">
        ${ext.platforms
          ?.map(
            (platform) =>
              `<vscode-badge class="platform-badge" slot="content-after">${platform}</vscode-badge>`
          )
          .join('')}
      </div>
    </div>`
        : '';

    return `<div class="extension-card">
              ${header}
              ${!!ext.description ? `<span class="value">${ext.description}</span>` : ''}
             <div class="metadata-container">
                ${packageName}
                 ${platforms}
             </div>
            </div>`;
  }

  private setLoading(loadingStatus: boolean, render: boolean = true) {
    this.loading = loadingStatus;
    if (this.webview && render) {
      this.render(this.getWebViewHtml(this.webview));
    }
  }

  async loadExtensions() {
    this.setLoading(true);
    const appiumHome = _.clone(this.appiumHome);

    const [driver, plugins] = await Promise.all([
      await getInstalledDrivers(
        DatabaseService.getAppiumInstances()[0].path,
        this.appiumHome?.path as string
      ),
      await getInstalledPlugins(
        DatabaseService.getAppiumInstances()[0].path,
        this.appiumHome?.path as string
      ),
    ]);

    this.drivers = driver;
    this.plugins = plugins;

    this.setLoading(false, appiumHome?.path === this.appiumHome?.path);
  }
}
