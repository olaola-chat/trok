import { resolve } from "@std/path/resolve";
import type { Config } from "./type.ts";
import { isFileExistSync } from "./util.ts";

const configPath = resolve(Deno.cwd() as string, "trok.config.json");

export default isFileExistSync(configPath)
  ? JSON.parse(Deno.readTextFileSync(configPath)) as Config
  : {};
