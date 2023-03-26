import { AppiumInstance } from '../services/appium-environment';
import { AppiumHome } from '../types';

export interface AppiumStatusChangeListener {
  onAppiumStatusChange: (appiumInstances: Array<AppiumInstance>) => void;
}

export interface AppiumEnvironmentProvider {
  getAppiumInstances(): Array<AppiumInstance>;
  getAppiumHomes(): Array<AppiumHome>;
  refresh(): Promise<Array<AppiumInstance>>;
  addStatusChangeListener(listener: AppiumStatusChangeListener): void;
}
