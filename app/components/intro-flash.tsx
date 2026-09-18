"use client";

import { useEffect, useRef, useState } from "react";

const shots = ["eye", "date", "model"];
const FRAME_MS = 250;

export function IntroFlash({ onComplete }: { onComplete: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let deadline = 0;
    const finish = () => {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(deadline);
      onComplete();
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }

    // Decode the selected compositions before the quick cuts. Never block entry
    // indefinitely if an image is missing or the connection is too slow.
    deadline = window.setTimeout(finish, 3000);
    const images = [...(root.current?.querySelectorAll("img") ?? [])];
    Promise.all(images.map(image => image.decode())).then(() => {
      if (disposed) return;
      window.clearTimeout(deadline);
      let index = 0;
      let elapsed = 0;
      let previous = 0;
      setActive(index);
      const tick = (now: number) => {
        if (document.hidden) {
          previous = 0;
        } else {
          if (previous) elapsed += now - previous;
          previous = now;
          if (elapsed >= FRAME_MS) {
            elapsed = 0;
            index++;
            if (index === shots.length) { finish(); return; }
            setActive(index);
          }
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }).catch(finish);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(deadline);
    };
  }, [onComplete]);

  return <div ref={root} className="intro-flash" aria-hidden="true" data-frame={active}>
    {shots.map((shot, index) => <picture key={shot} className={active === index ? "intro-shot is-active" : "intro-shot"}>
      <source media="(max-width: 700px)" srcSet={`/intro/${shot}-mobile.webp`} />
      {/* Native picture selects and preloads only the required composition. */}
      <img src={`/intro/${shot}-desktop.webp`} alt="" loading="eager" decoding="async" fetchPriority="high" />
    </picture>)}
  </div>;
}
