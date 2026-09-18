export const CONSENT_VERSION = "drop-notification-v1";

const EMAIL_PATTERN = /^[a-z0-9.!#$%&*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export function formatTurkishPhoneInput(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("90")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean).join("-");
}

export function validateRegistration(body: Record<string, unknown>) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const emailLocalPart = email.split("@", 1)[0] ?? "";
  if (email.length > 254 || emailLocalPart.length > 64 || email.includes("..") || !EMAIL_PATTERN.test(email)) {
    throw new Error("Geçerli bir e-posta adresi yaz.");
  }
  if (body.consent !== true) throw new Error("Drop bildirimi için izin vermelisin.");
  if (body.phone !== undefined && typeof body.phone !== "string") throw new Error("Telefon numarası geçerli değil.");
  const raw = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!raw) return { email, phone: null };
  if (raw.length > 24 || !/^\+?[\d\s().-]+$/.test(raw)) throw new Error("Telefon numarası geçerli değil.");
  let digits = raw.replace(/\D/g, "");
  if (/^90\d{10}$/.test(digits)) digits = digits.slice(2);
  else if (/^0\d{10}$/.test(digits)) digits = digits.slice(1);
  if (!/^5\d{9}$/.test(digits)) throw new Error("Telefonu 5XX-XXX-XXXX formatında yaz.");
  return { email, phone: `+90${digits}` };
}

// Quoting alone does not stop spreadsheet formulas in exported contact fields.
export function csvCell(value: string | number | null) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
