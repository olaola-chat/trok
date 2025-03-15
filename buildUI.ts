import { resolve } from "@std/path";
import * as esbuild from "https://deno.land/x/esbuild@v0.25.0/mod.js";

const entries = ['./ui/workspace.tsx', './ui/hub.tsx']
const outdir = resolve(import.meta.dirname!, "./ui/dist")

await esbuild.build({
  entryPoints: entries.map(item=> resolve(import.meta.dirname!, item)),
  outdir,
  bundle: true,
  format: "esm",
});

await esbuild.stop();

