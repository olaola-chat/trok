/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import Builder from "../Builder.ts";
import Dispatcher from "../Dispatcher.ts";
import Notify from "../Notify.ts";
import Message from "./Message.tsx";
import Workspace from "./Workspace.tsx";

async function getScriptContent() {
  const url = new URL("assets/Messages.client.js", import.meta.url);
  if (url.protocol.startsWith("http")) {
    return await fetch(url).then((res) => res.text());
  }
  return Deno.readTextFileSync(url);
}

const scriptContent = await getScriptContent();

export default function App() {
  return (
    <html>
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@4.12.23/dist/full.min.css"
          rel="stylesheet"
          type="text/css"
        />
        <script src="https://cdn.tailwindcss.com"></script>

        <script
          type="importmap"
          dangerouslySetInnerHTML={{
            __html: `{
              "imports": {
                "preact": "https://esm.sh/preact@10.23.1",
                "preact/": "https://esm.sh/preact@10.23.1/"
              }
            }`,
          }}
        >
        </script>
      </head>
      <body className="flex gap-2">
        <div className="w-2/5 h-screen overflow-y-scroll p-4 bg-base-300">
          <Workspace workspace={Builder.workspace} tasks={Dispatcher.queue} />
        </div>
        <div className="w-3/5 p-5 h-screen overflow-y-scroll">
          {Notify.messages.map((item) => <Message message={item} />)}
          <div id="messages" />
        </div>
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: scriptContent,
          }}
        >
        </script>
      </body>
    </html>
  );
}
