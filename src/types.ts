export type Consumer<T> = (args: T) => void | Promise<void>;
export interface AppiumHome {
  name: string;
  path: string;
}
