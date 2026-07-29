import { HTTP_OK, HTTP_INTERNAL_ERROR, HTTP_FORBIDDEN } from "../src/core/utils/constants";
import fs from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import { RENDERER_DIST } from "./constants.js";

export function startLocalServer(onReady: (port: number) => void): import("http").Server {
    const localServer = createServer((req: import("http").IncomingMessage, res: import("http").ServerResponse) => {
        let pathname = new URL(req.url || "", `http://${req.headers.host}`).pathname;
        if (pathname === "/") pathname = "/index.html";
        let filePath = path.join(RENDERER_DIST, pathname);

        if (!filePath.startsWith(RENDERER_DIST)) {
            res.writeHead(HTTP_FORBIDDEN);
            res.end("Forbidden");
            return;
        }

        if (!fs.existsSync(filePath)) {
            filePath = path.join(RENDERER_DIST, "index.html");
        }

        const ext = path.extname(filePath);
        const mimeTypes: Record<string, string> = {
            ".html": "text/html",
            ".js": "text/javascript",
            ".css": "text/css",
            ".json": "application/json",
            ".png": "image/png",
            ".jpg": "image/jpg",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
        };

        const contentType = mimeTypes[ext] || "application/octet-stream";

        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(HTTP_INTERNAL_ERROR);
                res.end("Internal Server Error");
            } else {
                res.writeHead(HTTP_OK, { "Content-Type": contentType });
                res.end(content, "utf-8");
            }
        });
    });

    localServer.listen(0, "127.0.0.1", () => {
        const addr = localServer.address();
        const serverPort = typeof addr === "string" ? 0 : addr?.port || 0;
        onReady(serverPort);
    });

    return localServer;
}
