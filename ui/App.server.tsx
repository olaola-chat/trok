/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { dirname } from "@sicasta/esm-file-info";

const __dirname = dirname(import.meta);

import { resolve } from "@std/path/resolve";
import Builder from "../Builder.ts";
import Dispatcher from "../Dispatcher.ts";
import Notify from "../Notify.ts";
import Message from "./Message.tsx";
import Workspace from "./Workspace.tsx";

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
            __html: Deno.readTextFileSync(
              resolve(__dirname, "assets", "Messages.client.js"),
            ),
          }}
        >
        </script>
      </body>
    </html>
  );
}
