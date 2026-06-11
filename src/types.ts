export interface Env {
  RATE_LIMITS: KVNamespace; // reserved for future rate limiting by wallet
  BACKEND_URL: string;
  X402_PAY_TO: string;      // receiving wallet address (USDC on Base)
  JOB_PRICE_CENTS: string;  // e.g. "100" = $1.00
  AUDIT_LOG_URL?: string;
}

export interface AuditEntry {
  ts: string;
  agentId: string;
  method: string;
  path: string;
  status: number;
  paymentRail?: string;
  blocked?: boolean;
  blockReason?: string;
}

export type ContextVariables = {
  agentId: string;
  requestId: string;
};
