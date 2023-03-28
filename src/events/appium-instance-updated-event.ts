import { AppiumInstance, Consumer } from '../types';
import { Event } from './event';
import { EventListener } from './event-listener';

export class AppiumInstanceUpdatedEvent extends Event<AppiumInstance[]> {
  private static readonly EVENT_NAME: string = 'appium-instance-updated';

  constructor(appiumInstances: AppiumInstance[]) {
    super(AppiumInstanceUpdatedEvent.EVENT_NAME, appiumInstances);
  }

  static listener(handler: Consumer<AppiumInstance[]>) {
    return new EventListener<AppiumInstance[]>(AppiumInstanceUpdatedEvent.EVENT_NAME, handler);
  }
}
