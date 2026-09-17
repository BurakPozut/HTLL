import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { adminSessions } from "../../../../db/schema";
import { apiError, json, readBody, requireAdmin, sessionCookie } from "../../../lib/admin-server";

export async function POST(request: Request) {
  try {
    await readBody(request);
    const tokenHash = await requireAdmin(request);
    await getDb().delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(request, "", 0) });
  } catch (error) { return apiError(error); }
}
