export interface AppiumExtension {
  type: 'driver' | 'plugin';
  name: string;
  version: string;
  installationName: string;
  path: string;
}

export interface AppiumInfo {
  version: string;
  path: string;
  appiumHome: string;
  plugins?: AppiumExtension[];
  drivers?: AppiumExtension[];
}
