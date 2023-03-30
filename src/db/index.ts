import _ = require('lodash');
import { AppiumHome, AppiumInstance } from '../types';
import { appiumHomeCollection, appiumInstanceCollection } from './collections';

export class DatabaseService {
  public static getAppiumInstances() {
    return appiumInstanceCollection.find();
  }

  public static getAppiumHomes() {
    return appiumHomeCollection.find();
  }

  public static getActiveAppiumInstance() {
    return appiumInstanceCollection.findOne({
      isActive: true,
    });
  }

  public static getActiveAppiumHome() {
    return appiumHomeCollection.findOne({
      isActive: true,
    });
  }

  public static insertAppiumInstance(
    appiumInstances: AppiumInstance[] | AppiumInstance,
    options: { reset: boolean } = { reset: false }
  ) {
    if (!_.isArray(appiumInstances)) {
      appiumInstances = [appiumInstances];
    }
    if (!!options.reset) {
      appiumInstanceCollection.chain().remove();
    }
    return appiumInstanceCollection.insert(
      appiumInstances.map((instance) => {
        delete (instance as any)['$loki'];
        return instance;
      })
    );
  }

  public static insertAppiumHome(
    appiumHomes: AppiumHome[] | AppiumHome,
    options: { reset: boolean } = { reset: false }
  ) {
    if (!_.isArray(appiumHomes)) {
      appiumHomes = [appiumHomes];
    }

    if (!!options.reset) {
      appiumHomeCollection.chain().find().remove();
    }
    return appiumHomeCollection.insert(
      appiumHomes.map((home) => {
        delete (home as any)['$loki'];
        return home;
      })
    );
  }
}
