import { build } from "esbuild";

await build({
  entryPoints: ["examples/react/main.tsx"],
  outfile: "examples/react/main.js",
  bundle: true,
  format: "esm",
  target: "es2022",
  jsx: "automatic",
  logLevel: "info",
});
