import _ = require('lodash');
import * as semver from 'semver';
import * as fs from 'fs';
import * as path from 'path';
import { sync as which } from 'which';
import { AppiumHome } from '../types';
import { homedir } from 'os';

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

export {
  SUPPORTED_APPIUM_VERSION,
  getGlobalAppiumPath,
  readPackageJson,
  getAppiumVersion,
  isAppiumVersionSupported,
  getAppiumExecutablePath,
  getDefaultAppiumHome,
};
