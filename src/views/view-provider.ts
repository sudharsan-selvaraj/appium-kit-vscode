import { Disposable, ExtensionContext } from 'vscode';

export interface ViewProvider extends Disposable {
  register: (viewId: string, context: ExtensionContext) => Promise<ViewProvider>;
}
