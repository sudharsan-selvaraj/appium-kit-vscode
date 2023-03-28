import { AppiumHome, AppiumInstance } from '../types';
import { appiumHomeCollection, appiumInstanceCollection } from './collections';

export class DatabaseService {
  public static getAppiumInstances() {
    return appiumInstanceCollection.find();
  }

  public static getAppiumHomes() {
    return appiumHomeCollection.find();
  }

  public static insertAppiumInstance(
    appiumInstances: AppiumInstance[] | AppiumInstance,
    options: { reset: boolean } = { reset: false }
  ) {
    if (!!options.reset) {
      appiumInstanceCollection.chain().remove();
    }
    return appiumInstanceCollection.insert(appiumInstances);
  }

  public static insertAppiumHome(
    appiumHomes: AppiumHome[] | AppiumHome,
    options: { reset: boolean } = { reset: false }
  ) {
    if (!!options.reset) {
      appiumHomeCollection.chain().remove();
    }
    return appiumHomeCollection.insert(appiumHomes);
  }
}
