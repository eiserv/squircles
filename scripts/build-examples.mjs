import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { compile } from "svelte/compiler";

await build({
  entryPoints: ["examples/react/main.tsx"],
  outfile: "examples/react/main.js",
  bundle: true,
  format: "esm",
  target: "es2022",
  jsx: "automatic",
  logLevel: "info",
});

await build({
  entryPoints: ["examples/svelte/main.js"],
  outfile: "examples/svelte/bundle.js",
  bundle: true,
  format: "esm",
  target: "es2022",
  logLevel: "info",
  plugins: [{
    name: "svelte-examples",
    setup(build) {
      build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
        const source = await readFile(path, "utf8");
        const { js } = compile(source, { filename: path, generate: "client" });
        return { contents: js.code, resolveDir: dirname(path), loader: "js" };
      });
    },
  }],
});
