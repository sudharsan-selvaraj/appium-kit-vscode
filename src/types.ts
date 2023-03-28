export type Consumer<T> = (args: T) => void | Promise<void>;
export interface AppiumHome {
  name: string;
  path: string;
  isActive?: boolean;
}

export enum AppiumSource {
  global = 'global',
  workspace = 'workspace',
}

export interface AppiumInstance {
  version: string;
  path: string;
  executable?: string;
  source: AppiumSource;
  isSupported: boolean;
  isActive?: boolean;
}
