import { parseArgs } from "@std/cli/parse-args";
import Builder from "./Builder.ts";

const args = parseArgs(Deno.args);

function trimBoolArg(argName: string, defaultValue?: string) {
  return args[argName] === true ? undefined : args[argName] ?? defaultValue;
}

const [{ origin, branch }] = Builder.workspace;

console.log(args.notify)

const notify = trimBoolArg("notify").split(",");
const verbose = Boolean(args.verbose);

Builder.run(
  {
    id: globalThis.crypto.randomUUID(),
    origin: trimBoolArg("origin", origin),
    branch: trimBoolArg("branch", branch),
    selector: trimBoolArg("selector", "HEAD^...HEAD"),
  },
  notify,
  verbose,
);
