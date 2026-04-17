"use client";

import { useEffect, useRef } from "react";

interface CircularGalleryItem {
  image: string;
  text: string;
}

interface CircularGalleryProps {
  items?: CircularGalleryItem[];
  bend?: number;
  textColor?: string;
  borderRadius?: number;
  scrollSpeed?: number;
  scrollEase?: number;
}

const VERT = `
  attribute vec3 position;
  attribute vec2 uv;

  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uBend;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 pos = position;

    if (abs(uBend) > 0.0001) {
      float r   = 1.0 / uBend;
      float ang = pos.x * uBend;
      pos.x = r * sin(ang);
      pos.z = pos.z + r * (cos(ang) - 1.0);
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAG = `
  precision highp float;

  uniform sampler2D uTexture;
  uniform float     uBorderRadius;
  uniform float     uOpacity;

  varying vec2 vUv;

  float roundedBox(vec2 uv, float r) {
    vec2 q = abs(uv - 0.5) - (0.5 - r);
    float d = length(max(q, 0.0)) - r;
    return 1.0 - smoothstep(-0.002, 0.002, d);
  }

  void main() {
    float mask = roundedBox(vUv, uBorderRadius);
    if (mask < 0.001) discard;
    vec4 tex = texture2D(uTexture, vUv);
    gl_FragColor = vec4(tex.rgb, tex.a * mask * uOpacity);
  }
