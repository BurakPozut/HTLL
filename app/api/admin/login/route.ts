import { lt } from "drizzle-orm";
import { getDb } from "../../../../db";
import { adminSessions } from "../../../../db/schema";
import { apiError, digest, HttpError, json, limitRequest, passwordMatches, readBody, sessionCookie } from "../../../lib/admin-server";

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    await limitRequest(request, "admin-login", 8);
    if (typeof body.password !== "string" || body.password.length > 256 || !await passwordMatches(body.password)) throw new HttpError(401, "Şifre yanlış.");
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes, n => n.toString(16).padStart(2, "0")).join("");
    const db = getDb();
    await db.delete(adminSessions).where(lt(adminSessions.expiresAt, Date.now()));
    await db.insert(adminSessions).values({ tokenHash: await digest(token), expiresAt: Date.now() + 8 * 60 * 60_000 });
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(request, token, 8 * 3600) });
  } catch (error) { return apiError(error); }
}
