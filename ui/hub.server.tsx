/** @jsxRuntime automatic */
/** @jsxImportSource preact */

async function getScriptContent() {
  const url = new URL("dist/hub.js.txt", import.meta.url);
  if (url.protocol.startsWith("http")) {
    return await fetch(url).then((res) => res.text());
  }
  return Deno.readTextFileSync(url);
}

const scriptContent = await getScriptContent();

export default function Hub() {
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
