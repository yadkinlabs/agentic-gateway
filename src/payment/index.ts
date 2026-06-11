import type { Context, Next } from "hono";
import type { Env, ContextVariables } from "../types";
import { checkStripeBalance } from "./stripe";
import { buildX402Response, verifyX402Payment } from "./x402";
import { checkMppRelationship } from "./mpp";

// Minimum balance required to pass the gateway. Actual cost is captured post-job by agentic-content.
const MINIMUM_BALANCE_CENTS = 10; // $0.10

// USDC on Base — replace with your receiving wallet address before deploy
const X402_PAY_TO = "REPLACE_WITH_WALLET_ADDRESS";
const X402_USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export async function paymentMiddleware(
  c: Context<{ Bindings: Env; Variables: ContextVariables }>,
  next: Next
) {
  const agent = c.get("agent");

  if (agent.paymentRail === "stripe") {
    const { ok, balance } = await checkStripeBalance(agent, MINIMUM_BALANCE_CENTS, c.env);
    if (!ok) {
      return c.json(
        { error: "Insufficient credit balance", balanceCents: balance, requiredCents: MINIMUM_BALANCE_CENTS },
        402
      );
    }

  } else if (agent.paymentRail === "x402") {
    const paymentHeader = c.req.header("x-payment");
    if (!paymentHeader) {
      return buildX402Response(c, {
        scheme: "exact",
        network: "base",
        maxAmountRequired: "100000", // 0.10 USDC
        resource: c.req.url,
        description: "agentic-gateway request",
        mimeType: "application/json",
        payTo: X402_PAY_TO,
        maxTimeoutSeconds: 300,
        asset: X402_USDC_BASE,
      });
    }
    const { valid } = await verifyX402Payment(paymentHeader, c.env);
    if (!valid) {
      return c.json({ error: "Invalid x402 payment" }, 402);
    }

  } else if (agent.paymentRail === "mpp") {
    const relationship = await checkMppRelationship(agent, c.env);
    if (!relationship || relationship.status !== "active") {
      return c.json({ error: "No active MPP relationship" }, 402);
    }
  }

  await next();
}
