import type { Context } from "hono";
import type { Env, ContextVariables } from "./types";

export async function proxyToBackend(
  c: Context<{ Bindings: Env; Variables: ContextVariables }>
): Promise<Response> {
  const url = new URL(c.req.url);
  const backendUrl = new URL(url.pathname + url.search, c.env.BACKEND_URL);

  const headers = new Headers(c.req.raw.headers);
  headers.set("x-gateway-agent-id", c.get("agentId"));
  headers.set("x-gateway-payment-rail", c.req.method === "GET" ? "none" : "x402");
  headers.set("x-gateway-request-id", c.get("requestId"));
  // Remove inbound x-payment — backend doesn't need it
  headers.delete("x-payment");

  const upstream = new Request(backendUrl.toString(), {
    method: c.req.method,
    headers,
    body: c.req.method !== "GET" && c.req.method !== "HEAD" ? c.req.raw.body : undefined,
  });

  return fetch(upstream);
}
