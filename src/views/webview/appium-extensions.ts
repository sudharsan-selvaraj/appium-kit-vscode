import { BaseWebView } from './base-webview';
import * as vscode from 'vscode';
import { EventBus } from '../../events/event-bus';
import { AppiumHomeChangedEvent } from '../../events/appium-home-changed-event';
import { AppiumExtension, AppiumHome, AppiumInstance, ExtensionType } from '../../types';
import { ViewProvider } from '../view-provider';
import { getInstalledDrivers, getInstalledPlugins } from '../../utils/appium';
import { DatabaseService } from '../../db';
import _ = require('lodash');
import { html } from 'common-tags';
import { InstallAppiumExtensionCommand, InstallExtensionOptions } from '../../commands/install-appium-extension';
import { AppiumExtensionUpdatedEvent } from '../../events/appium-extension-updated-event';
import { UnInstallAppiumExtensionCommand, UnInstallExtensionOptions } from '../../commands/uninstall-appium-extension';
import { UpdateAppiumExtensionCommand } from '../../commands/update-appium-extension';

const loadingViewTemplate = html`<div class="section flex-column" id="loading" style="display: block">
	<div class="flex-row gap-5">
		<i class="codicon codicon-sync codicon-modifier-spin"></i>
		<p>Loading extension details..</p>
	</div>
</div>`;

export class AppiumExtensionsWebView extends BaseWebView implements ViewProvider {
	private webview!: vscode.Webview;
	private appiumHome: AppiumHome | null = null;
	private drivers: AppiumExtension[] = [];
	private plugins: AppiumExtension[] = [];
	private activeTab: ExtensionType = 'driver';
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

		this.eventBus.addListener(
			AppiumExtensionUpdatedEvent.listener(() => {
				this.loadExtensions();
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

	private _findMatchingExtension(name: string, type: ExtensionType) {
		return [...this.drivers, ...this.plugins].find((ext) => ext.type === type && ext.name === name);
	}

	private _installExtenstion(appiumInstance: AppiumInstance, type: ExtensionType) {
		vscode.commands.executeCommand(InstallAppiumExtensionCommand.NAME, [
			this.appiumHome,
			appiumInstance,
			<InstallExtensionOptions>{ type: type },
		]);
	}

	private _uninstallExtenstion(appiumInstance: AppiumInstance, name: string, type: ExtensionType) {
		const extension = this._findMatchingExtension(name, type);
		if (!!extension) {
			extension.isDeleting = true;
		}
		vscode.commands.executeCommand(UnInstallAppiumExtensionCommand.NAME, [
			this.appiumHome,
			appiumInstance,
			<UnInstallExtensionOptions>{ name, type },
		]);
		this.setLoading(false);
	}

	private _updateExtension(appiumInstance: AppiumInstance, name: string, type: ExtensionType) {
		const extension = this._findMatchingExtension(name, type);
		if (!!extension) {
			extension.isUpdating = true;
		}
		const version = !!extension?.version ? JSON.parse(extension.version) : {};
		vscode.commands.executeCommand(UpdateAppiumExtensionCommand.NAME, [
			this.appiumHome,
			appiumInstance,
			{ name: name, type: type, version },
		]);
		this.setLoading(false);
	}

	onViewLoaded(webview: vscode.Webview) {
		this.webview = webview;
		this.webview.onDidReceiveMessage((event) => {
			const appiumInstance = DatabaseService.getActiveAppiumInstance();

			switch (event.type) {
				case 'install-extension':
					this._installExtenstion(<AppiumInstance>appiumInstance, event.extensionType);
					break;
				case 'uninstall-extension':
					this.activeTab = event.extensionType;
					this._uninstallExtenstion(<AppiumInstance>appiumInstance, event.name, event.extensionType);
					break;
				case 'update-extension':
					this.activeTab = event.extensionType;
					this._updateExtension(<AppiumInstance>appiumInstance, event.name, event.extensionType);
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

	_extentionListTemplate(extensionTitle: string, extensions: AppiumExtension[], type: ExtensionType) {
		const header = html`<vscode-tab-header slot="header">
			${extensionTitle}
			<vscode-badge variant="counter" slot="content-after">${extensions.length}</vscode-badge>
		</vscode-tab-header>`;

		const addNewExtension = html`<vscode-button class="full-width flex-row" onclick='installExtension("${type}")'>
			<span class="flex-row gap-5"> <i class="codicon codicon-cloud-download"></i>Install new ${type} </span>
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
							${extensions.map((ext) => this.getExtensionCardTemplate(ext, type)).join('')}
						</div>
					</div>
			  </div>`;

		return header + html`<vscode-tab-panel class="tab-body">${list}</vscode-tab-panel>`;
	}

	private getExtensionIcon(ext: AppiumExtension) {
		const iconFile = {
			npm: 'npm.svg',
			local: 'folder.svg',
			git: 'git.svg',
			github: 'github.svg',
		};

		return this.getAssetUri(this.webview, iconFile[ext.source]);
	}

	private getExtensionCardTemplate(ext: AppiumExtension, type: ExtensionType) {
		const extensionIcon = this.getExtensionIcon(ext);
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
									(platform) => `<vscode-badge class="platform-badge" slot="content-after">${platform}</vscode-badge>`
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

	private setLoading(loadingStatus: boolean, render: boolean = true) {
		this.loading = loadingStatus;
		if (this.webview && render) {
			this.render(this.getWebViewHtml(this.webview));
		}
	}

	async loadExtensions() {
		this.setLoading(true);
		this.activeTab = 'driver';

		const appiumHome = _.clone(this.appiumHome);

		const [driver, plugins] = await Promise.all([
			getInstalledDrivers(DatabaseService.getAppiumInstances()[0].path, this.appiumHome?.path as string),
			getInstalledPlugins(DatabaseService.getAppiumInstances()[0].path, this.appiumHome?.path as string),
		]);

		this.drivers = driver;
		this.plugins = plugins;

		this.setLoading(false, appiumHome?.path === this.appiumHome?.path);
	}
}
