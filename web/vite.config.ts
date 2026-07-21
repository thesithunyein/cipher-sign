import { defineConfig } from "vite";

// Browser → same-origin /fcc/* → local TEE proxy :6674 (avoids CORS NetworkError)
export default defineConfig({
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
