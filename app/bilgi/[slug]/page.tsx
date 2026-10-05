import Link from "next/link";
import { notFound } from "next/navigation";
import pages from "../../lib/legal-content.json";
import "../../storefront.css";
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
    <div className="legal-page storefront">
      <header className="site-header">
        <Link className="brand-wordmark" href="/" aria-label="High Tech Low Life ana sayfa"><img src="/brand/wordmark.png" alt="HTLL" /></Link>
        <nav aria-label="Ana menü"><Link href="/#pant">Drop 001</Link><Link href="/bilgi/hakkimizda">Hakkımızda</Link><Link href="/bilgi/iletisim">İletişim</Link></nav>
        <Link className="bag-button" href="/#pant">Mağazaya dön</Link>
      </header>
      <div className="legal-layout">
        <nav className="legal-nav" aria-label="Mağaza bilgileri">
          {pages.map((entry) => <Link key={entry.slug} href={`/bilgi/${entry.slug}`} aria-current={entry.slug === slug ? "page" : undefined}>{entry.title}</Link>)}
        </nav>
        <main className="legal-content">
          <p className="eyebrow">High Tech Low Life Studios</p>
          <h1>{page.title}</h1>
          {page.blocks.map((block, index) => block.kind === "heading" ? <h2 key={index}>{block.text}</h2> : <p key={index}>{block.text}</p>)}
          <div className="legal-contact"><a href="mailto:hightechlowlifestudios@gmail.com">hightechlowlifestudios@gmail.com</a><a href="tel:+905379814748">0537 981 4748</a></div>
        </main>
      </div>
      <footer>
        <div className="footer-identity"><Link className="brand-symbol" href="/" aria-label="HTLL ana sayfa"><img src="/brand/symbol-white.png" alt="" /></Link><p>HIGH TECH LOW LIFE STUDIOS<br />Independent clothing. İstanbul.</p></div>
        <div className="footer-links"><Link href="/#pant">Koleksiyonu keşfet ↗</Link><a href="mailto:hightechlowlifestudios@gmail.com">Bize ulaşın ↗</a><a href="https://www.instagram.com/htll.studios/" target="_blank" rel="noreferrer">Instagram @htll.studios ↗</a></div>
        <div className="footer-legal"><span>© 2026 HTLL</span><nav className="store-policy-links" aria-label="Yasal bilgiler">
          {pages.map((entry) => <Link key={entry.slug} href={`/bilgi/${entry.slug}`}>{entry.title}</Link>)}
        </nav></div>
      </footer>
    </div>
  );
}
