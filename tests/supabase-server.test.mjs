import assert from "node:assert/strict";
import test from "node:test";
import { createSubscriber, getSubscriberPage } from "../app/lib/supabase-server.ts";

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
