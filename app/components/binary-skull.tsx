"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const p = clamp(n); return p * p * (3 - 2 * p); };

// The silhouettes are sampled once; all glyph rendering and perspective run on the GPU.
export function BinarySkull({ progress }: { progress: RefObject<number> }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let release = () => {};
    async function setup() {
      const THREE = await import("three");
      if (disposed || !host.current) return;
      const element = host.current;
      const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x030605, 0);
      element.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
      const skull = new THREE.Group(); scene.add(skull);
      const jaw = new THREE.Group(); jaw.position.set(0, -.7, 0); skull.add(jaw);
      const atlas = document.createElement("canvas"); atlas.width = 128; atlas.height = 64;
      const pen = atlas.getContext("2d")!;
      pen.fillStyle = "white"; pen.font = "bold 51px monospace"; pen.textAlign = "center"; pen.textBaseline = "middle";
      pen.fillText("0", 32, 33); pen.fillText("1", 96, 33);
      const texture = new THREE.CanvasTexture(atlas);
      const material = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { glyphs: { value: texture }, time: { value: 0 }, density: { value: 500 }, fade: { value: 1 } },
        vertexShader: `attribute float seed; attribute float light; varying float vSeed; varying float vLight; uniform float density;
          void main(){ vSeed=seed; vLight=light; vec4 p=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*p; gl_PointSize=clamp(density/(-p.z),2.,64.); }`,
        fragmentShader: `uniform sampler2D glyphs; uniform float time; uniform float fade; varying float vSeed; varying float vLight;
          void main(){ float digit=mod(floor(vSeed*91.)+floor(time*.65+vSeed*4.),2.); vec2 uv=vec2((gl_PointCoord.x+digit)*.5,1.-gl_PointCoord.y); float a=texture2D(glyphs,uv).a; if(a<.15) discard; float pulse=.88+.12*sin(time+vSeed*30.); gl_FragColor=vec4(vec3(.52,.93,.66)*vLight,a*fade*pulse); }`,
      });
      const geometries: InstanceType<typeof THREE.BufferGeometry>[] = [];
      let frame = 0;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      const onLost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); setFailed(true); };
      renderer.domElement.addEventListener("webglcontextlost", onLost);
      const resize = () => {
        const { width, height } = element.getBoundingClientRect();
        renderer.setSize(width, height);
        camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix();
        material.uniforms.density.value = height * renderer.getPixelRatio() * .073;
      };
      const observer = new ResizeObserver(resize); observer.observe(element); resize();
      release = () => {
        cancelAnimationFrame(frame); observer.disconnect();
        renderer.domElement.removeEventListener("webglcontextlost", onLost);
        geometries.forEach(g => g.dispose()); material.dispose(); texture.dispose(); renderer.dispose(); renderer.domElement.remove();
      };
      async function addSurface(name: "upper" | "jaw") {
        const img = new Image(); img.src = `/skull/${name}.svg`; await img.decode();
        if (disposed) return;
        const sample = document.createElement("canvas"); sample.width = 400; sample.height = 500;
        const context = sample.getContext("2d", { willReadFrequently: true })!;
        context.drawImage(img, 0, 0, 400, 500);
        const pixels = context.getImageData(0, 0, 400, 500).data;
        const positions: number[] = [], seeds: number[] = [], lights: number[] = [];
        const step = window.innerWidth < 700 ? 5 : 4;
        for (let y = 28; y < 462; y += step) for (let x = 52; x < 350; x += step) {
          const index = (y * 400 + x) * 4;
          if (pixels[index + 3] < 100 || pixels[index + 1] < 45) continue;
          const nx = (x - 200) / 150;
          const dome = Math.sqrt(Math.max(0, 1 - nx * nx));
          let z = .2 + dome * .64;
          if (y < 205) z *= Math.sqrt(Math.max(.12, 1 - ((y - 178) / 158) ** 2));
          if (y > 290) z = .4 + dome * .4;
          const cheek = Math.exp(-((Math.abs(nx) - .65) ** 2) / .03 - ((y - 290) / 28) ** 2);
          z += cheek * .17;
          const py = (250 - y) / 125;
          positions.push((x - 200) / 125, py + (name === "jaw" ? .7 : 0), z);
          seeds.push(((x * 73 + y * 37) % 997) / 997);
          lights.push((.5 + dome * .5) * pixels[index + 1] / 235);
        }
        const geometry = new THREE.BufferGeometry(); geometries.push(geometry);
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute("seed", new THREE.Float32BufferAttribute(seeds, 1));
        geometry.setAttribute("light", new THREE.Float32BufferAttribute(lights, 1));
        const points = new THREE.Points(geometry, material);
        (name === "jaw" ? jaw : skull).add(points);
      }
      await Promise.all([addSurface("upper"), addSurface("jaw")]);
      if (disposed) return;
      let last = -1, sampleStart = 0, sampleFrames = 0, cpuTime = 0;
      const render = (now: number) => {
        frame = requestAnimationFrame(render);
        const p = progress.current;
        if (document.hidden || p > .9) return;
        if (reduced.matches && last === p) return;
        last = p;
        const time = reduced.matches ? 0 : now / 1000;
        const align = 1 - ease(p / .35);
        skull.rotation.y = Math.sin(time * .38) * .13 * align;
        skull.rotation.z = Math.sin(time * .27) * .022 * align;
        skull.position.y = Math.sin(time * .8) * .025 * align;
        jaw.rotation.x = ease(p / .5) * .8;
        jaw.position.y = -.7 - ease(p / .5) * .25;
        const travel = ease((p - .25) / .63);
        const startZ = camera.aspect < .8 ? 13 : 8.9;
        camera.position.set(0, -.05 - travel * 1.33, startZ + (1.15 - startZ) * travel);
        camera.lookAt(0, -.05 - travel * 1.33, 0);
        material.uniforms.time.value = time;
        material.uniforms.fade.value = 1 - ease((p - .76) / .12);
        const renderStart = performance.now();
        renderer.render(scene, camera);
        cpuTime += performance.now() - renderStart;
        sampleFrames++;
        if (!sampleStart) sampleStart = now;
        if (now - sampleStart >= 1000) {
          renderer.domElement.dataset.fps = String(Math.round(sampleFrames * 1000 / (now - sampleStart)));
          renderer.domElement.dataset.drawCalls = String(renderer.info.render.calls);
          renderer.domElement.dataset.points = String(renderer.info.render.points);
          renderer.domElement.dataset.cpuMs = (cpuTime / sampleFrames).toFixed(2);
          sampleStart = now; sampleFrames = 0; cpuTime = 0;
        }
      };
      frame = requestAnimationFrame(render);
    }
    setup().catch(() => { release(); if (!disposed) setFailed(true); });
    return () => { disposed = true; release(); };
  }, [progress]);
  return <div ref={host} className="binary-webgl" aria-hidden="true">{failed && <div className="binary-fallback"><span className="fallback-upper" /><span className="fallback-jaw" /></div>}</div>;
}
