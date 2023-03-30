import { AppiumHome, Consumer } from '../types';
import { Event } from './event';
import { EventListener } from './event-listener';

export class RefreshAppiumEnvironmentEvent extends Event<void> {
  private static readonly EVENT_NAME: string = 'appium-environemt-refresh';

  constructor() {
    super(RefreshAppiumEnvironmentEvent.EVENT_NAME);
  }

  static listener(handler: Consumer<void>) {
    return new EventListener<void>(RefreshAppiumEnvironmentEvent.EVENT_NAME, handler);
  }
}
