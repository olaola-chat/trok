/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { render } from "preact-render-to-string";
import Index from "../ui/index.server.tsx";
import { getRandomString } from "./util.ts";
import type { Task } from "./type.ts";
import Builder from "./Builder.ts";

import { SnapshotHub, SocketHub, TaskHub } from "./Hub.ts";

export default abstract class Server {
  static host?: string;
  static serve(port?: number) {
    const { addr } = Deno.serve({ port, hostname: "127.0.0.1" }, handler);
    this.host = `${addr.hostname}:${addr.port}`;
  }
}

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

async function handler(req: Request) {
  const { pathname } = new URL(req.url);

  switch (`${req.method} ${pathname}`) {
    case "GET /": {
      if (req.headers.get("upgrade") === "websocket") {
        const ua = req.headers.get("User-Agent")!;
        const { socket, response } = Deno.upgradeWebSocket(req);
        socket.addEventListener(
          "open",
          () => SocketHub.registry({ ua, socket }),
        );
        return response;
      }
      return html(render(<Index />));
    }

    case "GET /task":
      return json(TaskHub.tasks);

    case "POST /task": {
      const data = await req.json() as Omit<Task, "id">;
      TaskHub.register({
        ...data,
        id: getRandomString(),
        notify: `ws://${Server.host}`,
      });
      return new Response();
    }

    case "GET /snapshot": {
      return json(SnapshotHub.snapshots);
    }

    case "GET /workspace":
      return json(Builder.workspace);

    default:
      return new Response("Not Found", { status: 404 });
  }
}
