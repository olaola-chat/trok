import { parseArgs } from "@std/cli/parse-args";
import Workspace from "./workspace.ts";

const args = parseArgs(Deno.args);

function trimBoolArg(argName: string, defaultValue?: string) {
  return args[argName] === true ? defaultValue : (args[argName] ?? defaultValue);
}

const [{ origin, branch }] = Workspace.repos;

const notify = trimBoolArg("notify")?.split(",");
const verbose = Boolean(args.verbose);

Workspace.run({
  task: {
    from: trimBoolArg("from", "@trok/trok.cli"),
    id: globalThis.crypto.randomUUID(),
    origin: trimBoolArg("origin", origin),
    branch: trimBoolArg("branch", branch),
    selector: trimBoolArg("selector", "HEAD^...HEAD"),
  },
  notify,
  verbose,
});
