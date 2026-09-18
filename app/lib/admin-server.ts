import { consumeRequestLimit, hasAdminSession } from "./supabase-server";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export function apiError(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  // Contact values and internal database details must not leak into logs/responses.
  return json({ error: "İşlem şu an tamamlanamadı. Lütfen biraz sonra tekrar dene." }, 503);
}

export async function readBody(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new HttpError(403, "İstek kaynağı geçerli değil.");
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "JSON gerekli.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "İstek boş.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); throw new HttpError(413, "İstek çok büyük."); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const body = JSON.parse(new TextDecoder().decode(bytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new HttpError(400, "İstek geçerli değil."); }
}

export async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, "0")).join("");
}

export function adminPassword() {
  const password = process.env.HTLL_ADMIN_PASSWORD;
  if (!password || password.length < 20) throw new HttpError(503, "Yönetici girişi henüz yapılandırılmamış.");
  return password;
}

export async function passwordMatches(value: string) {
  const [a, b] = await Promise.all([digest(value), digest(adminPassword())]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

export async function limitRequest(request: Request, kind: string, maximum: number) {
  const now = Date.now();
  // CF sets this header at the production edge. Locally all requests share a bucket.
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const key = await digest(`${adminPassword()}:${kind}:${ip}`);
  const count = await consumeRequestLimit({ key, now, expiresAt: now + 15 * 60_000 });
  if (count > maximum) throw new HttpError(429, "Çok fazla deneme yaptın. 15 dakika sonra tekrar dene.");
}

export const SESSION_COOKIE = "htll_admin_session";
function sessionToken(request: Request) {
  return request.headers.get("cookie")?.split(";").map(x => x.trim()).find(x => x.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1) ?? "";
}
export async function requireAdmin(request: Request) {
  const token = sessionToken(request);
  if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(401, "Giriş yapmalısın.");
  const tokenHash = await digest(token);
  if (!await hasAdminSession(tokenHash, Date.now())) throw new HttpError(401, "Oturum süresi doldu. Yeniden giriş yap.");
  return tokenHash;
}
export function sessionCookie(request: Request, token: string, maxAge: number) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
