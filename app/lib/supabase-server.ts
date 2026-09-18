type SupabaseSubscriber = {
  id: number;
  email: string;
  phone: string | null;
  created_at: string;
  consent_version: string;
};

export type Subscriber = {
  id: number;
  email: string;
  phone: string | null;
  createdAt: number;
  consentVersion: string;
};

function config() {
  const configuredUrl = process.env.SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!configuredUrl || !secretKey) throw new Error("Supabase is not configured.");
  const parsed = new URL(configuredUrl);
  if (!parsed.hostname.endsWith(".supabase.co")) throw new Error("Supabase URL is not valid.");
  // Accept both the project URL and the Data API URL copied from Supabase.
  const url = parsed.origin;
  return { url, secretKey };
}

async function request(path: string, init: RequestInit = {}) {
  const { url, secretKey } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}).`);
  return response;
}

export async function consumeRequestLimit(values: {
  key: string;
  now: number;
  expiresAt: number;
}) {
  const response = await request("rpc/consume_request_limit", {
    method: "POST",
    body: JSON.stringify({
      p_key: values.key,
      p_now: values.now,
      p_expires_at: values.expiresAt,
    }),
  });
  const count = Number(await response.json());
  if (!Number.isSafeInteger(count) || count < 1) throw new Error("Supabase returned an invalid rate-limit count.");
  return count;
}

export async function deleteExpiredAdminSessions(now: number) {
  const query = new URLSearchParams({ expires_at: `lt.${now}` });
  await request(`admin_sessions?${query}`, { method: "DELETE" });
}

export async function createAdminSession(tokenHash: string, expiresAt: number) {
  await request("admin_sessions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ token_hash: tokenHash, expires_at: expiresAt }),
  });
}

export async function hasAdminSession(tokenHash: string, now: number) {
  const query = new URLSearchParams({
    select: "token_hash",
    token_hash: `eq.${tokenHash}`,
    expires_at: `gt.${now}`,
    limit: "1",
  });
  const response = await request(`admin_sessions?${query}`);
  const rows = await response.json() as Array<{ token_hash: string }>;
  return rows.length === 1;
}

export async function deleteAdminSession(tokenHash: string) {
  const query = new URLSearchParams({ token_hash: `eq.${tokenHash}` });
  await request(`admin_sessions?${query}`, { method: "DELETE" });
}

export async function createSubscriber(values: {
  email: string;
  phone: string | null;
  consentVersion: string;
}) {
  await request("subscribers?on_conflict=email", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({
      email: values.email,
      phone: values.phone,
      consent_version: values.consentVersion,
    }),
  });
}

function searchFilter(search: string) {
  // PostgREST filter syntax is structural, so only contact-field characters
  // are allowed into the expression. The whole value is URL-encoded below.
  const safe = search.replace(/[^\p{L}\p{N}@+._\-\s]/gu, "").trim();
  return safe ? `(email.ilike.*${safe}*,phone.ilike.*${safe}*)` : "";
}

function totalFrom(response: Response) {
  const value = response.headers.get("content-range")?.split("/")[1];
  const total = Number(value);
  if (!Number.isSafeInteger(total) || total < 0) throw new Error("Supabase did not return an exact count.");
  return total;
}

export async function getSubscriberPage(options: {
  search: string;
  offset: number;
  limit: number;
  count?: boolean;
}) {
  const query = new URLSearchParams({
    select: "id,email,phone,created_at,consent_version",
    order: "created_at.desc,id.desc",
    offset: String(options.offset),
    limit: String(options.limit),
  });
  const filter = searchFilter(options.search);
  if (filter) query.set("or", filter);
  const response = await request(`subscribers?${query}`, {
    headers: options.count ? { Prefer: "count=exact" } : undefined,
  });
  const raw = await response.json() as SupabaseSubscriber[];
  const rows = raw.map((row): Subscriber => ({
    id: row.id,
    email: row.email,
    phone: row.phone,
    createdAt: Date.parse(row.created_at),
    consentVersion: row.consent_version,
  }));
  return { rows, total: options.count ? totalFrom(response) : undefined };
}
