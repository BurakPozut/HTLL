"use client";

import { useEffect, useRef, useState } from "react";
import "./drop-entry.css";
import { BinarySkull } from "./binary-skull";

const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function DropEntry() {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [phase, setPhase] = useState(0);
  const [notice, setNotice] = useState("");
  const [loadProgress, setLoadProgress] = useState(0);
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
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
    document.body.classList.add("booting");
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(exitTimer);
      document.body.classList.remove("booting");
      document.body.style.overflow = "";
    };
  }, []);
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
      const p = current;
      progress.current = p;
      const phase = p >= .89 ? 3 : p > .55 ? 2 : p > .12 ? 1 : 0;
      if (phase !== lastPhase) { lastPhase = phase; setPhase(phase); }
      frame = current !== target ? requestAnimationFrame(paint) : 0;
      if (!frame) lastTime = 0;
    };
    const update = () => {
      target = clamp((window.scrollY - start) / distance);
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const measure = () => {
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
    <main className={`drop-entry phase-${phase}`} ref={root} aria-label="Kurukafa giriş sahnesi. Kayıt ekranına ulaşmak için aşağı kaydırın.">
      {loaderVisible && <section className={`boot-screen ${booted ? "boot-screen-exit" : ""}`} aria-label="HTLL sistemi yükleniyor" aria-live="polite">
        <div className="boot-grid" aria-hidden="true" />
        <div className="boot-corner boot-corner-tl">HT/LL_BOOT<br />NODE 001 / ISTANBUL</div>
        <div className="boot-corner boot-corner-tr">SECURE CHANNEL<br />ENCRYPTED</div>
        <div className="boot-corner boot-corner-bl">SIGNAL: <span>ACTIVE</span><br />MEMORY CHECK: OK</div>
        <div className="boot-corner boot-corner-br">DROP_001<br />PRE-RELEASE SYSTEM</div>
        <div className="boot-window">
          <div className="boot-titlebar"><span>HTLL_DOWNLOAD_MANAGER.EXE</span><span className="boot-window-actions">— □ ×</span></div>
          <div className="boot-content">
            <div className="boot-heading"><div>Downloading...</div><strong>{String(loadProgress).padStart(2, "0")}%</strong></div>
            <div className="boot-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={loadProgress}>
              {Array.from({ length: 28 }, (_, index) => <span key={index} className={index < Math.ceil(loadProgress / 100 * 28) ? "filled" : ""} />)}
            </div>
            <div className="boot-rate"><span>TRANSFERRING: HTLL_DROP_001 / ENCRYPTED</span><span>RATE: {Math.max(12, Math.round((loadProgress + 8) * 1.7))} KB/S</span></div>
            <div className="boot-details"><div><small>FILE</small><span>SKULL_ACCESS_GATE</span></div><div><small>STATUS</small><span>{loadProgress < 100 ? "BUFFERING" : "READY"}</span></div><div><small>ETA</small><span>{loadProgress < 100 ? `00:0${Math.max(0, Math.ceil((100 - loadProgress) / 40))}` : "00:00"}</span></div></div>
          </div>
          <div className="boot-statusbar"><span>HT/LL NETWORK</span><span>PLEASE WAIT</span></div>
        </div>
        <div className="boot-prompt">INITIALIZING ACCESS GATE<span className="boot-cursor">_</span></div>
      </section>}
      <div className="entry-stage">
        <BinarySkull progress={progress} />
        <div className="entry-symbol" role="img" aria-label="High Tech Low Life">
          <span className="symbol-base" />
          <span className="symbol-glitch symbol-glitch-a" aria-hidden="true" />
          <span className="symbol-glitch symbol-glitch-b" aria-hidden="true" />
        </div>
        {phase === 3 && <section className="entry-access" aria-label="Drop bildirim formu">
          <div className="window-echo echo-one" aria-hidden="true"><div>System Error — HT/LL</div></div>
          <div className="window-echo echo-two" aria-hidden="true"><div>Connection interrupted</div></div>
          <div className="retro-window">
            <div className="retro-title"><span>System Access — HT/LL</span><button aria-label="Giriş sahnesine dön" onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}>×</button></div>
            <div className="retro-content">
              <div className="retro-message"><span className="warning-symbol" aria-hidden="true">⚠</span><div><h2>You are early.</h2><p>Drop 001 henüz açılmadı.<br />Sinyali ilk alanlardan ol.</p></div></div>
              <form onSubmit={(event) => { event.preventDefault(); setNotice("Bu bir ön izleme. Kayıt bağlantısı henüz aktif değil; bilgilerin gönderilmedi."); }}>
                <label htmlFor="entry-email">E-posta adresi<input id="entry-email" type="email" name="email" autoComplete="email" placeholder="you@underground.net" required /></label>
                <label htmlFor="entry-phone">Telefon numarası <span>(isteğe bağlı)</span><input id="entry-phone" type="tel" name="phone" autoComplete="tel" placeholder="+90" /></label>
                <p className="preview-note">ÖN İZLEME / KAYIT HENÜZ AKTİF DEĞİL</p>
                <div className="retro-actions"><button type="submit">Erişim iste ↵</button></div>
                <p className="entry-notice" role="status">{notice}</p>
              </form>
            </div>
            <div className="retro-status"><span>HT/LL NETWORK</span><span>WAITING FOR DROP_001</span></div>
          </div>
        </section>}
      </div>
    </main>
  );
}
