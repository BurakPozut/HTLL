"use client";

import { useEffect, useMemo, useState } from "react";
import type { ShopifyProduct, ShopifyVariant } from "./lib/shopify";
import "./storefront.css";

type CartLine = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    selectedOptions: Array<{ name: string; value: string }>;
    price: { amount: string; currencyCode: string };
    image: { url: string; altText: string | null } | null;
    product: { title: string; featuredImage: { url: string; altText: string | null } | null };
  };
};
type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: { subtotalAmount: { amount: string; currencyCode: string } };
  lines: { nodes: CartLine[] };
};

const CART_KEY = "htll-shopify-cart-id";

function money(amount: string, currencyCode: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency", currency: currencyCode, maximumFractionDigits: 2,
  }).format(Number(amount));
}

function optionLabel(variant: ShopifyVariant) {
  return variant.selectedOptions.map((option) => option.value).join(" / ") || variant.title;
}

export function Storefront({ product }: { product: ShopifyProduct }) {
  const firstAvailable = product.variants.find((variant) => variant.availableForSale) ?? product.variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(firstAvailable?.id ?? "");
  const [bagOpen, setBagOpen] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [cartError, setCartError] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const selectedVariant = useMemo(
    () => product.variants.find((variant) => variant.id === selectedVariantId) ?? firstAvailable,
    [firstAvailable, product.variants, selectedVariantId],
  );
  const currentLine = cart?.lines.nodes[0] ?? null;
  const productImages = product.images.length > 0
    ? product.images
    : product.featuredImage
      ? [product.featuredImage]
      : [];
  const productImage = productImages[selectedImageIndex] ?? productImages[0] ?? null;

  useEffect(() => {
    document.body.style.overflow = bagOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [bagOpen]);

  useEffect(() => {
    const cartId = window.localStorage.getItem(CART_KEY);
    if (!cartId) return;
    fetch("/api/shopify/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get", cartId }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.cart) setCart(data.cart);
        else window.localStorage.removeItem(CART_KEY);
      })
      .catch(() => window.localStorage.removeItem(CART_KEY));
  }, []);

  async function cartRequest(body: Record<string, unknown>) {
    setLoading(true);
    setCartError("");
    try {
      const response = await fetch("/api/shopify/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || data.error || data.userErrors?.length) {
        throw new Error(data.error ?? data.userErrors?.map((error: { message: string }) => error.message).join("; ") ?? "Sepet güncellenemedi.");
      }
      setCart(data.cart);
      if (data.cart?.id) window.localStorage.setItem(CART_KEY, data.cart.id);
      if (!data.cart?.totalQuantity) window.localStorage.removeItem(CART_KEY);
      return data.cart as Cart;
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Sepet güncellenemedi.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function addToBag() {
    if (!selectedVariant?.availableForSale) return;
    const nextCart = await cartRequest({
      action: currentLine ? "update" : "add",
      cartId: cart?.id,
      lineId: currentLine?.id,
      merchandiseId: selectedVariant.id,
      quantity: 1,
    });
    if (nextCart) setBagOpen(true);
  }

  async function removeFromBag() {
    if (!cart?.id || !currentLine?.id) return;
    await cartRequest({ action: "remove", cartId: cart.id, lineId: currentLine.id });
  }

  return (
    <main className="storefront" id="top">
      <a className="skip-link" href="#pant">Ürüne geç</a>
      <header className="site-header">
        <a className="brand-wordmark" href="#top" aria-label="High Tech Low Life ana sayfa"><img src="/brand/wordmark.png" alt="HTLL" /></a>
        <nav aria-label="Ana menü"><a href="#pant">Drop 001</a><a href="/bilgi/hakkimizda">Hakkımızda</a><a href="/bilgi/iletisim">İletişim</a></nav>
        <button className="bag-button" onClick={() => setBagOpen(true)}>Sepet <sup>{cart?.totalQuantity ?? 0}</sup></button>
      </header>

      <div className="collection-line"><span>HIGH TECH LOW LIFE</span><span>DROP 001 / 2026</span></div>

      <section className="product" id="pant">
        <div className="product-image-wrap">
          <p className="image-count">{String(selectedImageIndex + 1).padStart(2, "0")} / {String(Math.max(productImages.length, 1)).padStart(2, "0")}</p>
          <img className="pant-image" src={productImage?.url ?? "/pant-product.png"} alt={productImage?.altText ?? product.title} />
          {productImages.length > 1 && (
            <div className="product-gallery" aria-label={`${product.title} görselleri`}>
              {productImages.map((image, index) => (
                <button
                  key={image.url}
                  type="button"
                  className={selectedImageIndex === index ? "selected" : ""}
                  onClick={() => setSelectedImageIndex(index)}
                  aria-label={`${product.title}, görsel ${index + 1}`}
                  aria-pressed={selectedImageIndex === index}
                >
                  <img src={image.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-info"><div className="product-sticky">
          <p className="eyebrow">High Tech Low Life / Drop 001</p>
          <h1>{product.title}</h1>
          {selectedVariant && <p className="price">{money(selectedVariant.price.amount, selectedVariant.price.currencyCode)}</p>}
          <p className="description">14 oz denim. Eskitilmiş yıkama. Değiştirilebilir double-knee patch sistemiyle uyumlu base şort.</p>
          <p className="patch-note">PATCH’LER AYRI SATILIR.</p>

          <fieldset className="size-picker">
            <legend>Beden seç</legend>
            <div>
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  className={selectedVariantId === variant.id ? "selected" : ""}
                  onClick={() => setSelectedVariantId(variant.id)}
                  aria-pressed={selectedVariantId === variant.id}
                  disabled={!variant.availableForSale}
                  title={variant.availableForSale ? `${variant.quantityAvailable ?? ""} adet stokta` : "Tükendi"}
                >
                  {optionLabel(variant)}
                </button>
              ))}
            </div>
          </fieldset>

          <button className="add-button" onClick={addToBag} disabled={loading || !selectedVariant?.availableForSale}>
            <span>{loading ? "Ekleniyor…" : currentLine ? "Sepeti güncelle" : "Sepete ekle"}</span>
            {selectedVariant && <span>{money(selectedVariant.price.amount, selectedVariant.price.currencyCode)}</span>}
          </button>
          {cartError && <p className="cart-error" role="alert">{cartError}</p>}

          <div className="product-notes" id="details">
            <details><summary>Ürün detayları</summary><p>{product.description || "Ürün açıklaması yakında eklenecek."}</p></details>
            <details><summary>Kargo ve iade</summary><p>Türkiye içi gönderim. 4.000 TL ve üzeri siparişlerde ücretsiz kargo. Ön sipariş süresi ayrıca belirtilmediyse 7 iş günü içinde kargoya teslim edilir. Teslimattan itibaren 14 gün içinde cayma hakkı. <a href="/bilgi/teslimat-ve-kargo">Teslimat koşulları</a> · <a href="/bilgi/iptal-cayma-ve-iade">İade koşulları</a></p></details>
          </div>
        </div></div>
      </section>

      <footer>
        <div className="footer-identity"><a className="brand-symbol" href="#top" aria-label="HTLL ana sayfa"><img src="/brand/symbol-white.png" alt="" /></a><p>HIGH TECH LOW LIFE STUDIOS<br />Independent clothing. İstanbul.</p></div>
        <div className="footer-links"><a href="#pant">Koleksiyonu keşfet ↗</a><a href="mailto:hightechlowlifestudios@gmail.com">Bize ulaşın ↗</a><a href="https://www.instagram.com/htll.studios/" target="_blank" rel="noreferrer">Instagram @htll.studios ↗</a></div>
        <div className="footer-legal"><span>© 2026 HTLL</span><nav className="store-policy-links" aria-label="Yasal bilgiler">
          <a href="/bilgi/hakkimizda">Hakkımızda</a>
          <a href="/bilgi/iletisim">İletişim</a>
          <a href="/bilgi/teslimat-ve-kargo">Teslimat ve Kargo</a>
          <a href="/bilgi/iptal-cayma-ve-iade">İptal, Cayma ve İade</a>
          <a href="/bilgi/on-bilgilendirme">Ön Bilgilendirme</a>
          <a href="/bilgi/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</a>
          <a href="/bilgi/gizlilik">Gizlilik ve Kişisel Veriler</a>
          <a href="/bilgi/waitlist-bilgilendirmesi">Waitlist Bilgilendirmesi</a>
        </nav></div>
      </footer>

      <div className={`overlay ${bagOpen ? "visible" : ""}`} onClick={() => setBagOpen(false)} />
      <aside className={`bag-drawer ${bagOpen ? "open" : ""}`} aria-hidden={!bagOpen} aria-label="Alışveriş sepeti">
        <div className="drawer-head"><p>Sepetiniz ({cart?.totalQuantity ?? 0})</p><button onClick={() => setBagOpen(false)} aria-label="Sepeti kapat">×</button></div>
        {currentLine && cart ? (
          <>
            <div className="bag-line">
              <img src={currentLine.merchandise.image?.url ?? currentLine.merchandise.product.featuredImage?.url ?? "/pant-product.png"} alt={currentLine.merchandise.product.title} />
              <div><h2>{currentLine.merchandise.product.title}</h2><p>{currentLine.merchandise.selectedOptions.map((option) => `${option.name}: ${option.value}`).join(" · ")}</p><button onClick={removeFromBag} disabled={loading}>Kaldır</button></div>
              <p>{money(currentLine.merchandise.price.amount, currentLine.merchandise.price.currencyCode)}</p>
            </div>
            <div className="drawer-total">
              <div><span>Ara toplam</span><span>{money(cart.cost.subtotalAmount.amount, cart.cost.subtotalAmount.currencyCode)}</span></div>
              <button onClick={() => window.location.assign(cart.checkoutUrl)}>Ödemeye devam et</button>
              <p className="checkout-policy-links"><a href="/bilgi/on-bilgilendirme" target="_blank" rel="noopener noreferrer">Ön Bilgilendirme</a> · <a href="/bilgi/mesafeli-satis-sozlesmesi" target="_blank" rel="noopener noreferrer">Mesafeli Satış Sözleşmesi</a></p>
              <p>Güvenli ödeme Shopify üzerinden tamamlanır.</p>
            </div>
          </>
        ) : (
          <div className="empty-bag"><p>Sepetiniz boş.</p><button onClick={() => { setBagOpen(false); document.querySelector("#pant")?.scrollIntoView(); }}>Ürünü gör</button></div>
        )}
      </aside>
    </main>
  );
}
