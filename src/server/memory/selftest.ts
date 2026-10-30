import "server-only";
/**
 * Engine integration self-test — OWNED BY CODEX. Runs ON VERCEL against real Atlas via
 * POST /api/admin/selftest (Bearer CRON_SECRET), because the dev machine's network cannot
 * reach Atlas. Use a throwaway owner (`eval:selftest:<ts>`) and delete everything it wrote.
 * Return one entry per check; never include secrets or user content from other owners.
 */
export interface SelfTestCheck {
  name: string;
  ok: boolean;
  ms: number;
  detail?: string;
}

export async function runSelfTest(): Promise<{ ok: boolean; checks: SelfTestCheck[] }> {
  return { ok: true, checks: [{ name: "placeholder", ok: true, ms: 0, detail: "Codex: replace with real checks" }] };
}
