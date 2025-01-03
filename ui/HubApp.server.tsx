/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import { resolve } from "@std/path/resolve";
import Message from "./Message.tsx";
import Hub from "../Hub.ts";

export default function HubApp() {
  return (
    <html>
      <head>
        <link
          href="https://cdn.jsdelivr.net/npm/daisyui@4.12.23/dist/full.min.css"
          rel="stylesheet"
          type="text/css"
        />
        <script src="https://cdn.tailwindcss.com">Hub</script>
      </head>
      <body className="flex gap-2">
        <div className="w-3/5 p-5 h-screen overflow-y-scroll">
          {Hub.messages.map((item) => <Message message={item} />)}
          <div id="messages" />
        </div>
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: Deno.readTextFileSync(
              resolve(import.meta.dirname!, "assets", "Messages.client.js"),
            ),
          }}
        >
        </script>
      </body>
    </html>
  );
}
