import { parseArgs } from "@std/cli/parse-args";
import Workspace from "./Workspace.ts";

const args = parseArgs(Deno.args);

function trimBoolArg(argName: string, defaultValue?: string) {
  return args[argName] === true ? undefined : args[argName] ?? defaultValue;
}

const [{ origin, branch }] = Workspace.repos;

const notify = trimBoolArg("notify").split(",");
const verbose = Boolean(args.verbose);

const task = {
  id: globalThis.crypto.randomUUID(),
  origin: trimBoolArg("origin", origin),
  branch: trimBoolArg("branch", branch),
  selector: trimBoolArg("selector", "HEAD^...HEAD"),
};

Workspace.run({ task, notify, verbose });
