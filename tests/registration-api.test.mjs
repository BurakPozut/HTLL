import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

// Explicit local integration test; cleans up only its own generated contact records.
test("local registration, authenticated listing, CSV and logout", async () => {
  const base = "http://localhost:3000";
  const env = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  const password = env.match(/^HTLL_ADMIN_PASSWORD=(.+)$/m)?.[1]?.trim();
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
    const cleanup = spawnSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "d1", "execute", "DB", "--local", "--config", "work/d1-local.json", "--persist-to", ".wrangler/state", "--command", `DELETE FROM subscribers WHERE email = '${email}'`], {
      env: { ...process.env, WRANGLER_SEND_METRICS: "false", WRANGLER_LOG_PATH: ".wrangler/logs" }, encoding: "utf8",
    });
    assert.equal(cleanup.status, 0, "Temporary test record cleanup failed");
  }
});
