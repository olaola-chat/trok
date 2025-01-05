import { resolve } from "@std/path/resolve";
import { isFileExistSync } from "./util.ts";
import type { Config } from "./type.ts";
import Builder from "./Builder.ts";
import { port } from "./mod.ts";

const configPath = resolve(Deno.cwd() as string, "tork.config.json");

const config: Config = isFileExistSync(configPath)
  ? JSON.parse(Deno.readTextFileSync(configPath))
  : {};

// TODO: 将notify提取到Builder中去
export default async function notify() {
  const notify = config.notify ?? `ws://127.0.0.1:${port}`;

  if (notify.startsWith("ws")) {
    const client = new WebSocket(notify.replace("http", "ws"));

    await new Promise<void>((resolve, reject) => {
      client.addEventListener("open", () => {
        Builder.mitt.on("stream", (data) => {
          client.send(JSON.stringify({ type: "stream", data }));
        });
        Builder.mitt.on("snapshot", (data) => {
          client.send(JSON.stringify({ type: "snapshot", data }));
        });
        resolve();
      });

      client.addEventListener("close", (e) => {
        reject();
      });
    });
  }

  if (notify.startsWith("http")) {
    Builder.mitt.on("snapshot", (data) => {
      fetch(notify, {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "applicatin/json" },
      });
    });
  }
}
