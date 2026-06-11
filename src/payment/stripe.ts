import type { AgentIdentity, Env } from "../types";

export async function checkStripeBalance(
  agent: AgentIdentity,
  minimumCents: number,
  env: Env
): Promise<{ ok: boolean; balance: number }> {
  const raw = await env.CREDIT_BALANCES.get(`stripe:${agent.agentId}`);
  const balance = parseInt(raw ?? "0");
  return { ok: balance >= minimumCents, balance };
}

export async function debitStripeBalance(
  agent: AgentIdentity,
  amountCents: number,
  env: Env
): Promise<void> {
  const raw = await env.CREDIT_BALANCES.get(`stripe:${agent.agentId}`);
  const balance = parseInt(raw ?? "0");
  await env.CREDIT_BALANCES.put(`stripe:${agent.agentId}`, String(Math.max(0, balance - amountCents)));
}
