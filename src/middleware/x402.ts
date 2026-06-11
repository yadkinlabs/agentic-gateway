import type { Context, Next } from "hono";
import type { Env, ContextVariables } from "../types";

// x402 — HTTP 402 Payment Required
// Spec: https://x402.org
// Facilitator (Coinbase-backed): https://x402.org/facilitator

const FACILITATOR = "https://x402.org/facilitator";
const USDC_ON_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// GET / OPTIONS / HEAD are free — agent already paid to submit the job.
// Only state-changing requests require payment.
const FREE_METHODS = new Set(["GET", "OPTIONS", "HEAD"]);

interface X402PaymentDetails {
  scheme: "exact";
  network: "base";
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
}

interface FacilitatorResult {
  valid: boolean;
  payer?: string; // wallet address of the paying agent
  error?: string;
}

function buildPaymentDetails(
  url: string,
  payTo: string,
  priceCents: number
): X402PaymentDetails {
  // USDC has 6 decimals: $1.00 = 1_000_000 units
  const amount = String(priceCents * 10_000);
  return {
    scheme: "exact",
    network: "base",
    maxAmountRequired: amount,
    resource: url,
    description: "Video meme generation",
    mimeType: "application/json",
    payTo,
    maxTimeoutSeconds: 300,
    asset: USDC_ON_BASE,
  };
}

function paymentRequired(c: Context, details: X402PaymentDetails): Response {
  return c.json(
    { x402Version: 1, error: "Payment Required", accepts: [details] },
    402,
    { "X-Payment-Required": "x402" }
  );
}

export async function x402Middleware(
  c: Context<{ Bindings: Env; Variables: ContextVariables }>,
  next: Next
) {
  // Read operations are free — no payment proof needed
  if (FREE_METHODS.has(c.req.method)) {
    c.set("agentId", "anonymous");
    c.set("requestId", crypto.randomUUID());
    await next();
    return;
  }

  const priceCents = parseInt(c.env.JOB_PRICE_CENTS ?? "100");
  const details = buildPaymentDetails(c.req.url, c.env.X402_PAY_TO, priceCents);
  const paymentHeader = c.req.header("x-payment");

  // No payment proof → return 402 with price offer
  if (!paymentHeader) {
    return paymentRequired(c, details);
  }

  // Decode and verify with x402 facilitator
  let payment: unknown;
  try {
    payment = JSON.parse(atob(paymentHeader));
  } catch {
    return c.json({ error: "Malformed x-payment header" }, 400);
  }

  let result: FacilitatorResult;
  try {
    const res = await fetch(`${FACILITATOR}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment, paymentRequirements: details }),
    });
    result = await res.json() as FacilitatorResult;
  } catch {
    return c.json({ error: "Payment facilitator unreachable" }, 502);
  }

  if (!result.valid) {
    // Return 402 again so the agent can retry with a fresh payment
    return paymentRequired(c, details);
  }

  // Payment verified — identity is the payer's wallet address
  c.set("agentId", `x402:${result.payer ?? "unknown"}`);
  c.set("requestId", crypto.randomUUID());

  await next();
}
