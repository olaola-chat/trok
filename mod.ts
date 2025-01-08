import { parseArgs } from "@std/cli/parse-args";
import Builder from "./lib/Builder.ts";
import Server from "./lib/Server.tsx";
import Notify from "./lib/Notify.ts";
export { Builder, Server };

const args = parseArgs(Deno.args);

function trimBoolArg(argName: string, defaultValue?: string) {
  return args[argName] === true ? undefined : args[argName] ?? defaultValue;
}

Notify.verbose = args.verbose;
Notify.notify = trimBoolArg("notify");

const [command] = args._;
if (!command || args.help || args.h) {
  // TODO: show help
}

if (command === "serve") {
  const port = Number(args.port ?? 8000);
  Server.serve({ port });
}

if (command === "build") {
  const [{ origin, branch }] = Builder.workspace;

  Builder.run({
    id: globalThis.crypto.randomUUID(),
    origin: trimBoolArg("origin", origin),
    branch: trimBoolArg("branch", branch),
    selector: trimBoolArg("selector", "HEAD^...HEAD"),
  });
}
