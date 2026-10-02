import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";

function serverStoragePlugin(): Plugin {
  const configFile = path.resolve(__dirname, "server_storage.json");
  return {
    name: "server-storage-plugin",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const cleanUrl = req.url ? req.url.split("?")[0] : "";
        if (cleanUrl === "/api/config" || cleanUrl === "/api.php") {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");

          if (req.method === "OPTIONS") {
            res.writeHead(200);
            res.end();
            return;
          }

          if (req.method === "GET") {
            if (fs.existsSync(configFile)) {
              try {
                const data = fs.readFileSync(configFile, "utf-8");
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(data);
                return;
              } catch (e) {
                // fall through
              }
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({}));
            return;
          } else if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => {
              body += chunk;
            });
            req.on("end", () => {
              try {
                fs.writeFileSync(configFile, body, "utf-8");
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true }));
              } catch (e) {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            });
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    serverStoragePlugin(),
  ],
  base: "./",
  server: {
    port: 5173,
    host: true,
  },
});
