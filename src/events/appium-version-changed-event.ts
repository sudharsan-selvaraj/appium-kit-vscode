import { AppiumInstance } from '../services/appium-environment';
import { Consumer } from '../types';
import { Event } from './event';
import { EventListener } from './event-listener';

export class AppiumVersionChangedEvent extends Event<AppiumInstance> {
  private static readonly EVENT_NAME: string = 'appium-version-changed';

  constructor(appiumInstance: AppiumInstance) {
    super(AppiumVersionChangedEvent.EVENT_NAME, appiumInstance);
  }

  static listener(handler: Consumer<AppiumInstance>) {
    return new EventListener<AppiumInstance>(AppiumVersionChangedEvent.EVENT_NAME, handler);
  }
}
