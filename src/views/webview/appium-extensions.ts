import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import { EventBus } from '../../events/event-bus';
import { AppiumHomeChangedEvent } from '../../events/appium-home-changed-event';
import { AppiumExtension, AppiumHome, AppiumBinary, ExtensionType } from '../../types';
import { ViewProvider } from '../view-provider';
import { getInstalledDrivers, getInstalledPlugins } from '../../utils/appium';
import _ = require('lodash');
import { html } from 'common-tags';
import {
  InstallAppiumExtensionCommand,
  InstallExtensionOptions,
} from '../../commands/install-appium-extension';
import { AppiumExtensionUpdatedEvent } from '../../events/appium-extension-updated-event';
import {
  UnInstallAppiumExtensionCommand,
  UnInstallExtensionOptions,
} from '../../commands/uninstall-appium-extension';
import {
  UpdateAppiumExtensionCommand,
  UpdateExtensionOptions,
} from '../../commands/update-appium-extension';
import { DataStore } from '../../db/data-store';
import { AppiumBinaryUpdatedEvent } from '../../events/appium-binary-updated-event';

const loadingViewTemplate = html`<div
  class="section flex-column"
  id="loading"
  style="display: block">
  <div class="flex-row gap-5">
    <i class="codicon codicon-sync codicon-modifier-spin"></i>
    <p>Loading extension details..</p>
  </div>
</div>`;

export class AppiumExtensionsWebView extends BaseWebView implements ViewProvider {
  private webview!: vscode.Webview;
  private appiumHome: AppiumHome | null = null;
  private appiumBinary: AppiumBinary | null = null;
  private drivers: AppiumExtension[] = [];
  private plugins: AppiumExtension[] = [];
  private activeTab: ExtensionType = 'driver';
  private loading: boolean = false;

