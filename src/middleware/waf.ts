import type { Context, Next } from "hono";
import type { Env, ContextVariables } from "../types";

const BLOCK_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /you are now (a |an )?/i,
  /disregard (your |all )?/i,
  /system prompt/i,
];

const MAX_BODY_BYTES = 1024 * 1024; // 1MB

export async function wafMiddleware(
  c: Context<{ Bindings: Env; Variables: ContextVariables }>,
  next: Next
) {
  const contentLength = parseInt(c.req.header("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) {
    return c.json({ error: "Request too large" }, 413);
  }

  if (c.req.method === "POST" || c.req.method === "PUT") {
    const body = await c.req.raw.clone().text();
    for (const pattern of BLOCK_PATTERNS) {
      if (pattern.test(body)) {
        return c.json({ error: "Request blocked" }, 400);
      }
    }
  }

  await next();
}
