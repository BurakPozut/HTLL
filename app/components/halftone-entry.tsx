"use client";

import { useEffect, useRef, useState } from "react";
import "./halftone-entry.css";
import { formatTurkishPhoneInput } from "../lib/registration";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const smooth = (n: number) => { const v = clamp(n); return v * v * (3 - 2 * v); };

// Two cached SVG layers, rather than thousands of per-frame text draws.
export function HalftoneSkull() {
  return <div className="skull-scene" aria-hidden="true">
    <div className="code-rain">{Array.from({ length: 12 }, (_, i) => <span key={i} style={{ left: `${i * 9}%`, animationDelay: `${-i * 1.7}s`, animationDuration: `${16 + i % 4 * 3}s` }}>01001101<br />00110110<br />11001001<br />01010010<br />10100101<br />01101000</span>)}</div>
    <div className="skull-position"><div className="skull-zoom"><div className="skull-idle">
      <svg className="skull-upper" viewBox="0 0 400 500" role="presentation">
        <defs>
          <pattern id="bone-dots" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.35" fill="#c6d9c3" /></pattern>
          <pattern id="shadow-dots" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="#829f81" /></pattern>
          <mask id="skull-cutouts"><rect width="400" height="500" fill="white" />
            <path d="M78 225 C82 207 112 198 143 210 L171 228 C180 246 165 277 143 283 C119 290 86 278 78 259 Z M322 225 C318 207 288 198 257 210 L229 228 C220 246 235 277 257 283 C281 290 314 278 322 259 Z" fill="black" />
            <path d="M199 267 C192 272 175 298 179 312 Q184 322 197 310 Q205 325 220 314 C225 304 207 273 203 267 Z" fill="black" />
          </mask>
        </defs>
        <g mask="url(#skull-cutouts)">
          <path fill="url(#bone-dots)" d="M200 30 C123 28 67 72 57 136 C50 170 59 198 64 218 L56 258 Q49 283 67 305 L99 322 L122 348 L130 372 Q200 397 270 372 L278 348 L301 322 L333 305 Q351 283 344 258 L336 218 C341 198 350 170 343 136 C333 72 277 28 200 30 Z" />
          <path fill="#030605" opacity=".68" d="M62 154 Q81 72 155 51 Q102 95 102 156 L82 190 L69 210 Z M338 154 Q319 72 245 51 Q298 95 298 156 L318 190 L331 210 Z" />
          <path fill="#030605" d="M72 198 Q114 171 166 205 L180 222 L167 213 Q121 191 81 216 Z M328 198 Q286 171 234 205 L220 222 L233 213 Q279 191 319 216 Z M73 282 L101 288 L128 307 L118 333 L92 311 Z M327 282 L299 288 L272 307 L282 333 L308 311 Z" />
          <path fill="url(#shadow-dots)" d="M84 287 L114 297 L135 316 L128 339 L103 315 Z M316 287 L286 297 L265 316 L272 339 L297 315 Z" />
          <path fill="#030605" d="M135 335 Q158 325 173 329 L165 343 L142 350 Z M265 335 Q242 325 227 329 L235 343 L258 350 Z M142 365 Q200 351 258 365 L259 392 L141 392 Z" />
          <path d="M200 52 L196 90 L208 108 L201 139 M196 91 L181 98" fill="none" stroke="#030605" strokeWidth="2" />
        </g>
        <g fill="url(#bone-dots)" stroke="#030605" strokeWidth="2">
          {Array.from({ length: 10 }, (_, i) => { const x = 133 + i * 13.4; const edge = Math.abs(i - 4.5); return <rect key={i} x={x} y={352 - edge * .5} width="12.6" height={27 - edge * 1.8} rx="3" />; })}
        </g>
      </svg>
      <svg className="skull-jaw" viewBox="0 0 400 500" role="presentation">
        <defs><pattern id="jaw-dots" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#adcaab" /></pattern></defs>
        <path fill="url(#jaw-dots)" d="M77 320 L94 324 L110 374 Q119 394 140 396 L260 396 Q281 394 290 374 L306 324 L323 320 L309 386 Q301 416 274 434 Q250 453 200 458 Q150 453 126 434 Q99 416 91 386 Z" />
        <path fill="#030605" opacity=".6" d="M124 414 Q200 448 276 414 Q252 444 200 446 Q148 444 124 414 Z" />
        <g fill="url(#jaw-dots)" stroke="#030605" strokeWidth="2">{Array.from({ length: 10 }, (_, i) => <rect key={i} x={135 + i * 13} y={380 + Math.abs(i - 4.5) * .5} width="12" height="22" rx="3" />)}</g>
      </svg>
    </div></div></div>
  </div>;
}

