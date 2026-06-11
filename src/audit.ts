import type { AuditEntry, Env } from "./types";

export async function writeAuditLog(entry: AuditEntry, env: Env): Promise<void> {
  if (!env.AUDIT_LOG_URL) return;

  // Best-effort — never block the response path
  await fetch(env.AUDIT_LOG_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  }).catch(() => {});
}
