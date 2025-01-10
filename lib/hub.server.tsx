/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { render } from "preact-render-to-string";
import Document from "../ui/index.server.tsx";
import type { Snapshot, SocketData } from "./type.ts";

function html(data: string, status = 200) {
  return new Response(data, {
    headers: { "content-type": "text/html; charset=UTF-8" },
    status,
  });
}

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json; charset=UTF-8" },
    status,
  });
}

function text(data: string, status = 200) {
  return new Response(data, {
    headers: { "content-type": "text/plain; charset=UTF-8" },
    status,
  });
}

async function route(path: string) {
  const url = new URL(`../ui/dist/${path}.js.txt`, import.meta.url);
  if (url.protocol.startsWith("http")) {
    return await fetch(url).then((res) => res.text());
  }
  return Deno.readTextFileSync(url);
}

export default {
  broadcast: (data: SocketData) => SocketHub.broadcast(data),
  async fetch(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url);

    switch (`${req.method} ${pathname}`) {
      case "GET /": {
        if (req.headers.get("upgrade") === "websocket") {
          const ua = req.headers.get("User-Agent")!;
          const { socket, response } = Deno.upgradeWebSocket(req);
          socket.addEventListener(
            "open",
            () => SocketHub.registry(socket, ua),
          );
          return response;
        }
        return html(render(<Document root={await route("main")} />));
      }

      case "POST /": {
        const snapshot = await req.json() as Snapshot;
        SnapshotHub.registry(snapshot);
        return text("ok");
      }

      case "GET /snapshot": {
        return json(SnapshotHub.snapshots);
      }

      default:
        return text("Not Found", 404);
    }
  },
};

abstract class SnapshotHub {
  static snapshots: Snapshot[] = [];

  static registry(snapshot: Snapshot) {
    this.snapshots.push(snapshot);
    // 只保存最近的100个任务
    this.clean();
  }

  static clean() {
    const tasklist = Object.values(
      Object.groupBy(this.snapshots, (item) => item.task.id),
    );

    if (tasklist.length > 100) {
      tasklist.shift();
      this.snapshots = tasklist.flat().map((item) => item!);
    }
  }
}

abstract class SocketHub {
  static clients: { ua: string; socket: WebSocket }[] = [];

  static broadcast(data: SocketData) {
    if (data.type === "snapshot") SnapshotHub.registry(data.data);
    this.clients.filter((item) => !item.ua.startsWith("Deno")).forEach(
      (item) => item.socket.send(JSON.stringify(data)),
    );
  }

  static registry(socket: WebSocket, ua: string) {
    const client = { socket, ua };
    this.clients.push(client);
    client.socket.addEventListener("close", () => {
      const index = this.clients.findIndex((item) =>
        item.socket === client.socket
      );
      this.clients.splice(index, 1);
    });

    client.socket.addEventListener(
      "message",
      (e) => {
        if (e.data === "PING") client.socket.send("PONG");
        else this.broadcast(JSON.parse(e.data) as SocketData);
      },
    );
  }
}
