import { apiError, HttpError, json, limitRequest, readBody } from "../../lib/admin-server";
import { CONSENT_VERSION, validateRegistration } from "../../lib/registration";
import { createSubscriber } from "../../lib/supabase-server";

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    await limitRequest(request, "subscribe", 20);
    if (typeof body.website === "string" && body.website) return json({ ok: true });
    let values;
    try { values = validateRegistration(body); }
    catch (error) { throw new HttpError(400, error instanceof Error ? error.message : "Bilgileri kontrol et."); }
    // Repeat submissions cannot overwrite a phone number belonging to an existing email.
    await createSubscriber({ ...values, consentVersion: CONSENT_VERSION });
    return json({ ok: true });
  } catch (error) { return apiError(error); }
}
