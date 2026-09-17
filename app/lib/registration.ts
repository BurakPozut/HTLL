export const CONSENT_VERSION = "drop-notification-v1";

export function validateRegistration(body: Record<string, unknown>) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Geçerli bir e-posta adresi yaz.");
  }
  if (body.consent !== true) throw new Error("Drop bildirimi için izin vermelisin.");
  if (body.phone !== undefined && typeof body.phone !== "string") throw new Error("Telefon numarası geçerli değil.");
  const raw = typeof body.phone === "string" ? body.phone.trim() : "";
  if (raw.length > 40 || (raw && !/^[+\d\s().-]+$/.test(raw))) throw new Error("Telefon numarası geçerli değil.");
  let phone = raw.replace(/[\s().-]/g, "");
  if (/^05\d{9}$/.test(phone)) phone = `+9${phone}`;
  else if (/^5\d{9}$/.test(phone)) phone = `+90${phone}`;
  else if (/^90\d{10}$/.test(phone)) phone = `+${phone}`;
  if (phone && !/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("Telefonu ülke koduyla yaz (ör. +90 5xx xxx xx xx).");
  return { email, phone: phone || null };
}

// Quoting alone does not stop spreadsheet formulas in exported contact fields.
export function csvCell(value: string | number | null) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
