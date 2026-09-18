import { apiError, json, readBody, requireAdmin, sessionCookie } from "../../../lib/admin-server";
import { deleteAdminSession } from "../../../lib/supabase-server";

export async function POST(request: Request) {
  try {
    await readBody(request);
    const tokenHash = await requireAdmin(request);
    await deleteAdminSession(tokenHash);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(request, "", 0) });
  } catch (error) { return apiError(error); }
}
