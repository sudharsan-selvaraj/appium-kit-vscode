import { ExtensionContext, Webview } from 'vscode';
import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import _ = require('lodash');
import { html } from 'common-tags';
import * as handlebar from 'handlebars';
import { ViewProvider } from '../view-provider';
import { EventBus } from '../../events/event-bus';
import { AppiumVersionChangedEvent } from '../../events/appium-version-changed-event';
import { AppiumHome, AppiumInstance } from '../../types';
import { AppiumHomeChangedEvent } from '../../events/appium-home-changed-event';
import { DatabaseService } from '../../db';
import { AppiumInstanceUpdatedEvent } from '../../events/appium-instance-updated-event';
import { AppiumHomeUpdatedEvent } from '../../events/appium-home-updated-event';
import { RefreshAppiumInstancesCommand } from '../../commands/refresh-appium-instances';
import { AddNewAppiumHomeCommand } from '../../commands/add-new-appium-home';

export class AppiumEnvironmentWebView extends BaseWebView implements ViewProvider {
  private webview!: vscode.Webview;
  private appiumHomes: AppiumHome[] = [];
  private appiumInstances: AppiumInstance[] = [];
  private activeAppiumInstance: AppiumInstance | null = null;
  private activeAppiumHome: AppiumHome | null = null;

  private versionSelectTemplate!: handlebar.TemplateDelegate;
  private appiumHomeSelectTemplate!: handlebar.TemplateDelegate;

  constructor(context: ExtensionContext, private eventBus: EventBus) {
    super(context, 'appium-environment', ['appium-environment.js'], []);
    this.eventBus.addListener(
      AppiumInstanceUpdatedEvent.listener(async () => {
        await this.refreshAppiumStatus();
      })
    );

    this.eventBus.addListener(
      AppiumHomeUpdatedEvent.listener(async () => {
        await this.refreshAppiumStatus();
      })
    );
  }

  async register(viewId: string, context: ExtensionContext): Promise<ViewProvider> {
    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(viewId, this, {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      })
    );

    await this.refreshAppiumStatus();

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

  private emitAppiumHomeChanged() {
    this.eventBus.fire(new AppiumHomeChangedEvent(this.activeAppiumHome as AppiumHome));
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

  async refreshAppiumStatus() {
    this.appiumHomes = DatabaseService.getAppiumHomes();
    this.appiumInstances = DatabaseService.getAppiumInstances();

    if (this.activeAppiumInstance === null && !_.isEmpty(this.appiumInstances)) {
      this.activeAppiumInstance = this.appiumInstances[0];
      this.emitAppiumVersionChanged();
    }

    if (this.activeAppiumHome === null && !_.isEmpty(this.appiumHomes)) {
      this.activeAppiumHome = this.appiumHomes[0];
      this.emitAppiumHomeChanged();
    }
    this.refreshView();
  }
}
