import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { Env, ContextVariables } from "./types";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { wafMiddleware } from "./middleware/waf";
import { paymentMiddleware } from "./payment";
import { proxyToBackend } from "./proxy";
import { writeAuditLog } from "./audit";

const app = new Hono<{ Bindings: Env; Variables: ContextVariables }>();

app.use("*", secureHeaders());
app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }));

// Health — unauthenticated
app.get("/health", (c) => c.json({ status: "ok" }));

// All other routes: auth → WAF → rate limit → payment → proxy
app.use("*", authMiddleware);
app.use("*", wafMiddleware);
app.use("*", rateLimitMiddleware);
app.use("*", paymentMiddleware);

app.all("*", async (c) => {
  const response = await proxyToBackend(c);

  c.executionCtx.waitUntil(
    writeAuditLog(
      {
        ts: new Date().toISOString(),
        agentId: c.get("agent").agentId,
        method: c.req.method,
        path: new URL(c.req.url).pathname,
        status: response.status,
        paymentRail: c.get("agent").paymentRail,
      },
      c.env
    )
  );

  return response;
});

export default app;
