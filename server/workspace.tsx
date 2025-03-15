/** @jsxRuntime automatic */
/** @jsxImportSource preact */


import type { Task } from "../lib/type.ts";
import hub from "./hub.tsx";
import { basename } from "@std/path";
import type { GithubWebhookBody } from "../lib/type.ts";
import Workspace from "../lib/workspace.ts";
import { render } from "preact-render-to-string";
import {
  getScript,
  getShortCompare,
  html,
  json,
  text,
  wipeHttpToken,
} from "../lib/util.ts";

export default {
  async fetch(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url);

    const route = `${req.method} ${pathname}`;

    if (route === "GET /" && req.headers.get("upgrade") !== "websocket") {
      return html(render(await renderUI()));
    }

    const response = await hub.fetch(req);
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
        TaskHub.register({ ...data, from: "trok.workspace.ui" });
        return text("提交成功");
      }

      case "POST /github": {
        const data = await req.json() as GithubWebhookBody;

        TaskHub.register({
          origin: data.repository.html_url,
          branch: basename(data.ref),
          selector: getShortCompare(data.compare),
          from: `trok.workspace.github.${data.sender.login}`,
        });
        return text("提交成功");
      }

      case "GET /repos":
        return json(Workspace.repos.map((item) => ({
          ...item,
          origin: wipeHttpToken(item.origin),
        })));

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
          notify: (data) => hub.broadcast(data),
          verbose: true,
        });
      }
    }
    setTimeout(() => this.dispatch(), 3000);
  }
}

async function renderUI() {
  const script = await getScript("workspace.js");
  
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
