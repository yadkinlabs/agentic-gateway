import type { Context, Next } from "hono";
import type { Env, AgentIdentity, ContextVariables } from "../types";

export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: ContextVariables }>,
  next: Next
) {
  const apiKey =
    c.req.header("x-api-key") ?? c.req.header("authorization")?.replace("Bearer ", "");

  if (!apiKey) {
    return c.json({ error: "Missing API key" }, 401);
  }

  const raw = await c.env.API_KEYS.get(apiKey);
  if (!raw) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  const agent: AgentIdentity = JSON.parse(raw);
  c.set("agent", agent);
  c.set("requestId", crypto.randomUUID());

  await next();
}