`;

export default function CircularGallery({
  items = [],
  bend = 3,
  textColor = "#ffffff",
  borderRadius = 0.05,
  scrollSpeed = 2,
  scrollEase = 0.05,
}: CircularGalleryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || items.length === 0) return;

    let rafId = 0;
    let destroyed = false;
    let targetScroll = 0;
    let currentScroll = 0;
    let touchStartX = 0;
    const labelEls: HTMLDivElement[] = [];

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const CARD_W = 1.5;
    const CARD_H = 1.0;
    const W_SEG = 20;
    const H_SEG = 20;
    const FOV = 35;
    const CAM_Z = 5;
    const safeBend = Math.max(bend, 0.001);

    import("ogl").then(
      ({ Renderer, Camera, Transform, Mesh, Program, Geometry, Texture }) => {
        if (destroyed) return;

        // ── Renderer ──────────────────────────────────────────────────────
        const renderer = new Renderer({
          canvas,
          alpha: true,
          antialias: true,
        });
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // ── Camera ────────────────────────────────────────────────────────
        const camera = new Camera(gl, { fov: FOV });
        camera.position.z = CAM_Z;

        // ── Scene ─────────────────────────────────────────────────────────
        const scene = new Transform();

        // ── Resize ────────────────────────────────────────────────────────
        function resize() {
          renderer.setSize(container!.offsetWidth, container!.offsetHeight);
          camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
        }
        const ro = new ResizeObserver(resize);
        ro.observe(container);
        resize();

        // ── Plane geometry builder ─────────────────────────────────────────
        function makePlane(w: number, h: number, wSeg: number, hSeg: number) {
          const nx = wSeg + 1;
          const ny = hSeg + 1;
          const positions = new Float32Array(nx * ny * 3);
          const uvs = new Float32Array(nx * ny * 2);
          const indices = new Uint16Array(wSeg * hSeg * 6);

          let vi = 0;
          let ui = 0;
          for (let iy = 0; iy < ny; iy++) {
            for (let ix = 0; ix < nx; ix++) {
              positions[vi++] = (ix / wSeg - 0.5) * w;
              positions[vi++] = (iy / hSeg - 0.5) * h;
              positions[vi++] = 0;
              uvs[ui++] = ix / wSeg;
              uvs[ui++] = iy / hSeg;
            }
          }

          let ii = 0;
          for (let iy = 0; iy < hSeg; iy++) {
            for (let ix = 0; ix < wSeg; ix++) {
              const a = iy * nx + ix;
              const b = a + 1;
              const c = a + nx;
              const d = c + 1;
              indices[ii++] = a;
              indices[ii++] = c;
              indices[ii++] = b;
              indices[ii++] = b;
              indices[ii++] = c;
              indices[ii++] = d;
            }
          }

          return new Geometry(gl, {
            position: { size: 3, data: positions },
            uv: { size: 2, data: uvs },
            index: { size: 1, data: indices },
          });
        }

        // ── Arc layout ────────────────────────────────────────────────────
        const count = items.length;
        const totalAngle = safeBend * Math.PI;
        const angleStep = count > 1 ? totalAngle / (count - 1) : 0;
        const radius = count > 1 ? (CARD_W * count) / totalAngle : CAM_Z;

        // ── Build meshes ──────────────────────────────────────────────────
        type OGLMesh = InstanceType<typeof Mesh>;
        const meshes: OGLMesh[] = [];
        const opacities: number[] = [];

        items.forEach((item, i) => {
          const geo = makePlane(CARD_W, CARD_H, W_SEG, H_SEG);

          const tex = new Texture(gl, {
            generateMipmaps: false,
            minFilter: gl.LINEAR,
            magFilter: gl.LINEAR,
          });

          opacities[i] = 0;

          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            tex.image = img;
            (tex as unknown as { needsUpdate: boolean }).needsUpdate = true;
            opacities[i] = 1;
          };
          img.onerror = () => {
            opacities[i] = 0.5;
          };
          img.src = item.image;

          const prog = new Program(gl, {
            vertex: VERT,
            fragment: FRAG,
            uniforms: {
              uTexture: { value: tex },
              uBorderRadius: { value: borderRadius },
              uOpacity: { value: 0 },
              uBend: { value: 0 },
            },
            transparent: true,
            depthTest: false,
          });

          const mesh = new Mesh(gl, { geometry: geo, program: prog });

          const angle = count > 1 ? (i - (count - 1) / 2) * angleStep : 0;
          mesh.position.x = radius * Math.sin(angle);
          mesh.position.z = radius * Math.cos(angle) - radius;
          mesh.rotation.y = -angle;

          mesh.setParent(scene);
          meshes.push(mesh);

          // ── Text label (visual only — screen readers use the fallback list) ─
          const label = document.createElement("div");
          label.textContent = item.text;
          label.setAttribute("dir", "auto");
          label.setAttribute("aria-hidden", "true");
          label.style.cssText = [
            "position:absolute",
            `color:${textColor}`,
            "font-size:13px",
            "font-family:inherit",
            "text-align:center",
            "pointer-events:none",
            "white-space:nowrap",
            "transform:translateX(-50%)",
            "text-shadow:0 1px 6px rgba(0,0,0,0.7)",
            "letter-spacing:0.03em",
            "opacity:0",
            "transition:opacity 0.4s",
          ].join(";");
          container.appendChild(label);
          labelEls.push(label);
        });

        // ── 3-D → screen projection ────────────────────────────────────────
        function worldToScreen(
          wx: number,
          wy: number,
          wz: number
        ): { x: number; y: number } | null {
          const sy = Math.sin(scene.rotation.y);
          const cy = Math.cos(scene.rotation.y);
          const rx = cy * wx + sy * wz;
          const rz = -sy * wx + cy * wz;

          const vx = rx;
          const vy = wy;
          const vz = rz - CAM_Z;

          if (vz >= -0.01) return null;

          const fovRad = (FOV * Math.PI) / 180;
          const f = 1 / Math.tan(fovRad / 2);
          const cw = container!.offsetWidth;
          const ch = container!.offsetHeight;
          const aspect = cw / ch;

          const ndcX = (vx / -vz) * (f / aspect);
          const ndcY = (vy / -vz) * f;

          return {
            x: ((ndcX + 1) / 2) * cw,
            y: ((1 - ndcY) / 2) * ch,
          };
        }

        // ── RAF loop ───────────────────────────────────────────────────────
        function update() {
          rafId = requestAnimationFrame(update);

          currentScroll += prefersReduced
            ? targetScroll - currentScroll
            : (targetScroll - currentScroll) * scrollEase;

          scene.rotation.y = currentScroll;

          meshes.forEach((mesh, i) => {
            mesh.program.uniforms.uOpacity.value = opacities[i] ?? 0;
            mesh.program.uniforms.uBorderRadius.value = borderRadius;
            mesh.program.uniforms.uBend.value = safeBend * 0.5;

            const wx = mesh.position.x;
            const wy = mesh.position.y - CARD_H / 2 - 0.14;
            const wz = mesh.position.z;
            const screen = worldToScreen(wx, wy, wz);
            const label = labelEls[i];

            if (screen && label) {
              label.style.left = `${screen.x}px`;
              label.style.top = `${screen.y}px`;
              label.style.opacity = (opacities[i] ?? 0).toString();
            } else if (label) {
              label.style.opacity = "0";
            }
          });

          renderer.render({ scene, camera });
        }

        update();

        // ── Input events ───────────────────────────────────────────────────
        function onWheel(e: WheelEvent) {
          e.preventDefault();
          targetScroll += e.deltaY * scrollSpeed * 0.001;
        }
        function onTouchStart(e: TouchEvent) {
          touchStartX = e.touches[0].clientX;
        }
        function onTouchMove(e: TouchEvent) {
          const dx = touchStartX - e.touches[0].clientX;
          targetScroll += dx * scrollSpeed * 0.003;
          touchStartX = e.touches[0].clientX;
        }
        // Keyboard navigation (RTL: ArrowRight = previous, ArrowLeft = next)
        function onKeyDown(e: KeyboardEvent) {
          const step = scrollSpeed * 0.3;
          if (e.key === "ArrowLeft") { e.preventDefault(); targetScroll += step; }
          if (e.key === "ArrowRight") { e.preventDefault(); targetScroll -= step; }
        }

        canvas.addEventListener("wheel", onWheel, { passive: false });
        canvas.addEventListener("touchstart", onTouchStart, { passive: true });
        canvas.addEventListener("touchmove", onTouchMove, { passive: true });
        canvas.addEventListener("keydown", onKeyDown);

        (canvas as HTMLCanvasElement & { _oglCleanup?: () => void })._oglCleanup =
          () => {
            cancelAnimationFrame(rafId);
            ro.disconnect();
            canvas.removeEventListener("wheel", onWheel);
            canvas.removeEventListener("touchstart", onTouchStart);
            canvas.removeEventListener("touchmove", onTouchMove);
            canvas.removeEventListener("keydown", onKeyDown);
            labelEls.forEach((el) => el.remove());
            try {
              gl.getExtension("WEBGL_lose_context")?.loseContext();
            } catch {
              // ignore
            }
          };
      }
    );

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      labelEls.forEach((el) => el.remove());
      const c = canvas as HTMLCanvasElement & { _oglCleanup?: () => void };
      c._oglCleanup?.();
    };
  }, [items, bend, textColor, borderRadius, scrollSpeed, scrollEase]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="גלריית עבודות — גלול או השתמש בחצים לניווט"
        tabIndex={0}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          outline: "none",
        }}
        onFocus={(e) => { e.currentTarget.style.outline = "2px solid #c9a84c"; e.currentTarget.style.outlineOffset = "2px"; }}
        onBlur={(e) => { e.currentTarget.style.outline = "none"; }}
      />
      {/* Visually-hidden fallback for screen readers */}
      <ul
        aria-label="גלריית עבודות"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {items.map((item, i) => (
          <li key={i}>{item.text || `תמונה ${i + 1}`}</li>
        ))}
      </ul>
    </div>
  );
}
