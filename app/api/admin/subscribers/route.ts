import { count, desc, like, or } from "drizzle-orm";
import { getDb } from "../../../../db";
import { subscribers } from "../../../../db/schema";
import { apiError, HttpError, json, requireAdmin } from "../../../lib/admin-server";
import { csvCell } from "../../../lib/registration";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const search = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const page = Number(url.searchParams.get("page") ?? 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100_000) throw new HttpError(400, "Sayfa geçerli değil.");
    const filter = search ? or(like(subscribers.email, `%${search}%`), like(subscribers.phone, `%${search}%`)) : undefined;
    const db = getDb();
    const [{ total }] = await db.select({ total: count() }).from(subscribers).where(filter);
    const csv = url.searchParams.get("format") === "csv";
    if (csv && total > 10_000) throw new HttpError(400, "İndirmek için aramayı daralt (en fazla 10.000 kayıt).");
    const rows = await db.select().from(subscribers).where(filter).orderBy(desc(subscribers.createdAt), desc(subscribers.id)).limit(csv ? 10_000 : 50).offset(csv ? 0 : (page - 1) * 50);
    if (csv) {
      const body = [["E-posta", "Telefon", "Kayıt tarihi (UTC)", "Bildirim izni"], ...rows.map(r => [r.email, r.phone, new Date(r.createdAt).toISOString(), r.consentVersion])].map(row => row.map(csvCell).join(",")).join("\r\n");
      return new Response(`\uFEFF${body}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="htll-kayitlar.csv"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }
    return json({ rows, total, page, pageSize: 50 });
  } catch (error) { return apiError(error); }
}
