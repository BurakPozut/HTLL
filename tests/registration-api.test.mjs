import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Explicit local integration test; cleans up only its own generated contact records.
test("local registration, authenticated listing, CSV and logout", async () => {
  const base = "http://localhost:3000";
  const envText = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  const env = Object.fromEntries(envText.split(/\r?\n/).filter(line => line && !line.startsWith("#") && line.includes("=")).map(line => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));
  const password = env.HTLL_ADMIN_PASSWORD?.trim();
  assert.ok(password);
  const email = `htll-test-${Date.now()}@example.com`;
  let cookie = "";
  const post = (route, body, origin = base) => fetch(base + route, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie }, body: JSON.stringify(body) });
  try {
    assert.equal((await fetch(base + "/api/admin/subscribers")).status, 401);
    assert.equal((await fetch(base + "/api/admin/subscribers?format=csv")).status, 401);
    assert.equal((await post("/api/admin/login", { password: "wrong" })).status, 401);
    assert.equal((await post("/api/subscribe", { email, consent: true }, "https://example.com")).status, 403);
    assert.equal((await post("/api/subscribe", { email, consent: false })).status, 400);
    assert.equal((await post("/api/subscribe", { email, phone: "not-a-number", consent: true })).status, 400);
    let response = await post("/api/subscribe", { email, phone: "0532 123 45 67", consent: true });
    assert.equal(response.status, 200, await response.text());
    assert.equal((await post("/api/subscribe", { email, phone: "+905551234567", consent: true })).status, 200);
    response = await post("/api/admin/login", { password });
    assert.equal(response.status, 200, await response.clone().text());
    const setCookie = response.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Strict/);
    cookie = setCookie.split(";")[0];
    response = await fetch(base + `/api/admin/subscribers?q=${email}`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const data = await response.json();
    assert.equal(data.total, 1); assert.equal(data.rows[0].phone, "+905321234567");
    assert.equal(data.rows[0].consentVersion, "drop-notification-v1");
    response = await fetch(base + `/api/admin/subscribers?format=csv&q=${email}`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    const csv = await response.text(); assert.ok(csv.includes(email)); assert.ok(csv.includes("'+905321234567"));
    assert.equal((await post("/api/admin/logout", {})).status, 200);
    assert.equal((await fetch(base + "/api/admin/subscribers", { headers: { Cookie: cookie } })).status, 401);
  } finally {
    const projectUrl = new URL(env.SUPABASE_URL).origin;
    const query = new URLSearchParams({ email: `eq.${email}` });
    const cleanup = await fetch(`${projectUrl}/rest/v1/subscribers?${query}`, {
      method: "DELETE",
      headers: { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}` },
    });
    assert.ok(cleanup.ok, "Temporary test record cleanup failed");
  }
});
