import { Consumer } from '../types';

export class EventListener<T> {
  constructor(private readonly eventName: string, private readonly handler: Consumer<T>) {}

  public getEventName() {
    return this.eventName;
  }

  public getHandler() {
    return this.handler;
  }
}
