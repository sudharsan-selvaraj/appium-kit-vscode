import { ExtensionContext, Webview } from 'vscode';
import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import _ = require('lodash');
import {
  AppiumEnvironmentProvider,
  AppiumStatusChangeListener,
} from '../../interfaces/appium-environment-provider';
import { AppiumInstance } from '../../services/appium-environment';
import { html } from 'common-tags';
import * as handlebar from 'handlebars';
import { ViewProvider } from '../view-provider';
import { EventBus } from '../../events/event-bus';
import { AppiumVersionChangedEvent } from '../../events/appium-version-changed-event';
import { AppiumHome } from '../../types';
import { AppiumHomeChangedEvent } from '../../events/appium-home-changed-event';

export class AppiumEnvironmentWebView
  extends BaseWebView
  implements AppiumStatusChangeListener, ViewProvider
{
  private webview!: vscode.Webview;
  private appiumInstances: AppiumInstance[] = [];
  private appiumHomes: AppiumHome[] = [];
  private activeAppiumInstance: AppiumInstance | null = null;
  private activeAppiumHome: AppiumHome | null = null;
  private isRefreshing: boolean = false;

  private versionSelectTemplate!: handlebar.TemplateDelegate;
  private appiumHomeSelectTemplate!: handlebar.TemplateDelegate;

  constructor(
    context: ExtensionContext,
    private eventBus: EventBus,
    private appiumEnvironmentProvider: AppiumEnvironmentProvider
  ) {
    super(context, 'appium-environment', ['appium-environment.js'], []);
  }

  async register(viewId: string, context: ExtensionContext): Promise<ViewProvider> {
    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(viewId, this, {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      })
    );
    this.appiumEnvironmentProvider.addStatusChangeListener(this);
    await this.refreshAppiumStatus({ force: false });
    this.context.subscriptions.push(
      vscode.commands.registerCommand(
        'appium.environment.refresh',
        async () => await this.refreshAppiumStatus({ force: true })
      )
    );
    return this;
  }

  dispose() {
    //not required
  }

  onAppiumStatusChange(appiumInstances: AppiumInstance[]) {
    this.appiumInstances = appiumInstances;
    this.refreshView();
  }

  onViewLoaded(webview: Webview) {
    this.webview = webview;
    this.webview.onDidReceiveMessage((event) => {
      switch (event.type) {
        case 'select-appium-home':
          this.activeAppiumInstance = this.appiumInstances[event.index];
          this.emitAppiumVersionChanged();
          break;
        case 'select-appium-home':
          this.activeAppiumHome = this.appiumHomes[event.index];
          this.emitAppiumHomeChanged();
          break;
      }
    });
  }

  private emitAppiumVersionChanged() {
    this.eventBus.fire(new AppiumVersionChangedEvent(this.activeAppiumInstance as AppiumInstance));
  }

  private emitAppiumHomeChanged() {
    this.eventBus.fire(new AppiumHomeChangedEvent(this.activeAppiumHome as AppiumHome));
  }

  getWebViewHtml(webview: Webview) {
    return html`<div class="container full-width">
      <div class="section flex-column full-width">
        ${this.isRefreshing ? this.getRefreshingTemplate() : this.getAppiumVersionDropDown()}
        ${this.getAppiumHomeDropDown()}
      </div>
    </div>`;
  }

  getAppiumVersionDropDown() {
    if (_.isNil(this.versionSelectTemplate)) {
      this.versionSelectTemplate = handlebar.compile(
        this.getTemplateFromFile(this.webview, 'appium-version.html')
      );
    }
    return this.versionSelectTemplate({
      instances: this.appiumInstances.map((instance) => ({
        ...instance,
        selected:
          this.activeAppiumInstance !== null && instance.path === this.activeAppiumInstance?.path,
      })),
    });
  }

  getAppiumHomeDropDown() {
    if (_.isNil(this.appiumHomeSelectTemplate)) {
      this.appiumHomeSelectTemplate = handlebar.compile(
        this.getTemplateFromFile(this.webview, 'appium-home.html')
      );
    }
    return this.appiumHomeSelectTemplate({
      instances: this.appiumHomes.map((home) => ({
        ...home,
        selected: this.activeAppiumHome !== null && home.name === this.activeAppiumHome?.name,
      })),
    });
  }

  getRefreshingTemplate() {
    return html` <div
      class="section flex-column"
      id="loading"
    >
      <div class="flex-row gap-5">
        <i class="codicon codicon-sync codicon-modifier-spin"></i>
        <p>Refreshing...</p>
      </div>
    </div>`;
  }

  async refresh() {
    await this.appiumEnvironmentProvider.refresh();
  }

  refreshView() {
    if (!!this.webview) {
      this.render(this.getWebViewHtml(this.webview));
    }
  }

  async refreshAppiumStatus(opts: { force: boolean }) {
    this.isRefreshing = true;
    this.refreshView();
    if (opts.force) {
      this.appiumInstances = await this.appiumEnvironmentProvider.refresh();
    } else {
      this.appiumInstances = this.appiumEnvironmentProvider.getAppiumInstances();
      this.appiumHomes = this.appiumEnvironmentProvider.getAppiumHomes();
    }

    if (this.activeAppiumInstance === null && !_.isEmpty(this.appiumInstances)) {
      this.activeAppiumInstance = this.appiumInstances[0];
      this.emitAppiumHomeChanged();
    }

    if (this.activeAppiumHome === null && !_.isEmpty(this.appiumHomes)) {
      this.activeAppiumHome = this.appiumHomes[0];
      this.emitAppiumHomeChanged();
    }

    this.isRefreshing = false;
    this.refreshView();
  }
}
