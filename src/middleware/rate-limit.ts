import type { Context, Next } from "hono";
import type { Env, AgentIdentity, ContextVariables } from "../types";

const LIMITS: Record<AgentIdentity["rateLimitTier"], { rpm: number }> = {
  standard: { rpm: 60 },
  premium: { rpm: 600 },
};

export async function rateLimitMiddleware(
  c: Context<{ Bindings: Env; Variables: ContextVariables }>,
  next: Next
) {
  const agent = c.get("agent");
  const windowKey = `rl:${agent.agentId}:${Math.floor(Date.now() / 60_000)}`;

  const current = parseInt((await c.env.RATE_LIMITS.get(windowKey)) ?? "0");
  const limit = LIMITS[agent.rateLimitTier].rpm;

  if (current >= limit) {
    return c.json(
      { error: "Rate limit exceeded" },
      429,
      {
        "Retry-After": "60",
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
      }
    );
  }

  // TTL of 120s so the key expires shortly after the window ends
  await c.env.RATE_LIMITS.put(windowKey, String(current + 1), { expirationTtl: 120 });

  c.res.headers.set("X-RateLimit-Limit", String(limit));
  c.res.headers.set("X-RateLimit-Remaining", String(limit - current - 1));

  await next();
}
