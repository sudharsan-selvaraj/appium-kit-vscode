import { AppiumServiceInstance } from '../services/appium-service';
import { AppiumHome, Consumer } from '../types';
import { Event } from './event';
import { EventListener } from './event-listener';

export class AppiumServerStartedEvent extends Event<AppiumServiceInstance> {
  private static readonly EVENT_NAME: string = 'appium-server-started';

  constructor(appiumServerInsatnce: AppiumServiceInstance) {
    super(AppiumServerStartedEvent.EVENT_NAME, appiumServerInsatnce);
  }

  static listener(handler: Consumer<AppiumServiceInstance>) {
    return new EventListener<AppiumServiceInstance>(AppiumServerStartedEvent.EVENT_NAME, handler);
  }
}
