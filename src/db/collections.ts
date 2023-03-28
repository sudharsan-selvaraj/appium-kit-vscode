import * as loki from 'lokijs';
import { AppiumHome, AppiumInstance } from '../types';

const db = new loki('example.db');
const appiumInstanceCollection = db.addCollection<AppiumInstance>('appium-instances', {
  disableMeta: true,
});
const appiumHomeCollection = db.addCollection<AppiumHome>('appium-homes', { disableMeta: true });

export { appiumInstanceCollection, appiumHomeCollection };
