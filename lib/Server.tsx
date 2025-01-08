/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { basename } from "@std/path";
import { render } from "preact-render-to-string";
import Index from "../ui/index.server.tsx";
import type { GithubWebhookBody, Task } from "./type.ts";
import Builder from "./Builder.ts";
import { SnapshotHub, SocketHub, TaskHub } from "./Hub.ts";

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

export default abstract class Server {
  static id?: string;

  static async handler(req: Request): Promise<Response> {
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
          from: Server.id,
        });
        return text("提交成功");
      }

      case "GET /snapshot": {
        return json(SnapshotHub.snapshots);
      }

      case "GET /workspace":
        return json(Builder.workspace);

      case "POST /github": {
        const data = await req.json() as GithubWebhookBody;
        TaskHub.register({
          origin: data.repository.html_url,
          branch: basename(data.ref),
          selector: basename(data.compare),
          from: Server.id,
        });
        return text("提交成功");
      }

      default:
        return text("Not Found", 404);
    }
  }

  static serve(
    options: {
      hostname?: string;
      port?: number;
      handler?: (req: Request) => Promise<Response>;
    },
  ) {
    const { hostname = "127.0.0.1", port = 8000, handler } = options;

    Deno.serve({ port, hostname }, async (req) => {
      if (!handler) return this.handler(req);
      const response = await handler(req);
      if (response.status !== 404) return response;
      return this.handler(req);
    });

    this.id = globalThis.crypto.randomUUID();
  }
}
