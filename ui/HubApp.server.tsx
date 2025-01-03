/** @jsxRuntime automatic */
/** @jsxImportSource preact */

import Message from "./Message.tsx";
import Hub from "../Hub.ts";

async function getScriptContent() {
  const url = new URL("assets/Messages.client.js.txt", import.meta.url);
  if (url.protocol.startsWith("http")) {
    return await fetch(url).then((res) => res.text());
  }
  return Deno.readTextFileSync(url);
}

const scriptContent = await getScriptContent();

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
          dangerouslySetInnerHTML={{ __html: scriptContent }}
        >
        </script>
      </body>
    </html>
  );
}
