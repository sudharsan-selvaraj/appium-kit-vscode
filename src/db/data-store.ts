import { DatabaseCollections } from '.';
import { AppiumBinary, AppiumHome } from '../types';
import _ = require('lodash');

export class DataStore {
  constructor(private collections: DatabaseCollections) {}

  getAppiumHomes(): AppiumHome[] {
    return this.collections.appiumHome.find();
  }

  getDefaultAppiumHome(): AppiumHome | null {
    return this.collections.appiumHome.findOne({
      isActive: true,
    });
  }

  getAppiumBinaries(): AppiumBinary[] {
    return this.collections.appiumBinary.find();
  }

  getActiveAppiumBinary(): AppiumBinary | null {
    return this.collections.appiumBinary.findOne({
      isActive: true,
    });
  }

  public addNewAppiumHome(home: AppiumHome) {
    this.collections.appiumHome.insert(home);
  }

  public updateAppiumHome(home: AppiumHome[]) {
    const changed = _.differenceWith(this.collections.appiumHome.find(), home, this._pathPredicate);
    if (changed.length) {
      this.collections.appiumHome.chain().remove();
      this.collections.appiumHome.insert(home);
    }
    return changed.length;
  }

  public updateAppiumBinary(binaries: AppiumBinary[]) {
    const changed = _.differenceWith(
      this.collections.appiumBinary.find(),
      binaries,
      this._pathPredicate
    );
    if (changed.length) {
      this.collections.appiumBinary.chain().remove();
      this.collections.appiumBinary.insert(binaries);
    }
    return changed.length;
  }

  public setActiveAppiumBinary(activeBinary: AppiumBinary) {
    this.collections.appiumBinary.chain().update((binary) => {
      binary.isActive = this._pathPredicate(binary, activeBinary);
    });
  }

  public setActiveAppiumHome(activeHome: AppiumHome) {
    this.collections.appiumBinary.chain().update((home) => {
      home.isActive = this._pathPredicate(home, activeHome);
    });
  }

  private _pathPredicate(a: { path: string }, b: { path: string }): boolean {
    return a.path === b.path;
  }
}
