"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./drop-entry.css";
import { BinarySkull } from "./binary-skull";
import { IntroFlash } from "./intro-flash";
import { formatTurkishPhoneInput } from "../lib/registration";

const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function DropEntry() {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const scrollFinished = useRef(false);
  const [phase, setPhase] = useState(0);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmationStep, setConfirmationStep] = useState(false);
  const [phone, setPhone] = useState("");
  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || confirmationStep) return;
    const values = new FormData(event.currentTarget);
    setSubmitting(true); setNotice("");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.get("email"), phone: values.get("phone"), consent: values.get("consent") === "on", website: values.get("website") }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Kayıt tamamlanamadı.");
      setConfirmationStep(true); setNotice("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Bağlantı kurulamadı. Tekrar dene."); }
    finally { setSubmitting(false); }
  }
  const [loadProgress, setLoadProgress] = useState(0);
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [booted, setBooted] = useState(false);
  const [introFinished, setIntroFinished] = useState(false);
  const finishIntro = useCallback(() => setIntroFinished(true), []);

  useEffect(() => {
    if (booted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.classList.add("booting");
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("booting");
      document.body.style.overflow = previousOverflow;
    };
  }, [booted]);

  useEffect(() => {
    if (!introFinished) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const duration = reduced.matches ? 500 : 2400;
    const startedAt = performance.now();
    let frame = 0;
    let exitTimer = 0;

    const tick = (now: number) => {
      const raw = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - raw, 3);
      setLoadProgress(Math.round(eased * 100));
      if (raw < 1) {
        frame = requestAnimationFrame(tick);
        return;
      }
      setBooted(true);
      exitTimer = window.setTimeout(() => setLoaderVisible(false), reduced.matches ? 120 : 620);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(exitTimer);
    };
  }, [introFinished]);
  useEffect(() => {
    const section = root.current;
    if (!section) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, current = 0, target = 0, start = 0, distance = 1, lastPhase = -1;
    let lastTime = 0;
    const paint = (time: number) => {
      const delta = Math.min(64, time - (lastTime || time - 16));
      lastTime = time;
      current = reduced.matches ? target : current + (target - current) * (1 - Math.exp(-delta / 65));
      if (Math.abs(target - current) < .00015) current = target;
      let p = current;
      if (p >= .89 || scrollFinished.current) {
        scrollFinished.current = true;
        current = target = p = 1;
      }
      progress.current = p;
      const phase = p >= .89 ? 3 : p > .55 ? 2 : p > .12 ? 1 : 0;
      if (phase !== lastPhase) { lastPhase = phase; setPhase(phase); }
      frame = current !== target ? requestAnimationFrame(paint) : 0;
      if (!frame) lastTime = 0;
    };
    const update = () => {
      target = scrollFinished.current ? 1 : clamp((window.scrollY - start) / distance);
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const measure = () => {
      // Mobile keyboards resize the viewport. Once the reveal is complete,
      // never let those resize/scroll events restart the entrance animation.
      if (scrollFinished.current) { update(); return; }
      start = window.scrollY + section.getBoundingClientRect().top;
      distance = Math.max(1, section.offsetHeight - window.innerHeight);
      update();
    };
    measure();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", update); window.removeEventListener("resize", measure); };
  }, []);
  return (
    <main className={`drop-entry phase-${phase} ${booted ? "booted" : ""}`} ref={root} aria-label="Kurukafa giriş sahnesi. Kayıt ekranına ulaşmak için aşağı kaydırın.">
      {!introFinished && <IntroFlash onComplete={finishIntro} />}
      {introFinished && loaderVisible && <section className={`boot-screen ${booted ? "boot-screen-exit" : ""}`} aria-label="HTLL sistemi yükleniyor" aria-live="polite">
        <div className="simple-loader" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={loadProgress}>
          <span style={{ width: `${loadProgress}%` }} />
        </div>
      </section>}
      <div className="entry-stage">
        <BinarySkull progress={progress} />
        <div className="entry-symbol" role="img" aria-label="High Tech Low Life">
          <span className="symbol-base" />
          <span className="symbol-glitch symbol-glitch-a" aria-hidden="true" />
          <span className="symbol-glitch symbol-glitch-b" aria-hidden="true" />
        </div>
        {phase === 3 && <section className="entry-access" aria-label="Drop bildirim formu">
          <div className="window-echo echo-one" aria-hidden="true"><div>Access Request — HT/LL</div></div>
          <div className="window-echo echo-two" aria-hidden="true"><div>Password Required</div></div>
          <div className="retro-window">
            <div className="retro-title"><span>System Access — HT/LL</span><button aria-label="Giriş sahnesini yeniden başlat" onClick={() => window.location.reload()}>×</button></div>
            <div className="retro-content">
              {!confirmationStep ? <>
                <div className="retro-message"><span className="warning-symbol" aria-hidden="true">⚠</span><div><h2>GET YOUR EARLY ACCESS<br />PASSWORD</h2><p>REGISTER TO RECEIVE YOUR PASS.</p></div></div>
                <form onSubmit={subscribe}>
                  <fieldset disabled={submitting} className="registration-fields">
                  <div className="registration-grid">
                    <label htmlFor="entry-email">E-posta adresi<input id="entry-email" type="email" name="email" autoComplete="email" placeholder="you@underground.net" required /></label>
                    <label htmlFor="entry-phone">Telefon numarası <span>(isteğe bağlı)</span><input id="entry-phone" type="tel" inputMode="numeric" name="phone" autoComplete="tel-national" placeholder="5XX-XXX-XXXX" pattern="5[0-9]{2}-[0-9]{3}-[0-9]{4}" maxLength={12} title="5XX-XXX-XXXX formatında bir telefon numarası yazın" value={phone} onChange={(event) => setPhone(formatTurkishPhoneInput(event.currentTarget.value))} /></label>
                  </div>
                  <div className="registration-trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
                  <label className="registration-consent"><input type="checkbox" name="consent" required /><span>HTLL’nin drop açılışı hakkında e-posta ve paylaşırsam telefon yoluyla bana haber vermesini istiyorum.</span></label>
                  <div className="retro-actions"><button type="submit">{submitting ? "Kaydediliyor…" : "GET PASSWORD ↵"}</button></div>
                  </fieldset>
                  <p className="entry-notice" role="status">{notice}</p>
                </form>
              </> : <div className="confirmation-panel" role="status">
                <div className="retro-message"><span className="confirmation-symbol" aria-hidden="true">✓</span><div><h2>ACCESS REQUEST<br />RECEIVED</h2><p>YOUR EARLY ACCESS PASSWORD<br />WILL BE SENT TO YOUR EMAIL SOON.</p></div></div>
                <div className="confirmation-stamp">STATUS: TRANSMISSION QUEUED</div>
                <a className="confirmation-instagram" href="https://www.instagram.com/htll.studios/" target="_blank" rel="noopener noreferrer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                  <span>FOLLOW US ON INSTAGRAM</span>
                </a>
              </div>}
            </div>
            <div className="retro-status"><span>HT/LL NETWORK</span><span>WAITING FOR DROP_001</span></div>
          </div>
        </section>}
      </div>
    </main>
  );
}
