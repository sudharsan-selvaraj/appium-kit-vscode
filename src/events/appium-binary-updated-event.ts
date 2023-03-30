import { AppiumBinary, Consumer } from '../types';
import { Event } from './event';
import { EventListener } from './event-listener';

export class AppiumBinaryUpdatedEvent extends Event<AppiumBinary[]> {
  private static readonly EVENT_NAME: string = 'appium-binary-updated';

  constructor(binaries: AppiumBinary[]) {
    super(AppiumBinaryUpdatedEvent.EVENT_NAME, binaries);
  }

  static listener(handler: Consumer<AppiumBinary[]>) {
    return new EventListener<AppiumBinary[]>(AppiumBinaryUpdatedEvent.EVENT_NAME, handler);
  }
}
