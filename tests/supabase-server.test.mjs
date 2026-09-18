import assert from "node:assert/strict";
import test from "node:test";
import {
  consumeRequestLimit,
  createAdminSession,
  createSubscriber,
  deleteAdminSession,
  getSubscriberPage,
  hasAdminSession,
} from "../app/lib/supabase-server.ts";

const originalFetch = globalThis.fetch;

test.beforeEach(() => {
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "test-secret";
});

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SECRET_KEY;
});

test("creates a subscriber without exposing the key in the URL or body", async () => {
  let captured;
  globalThis.fetch = async (url, init) => {
    captured = { url: String(url), init };
    return new Response(null, { status: 201 });
  };

  await createSubscriber({ email: "test@example.com", phone: "+905321234567", consentVersion: "v1" });

  assert.equal(captured.url, "https://project.supabase.co/rest/v1/subscribers?on_conflict=email");
  assert.equal(captured.init.headers.Authorization, "Bearer test-secret");
  assert.equal(captured.init.headers.Prefer, "resolution=ignore-duplicates,return=minimal");
  assert.deepEqual(JSON.parse(captured.init.body), {
    email: "test@example.com",
    phone: "+905321234567",
    consent_version: "v1",
  });
});

test("accepts a Supabase Data API URL that already includes /rest/v1", async () => {
  process.env.SUPABASE_URL = "https://project.supabase.co/rest/v1/";
  let capturedUrl = "";
  globalThis.fetch = async (url) => {
    capturedUrl = String(url);
    return new Response(null, { status: 201 });
  };

  await createSubscriber({ email: "test@example.com", phone: null, consentVersion: "v1" });

  assert.equal(capturedUrl, "https://project.supabase.co/rest/v1/subscribers?on_conflict=email");
});

test("maps Supabase rows and reads the exact total", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify([{
    id: 7,
    email: "test@example.com",
    phone: null,
    created_at: "2026-09-18T10:00:00.000Z",
    consent_version: "v1",
  }]), { status: 200, headers: { "content-range": "0-0/1" } });

  const result = await getSubscriberPage({ search: "test@example.com", offset: 0, limit: 50, count: true });

  assert.equal(result.total, 1);
  assert.deepEqual(result.rows[0], {
    id: 7,
    email: "test@example.com",
    phone: null,
    createdAt: Date.parse("2026-09-18T10:00:00.000Z"),
    consentVersion: "v1",
  });
});

test("uses Supabase for rate limits and admin sessions", async () => {
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    requests.push({ url: String(url), init });
    if (String(url).includes("rpc/consume_request_limit")) return Response.json(2);
    if (init.method === "POST") return new Response(null, { status: 201 });
    if (init.method === "DELETE") return new Response(null, { status: 204 });
    return Response.json([{ token_hash: "abc" }]);
  };

  assert.equal(await consumeRequestLimit({ key: "bucket", now: 10, expiresAt: 20 }), 2);
  await createAdminSession("abc", 20);
  assert.equal(await hasAdminSession("abc", 10), true);
  await deleteAdminSession("abc");

  assert.equal(requests.length, 4);
  assert.match(requests[0].url, /rpc\/consume_request_limit$/);
  assert.match(requests[1].url, /\/admin_sessions$/);
  assert.match(requests[2].url, /admin_sessions\?/);
  assert.equal(requests[3].init.method, "DELETE");
});
