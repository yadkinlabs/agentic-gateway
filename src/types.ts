export interface Env {
  API_KEYS: KVNamespace;
  RATE_LIMITS: KVNamespace;
  CREDIT_BALANCES: KVNamespace;
  BACKEND_URL: string;
  STRIPE_SECRET_KEY: string;
  X402_SECRET: string;
  MPP_SECRET: string;
  AUDIT_LOG_URL?: string;
}

export interface AgentIdentity {
  agentId: string;
  name: string;
  rateLimitTier: "standard" | "premium";
  paymentRail: "stripe" | "x402" | "mpp";
}

export interface AuditEntry {
  ts: string;
  agentId: string;
  method: string;
  path: string;
  status: number;
  paymentRail?: string;
  amountCharged?: number; // USD cents
  rateLimited?: boolean;
  blocked?: boolean;
  blockReason?: string;
}

// Hono context variables — set by middleware, read downstream
export type ContextVariables = {
  agent: AgentIdentity;
  requestId: string;
};
