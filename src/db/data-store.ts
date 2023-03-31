import { DatabaseCollections } from '.';
import { AppiumBinary, AppiumHome } from '../types';
import _ = require('lodash');
import { diff } from 'semver';

export class DataStore {
  constructor(private collections: DatabaseCollections) {}

  getAppiumHomes(): AppiumHome[] {
    return this.collections.appiumHome.find();
  }

  getActiveAppiumHome(): AppiumHome | null {
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

  public deleteAppiumHome(home: AppiumHome) {
    this.collections.appiumHome
      .chain()
      .find({
        path: home.path,
      })
      .remove();
  }

  public updateAppiumHome(home: AppiumHome[]) {
    const changed = this._differenceWith(this.collections.appiumHome.find(), home, 'path');
    if (changed.length) {
      this.collections.appiumHome.chain().remove();
      this.collections.appiumHome.insert(home);
    }
    return !!changed.length;
  }

  public updateAppiumBinary(binaries: AppiumBinary[]) {
    const changed = this._differenceWith(this.collections.appiumBinary.find(), binaries, 'path');
    if (changed.length) {
      this.collections.appiumBinary.chain().remove();
      this.collections.appiumBinary.insert(binaries);
    }
    return !!changed.length;
  }

  public setActiveAppiumBinary(activeBinary: AppiumBinary) {
    this.collections.appiumBinary.chain().update((binary) => {
      binary.isActive = this._pathPredicate(binary, activeBinary);
    });
  }

  public setActiveAppiumHome(activeHome: AppiumHome) {
    this.collections.appiumHome.chain().update((home) => {
      home.isActive = this._pathPredicate(home, activeHome);
    });
  }

  private _pathPredicate(a: { path: string }, b: { path: string }): boolean {
    return a.path === b.path;
  }

  private _differenceWith(a1: Array<any>, a2: Array<any>, prop: any) {
    const diff1 = a1.filter((o1) => a2.filter((o2) => o2[prop] === o1[prop]).length === 0);
    const diff2 = a2.filter((o1) => a1.filter((o2) => o2[prop] === o1[prop]).length === 0);
    return _.flatMap([diff1, diff2]);
  }
}
