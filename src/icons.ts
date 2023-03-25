import { ThemeColor, ThemeIcon } from 'vscode';
import * as path from 'path';

export const COLOR_ERROR = new ThemeColor('#ff3333');
export const ICON_INVALID = new ThemeIcon('bracket-error', COLOR_ERROR);
export const ICON_VALID = new ThemeIcon('bracket-dot');
export const ICON_APPIUM = path.join(__dirname, '..', 'media', 'appium.svg');
