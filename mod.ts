import { parseArgs } from "@std/cli/parse-args";
import Builder from "./Builder.ts";
import server from "./server.tsx";
import { getRandomString, sleep } from "./util.ts";
import notify from "./notify.ts";

const args = parseArgs(Deno.args);

const [command] = args._;

export const port = args.port ?? 8000;

if (command === "serve") Deno.serve({ port }, server);
await notify();
if (command === "build") {
  const [repository] = Builder.workspace;
  Builder.run({
    id: getRandomString(),
    origin: args.origin ?? repository.origin,
    branch: args.branch ?? repository.branch,
    selector: args.selector ?? "HEAD^...HEAD",
  }).then(() => {
    sleep(1000).then(() => {
      Deno.exit(0);
    });
  });
}

if (!command || args.help || args.h) {
  // TODO: show help
  Deno.exit(0);
}
