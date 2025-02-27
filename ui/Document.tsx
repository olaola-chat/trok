/** @jsxRuntime automatic */
/** @jsxImportSource preact */

export default function Document(props: { root: string }) {
  return (
    <html>
      <head>
        <link href="https://cdn.jsdelivr.net/npm/daisyui@5.0.0-beta.9/daisyui.css" rel="stylesheet" type="text/css" />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
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
