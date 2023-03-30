import { AppiumHome, Consumer } from '../types';
import { Event } from './event';
import { EventListener } from './event-listener';

export class AppiumExtensionUpdatedEvent extends Event<null> {
  private static readonly EVENT_NAME: string = 'appium-extension-updated';

  constructor() {
    super(AppiumExtensionUpdatedEvent.EVENT_NAME, null);
  }

  static listener(handler: Consumer<void>) {
    return new EventListener<void>(AppiumExtensionUpdatedEvent.EVENT_NAME, handler);
  }
}
