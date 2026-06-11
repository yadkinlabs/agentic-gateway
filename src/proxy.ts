import type { Context } from "hono";
import type { Env, ContextVariables } from "./types";

export async function proxyToBackend(
  c: Context<{ Bindings: Env; Variables: ContextVariables }>
): Promise<Response> {
  const agent = c.get("agent");
  const requestId = c.get("requestId");

  const url = new URL(c.req.url);
  const backendUrl = new URL(url.pathname + url.search, c.env.BACKEND_URL);

  const headers = new Headers(c.req.raw.headers);
  // Pass agent identity to backend via internal headers; strip inbound auth
  headers.set("x-gateway-agent-id", agent.agentId);
  headers.set("x-gateway-request-id", requestId);
  headers.delete("x-api-key");
  headers.delete("authorization");

  const upstream = new Request(backendUrl.toString(), {
    method: c.req.method,
    headers,
    body: c.req.method !== "GET" && c.req.method !== "HEAD" ? c.req.raw.body : undefined,
  });

  return fetch(upstream);
}
