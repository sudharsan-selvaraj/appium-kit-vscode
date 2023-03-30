import { AppiumBinary, Consumer } from '../types';
import { Event } from './event';
import { EventListener } from './event-listener';

export class AppiumBinaryChangedEvent extends Event<AppiumBinary> {
  private static readonly EVENT_NAME: string = 'appium-binary-changed';

  constructor(appiumInstance: AppiumBinary) {
    super(AppiumBinaryChangedEvent.EVENT_NAME, appiumInstance);
  }

  static listener(handler: Consumer<AppiumBinary>) {
    return new EventListener<AppiumBinary>(AppiumBinaryChangedEvent.EVENT_NAME, handler);
  }
}
