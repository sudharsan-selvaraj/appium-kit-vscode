import _ = require('lodash');
import * as semver from 'semver';
import * as fs from 'fs';
import * as path from 'path';
import { sync as which } from 'which';
import { AppiumExtension, AppiumHome, ExtensionType } from '../types';
import { homedir } from 'os';
import { env, npm } from '@appium/support';
import { execa } from 'execa';
import * as yaml from 'yaml';

const APPIUM_BINARY = 'appium';
const SUPPORTED_APPIUM_VERSION = '>=2.0.0';

function getGlobalAppiumPath() {
  try {
    const appiumPath = which(APPIUM_BINARY);
    const realFilePath = fs.realpathSync(appiumPath);
    const directory = path.join(realFilePath.split('node_modules')[0], 'node_modules', 'appium');
    return directory;
  } catch (err) {
    return '';
  }
}

function readPackageJson(appiumPath: string) {
  const pkg = fs.readFileSync(path.join(appiumPath, 'package.json'), {
    encoding: 'utf-8',
  });
  return JSON.parse(pkg);
}

function getAppiumVersion(appiumPath: string) {
  try {
    return readPackageJson(appiumPath)?.version?.trim();
  } catch (err) {
    return null;
  }
}

function isAppiumVersionSupported(currVesion: string) {
  return (
    !!currVesion &&
    semver.satisfies(semver.coerce(currVesion)?.version as string, SUPPORTED_APPIUM_VERSION)
  );
}

function getAppiumExecutablePath(appiumPath: string) {
  const pkg = readPackageJson(appiumPath);
  return path.join(appiumPath, pkg.bin.appium);
}

function getDefaultAppiumHome(): AppiumHome {
  return {
    name: 'default',
    path: path.resolve(homedir(), '.appium'),
  };
}

async function getInstalledDrivers(appiumExecutable: string, appiumHome: string) {
  return await fetchExtensions(appiumExecutable, appiumHome, 'driver');
}

async function getInstalledPlugins(appiumExecutable: string, appiumHome: string) {
  return await fetchExtensions(appiumExecutable, appiumHome, 'plugin');
}

async function fetchExtensions(
  appiumExecutable: string,
  appiumHome: string,
  extensionType: ExtensionType
): Promise<AppiumExtension[]> {
  const extensionsection = `${extensionType}s`;

  const manifestPath = await env.resolveManifestPath(appiumHome);
  if (
    !fs.existsSync(manifestPath) &&
    !(await initializeAppiumManifest(appiumExecutable, appiumHome, manifestPath))
  ) {
    return [];
  } else {
    const maifest = await readAppiumManifest(manifestPath);
    const extensions = Object.keys(maifest[extensionsection]).map((name) => {
      return {
        name,
        version: semver.parse(maifest[extensionsection][name].version)?.version,
        packageName: maifest[extensionsection][name].pkgName,
        source: maifest[extensionsection][name].installType,
        installSpec: maifest[extensionsection][name].installSpec,
        type: extensionType,
        isDeleting: false,
        isUpdating: false,
        path: path.join(appiumHome, 'node_modules', maifest[extensionsection][name].pkgName),
        platforms: maifest[extensionsection][name].platformNames,
      } as AppiumExtension;
    });

    const parsedExtensions = await Promise.all(
      extensions.map((ext) => {
        return checkForUpdates(ext.packageName, appiumHome, ext.version as string).then(
          (updates) => {
            const metadata = getExtensionMetadata(ext, appiumHome);
            return {
              ...ext,
              updates,
              description: metadata?.description,
            };
          }
        );
      })
    );
    return parsedExtensions;
  }
}

async function checkForUpdates(
  packageName: string,
  appiumHome: string,
  currentVersion: string
): Promise<{
  safe?: string;
  force?: string;
}> {
  const [latestVersion, safeVersion] = await Promise.all([
    npm.getLatestVersion(appiumHome, packageName),
    npm.getLatestSafeUpgradeVersion(appiumHome, packageName, currentVersion),
  ]);

  return {
    safe: !safeVersion || safeVersion === currentVersion ? undefined : safeVersion,
    force: !latestVersion || safeVersion === latestVersion ? undefined : latestVersion,
  };
}

function getExtensionMetadata(
  extension: AppiumExtension,
  appiumHome: string
): { description?: string; homepage?: string } {
  try {
    let pkgPath;
    if (fs.existsSync(path.join(extension.path || '', 'package.json'))) {
      pkgPath = extension.path;
    } else if (fs.existsSync(path.join(appiumHome, 'node_modules', extension.packageName))) {
      pkgPath = path.join(appiumHome, 'node_modules', extension.packageName);
    }

    if (!!pkgPath) {
      const pkgJson = readPackageJson(extension.path);
      return {
        description: pkgJson.description,
      };
    } else {
      return {};
    }
  } catch (err) {
    return {};
  }
}

async function readAppiumManifest(manifestpath: string) {
  try {
    const manifestContent = fs.readFileSync(manifestpath, {
      encoding: 'utf-8',
    });

    return yaml.parse(manifestContent);
  } catch (err) {
    return {};
  }
}

async function initializeAppiumManifest(
  appiumExecutable: string,
  appiumHome: string,
  manifestPath: string
) {
  try {
    await execa('node', [appiumExecutable, '-v'], {
      env: {
        ...process.env,
        APPIUM_HOME: appiumHome,
      },
    });

    if (fs.existsSync(manifestPath)) {
      return true;
    } else {
      return false;
    }
  } catch (err) {
    return false;
  }
}

export {
  SUPPORTED_APPIUM_VERSION,
  getGlobalAppiumPath,
  readPackageJson,
  getAppiumVersion,
  isAppiumVersionSupported,
  getAppiumExecutablePath,
  getDefaultAppiumHome,
  getInstalledDrivers,
  getInstalledPlugins,
};
