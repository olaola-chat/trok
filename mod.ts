import { parseArgs } from "@std/cli/parse-args";
import Builder from "./lib/Builder.ts";
import Server from "./lib/Server.tsx";
import { getRandomString } from "./lib/util.ts";
export { Builder, Server };

const args = parseArgs(Deno.args);

const [command] = args._;

if (command === "serve") Server.serve(args.port ?? 8000);
if (command === "build") {
  const [{ origin, branch }] = Builder.workspace;
  Builder.run({
    id: getRandomString(),
    origin: args.origin ?? origin,
    branch: args.branch ?? branch,
    selector: args.selector ?? "HEAD^...HEAD",
    notify: args.notify,
  });
}

if (!command || args.help || args.h) {
  // TODO: show help
  Deno.exit(0);
}
