import type { Context } from "hono";
import type { Env, ContextVariables } from "../types";

// x402 — HTTP 402 Payment Required
// Spec: https://x402.org

export interface X402PaymentDetails {
  scheme: "exact";
  network: "base" | "ethereum";
  maxAmountRequired: string; // token base units (e.g. USDC has 6 decimals)
  resource: string;
  description: string;
  mimeType: string;
  payTo: string; // wallet address
  maxTimeoutSeconds: number;
  asset: string; // token contract address
  extra?: Record<string, unknown>;
}

export function buildX402Response(
  c: Context<{ Bindings: Env; Variables: ContextVariables }>,
  details: X402PaymentDetails
): Response {
  return c.json(
    { x402Version: 1, error: "Payment Required", accepts: [details] },
    402,
    { "X-Payment-Required": "x402" }
  );
}

export async function verifyX402Payment(
  paymentHeader: string,
  _env: Env
): Promise<{ valid: boolean }> {
  // TODO: verify payment proof against x402 facilitator
  // https://x402.org/facilitators
  void paymentHeader;
  return { valid: false };
}
