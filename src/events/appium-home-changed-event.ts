import { AppiumInstance } from '../services/appium-environment';
import { AppiumHome, Consumer } from '../types';
import { Event } from './event';
import { EventListener } from './event-listener';

export class AppiumHomeChangedEvent extends Event<AppiumHome> {
  private static readonly EVENT_NAME: string = 'appium-home-changed';

  constructor(appiumHome: AppiumHome) {
    super(AppiumHomeChangedEvent.EVENT_NAME, appiumHome);
  }

  static listener(handler: Consumer<AppiumHome>) {
    return new EventListener<AppiumHome>(AppiumHomeChangedEvent.EVENT_NAME, handler);
  }
}
