import { ExtensionContext, Webview } from 'vscode';
import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import _ = require('lodash');
import { html } from 'common-tags';
import * as handlebar from 'handlebars';
import { ViewProvider } from '../view-provider';
import { EventBus } from '../../events/event-bus';
import { AppiumHome, AppiumBinary } from '../../types';
import { AppiumHomeChangedEvent } from '../../events/appium-home-changed-event';
import { AppiumHomeUpdatedEvent } from '../../events/appium-home-updated-event';
import { RefreshAppiumInstancesCommand } from '../../commands/refresh-appium-instances';
import { AddNewAppiumHomeCommand } from '../../commands/add-new-appium-home';
import { AppiumBinaryChangedEvent } from '../../events/appium-binary-changed-event';
import { AppiumBinaryUpdatedEvent } from '../../events/appium-binary-updated-event';

export class AppiumEnvironmentWebView extends BaseWebView implements ViewProvider {
  private webview!: vscode.Webview;
  private appiumHomes: AppiumHome[] = [];
  private appiumBinaries: AppiumBinary[] = [];
  private activeAppiumBinary: AppiumBinary | null = null;
  private activeAppiumHome: AppiumHome | null = null;

  private versionSelectTemplate!: handlebar.TemplateDelegate;
  private appiumHomeSelectTemplate!: handlebar.TemplateDelegate;

  constructor(context: ExtensionContext, private eventBus: EventBus) {
    super(context, 'appium-environment', ['appium-environment.js'], []);
    this.eventBus.addListener(
      AppiumBinaryUpdatedEvent.listener(this._appiumBinaryUpdated.bind(this))
    );
    this.eventBus.addListener(AppiumHomeUpdatedEvent.listener(this._appiumHomeUpdated.bind(this)));
  }

  async register(viewId: string, context: ExtensionContext): Promise<ViewProvider> {
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
    //not required
  }

  onViewLoaded(webview: Webview) {
    this.webview = webview;
    this.webview.onDidReceiveMessage((event) => {
      switch (event.type) {
        case 'select-appium-version':
          const appiumInstances = DatabaseService.getAppiumInstances();
          if (
            _.isNil(this.activeAppiumInstance) ||
            this.activeAppiumInstance.path !== appiumInstances[event.index].path
          ) {
            this.activeAppiumInstance = appiumInstances[event.index];
            this.emitAppiumVersionChanged();
          }

          break;
        case 'select-appium-home':
          const appiumHomes = DatabaseService.getAppiumHomes();
          if (
            _.isNil(this.activeAppiumHome) ||
            this.activeAppiumHome.path !== appiumHomes[event.index].path
          ) {
            this.activeAppiumHome = appiumHomes[event.index];
            this.emitAppiumHomeChanged();
          }

          break;
        case 'add-new-appium-home':
          this.addNewAppiumHome();
          break;
      }
    });
  }

  private addNewAppiumHome() {
    vscode.commands.executeCommand(AddNewAppiumHomeCommand.NAME);
  }

  private emitAppiumVersionChanged() {
    this.eventBus.fire(new AppiumVersionChangedEvent(this.activeAppiumInstance as AppiumInstance));
  }

  getWebViewHtml(webview: Webview) {
    return html`<div class="container full-width">
      <div class="section flex-column full-width">
        ${this.getAppiumVersionDropDown()} ${this.getAppiumHomeDropDown()}
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

  async refresh() {
    vscode.commands.executeCommand(RefreshAppiumInstancesCommand.NAME);
  }

  refreshView() {
    if (!!this.webview) {
      this.render(this.getWebViewHtml(this.webview));
    }
  }

  async _appiumHomeUpdated(newHomes: AppiumHome[]) {
    this.appiumHomes = newHomes;
    if (!!this.activeAppiumHome || !newHomes.some((h) => h.path === this.activeAppiumHome?.path)) {
      this.activeAppiumHome = newHomes[0];
      this.eventBus.fire(new AppiumHomeChangedEvent(this.activeAppiumHome));
      this.refreshView();
    }
  }

  async _appiumBinaryUpdated(binaries: AppiumBinary[]) {
    this.appiumBinaries = binaries;
    if (
      !!this.activeAppiumBinary ||
      !binaries.some((b) => b.path === this.activeAppiumBinary?.path)
    ) {
      this.activeAppiumBinary = binaries[0];
      this.eventBus.fire(new AppiumBinaryChangedEvent(this.activeAppiumBinary));
      this.refreshView();
    }
  }
}