export function DropEntry() {
  const root = useRef<HTMLElement>(null);
  const formInteraction = useRef(false);
  const [phase, setPhase] = useState(0);
  const [notice, setNotice] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => {
    const section = root.current;
    if (!section) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, current = 0, target = 0, start = 0, distance = 1, lastPhase = -1;
    const zoom = section.querySelector<HTMLElement>(".skull-zoom")!;
    const jaw = section.querySelector<SVGSVGElement>(".skull-jaw")!;
    const scene = section.querySelector<HTMLElement>(".skull-scene")!;
    const intro = section.querySelector<HTMLElement>(".entry-heading")!;
    const coordinate = section.querySelector<HTMLElement>(".entry-coordinate")!;
    let lastTime = 0;
    const paint = (time: number) => {
      const delta = Math.min(64, time - (lastTime || time - 16));
      lastTime = time;
      current = reduced.matches ? target : current + (target - current) * (1 - Math.exp(-delta / 65));
      if (Math.abs(target - current) < .00015) current = target;
      const p = current;
      const travel = smooth((p - .25) / .63);
      const opening = smooth(p / .5);
      // Only transform/opacity change during scroll; no geometry or text redraw loop.
      zoom.style.transform = `translate3d(0,${-travel * 29}%,0) scale(${1 + travel * travel * 13})`;
      jaw.style.transform = `translate3d(0,${opening * 16}%,0) rotateX(${-opening * 24}deg)`;
      scene.style.opacity = String(1 - smooth((p - .76) / .12));
      intro.style.opacity = coordinate.style.opacity = String(1 - smooth(p / .23));
      const phase = p >= .89 ? 3 : p > .55 ? 2 : p > .12 ? 1 : 0;
      if (phase !== lastPhase) { lastPhase = phase; setPhase(phase); }
      frame = current !== target ? requestAnimationFrame(paint) : 0;
      if (!frame) lastTime = 0;
    };
    const update = () => {
      target = formInteraction.current ? 1 : clamp((window.scrollY - start) / distance);
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const measure = () => {
      if (formInteraction.current) { update(); return; }
      start = window.scrollY + section.getBoundingClientRect().top;
      distance = Math.max(1, section.offsetHeight - window.innerHeight);
      update();
    };
    measure();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", update); window.removeEventListener("resize", measure); };
  }, []);
  const skip = () => {
    const section = root.current;
    if (section) window.scrollTo({ top: window.scrollY + section.getBoundingClientRect().top + section.offsetHeight - window.innerHeight, behavior: "instant" });
  };
  return (
    <main className={`drop-entry phase-${phase}`} ref={root}>
      <div className="entry-stage">
        <HalftoneSkull />
        <div className="entry-grain" aria-hidden="true" />
        <header className="entry-header">
          <a href="#" className="entry-brand" aria-label="High Tech Low Life">HT<span>/</span>LL<span className="brand-dot">®</span></a>
          <span className="entry-edition">INDEPENDENT SYSTEMS<br />ISTANBUL · EST. 2026</span>
          <button className="entry-skip" onClick={skip}>KAYDA GEÇ <span>↗</span></button>
        </header>
        <div className="entry-heading"><p>TRANSMISSION 001 / ACCESS RESTRICTED</p><h1>HIGH TECH<br /><span>LOW LIFE.</span></h1></div>
        <div className="entry-coordinate" aria-hidden="true">SYS. HTLL_001<br />41°00′ N / 28°58′ E<br /><span>● SIGNAL ACTIVE</span></div>
        {phase < 3 && <div className="entry-scroll"><span>{phase === 0 ? "SCROLL TO ENTER" : phase === 1 ? "OPENING THE GATE" : "ENTER THE VOID"}</span><div /><span className="scroll-arrow">↓</span></div>}
        <div className="entry-footer"><span>NOT FOR EVERYONE.</span><span>DROP 001 — COMING SOON</span><span>© HT/LL STUDIOS</span></div>
        {phase === 3 && <section className="entry-access" aria-label="Drop bildirim formu" onFocusCapture={() => { formInteraction.current = true; }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) formInteraction.current = false; }}>
          <div className="window-echo echo-one" aria-hidden="true"><div>System Error — HT/LL</div></div>
          <div className="window-echo echo-two" aria-hidden="true"><div>Connection interrupted</div></div>
          <div className="retro-window">
            <div className="retro-title"><span>System Access — HT/LL</span><button aria-label="Giriş sahnesine dön" onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}>×</button></div>
            <div className="retro-content">
              <div className="retro-message"><span className="warning-symbol" aria-hidden="true">⚠</span><div><h2>You are early.</h2><p>Drop 001 henüz açılmadı.<br />Sinyali ilk alanlardan ol.</p></div></div>
              <form onSubmit={(event) => { event.preventDefault(); setNotice("Bu bir ön izleme. Kayıt bağlantısı henüz aktif değil; bilgilerin gönderilmedi."); }}>
                <label htmlFor="entry-email">E-posta adresi<input id="entry-email" type="email" name="email" autoComplete="email" placeholder="you@underground.net" required /></label>
                <label htmlFor="entry-phone">Telefon numarası <span>(isteğe bağlı)</span><input id="entry-phone" type="tel" inputMode="numeric" name="phone" autoComplete="tel-national" placeholder="5XX-XXX-XXXX" pattern="5[0-9]{2}-[0-9]{3}-[0-9]{4}" maxLength={12} title="5XX-XXX-XXXX formatında bir telefon numarası yazın" value={phone} onChange={(event) => setPhone(formatTurkishPhoneInput(event.currentTarget.value))} /></label>
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
