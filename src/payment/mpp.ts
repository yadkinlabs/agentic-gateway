import type { AgentIdentity, Env } from "../types";

// MPP — Machine Payment Protocol
// Manages ongoing agent payment relationships: subscriptions, recurring billing, streaming payments.
// Spec: https://mpp.dev

export interface MppRelationship {
  agentId: string;
  status: "active" | "suspended" | "cancelled";
  plan: string;
  expiresAt: string; // ISO 8601
}

export async function checkMppRelationship(
  agent: AgentIdentity,
  _env: Env
): Promise<MppRelationship | null> {
  // TODO: verify relationship with MPP provider
  void agent;
  return null;
}

export async function recordMppUsage(
  agent: AgentIdentity,
  amountCents: number,
  _env: Env
): Promise<void> {
  // TODO: report usage to MPP provider for billing
  void agent;
  void amountCents;
}
