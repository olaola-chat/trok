/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { render } from "preact-render-to-string";
import Index from "./ui/index.server.tsx";
import Hub from "./ui/hub.server.tsx";
import Dispatcher from "./Dispatcher.ts";
import { getRandomString } from "./util.ts";
import Notify from "./Notify.ts";
import type { Task, TaskState } from "./type.ts";
import HubHandler from "./HubHandler.ts";
import Builder from "./Builder.ts";

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
        Notify.mitt.on(
          "message",
          (message) =>
            socket.send(JSON.stringify({ type: "notify", data: message })),
        );
        Builder.mitt.on(
          "data",
          (message) =>
            socket.send(JSON.stringify({ type: "builder", data: message })),
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

    case "GET /messages":
      return new Response(JSON.stringify(Notify.messages), {
        headers: { "content-type": "application/json; charset=UTF-8" },
      });

    case "GET /hub": {
      if (req.headers.get("upgrade") !== "websocket") {
        return new Response(render(<Hub />), {
          headers: { "content-type": "text/html; charset=UTF-8" },
        });
      }

      const { socket, response } = Deno.upgradeWebSocket(req);
      socket.addEventListener("open", () => {
        console.log("a client connected!");
        HubHandler.mitt.on("message", (message) => {
          socket.send(JSON.stringify(message));
        });
      });
      socket.addEventListener("message", (event) => {
        if (event.data === "ping") socket.send("pong");
      });
      return response;
    }

    case "POST /hub": {
      const data = await req.json() as TaskState;
      HubHandler.register(data);
      return new Response(null, { status: 200 });
    }

    default:
      return new Response("Not Found", { status: 404 });
  }
}
