import _ = require('lodash');
import * as semver from 'semver';
import * as fs from 'fs';
import * as path from 'path';
import { sync as which } from 'which';
import { AppiumExtension, AppiumHome } from '../types';
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
  return semver.satisfies(semver.coerce(currVesion)?.version as string, SUPPORTED_APPIUM_VERSION);
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
  return await fetchExtensions(appiumExecutable, appiumHome, 'drivers');
}

async function getInstalledPlugins(appiumExecutable: string, appiumHome: string) {
  return await fetchExtensions(appiumExecutable, appiumHome, 'plugins');
}

async function fetchExtensions(
  appiumExecutable: string,
  appiumHome: string,
  extensionType: 'drivers' | 'plugins'
): Promise<AppiumExtension[]> {
  const manifestPath = await env.resolveManifestPath(appiumHome);
  if (
    !fs.existsSync(manifestPath) &&
    !(await initializeAppiumManifest(appiumExecutable, appiumHome, manifestPath))
  ) {
    return [];
  } else {
    const maifest = await readAppiumManifest(manifestPath);
    const extensions = Object.keys(maifest[extensionType]).map((name) => {
      return {
        name,
        version: semver.parse(maifest[extensionType][name].version)?.version,
        packageName: maifest[extensionType][name].pkgName,
        source: maifest[extensionType][name].installType,
        installSpec: maifest[extensionType][name].installSpec,
        type: extensionType,
        isInstalling: false,
        isUpdating: false,
        path: path.join(appiumHome, 'node_modules', maifest[extensionType][name].pkgName),
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
  const latestVersion = await npm.getLatestVersion(appiumHome, packageName);
  const safeVersion = await npm.getLatestSafeUpgradeVersion(
    appiumHome,
    packageName,
    currentVersion
  );
  return {
    safe: !safeVersion || safeVersion === currentVersion ? undefined : safeVersion,
    force: !latestVersion || safeVersion === latestVersion ? undefined : latestVersion,
  };
}

function getExtensionMetadata(
  extension: AppiumExtension,
  appiumHome: string
): { description?: string; homepage?: string } {
  // if (extension.source === 'npm') {
  //   const res = (
  //     await npm.exec('view', [extension.packageName, 'description', 'homepage'], {
  //       cwd: appiumHome,
  //       json: true,
  //     })
  //   ).json;
  //   return res;
  // } else if (extension.source === 'local') {
  //   //const pkg = readPackageJson();
  //   return {};
  // } else {
  //   return {};
  // }

  try {
    const pkgJson = readPackageJson(extension.path);
    return {
      description: pkgJson.description,
    };
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
