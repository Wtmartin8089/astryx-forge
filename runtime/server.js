import { createReadStream, statSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import adminHandler from "../api/admin/[...path].js";

const DIST = resolve("dist");
const MAX_BODY_BYTES = 1_048_576;
const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Request body too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!size) return resolveBody(undefined);
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Invalid JSON"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function queryObject(searchParams) {
  const query = {};
  for (const [key, value] of searchParams) {
    query[key] = key in query ? [...(Array.isArray(query[key]) ? query[key] : [query[key]]), value] : value;
  }
  return query;
}

async function routeAdmin(req, res, url) {
  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    res.writeHead(error.status || 400, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ success: false, error: { code: "bad_request", message: error.message } }));
    return;
  }

  const path = url.pathname.slice("/api/admin".length).split("/").filter(Boolean).map(decodeURIComponent);
  const handlerReq = {
    method: req.method,
    url: req.url,
    body,
    query: { ...queryObject(url.searchParams), path },
    headers: { ...req.headers, "x-forwarded-proto": req.socket.encrypted ? "https" : "http" },
  };
  const headers = new Map();
  const handlerRes = {
    statusCode: 200,
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    getHeader(name) { return headers.get(name.toLowerCase()); },
    end(payload = "") {
      for (const [name, value] of headers) res.setHeader(name, value);
      res.statusCode = this.statusCode;
      res.end(payload);
    },
  };

  await adminHandler(handlerReq, handlerRes);
}

function serveStatic(req, res, url) {
  let candidate = resolve(DIST, `.${decodeURIComponent(url.pathname)}`);
  if (candidate !== DIST && !candidate.startsWith(`${DIST}${sep}`)) {
    res.writeHead(400).end();
    return;
  }
  try {
    if (statSync(candidate).isDirectory()) candidate = resolve(candidate, "index.html");
    statSync(candidate);
  } catch {
    candidate = resolve(DIST, "index.html");
  }
  res.setHeader("Content-Type", TYPES[extname(candidate)] || "application/octet-stream");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "HEAD") return res.end();
  createReadStream(candidate).on("error", () => res.writeHead(404).end()).pipe(res);
}

export function createIntegrationServer() {
  return createHttpServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end('{"status":"ok"}');
      return;
    }
    if (url.pathname === "/api/admin" || url.pathname.startsWith("/api/admin/")) {
      await routeAdmin(req, res, url);
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      res.writeHead(404, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end('{"success":false,"error":{"code":"not_found","message":"Route not found."}}');
      return;
    }
    if (req.method === "GET" || req.method === "HEAD") serveStatic(req, res, url);
    else res.writeHead(405, { Allow: "GET, HEAD" }).end();
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const host = process.env.HOST || "0.0.0.0";
  const port = Number(process.env.PORT || 3000);
  createIntegrationServer().listen(port, host);
}