  constructor(
    context: vscode.ExtensionContext,
    private eventBus: EventBus,
    private dataStore: DataStore
  ) {
    super(context, 'extensions', ['extension.js'], ['extension.css']);
    this.eventBus.addListener(
      AppiumHomeChangedEvent.listener((appiumHome) => {
        if (!this.appiumHome || this.appiumHome?.path !== appiumHome.path) {
          this.appiumHome = appiumHome;
          this._loadExtensions();
        }
      })
    );

    this.eventBus.addListener(
      AppiumBinaryUpdatedEvent.listener(() => {
        this.appiumBinary = this.appiumBinary;
      })
    );

    this.eventBus.addListener(
      AppiumExtensionUpdatedEvent.listener(() => {
        this._loadExtensions();
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
    this.webview.onDidReceiveMessage((event) => {
      switch (event.type) {
        case 'install-extension':
          this._installExtenstion(event.extensionType);
          break;
        case 'uninstall-extension':
          this.activeTab = event.extensionType;
          this._uninstallExtenstion(event.name, event.extensionType);
          break;
        case 'update-extension':
          this.activeTab = event.extensionType;
          this._updateExtension(event.name, event.extensionType);
          break;
      }
    });
  }

  getWebViewHtml(webview: vscode.Webview) {
    let body = loadingViewTemplate;
    if (!this.loading) {
      const driverList = this._extentionListTemplate('Drivers', this.drivers, 'driver');
      const pluginList = this._extentionListTemplate('Plugins', this.plugins, 'plugin');
      body = html`<vscode-tabs
        class="full-width tab-container"
        selected-index=${this.activeTab === 'driver' ? '0' : '1'}
        >${driverList} ${pluginList}</vscode-tabs
      >`;
    }
    return html`<div class="container flex-column">${body}</body>`;
  }

  private _findMatchingExtension(name: string, type: ExtensionType) {
    return [...this.drivers, ...this.plugins].find((ext) => ext.type === type && ext.name === name);
  }

  private _installExtenstion(type: ExtensionType) {
    vscode.commands.executeCommand(InstallAppiumExtensionCommand.NAME, [
      <InstallExtensionOptions>{ type: type },
    ]);
  }

  private _uninstallExtenstion(name: string, type: ExtensionType) {
    const extension = this._findMatchingExtension(name, type);
    if (!!extension) {
      extension.isDeleting = true;
    }
    vscode.commands.executeCommand(UnInstallAppiumExtensionCommand.NAME, [
      <UnInstallExtensionOptions>{ name, type },
    ]);
    this._setLoading(false);
  }

  private _updateExtension(name: string, type: ExtensionType) {
    const extension = this._findMatchingExtension(name, type);
    if (!!extension) {
      extension.isUpdating = true;
    }
    const versions = !!extension?.updates ? extension.updates : {};
    vscode.commands.executeCommand(UpdateAppiumExtensionCommand.NAME, [
      <UpdateExtensionOptions>{ name: name, type: type, versions },
    ]);
    this._setLoading(false);
  }

  private _extentionListTemplate(
    extensionTitle: string,
    extensions: AppiumExtension[],
    type: ExtensionType
  ) {
    const header = html`<vscode-tab-header slot="header">
      ${extensionTitle}
      <vscode-badge variant="counter" slot="content-after">${extensions.length}</vscode-badge>
    </vscode-tab-header>`;

    const addNewExtension = html`<vscode-button
      class="full-width flex-row"
      onclick='installExtension("${type}")'>
      <span class="flex-row gap-5">
        <i class="codicon codicon-cloud-download"></i>Install new ${type}
      </span>
    </vscode-button>`;

    const list = !extensions.length
      ? html`<div class="full-width" style="height:100%;text-align:center;padding-top:20px">
          <p>No ${extensionTitle} installed</p>
          <p>${addNewExtension}</p>
        </div>`
      : html`<div>
          ${addNewExtension}
          <div class="extension-container">
            <div class="extension-scroll-area">
              ${extensions.map((ext) => this._getExtensionCardTemplate(ext, type)).join('')}
            </div>
          </div>
        </div>`;

    return header + html`<vscode-tab-panel class="tab-body">${list}</vscode-tab-panel>`;
  }

  private _getExtensionIcon(ext: AppiumExtension) {
    const iconFile = {
      npm: 'npm.svg',
      local: 'folder.svg',
      git: 'git.svg',
      github: 'github.svg',
    };

    return this.getAssetUri(this.webview, iconFile[ext.source]);
  }

  private _getExtensionCardTemplate(ext: AppiumExtension, type: ExtensionType) {
    const extensionIcon = this._getExtensionIcon(ext);
    const loadingicon = html`<span class="action-icon"
      ><i class="codicon codicon-modifier-spin codicon-loading"></i>
    </span>`;

    const header = html`<div class="header-container">
      <div class="header">
        <span class="name">${ext.name}</span>
        ${!!extensionIcon ? `<img class="extension-icon" src="${extensionIcon}"></img>` : ''}
        <vscode-badge variant="counter" slot="content-after">${ext.version}</vscode-badge>
      </div>
      <div class="header-icon-container">
        ${!!ext.updates?.safe || !!ext.updates.force
          ? ext.isUpdating
            ? loadingicon
            : html`<span onclick='updateExtension("${ext.name}", "${type}")' class="action-icon">
                <i class="codicon codicon-versions"> </i>
              </span>`
          : ''}
        ${ext.isDeleting
          ? loadingicon
          : html`<span onclick='uninstallExtension("${ext.name}", "${type}")' class="action-icon">
              <i class="codicon codicon-trash"></i>
            </span>`}
      </div>
    </div>`;

    const packageName = html` <div class="row">
      <span class="label">package:</span>
      <span class="value link-blue">${ext.packageName}</span>
    </div>`;

    const platforms =
      ext.type === 'driver'
        ? html`<div class="row">
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

    return html`<div class="extension-card">
      ${header} ${!!ext.description ? `<span class="value">${ext.description}</span>` : ''}
      <div class="metadata-container">${packageName} ${platforms}</div>
    </div>`;
  }

  private _setLoading(loadingStatus: boolean, render: boolean = true) {
    this.loading = loadingStatus;
    if (this.webview && render) {
      this.render(this.getWebViewHtml(this.webview));
    }
  }

  private async _loadExtensions() {
    this._setLoading(true);

    const appiumHome = _.clone(this.appiumHome);
    if (!this.appiumBinary) {
      this.appiumBinary = this.dataStore.getActiveAppiumBinary();
    }

    const [driver, plugins] = await Promise.all([
      getInstalledDrivers(this.appiumBinary?.path as string, this.appiumHome?.path as string),
      getInstalledPlugins(this.appiumBinary?.path as string, this.appiumHome?.path as string),
    ]);

    this.drivers = driver;
    this.plugins = plugins;

    this._setLoading(false, appiumHome?.path === this.appiumHome?.path);
  }
}
