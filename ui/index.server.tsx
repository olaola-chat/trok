/** @jsxRuntime automatic */
/** @jsxImportSource preact */

async function getScriptContent() {
  const url = new URL("dist/index.js.txt", import.meta.url);
  if (url.protocol.startsWith("http")) {
    return await fetch(url).then((res) => res.text());
  }
  return Deno.readTextFileSync(url);
}

const scriptContent = await getScriptContent();

const importMap = {
  "imports": {
    "preact": "https://esm.sh/preact@10.23.1",
    "preact/": "https://esm.sh/preact@10.23.1/",
    "mitt": "https://esm.sh/mitt@3.0.1",
  },
};

export default function Index() {
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(importMap) }}
        >
        </script>
      </head>
      <body className="flex gap-2">
        <div id="root" />
        <script
          type="module"
          dangerouslySetInnerHTML={{ __html: scriptContent }}
        >
        </script>
      </body>
    </html>
  );
}
