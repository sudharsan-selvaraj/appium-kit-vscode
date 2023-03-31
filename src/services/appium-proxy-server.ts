import { open } from 'fs';
import { AppiumBinary, AppiumHome, AppiumServerSatus } from '../types';
import { AppiumLocalServer, AppiumOptions } from './local-server';
import * as httpProxy from 'http-proxy';

export interface AppiumSessionListener {
  onSessionStarted?: (serverId: string, sessionId: string) => {};
  onSessionTerminated?: (serverId: string, sessionId: string) => {};
  onSessionLogs?: (serverId: string, sessionId: string) => {};
}

export interface AppiumServerListener {
  onStarted?: (serverId: string) => void;
  onStoped?: (serverId: string) => void;
}

export interface AppiumServerOptions extends AppiumOptions {
  appiumHome: AppiumHome;
  appiumBinary: AppiumBinary;
  configPath: string;
}

export class AppiumServerService {
  private _sessionListeners: AppiumSessionListener[] = [];
  private _serverListeners: AppiumServerListener[] = [];
  private _localAppiumServer!: AppiumLocalServer;
  private _httpServer!: httpProxy;

  private status: AppiumServerSatus = AppiumServerSatus.stopped;

  constructor(private id: string, private options: AppiumServerOptions) {}

  start() {
    if (this.status !== AppiumServerSatus.stopped) {
      return;
    }
    this.status = AppiumServerSatus.starting;
    this.startProxyServer();
    this.startLocalServer();
  }

  getStatus() {
    return this.status;
  }

  revealTerminal() {}

  private startProxyServer() {
    this._httpServer = httpProxy.createProxyServer({
      target: `http://localhost:${this.options.overridePort}`,
    });

    this._httpServer.on('proxyRes', function (proxyRes, req, res) {
      let _body: any[] = [];
      proxyRes.on('data', function (chunk) {
        _body.push(chunk);
      });
      proxyRes.on('end', function () {
        let finalBody = Buffer.concat(_body).toString();
        res.end(finalBody);
        if (req?.method?.toLowerCase() === 'post' && req.url?.endsWith('session')) {
        } else if (req?.method?.toLowerCase() === 'delete' && req.url?.endsWith('session')) {
        }
      });
    });
  }

  private startLocalServer() {
    this._localAppiumServer = new AppiumLocalServer(
      this.options.appiumHome,
      this.options.appiumBinary,
      this.options.configPath,
      this.options
    );

    this._localAppiumServer.addListener({
      onStarted: () => {
        this.status = AppiumServerSatus.running;
        this._serverListeners.forEach((l) => l.onStarted && l.onStarted(this.id));
      },
      onStopped: this._onAppiumServerStopped.bind(this),
    });

    this._localAppiumServer.start();
  }

  private _onAppiumServerStopped() {
    this.status = AppiumServerSatus.stopped;
    this._serverListeners.forEach((l) => l.onStoped && l.onStoped(this.id));
    this._httpServer.close();
  }

  addServerListener(listener: AppiumServerListener) {
    this._serverListeners.push(listener);
  }
}
