import { resolve } from "@std/path/resolve";
import type { Config } from "./type.ts";
import { isFileExistSync } from "./util.ts";
import Notify from "./Notify.ts";

export default abstract class Configiration {
  static configPath = resolve(Deno.cwd() as string, "trok.config.json");

  private static get fileConfig() {
    return isFileExistSync(this.configPath)
      ? JSON.parse(Deno.readTextFileSync(this.configPath)) as Config
      : {};
  }

  static #notify = this.fileConfig.notify;

  static set notify(value: string | undefined) {
    this.#notify = value;
    Notify.setup();
  }

  static get notify() {
    return this.#notify;
  }
}
