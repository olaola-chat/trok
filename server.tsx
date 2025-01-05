/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { render } from "preact-render-to-string";
import Index from "./ui/index.server.tsx";
import Dispatcher from "./Dispatcher.ts";
import { getRandomString } from "./util.ts";
import type { Task } from "./type.ts";
import Builder from "./Builder.ts";
import TaskSnapshot from "./TaskSnapshot.ts";

export default async function server(req: Request) {
  const { pathname } = new URL(req.url);

  switch (`${req.method} ${pathname}`) {
    case "GET /": {
      if (req.headers.get("upgrade") !== "websocket") {
        return new Response(render(<Index />), {
          headers: { "content-type": "text/html; charset=UTF-8" },
        });
      }

      const { socket, response } = Deno.upgradeWebSocket(req);
      socket.addEventListener("open", () => {
        console.log("a client connected!");
        TaskSnapshot.mitt.on(
          "snapshot",
          (message) =>
            socket.send(JSON.stringify({ type: "snapshot", data: message })),
        );
        Builder.mitt.on(
          "stream",
          (message) =>
            socket.send(JSON.stringify({ type: "stream", data: message })),
        );
      });
      socket.addEventListener("message", (event) => {
        if (event.data === "ping") socket.send("pong");
      });
      return response;
    }

    case "POST /": {
      const data = await req.json() as Omit<Task, "id">;
      Dispatcher.register({ ...data, id: getRandomString() });
      return new Response(null, { status: 302, headers: { location: "/" } });
    }

    case "GET /workspace":
      return new Response(JSON.stringify(Builder.workspace));

    case "GET /task":
      return new Response(JSON.stringify(Dispatcher.queue), {
        headers: { "content-type": "application/json; charset=UTF-8" },
      });

    case "GET /snapshots":
      return new Response(JSON.stringify(TaskSnapshot.snapshots), {
        headers: { "content-type": "application/json; charset=UTF-8" },
      });

    default:
      return new Response("Not Found", { status: 404 });
  }
}
