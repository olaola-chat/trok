/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import type { Task } from "./type.ts";
import Hub from "./hub.server.tsx";
import { basename } from "@std/path";
import type { GithubWebhookBody } from "./type.ts";
import Workspace from "./Workspace.ts";
import { render } from "preact-render-to-string";
import Document from "../ui/Document.tsx";

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

async function router(path: string) {
  const url = new URL(`../ui/dist/${path}.js.txt`, import.meta.url);
  if (url.protocol.startsWith("http")) {
    return await fetch(url).then((res) => res.text());
  }
  return Deno.readTextFileSync(url);
}

export default {
  async fetch(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url);

    const route = `${req.method} ${pathname}`;

    if (route === "GET /" && req.headers.get("upgrade") !== "websocket") {
      return html(render(<Document root={await router("workspace")} />));
    }

    const response = await Hub.fetch(req);
    if (response.status !== 404) return response;

    switch (route) {
      case "GET /task":
        return json(TaskHub.list);

      case "POST /task": {
        const data = await req.json() as {
          origin: string;
          branch: string;
          selector: string;
        };
        TaskHub.register({ ...data, from: "server" });
        return text("提交成功");
      }

      case "POST /github": {
        const data = await req.json() as GithubWebhookBody;
        TaskHub.register({
          origin: data.repository.html_url,
          branch: basename(data.ref),
          selector: basename(data.compare),
          from: "github",
        });
        return text("提交成功");
      }

      case "GET /repos":
        return json(Workspace.repos);

      default:
        return text("Not Found", 404);
    }
  },
};

class TaskHub {
  static list: Task[] = [];

  static register(taskOptions: Omit<Task, "id">) {
    const task = { ...taskOptions, id: globalThis.crypto.randomUUID() };
    this.list.push(task);
    this.dispatch();
  }

  static async dispatch() {
    if (!Workspace.currentTask) {
      const item = this.list.shift();
      if (item) {
        await Workspace.run({
          task: item,
          notify: (data) => Hub.broadcast(data),
          verbose: true,
        });
      }
    }
    setTimeout(() => this.dispatch(), 3000);
  }
}
