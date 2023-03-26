import { EventEmitter2 } from 'eventemitter2';

import { Event } from './event';
import { EventListener } from './event-listener';

export class EventBus {
  private delegate: EventEmitter2 = new EventEmitter2();

  addListener<T>(listener: EventListener<T>) {
    this.delegate.addListener(listener.getEventName(), listener.getHandler());
  }

  fire<T>(event: Event<T>) {
    this.delegate.emit(event.getEventName(), event.getData());
  }

  removeAll() {
    this.delegate.removeAllListeners();
  }
}
