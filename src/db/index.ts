import * as loki from 'lokijs';
import _ = require('lodash');
import { ExtensionContext } from 'vscode';
import { AppiumHome, AppiumBinary } from '../types';
const lfsa = require('lokijs/src/loki-fs-structured-adapter');

export interface DatabaseCollections {
  appiumHome: Collection<AppiumHome>;
  appiumBinary: Collection<AppiumBinary>;
}

function initializeDb(context: ExtensionContext): DatabaseCollections {
  const adapter = new lfsa();
  const collections: any = {};

  const database = new loki('appium-kit.db', {
    adapter: adapter,
    autoload: true,
    autoloadCallback: () => {
      ['appiumHome', 'appiumInstance'].forEach((table) => {
        collections[table as keyof DatabaseCollections] =
          database.getCollection(table) || database.addCollection(table);
      });
    },
    autosave: true,
    autosaveInterval: 4000,
  });

  return collections;
}

export { initializeDb };

// export class DatabaseService {
// 	constructor(context: ExtensionContext) {}

// 	async initialize() {}

// 	public getAppiumInstances() {
// 		return appiumInstanceCollection.find();
// 	}

// 	public getAppiumHomes() {
// 		return appiumHomeCollection.find();
// 	}

// 	public getActiveAppiumInstance() {
// 		return appiumInstanceCollection.findOne({
// 			isActive: true,
// 		});
// 	}

// 	public getActiveAppiumHome() {
// 		return appiumHomeCollection.findOne({
// 			isActive: true,
// 		});
// 	}

// 	public insertAppiumInstance(
// 		appiumInstances: AppiumInstance[] | AppiumInstance,
// 		options: { reset: boolean } = { reset: false }
// 	) {
// 		if (!_.isArray(appiumInstances)) {
// 			appiumInstances = [appiumInstances];
// 		}
// 		if (!!options.reset) {
// 			appiumInstanceCollection.chain().remove();
// 		}
// 		return appiumInstanceCollection.insert(
// 			appiumInstances.map((instance) => {
// 				delete (instance as any)['$loki'];
// 				return instance;
// 			})
// 		);
// 	}

// 	public insertAppiumHome(appiumHomes: AppiumHome[] | AppiumHome, options: { reset: boolean } = { reset: false }) {
// 		if (!_.isArray(appiumHomes)) {
// 			appiumHomes = [appiumHomes];
// 		}

// 		if (!!options.reset) {
// 			appiumHomeCollection.chain().find().remove();
// 		}
// 		return appiumHomeCollection.insert(
// 			appiumHomes.map((home) => {
// 				delete (home as any)['$loki'];
// 				return home;
// 			})
// 		);
// 	}
// }
