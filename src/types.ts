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

export interface AppiumExtension {
  type: ExtensionType;
  name?: string;
  installSpec?: string;
  packageName: string;
  version?: string;
  updates: {
    safe?: string;
    force?: string;
  };
  isDeleting: boolean;
  isUpdating: boolean;
  source: 'npm' | 'github' | 'local' | 'git';
  description?: string;
  path: string;
  platforms?: string[];
}

export type ExtensionType = 'driver' | 'plugin';
