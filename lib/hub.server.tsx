/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { render } from "preact-render-to-string";
import Document from "../ui/Document.tsx";
import type { Snapshot, SocketData } from "./type.ts";
import { wipeHttpToken } from "./util.ts";

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

          SocketHub.registry(socket, ua);

          return response;
        }
        return html(render(<Document root={await route("hub")} />));
      }

      case "POST /": {
        this.broadcast(await req.json() as SocketData);
        return text("ok");
      }

      case "GET /snapshot": {
        return json(SnapshotHub.snapshots.map((item) => ({
          ...item,
          task: {
            ...item.task,
            origin: wipeHttpToken(item.task.origin),
          },
        })));
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
    let timer = 0;
    socket.addEventListener("open", () => this.clients.push({ socket, ua }));
    socket.addEventListener("close", () => {
      const index = this.clients.findIndex((item) => item.socket === socket);
      this.clients.splice(index, 1);
    });
    socket.addEventListener(
      "message",
      (e) => {
        if (e.data !== "PING") {
          return this.broadcast(JSON.parse(e.data) as SocketData);
        }
        clearTimeout(timer);
        socket.send("PONG");
        // 发送PONG后30秒未收到下一次PING视为心跳检测异常，断开链接
        timer = setTimeout(
          () => socket.close(4000, "heartbeat timeout"),
          30 * 1000,
        );
      },
    );
  }
}
