import { AppiumStatus } from '../services/appium-environment';

export interface AppiumStatusChangeListener {
  onAppiumStatusChange: (appiumStatus: AppiumStatus | null) => void;
}

export interface AppiumEnvironmentProvider {
  getAppiumStatus(): AppiumStatus | null;
  refresh(): Promise<AppiumStatus | null>;
  addStatusChangeListener(listener: AppiumStatusChangeListener): void;
}
