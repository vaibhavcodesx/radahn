import { HttpError } from "@/server/http";
import { engine } from "@/server/memory";
import { handleRpc, type Rpc } from "@/server/mcp/server";
import { rateLimit } from "@/server/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const rpcError = (status: number, code: number, message: string, headers?: Record<string, string>) =>
  Response.json({ jsonrpc: "2.0", id: null, error: { code, message } }, { status, headers });

const isRpc = (m: unknown): m is Rpc => !!m && typeof m === "object" && typeof (m as { method?: unknown }).method === "string";

/** MCP endpoint (stateless Streamable HTTP). Auth: `Authorization: Bearer radahn_…` from Settings. */
export async function POST(req: Request) {
  const raw = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const key = raw ? await (await engine()).verifyAgentKey(raw) : null;
  if (!key) return rpcError(401, -32001, "Missing or revoked Radahn agent key.", { "WWW-Authenticate": 'Bearer realm="radahn"' });
  try {
    await rateLimit("agent", key.ownerId, false);
  } catch (e) {
    if (e instanceof HttpError) return rpcError(429, -32002, e.message);
    throw e;
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return rpcError(400, -32700, "Parse error");
  }
  const batch: unknown[] = Array.isArray(body) ? body : [body];
  if (!batch.length || batch.length > 20 || !batch.every(isRpc)) return rpcError(400, -32600, "Invalid request");
  const out = (await Promise.all(batch.map((m) => handleRpc(key, m)))).filter((r) => r !== null);
  if (!out.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? out : out[0]);
}

/** No server-initiated stream in stateless mode. */
export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
