import { Pty } from '../pty';
import { AppiumBinary, AppiumHome, AppiumServerSatus } from '../types';

export interface AppiumServerListener {
  onStarted?: () => void;
  onStopped?: () => void;
}

export interface AppiumOptions {
  address: string;
  originalPort: number;
  overridePort: number;
}

export class AppiumLocalServer {
  private status: AppiumServerSatus = AppiumServerSatus.stopped;
  private listeners: AppiumServerListener[] = [];
  private pty: Pty | null = null;

  constructor(
    private appiumHome: AppiumHome,
    private appiumBinary: AppiumBinary,
    private configPath: string,
    private appiumOptions: AppiumOptions
  ) {}

  addListener(listener: AppiumServerListener) {
    this.listeners.push(listener);
  }

  start() {
    if (!this.pty) {
      const args = [
        this.appiumBinary.executable,
        'server',
        '--config',
        this.configPath,
        '-p',
        `${this.appiumOptions.overridePort}`,
      ];
      const env = { ...process.env, APPIUM_HOME: this.appiumHome.path };
      this.pty = new Pty(
        `Appium Server - ${this.configPath}`,
        'node',
        { args: args, env: env, killOnTerminalClosed: true, killOnUserInput: true },
        {
          onStarted: () => {
            this.pty?.write(
              `* Starting Appium server ${this.appiumBinary.version} using appium home in ${this.appiumHome.path}`
            );
            this.pty?.write(`> node ${args.slice(0, args.length - 2).join(' ')}`);
          },
          onTerminalClosed: this._onAppiumStopped.bind(this),
          onError: (err: Error) => {
            this._onAppiumStopped();
            return err.toString();
          },
          onStdout: this._onAppiumLogs.bind(this),
        }
      );

      this.pty.startProcess();
    }
  }

  stop() {
    if (this.pty) {
      this.pty.stop();
    }
  }

  getStatus() {
    return this.status;
  }

  revealTerminal() {
    this.pty?.revealterminal();
  }

  private _onAppiumLogs(data: Buffer) {
    if (data.toString().includes('http interface listener started')) {
      this._onAppiumStarted();
      return data
        .toString()
        .replace(
          `${this.appiumOptions.address}:${this.appiumOptions.overridePort}`,
          `${this.appiumOptions.address}:${this.appiumOptions.originalPort}`
        );
    }
    return data.toString();
  }

  private _onAppiumStarted() {
    this.listeners.forEach((l) => {
      if (l.onStarted) {
        l.onStarted();
      }
    });
  }

  private _onAppiumStopped() {
    this.listeners.forEach((l) => {
      if (l.onStopped) {
        l.onStopped();
      }
    });
    this.pty = null;
    this.status = AppiumServerSatus.stopped;
  }
}
