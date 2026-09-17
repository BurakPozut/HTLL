"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import "./panel.css";

type Row = { id: number; email: string; phone: string | null; createdAt: number; consentVersion: string };
type Page = { rows: Row[]; total: number; page: number; pageSize: number };

export function AdminPanel() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [data, setData] = useState<Page | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/subscribers?q=${encodeURIComponent(query)}&page=${page}`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (response.status === 401) { setAuthenticated(false); setData(null); return; }
        if (!response.ok) throw new Error(result.error || "Kayıtlar yüklenemedi.");
        setAuthenticated(true); setData(result); setError("");
      }).catch(e => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, page, refresh]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const password = new FormData(event.currentTarget).get("password");
    event.currentTarget.reset();
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setLoading(true); setRefresh(value => value + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Giriş yapılamadı."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok && response.status !== 401) throw new Error("Çıkış yapılamadı. Tekrar dene.");
      setAuthenticated(false); setData(null); setPage(1); setQuery(""); setDraft("");
    } catch (e) { setError(e instanceof Error ? e.message : "Çıkış yapılamadı."); }
    finally { setBusy(false); }
  }
  async function download() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/subscribers?format=csv&q=${encodeURIComponent(query)}`, { cache: "no-store" });
      if (response.status === 401) { setAuthenticated(false); setData(null); throw new Error("Oturum süresi doldu."); }
      if (!response.ok) throw new Error((await response.json()).error);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = "htll-kayitlar.csv"; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e instanceof Error ? e.message : "İndirilemedi."); }
    finally { setBusy(false); }
  }
  return <main className="admin-panel">
    <header className="admin-header"><Link href="/">HT/LL</Link><span>DROP 001 / KAYITLAR</span>{authenticated && <button onClick={logout} disabled={busy}>Çıkış yap</button>}</header>
    <div className="admin-content">
      {error && <p role="alert" className="admin-error">{error}</p>}
      {authenticated === null ? <p>{loading ? "Yükleniyor…" : "Bağlantı kurulamadı."} {!loading && <button onClick={() => { setLoading(true); setRefresh(v => v + 1); }}>Tekrar dene</button>}</p> : !authenticated ?
        <form className="admin-login" onSubmit={login}><p className="admin-kicker">YALNIZCA YÖNETİCİ</p><h1>Kayıt listene giriş yap.</h1><label>Yönetici şifresi<input type="password" name="password" autoComplete="current-password" required maxLength={256} /></label><button disabled={busy}>{busy ? "Kontrol ediliyor…" : "Giriş yap →"}</button></form> : <>
        <div className="admin-summary"><div><p className="admin-kicker">{query ? "ARAMA SONUÇLARI" : "TOPLAM KAYIT"}</p><h1>{data?.total ?? "—"}</h1></div><p>Drop bildirim listesi.<br />En yeni kayıtlar en üstte.</p></div>
        <div className="admin-toolbar"><form onSubmit={e => { e.preventDefault(); setLoading(true); setQuery(draft.trim()); setPage(1); setRefresh(v => v + 1); }}><input aria-label="E-posta veya telefon ara" value={draft} onChange={e => setDraft(e.target.value)} placeholder="E-posta veya telefon ara" maxLength={100} /><button disabled={loading}>Ara</button></form><button onClick={() => { setLoading(true); setRefresh(v => v + 1); }} disabled={loading}>Yenile</button><button onClick={download} disabled={busy || loading || !data?.total}>CSV indir ↓</button></div>
        <div className="admin-table-wrap" aria-busy={loading}><table><thead><tr><th>E-posta</th><th>Telefon</th><th>Kayıt tarihi</th><th>Bildirim izni</th></tr></thead><tbody>{data?.rows.map(row => <tr key={row.id}><td>{row.email}</td><td>{row.phone ?? "—"}</td><td>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(row.createdAt)}</td><td><span className="admin-consent">Verildi</span></td></tr>)}</tbody></table>{!loading && !data?.rows.length && <p className="admin-empty">{query ? "Aramana uygun kayıt bulunamadı." : "Henüz kayıt yok. Formu dolduranlar burada görünecek."}</p>}</div>
        <div className="admin-pagination"><span>Tarihler İstanbul saatine göre gösterilir.</span><button disabled={page === 1 || loading} onClick={() => { setLoading(true); setPage(v => v - 1); }}>← Önceki</button><span>{page} / {Math.max(1, Math.ceil((data?.total ?? 0) / 50))}</span><button disabled={loading || page * 50 >= (data?.total ?? 0)} onClick={() => { setLoading(true); setPage(v => v + 1); }}>Sonraki →</button></div>
      </>}
    </div>
  </main>;
}
