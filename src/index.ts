import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { Env, ContextVariables } from "./types";
import { wafMiddleware } from "./middleware/waf";
import { x402Middleware } from "./middleware/x402";
import { proxyToBackend } from "./proxy";
import { writeAuditLog } from "./audit";

const app = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

app.use("*", secureHeaders());
app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }));

// Health — unauthenticated, no payment
app.get("/health", (c) => c.json({ status: "ok" }));

// WAF runs first on all requests — blocks oversized payloads and prompt injection
app.use("*", wafMiddleware);

// x402 — POST/PUT/DELETE require payment proof; GET is free
app.use("*", x402Middleware);

// Proxy verified requests to the backend
app.all("*", async (c) => {
  const response = await proxyToBackend(c);

  c.executionCtx.waitUntil(
    writeAuditLog(
      {
        ts: new Date().toISOString(),
        agentId: c.get("agentId"),
        method: c.req.method,
        path: new URL(c.req.url).pathname,
        status: response.status,
        paymentRail: c.req.method === "GET" ? undefined : "x402",
      },
      c.env
    )
  );

  return response;
});

export default app;
