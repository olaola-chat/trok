import { parseArgs } from "@std/cli/parse-args";
import Builder from "./lib/Builder.ts";
import serve from "./lib/serve.tsx";
import { getRandomString } from "./lib/util.ts";

const args = parseArgs(Deno.args);

const [command] = args._;

if (command === "serve") serve(args.port ?? 8000);
if (command === "build") {
  const [{ origin, branch }] = Builder.workspace;
  await Builder.run({
    id: getRandomString(),
    origin: args.origin ?? origin,
    branch: args.branch ?? branch,
    selector: args.selector ?? "HEAD^...HEAD",
  });
  Deno.exit(0);
}

if (!command || args.help || args.h) {
  // TODO: show help
  Deno.exit(0);
}
