import { AppiumHome, Consumer } from '../types';
import { Event } from './event';
import { EventListener } from './event-listener';

export class AppiumHomeUpdatedEvent extends Event<AppiumHome[]> {
  private static readonly EVENT_NAME: string = 'appium-home-updated';

  constructor(appiumHomes: AppiumHome[]) {
    super(AppiumHomeUpdatedEvent.EVENT_NAME, appiumHomes);
  }

  static listener(handler: Consumer<AppiumHome[]>) {
    return new EventListener<AppiumHome[]>(AppiumHomeUpdatedEvent.EVENT_NAME, handler);
  }
}
