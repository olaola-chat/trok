/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { render } from "preact-render-to-string";
import Index from "./ui/index.server.tsx";
import Dispatcher from "./Dispatcher.ts";
import { getRandomString } from "./util.ts";
import type { SocketData, Task } from "./type.ts";
import Builder from "./Builder.ts";
import Hub from "./Hub.ts";
import Configiration from "./Configration.ts";

function html(data: string) {
  return new Response(data, {
    headers: { "content-type": "text/html; charset=UTF-8" },
  });
}

function json(data: object) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json; charset=UTF-8" },
  });
}

async function server(req: Request) {
  const { pathname } = new URL(req.url);

  switch (`${req.method} ${pathname}`) {
    case "GET /": {
      if (req.headers.get("upgrade") !== "websocket") {
        return html(render(<Index />));
      }

      // 接收websocket推送过来的数据
      const { socket, response } = Deno.upgradeWebSocket(req);

      socket.addEventListener(
        "message",
        (e) => {
          const data = JSON.parse(e.data) as SocketData;
          if (data.type === "snapshot") {
            Hub.registry(data.data);
            Hub.mitt.emit("snapshot", data.data);
          }
          if (data.type === "stream") {
            Hub.mitt.emit("stream", data.data);
          }
        },
      );
      return response;
    }

    case "GET /task":
      return new Response(JSON.stringify(Dispatcher.queue), {
        headers: { "content-type": "application/json; charset=UTF-8" },
      });

    case "POST /task": {
      const data = await req.json() as Omit<Task, "id">;
      Dispatcher.register({ ...data, id: getRandomString() });
      return new Response();
    }

    case "GET /workspace":
      return json(Builder.workspace);

    case "GET /hub": {
      if (req.headers.get("upgrade") !== "websocket") {
        return json(Hub.snapshots);
      }

      // 推送消息
      const { socket, response } = Deno.upgradeWebSocket(req);
      socket.addEventListener("open", () => {
        Hub.mitt.on("snapshot", (data) => {
          socket.send(JSON.stringify({ type: "snapshot", data }));
        });
        Hub.mitt.on("stream", (data) => {
          socket.send(JSON.stringify({ type: "stream", data }));
        });
      });

      return response;
    }

    default:
      return new Response("Not Found", { status: 404 });
  }
}

export default function serve(port?: number) {
  const { addr } = Deno.serve({ port, hostname: "127.0.0.1" }, server);
  if (!Configiration.notify) {
    Configiration.notify = `ws://${addr.hostname}:${addr.port}`;
  }
}
