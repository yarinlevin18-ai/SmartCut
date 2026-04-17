"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

interface LightRaysProps {
  raysOrigin?: string;
  raysColor?: string;
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  pulsating?: boolean;
  fadeDistance?: number;
  saturation?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  noiseAmount?: number;
  distortion?: number;
  className?: string;
  style?: React.CSSProperties;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [1, 1, 1];
}

function getOriginAndDir(
  origin: string,
  w: number,
  h: number
): { pos: [number, number]; dir: [number, number] } {
  switch (origin) {
    case "top-left":     return { pos: [-w * 0.2, h * 1.2], dir: [0.5, -0.7] };
    case "top-right":    return { pos: [w * 1.2,  h * 1.2], dir: [-0.5, -0.7] };
    case "left":         return { pos: [-w * 0.2, h * 0.5], dir: [1, 0] };
    case "right":        return { pos: [w * 1.2,  h * 0.5], dir: [-1, 0] };
    case "bottom-left":  return { pos: [-w * 0.2, -h * 0.2], dir: [0.5, 0.7] };
    case "bottom-center":return { pos: [w * 0.5,  -h * 0.2], dir: [0, 1] };
    case "bottom-right": return { pos: [w * 1.2,  -h * 0.2], dir: [-0.5, 0.7] };
    // top-center default
    default:             return { pos: [w * 0.5,  h * 1.2], dir: [0, -1] };
  }
}

export default function LightRays({
  raysOrigin = "top-center",
  raysColor = "#c9a84c",
  raysSpeed = 1,
  lightSpread = 0.6,
  rayLength = 2.5,
  pulsating = false,
  fadeDistance = 1.0,
  saturation = 1.0,
  followMouse = true,
  mouseInfluence = 0.08,
  noiseAmount = 0,
  distortion = 0,
  className = "",
  style,
}: LightRaysProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduce = useReducedMotion();
  const cleanupRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (shouldReduce || !containerRef.current) return;

    let animFrameId = 0;
    const startTime = performance.now();
    const mouse = { x: 0.5, y: 0.5 };
    const smoothMouse = { x: 0.5, y: 0.5 };

    const init = async () => {
      const el = containerRef.current;
      if (!el) return;

      const { Renderer, Program, Triangle, Mesh } = await import("ogl");

      const dpr = Math.min(window.devicePixelRatio, 2);
      const renderer = new Renderer({ dpr, alpha: true });
      const gl = renderer.gl;

      gl.canvas.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;";
      el.appendChild(gl.canvas);
      renderer.setSize(el.clientWidth, el.clientHeight);

      const W = el.clientWidth * dpr;
      const H = el.clientHeight * dpr;
      const { pos, dir } = getOriginAndDir(raysOrigin, W, H);
      const color = hexToRgb(raysColor);

      const vert = /* glsl */ `
        attribute vec2 position;
        void main() { gl_Position = vec4(position, 0.0, 1.0); }
      `;

      const frag = /* glsl */ `
        precision highp float;
        uniform float iTime;
        uniform vec2  iResolution;
        uniform vec2  rayPos;
        uniform vec2  rayDir;
        uniform vec3  raysColor;
        uniform float raysSpeed;
        uniform float lightSpread;
        uniform float rayLength;
        uniform float pulsating;
        uniform float fadeDistance;
        uniform float saturation;
        uniform vec2  mousePos;
        uniform float mouseInfluence;
        uniform float noiseAmount;
        uniform float distortion;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float vnoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          f = f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                     mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
        }

        float rayStrength(vec2 fc, vec2 origin, vec2 dirBase, float seed, float t) {
          vec2 mo = (mousePos - vec2(0.5)) * mouseInfluence * 2.0;
          vec2 d  = normalize(dirBase + mo);
          vec2 v  = fc - origin;
          float dist = length(v);
          vec2 nv = v / (dist + 0.001);
          float angle = dot(nv, d);
          float spread = lightSpread * 0.25 + 0.04;
          float af = smoothstep(1.0 - spread, 1.0, angle);
          float df = 1.0 - smoothstep(0.0, fadeDistance * iResolution.x * rayLength, dist);
          float strength = af * df;
          if (distortion > 0.0) {
            strength *= 1.0 + sin(dist * 0.008 + t * raysSpeed + seed) * distortion * 0.08;
          }
          if (noiseAmount > 0.0) {
            float n = vnoise(fc * 0.004 + t * 0.05);
            strength *= mix(1.0, n * 2.0, noiseAmount);
          }
          return clamp(strength, 0.0, 1.0);
        }

        vec3 toSat(vec3 c, float s) {
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          return mix(vec3(l), c, s);
        }

        void main() {
          vec2 fc = gl_FragCoord.xy;
          float t  = iTime * raysSpeed;
          float r1 = rayStrength(fc, rayPos, rayDir, 0.0,  t);
          float r2 = rayStrength(fc, rayPos, rayDir, 37.4, t + 1.3);
          float rays = r1 * 0.55 + r2 * 0.38;
          if (pulsating > 0.5) rays *= 0.65 + 0.35 * sin(iTime * 1.8);
          vec3 col = toSat(raysColor * rays, saturation);
          gl_FragColor = vec4(col, rays * 0.55);
        }
      `;

      const program = new Program(gl, {
        vertex: vert,
        fragment: frag,
        uniforms: {
          iTime:          { value: 0 },
          iResolution:    { value: [W, H] },
          rayPos:         { value: pos },
          rayDir:         { value: dir },
          raysColor:      { value: color },
          raysSpeed:      { value: raysSpeed },
          lightSpread:    { value: lightSpread },
          rayLength:      { value: rayLength },
          pulsating:      { value: pulsating ? 1.0 : 0.0 },
          fadeDistance:   { value: fadeDistance },
          saturation:     { value: saturation },
          mousePos:       { value: [0.5, 0.5] },
          mouseInfluence: { value: mouseInfluence },
          noiseAmount:    { value: noiseAmount },
          distortion:     { value: distortion },
        },
        transparent: true,
        depthTest: false,
      });

      const geo  = new Triangle(gl);
      const mesh = new Mesh(gl, { geometry: geo, program });

      const onMouse = (e: MouseEvent) => {
        mouse.x = e.clientX / window.innerWidth;
        mouse.y = 1.0 - e.clientY / window.innerHeight;
      };
      if (followMouse) window.addEventListener("mousemove", onMouse);

      const loop = () => {
        animFrameId = requestAnimationFrame(loop);
        const elapsed = (performance.now() - startTime) / 1000;
        program.uniforms.iTime.value = elapsed;
        smoothMouse.x += (mouse.x - smoothMouse.x) * 0.08;
        smoothMouse.y += (mouse.y - smoothMouse.y) * 0.08;
        program.uniforms.mousePos.value = [smoothMouse.x, smoothMouse.y];
        renderer.render({ scene: mesh });
      };
      loop();

      cleanupRef.current = () => {
        cancelAnimationFrame(animFrameId);
        if (followMouse) window.removeEventListener("mousemove", onMouse);
        try {
          const ext = gl.getExtension("WEBGL_lose_context");
          if (ext) ext.loseContext();
        } catch (_) {}
        gl.canvas.parentNode?.removeChild(gl.canvas);
      };
    };

    // Lazy-init via IntersectionObserver
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          init();
        }
      },
      { threshold: 0.01 }
    );
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      cleanupRef.current();
    };
  }, []); // intentionally run once; hot-prop changes not needed for static overlay

  if (shouldReduce) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        ...style,
      }}
    />
  );
}
