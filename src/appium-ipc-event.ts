export type AppiumIpcEvent = 'session-started' | 'session-command' | 'session-stopped';

export interface AppiumIpcMessage<T> {
  event: AppiumIpcEvent;
  data: T;
}
