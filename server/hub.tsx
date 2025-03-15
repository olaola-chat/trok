/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { render } from "preact-render-to-string";
import type { Snapshot, SocketData } from "../lib/type.ts";
import { getScript, html, json, text, wipeHttpToken } from "../lib/util.ts";

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
        return html(render(await renderUI()));
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

async function renderUI() {
  const script = await getScript("hub.js");

  return (
    <html>
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0-beta.9/daisyui.css"
          rel="stylesheet"
          type="text/css"
        />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4" />
      </head>
      <body className="flex gap-2">
        <div id="root" />
        <script type="module" dangerouslySetInnerHTML={{ __html: script }} />
      </body>
    </html>
  );
}
