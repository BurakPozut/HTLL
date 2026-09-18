import { apiError, HttpError, json, requireAdmin } from "../../../lib/admin-server";
import { csvCell } from "../../../lib/registration";
import { getSubscriberPage, Subscriber } from "../../../lib/supabase-server";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const url = new URL(request.url);
    const search = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
    const page = Number(url.searchParams.get("page") ?? 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 100_000) throw new HttpError(400, "Sayfa geçerli değil.");
    const csv = url.searchParams.get("format") === "csv";
    const first = await getSubscriberPage({ search, offset: csv ? 0 : (page - 1) * 50, limit: csv ? 1_000 : 50, count: true });
    const total = first.total ?? 0;
    if (csv && total > 10_000) throw new HttpError(400, "İndirmek için aramayı daralt (en fazla 10.000 kayıt).");
    let rows = first.rows;
    if (csv) {
      const pages: Subscriber[][] = [rows];
      for (let offset = rows.length; offset < total; offset += 1_000) {
        pages.push((await getSubscriberPage({ search, offset, limit: Math.min(1_000, total - offset) })).rows);
      }
      rows = pages.flat();
    }
    if (csv) {
      const body = [["E-posta", "Telefon", "Kayıt tarihi (UTC)", "Bildirim izni"], ...rows.map(r => [r.email, r.phone, new Date(r.createdAt).toISOString(), r.consentVersion])].map(row => row.map(csvCell).join(",")).join("\r\n");
      return new Response(`\uFEFF${body}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="htll-kayitlar.csv"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    }
    return json({ rows, total, page, pageSize: 50 });
  } catch (error) { return apiError(error); }
}
