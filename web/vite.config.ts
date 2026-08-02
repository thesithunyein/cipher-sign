import { defineConfig, type Plugin } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

/** Local /api/instruct — operator pays gas (reads tee/.env PRIVATE_KEY). */
function sponsorApiPlugin(): Plugin {
  return {
    name: "ciphersign-sponsor-api",
    configureServer(server) {
      const root = resolve(__dirname, "..");
      loadEnvFile(resolve(root, "tee/.env"));
      loadEnvFile(resolve(root, "tee/config/extension.env"));
      if (process.env.PRIVATE_KEY && !process.env.SPONSOR_PRIVATE_KEY) {
        process.env.SPONSOR_PRIVATE_KEY = process.env.PRIVATE_KEY;
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/instruct")) return next();
        try {
          const mod = await import("../api/instruct.js");
          await mod.default(req, res);
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: e instanceof Error ? e.message : String(e),
            })
          );
        }
      });
    },
  };
}

// Browser → same-origin /fcc/* → local TEE proxy :6674 (avoids CORS NetworkError)
export default defineConfig({
  plugins: [sponsorApiPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/fcc": {
        target: "http://127.0.0.1:6674",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fcc/, ""),
      },
    },
  },
});
