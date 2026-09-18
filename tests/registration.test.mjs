import { test } from "node:test";
import assert from "node:assert/strict";
import { validateRegistration, csvCell, formatTurkishPhoneInput } from "../app/lib/registration.ts";

test("normalizes email and Turkish numbers without making phone mandatory", () => {
  assert.deepEqual(validateRegistration({ email: " Test@Example.com ", phone: "0532 123 45 67", consent: true }), { email: "test@example.com", phone: "+905321234567" });
  assert.equal(validateRegistration({ email: "x@example.com", phone: "532-123-4567", consent: true }).phone, "+905321234567");
  assert.equal(validateRegistration({ email: "x@example.com", phone: "", consent: true }).phone, null);
});
test("formats Turkish mobile numbers while typing", () => {
  assert.equal(formatTurkishPhoneInput("5321234567"), "532-123-4567");
  assert.equal(formatTurkishPhoneInput("0532 123 45 67"), "532-123-4567");
  assert.equal(formatTurkishPhoneInput("+90 532 123 45 67"), "532-123-4567");
  assert.equal(formatTurkishPhoneInput("532123456789"), "532-123-4567");
});
test("rejects bad emails, phones and missing notification permission", () => {
  for (const value of [
    { email: "invalid", consent: true },
    { email: "x'or'1'='1@example.com", consent: true },
    { email: "x@example.com", consent: false },
    { email: "x@example.com", consent: "true" },
    { email: "x@example.com", phone: "call me", consent: true },
    { email: "x@example.com", phone: "532-123-4567'; DROP TABLE subscribers;--", consent: true },
    { email: "x@example.com", phone: "++905321234567", consent: true },
    { email: "x@example.com", phone: "+44 7700 900123", consent: true },
    { email: "x@example.com", phone: 1234, consent: true },
  ]) assert.throws(() => validateRegistration(value));
});
test("CSV escapes quotes and neutralizes formula prefixes", () => {
  assert.equal(csvCell('a"b'), '"a""b"');
  assert.equal(csvCell("=CMD()"), '"\'=CMD()"');
  assert.equal(csvCell("+905321234567"), '"\'+905321234567"');
});
