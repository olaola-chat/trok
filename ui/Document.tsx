/** @jsxRuntime automatic */
/** @jsxImportSource preact */

export default function Document(props: { root: string }) {
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
            __html: JSON.stringify({
              "imports": {
                "preact": "https://esm.sh/preact@10.23.1",
                "preact/": "https://esm.sh/preact@10.23.1/",
              },
            }),
          }}
        >
        </script>
      </head>
      <body className="flex gap-2">
        <div id="root" />
        <script
          type="module"
          dangerouslySetInnerHTML={{
            __html: props.root,
          }}
        >
        </script>
      </body>
    </html>
  );
}
