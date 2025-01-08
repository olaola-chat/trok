import { parseArgs } from "@std/cli/parse-args";
import Builder from "./Builder.ts";
import Server from "./Server.tsx";

const args = parseArgs(Deno.args);

function trimBoolArg(argName: string, defaultValue?: string) {
  return args[argName] === true ? undefined : args[argName] ?? defaultValue;
}

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

  const notify = trimBoolArg("notify");
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
}
