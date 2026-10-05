import { notFound } from "next/navigation";
import pages from "../../lib/legal-content.json";
import "../legal.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages.find((entry) => entry.slug === slug);
  return { title: page ? `${page.title} — HTLL` : "Sayfa bulunamadı — HTLL" };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages.find((entry) => entry.slug === slug);
  if (!page) notFound();

  return (
    <div className="legal-page">
      <header className="legal-header"><a href="/" className="wordmark">HTLL</a><a href="/">← Mağazaya dön</a></header>
      <div className="legal-layout">
        <nav className="legal-nav" aria-label="Mağaza bilgileri">
          {pages.map((entry) => <a key={entry.slug} href={`/bilgi/${entry.slug}`} aria-current={entry.slug === slug ? "page" : undefined}>{entry.title}</a>)}
        </nav>
        <main className="legal-content">
          <p className="eyebrow">High Tech Low Life Studios</p>
          <h1>{page.title}</h1>
          {page.blocks.map((block, index) => block.kind === "heading" ? <h2 key={index}>{block.text}</h2> : <p key={index}>{block.text}</p>)}
          <div className="legal-contact"><a href="mailto:hightechlowlifestudios@gmail.com">hightechlowlifestudios@gmail.com</a><a href="tel:+905379814748">0537 981 4748</a></div>
        </main>
      </div>
    </div>
  );
}
