/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { render } from "preact-render-to-string";
import { basename, resolve } from "@std/path";
import hub from "./hub.tsx";
import { getShortCompare, html, isSameGitOrigin, json } from "../lib/util.ts";
import type { GithubWebhookBody } from "../lib/type.ts";

type AliFlow = {
  origin: string;
  branch: string;
  host: string[];
  webhook: string;
  notify: string;
};

type AliFlowTask = {
  origin: string;
  branch: string;
  selector: string;
  from: string;
};

type AliFlowWebhookBody = {
  errorCode: string;
  errorMsg: string;
  successful: false;
} | {
  object: true;
  successful: true;
};

let aliflows: AliFlow[] = [];

if (Deno.env.has("ALIFLOWS_URL")) {
  aliflows = await fetch(Deno.env.get("ALIFLOWS_URL")!).then((res) =>
    res.json()
  ) as AliFlow[];
} else {
  try {
    const data = Deno.readFileSync(resolve(Deno.cwd(), "aliflow.json"));
    const text = new TextDecoder().decode(data);
    aliflows = JSON.parse(text);
  } catch (err) {
    console.error(`未找到流水线配置文件`, (err as Error).message);
    throw err;
  }
}

async function dispatch(task: AliFlowTask) {
  const aliflow = aliflows.find((item) => {
    return isSameGitOrigin(item.origin, task.origin) &&
      item.branch === task.branch;
  });
  if (!aliflow) return new Response("未找到此仓库或分支的流水线", { status: 404 });

  const res = await fetch(aliflow.webhook, {
    method: "POST",
    body: JSON.stringify({
      selector: task.selector,
      notify: aliflow.notify,
      from: task.from,
    }),
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json() as AliFlowWebhookBody;
  console.log(
    `aliflow webhook response body: ${JSON.stringify(data, null, 2)}`,
  );
  if (data.successful) {
    return html(render(<Success />));
  }
  return json(data);
}

export default {
  async fetch(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url);

    switch (`${req.method} ${pathname}`) {
      case "GET /aliflow/": {
        return html(render(<AliFlow />));
      }

      case "POST /dispatch": {
        const text = await req.text();
        const search = new URLSearchParams(text);
        return await dispatch({
          origin: search.get("origin")!,
          branch: search.get("branch")!,
          selector: search.get("selector")!,
          from: "trok.aliflow.ui",
        });
      }

      case "POST /github": {
        const data = await req.json() as GithubWebhookBody;
        const origin = data.repository.html_url;
        const branch = basename(data.ref);
        const selector = getShortCompare(data.compare);
        return await dispatch({
          origin,
          branch,
          selector,
          from: `trok.aliflow.github.${data.sender.login}`,
        });
      }

      default:
        return await hub.fetch(req);
    }
  },
};

function AliFlow() {
  return (
    <html>
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0-beta.9/daisyui.css"
          rel="stylesheet"
          type="text/css"
        />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4">
        </script>
      </head>
      <body>
        <div className="w-screen bg-base-300 flex">
          <div className="flex flex-col gap-2 w-96 h-screen overflow-y-scroll p-5">
            {aliflows.map((item) => {
              return (
                <form
                  method="post"
                  action="../dispatch"
                  key={`${item.origin}/${item.branch}`}
                  className="shadow bg-base-100 rounded-2xl p-5 flex flex-col gap-2 border-primary"
                >
                  <div>
                    {item.origin}
                    <span className="badge badge-outline ml-2 badge-sm">
                      {item.branch}
                    </span>
                  </div>
                  <input type="hidden" name="origin" value={item.origin} />
                  <input type="hidden" name="branch" value={item.branch} />
                  <input
                    required
                    type="text"
                    name="selector"
                    className="input input-bordered input-sm"
                    placeholder="eg: ./act/act-center"
                  />
                  <button type="submit" class="btn btn-primary btn-sm">
                    提交打包任务
                  </button>
                </form>
              );
            })}
          </div>
          <iframe
            id="trok"
            src=".."
            className="w-2/3 h-screen overflow-y-scroll grow bg-base-100 p-5"
          >
          </iframe>
        </div>
      </body>
    </html>
  );
}

function Success() {
  return (
    <html>
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0-beta.9/daisyui.css"
          rel="stylesheet"
          type="text/css"
        />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4">
        </script>
      </head>
      <body>
        <div className="w-screen">
          <p>任务提交成功</p>
          <a className="btn btn-primary" href="./aliflow/">
            回到首页
          </a>
        </div>
      </body>
    </html>
  );
}
