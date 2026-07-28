import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const port = Number(process.env.PORT ?? 5173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

/** Resolves a request path inside the package, or null if it escapes it. */
function resolve(requestPath) {
  const relative = requestPath === "/" ? "examples/playground.html" : requestPath.slice(1);
  const target = new URL(relative, root);

  return target.href.startsWith(root.href) ? target : null;
}

const server = createServer(async (request, response) => {
  const target = resolve(new URL(request.url, "http://localhost").pathname);

  if (!target) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  const path = fileURLToPath(target);

  try {
    const stats = await stat(path);

    if (!stats.isFile()) {
      throw new Error("not a file");
    }
  } catch {
    response.writeHead(404).end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": types[extname(path)] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  createReadStream(path).pipe(response);
});

server.listen(port, () => {
  console.log(`squircles playground: http://localhost:${port}/`);
});
