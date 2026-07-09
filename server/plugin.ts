import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { GatewardServer } from "@gateward/sdk/server";
import { GatewardError } from "@gateward/sdk";

export interface GatewardApiOptions {
  baseUrl: string;
  /** Service-account API key — stays server-side, never shipped to the browser. */
  apiKey: string;
  appId?: string;
  issuer: string;
}

/** Vite dev-server plugin exposing the server-to-server half of the SDK under
 *  `/api/*`. The API key lives only here (Node), so the browser never sees it —
 *  the same split a real backend would use. */
export function gatewardApi(opts: GatewardApiOptions): Plugin {
  const server = new GatewardServer({
    baseUrl: opts.baseUrl,
    apiKey: opts.apiKey,
    ...(opts.appId ? { appId: opts.appId } : {}),
    issuer: opts.issuer,
  });

  return {
    name: "gateward-api",
    configureServer(vite) {
      vite.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();
        try {
          const body = await readJson(req);
          if (req.url === "/api/send-event" && req.method === "POST") {
            await server.sendEvent(body);
            return json(res, 202, { ok: true });
          }
          if (req.url === "/api/verify" && req.method === "POST") {
            const claims = await server.verifyToken(body.token, opts.appId);
            return json(res, 200, { claims });
          }
          return next();
        } catch (err) {
          const status = err instanceof GatewardError ? err.status || 500 : 500;
          const detail =
            err instanceof GatewardError ? err.body : String(err);
          return json(res, status, { error: detail });
        }
      });
    },
  };
}

function readJson(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function json(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
}
