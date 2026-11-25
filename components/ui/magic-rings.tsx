"use client";

import React, { useEffect, useRef } from "react";

export interface MagicRingsProps {
  className?: string;
  color?: string;
  colorTwo?: string;
  speed?: number;
  ringCount?: number;
  opacity?: number;
  followMouse?: boolean;
  mouseStrength?: number;
}

const VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uBurst;
  uniform vec3 uColorOne;
  uniform vec3 uColorTwo;
  uniform vec3 uColorHighlight;
  uniform float uSpeed;
  uniform float uRingCount;
  uniform float uOpacity;
  uniform float uMouseStrength;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    float minDim = max(min(uResolution.x, uResolution.y), 1.0);
    vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution.xy) / minDim;

    float t = uTime * uSpeed;
    vec2 mouseOffset = (uMouse - 0.5) * uMouseStrength;
    vec2 center = vec2(
      sin(t * 0.55) * 0.045,
      cos(t * 0.42) * 0.045
    ) + mouseOffset;

    vec2 p = uv - center;
    float baseDist = length(p);
    float angle = atan(p.y, p.x);

    vec3 accumColor = vec3(0.0);
    float totalGlow = 0.0;

    for (int i = 0; i < 10; i++) {
      float fi = float(i);
      if (fi >= uRingCount) break;

      // Expansión continua y fluida hacia afuera + respiración orgánica
      float cycle = fract(fi / uRingCount + t * 0.13);
      float fadeIn = smoothstep(0.0, 0.16, cycle);
      float fadeOut = 1.0 - smoothstep(0.72, 1.0, cycle);
      float lifeAlpha = fadeIn * fadeOut;

      float targetRadius = 0.06 + cycle * 0.72 + uBurst * 0.04 * sin(fi + t * 3.0);

      // Ondas fluidas rotando continuamente alrededor de cada anillo
      float rot = t * (0.85 + mod(fi, 3.0) * 0.25) * (mod(fi, 2.0) == 0.0 ? 1.0 : -1.0);
      float wave =
        sin(angle * 3.0 + rot + fi * 1.3) * 0.024 +
        cos(angle * 5.0 - rot * 0.75 + fi * 0.8) * 0.012 +
        (noise(vec2(cos(angle) * 2.2 + t * 0.35, sin(angle) * 2.2 - t * 0.25 + fi)) - 0.5) * 0.028;

      float ringDist = abs(baseDist - (targetRadius + wave));

      // Núcleo nítido + halo luminoso suave
      float core = exp(-ringDist * 115.0) * 1.05;
      float halo = exp(-ringDist * 22.0) * 0.28;

      // Destello viajero orbital a lo largo del anillo
      float arc = pow(0.5 + 0.5 * sin(angle * 2.0 - rot * 1.4 + fi), 3.0);
      float ringIntensity = (core * (0.7 + 0.65 * arc) + halo) * lifeAlpha * (1.0 + uBurst * 0.45);

      float colorMix = 0.5 + 0.5 * sin(angle * 2.0 + t * 0.9 + fi * 0.7);
      vec3 ringCol = mix(uColorOne, uColorTwo, colorMix);
      ringCol = mix(ringCol, uColorHighlight, clamp(arc * core * 0.85, 0.0, 0.85));

      accumColor += ringCol * ringIntensity;
      totalGlow += ringIntensity;
    }

    // Resplandor ambiental azul eléctrico pulsante en el centro
    float pulse = 0.85 + 0.15 * sin(t * 1.6);
    float ambient = exp(-baseDist * 2.6) * 0.22 * pulse;
    vec3 finalColor = accumColor + mix(uColorOne, uColorTwo, 0.55) * ambient;

    float alpha = clamp((totalGlow + ambient) * uOpacity, 0.0, 1.0);
    gl_FragColor = vec4(finalColor * uOpacity, alpha);
  }
`;

function hexToRgbNormalized(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = Number.parseInt(full, 16);
  if (Number.isNaN(num)) return [0.23, 0.51, 0.96];
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255,
  ];
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function MagicRings({
  className = "",
  color = "#1E40AF",
  colorTwo = "#3B82F6",
  speed = 1.15,
  ringCount = 7,
  opacity = 0.95,
  followMouse = true,
  mouseStrength = 0.14,
}: MagicRingsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const effectiveSpeed = prefersReducedMotion ? 0.3 : speed;

    let rafId = 0;
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;
    let currentMouseX = 0.5;
    let currentMouseY = 0.5;
    let burst = 0;

    const handlePointerMove = (e: PointerEvent) => {
      if (!followMouse) return;
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      targetMouseX = e.clientX / w;
      targetMouseY = 1 - e.clientY / h;
    };

    const handlePointerDown = () => {
      burst = 1.0;
    };

    if (followMouse) {
      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      window.addEventListener("pointerdown", handlePointerDown, {
        passive: true,
      });
    }

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });

    if (gl) {
      const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

      if (vs && fs) {
        const program = gl.createProgram();
        if (program) {
          gl.attachShader(program, vs);
          gl.attachShader(program, fs);
          gl.linkProgram(program);

          if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.useProgram(program);

            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(
              gl.ARRAY_BUFFER,
              new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
              gl.STATIC_DRAW
            );

            const aPos = gl.getAttribLocation(program, "aPosition");
            gl.enableVertexAttribArray(aPos);
            gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

            const uResolution = gl.getUniformLocation(program, "uResolution");
            const uTime = gl.getUniformLocation(program, "uTime");
            const uMouse = gl.getUniformLocation(program, "uMouse");
            const uBurst = gl.getUniformLocation(program, "uBurst");
            const uColorOne = gl.getUniformLocation(program, "uColorOne");
            const uColorTwo = gl.getUniformLocation(program, "uColorTwo");
            const uColorHighlight = gl.getUniformLocation(
              program,
              "uColorHighlight"
            );
            const uSpeed = gl.getUniformLocation(program, "uSpeed");
            const uRingCount = gl.getUniformLocation(program, "uRingCount");
            const uOpacity = gl.getUniformLocation(program, "uOpacity");
            const uMouseStrength = gl.getUniformLocation(
              program,
              "uMouseStrength"
            );

            const [r1, g1, b1] = hexToRgbNormalized(color);
            const [r2, g2, b2] = hexToRgbNormalized(colorTwo);
            const [rh, gh, bh] = hexToRgbNormalized("#E0F2FE");
            gl.uniform3f(uColorOne, r1, g1, b1);
            gl.uniform3f(uColorTwo, r2, g2, b2);
            gl.uniform3f(uColorHighlight, rh, gh, bh);
            gl.uniform1f(uSpeed, effectiveSpeed);
            gl.uniform1f(uRingCount, Math.min(10, Math.max(1, ringCount)));
            gl.uniform1f(uOpacity, opacity);
            gl.uniform1f(uMouseStrength, followMouse ? mouseStrength : 0);

            const updateSize = () => {
              const rect = container.getBoundingClientRect();
              const dpr = Math.min(window.devicePixelRatio || 1, 2);
              const w = Math.max(1, Math.floor(rect.width * dpr));
              const h = Math.max(1, Math.floor(rect.height * dpr));
              if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
                gl.viewport(0, 0, w, h);
              }
            };

            updateSize();
            const observer = new ResizeObserver(updateSize);
            observer.observe(container);

            const startTime = performance.now();
            const render = (now: number) => {
              const elapsed = (now - startTime) * 0.001;
              currentMouseX += (targetMouseX - currentMouseX) * 0.07;
              currentMouseY += (targetMouseY - currentMouseY) * 0.07;
              burst *= 0.94;

              gl.uniform2f(uResolution, canvas.width, canvas.height);
              gl.uniform1f(uTime, elapsed);
              gl.uniform2f(uMouse, currentMouseX, currentMouseY);
              gl.uniform1f(uBurst, burst);
              gl.drawArrays(gl.TRIANGLES, 0, 6);

              rafId = window.requestAnimationFrame(render);
            };

            rafId = window.requestAnimationFrame(render);

            return () => {
              window.cancelAnimationFrame(rafId);
              observer.disconnect();
              if (followMouse) {
                window.removeEventListener("pointermove", handlePointerMove);
                window.removeEventListener("pointerdown", handlePointerDown);
              }
              gl.deleteBuffer(buffer);
              gl.deleteProgram(program);
              gl.deleteShader(vs);
              gl.deleteShader(fs);
            };
          }
        }
      }
    }

    // Fallback fluido en Canvas 2D si WebGL no está disponible
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) {
      return () => {
        if (followMouse) {
          window.removeEventListener("pointermove", handlePointerMove);
          window.removeEventListener("pointerdown", handlePointerDown);
        }
      };
    }

    const resize2d = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    resize2d();
    const observer2d = new ResizeObserver(resize2d);
    observer2d.observe(container);

    const start2d = performance.now();
    const render2d = (now: number) => {
      const t = (now - start2d) * 0.001 * effectiveSpeed;
      currentMouseX += (targetMouseX - currentMouseX) * 0.07;
      currentMouseY += (targetMouseY - currentMouseY) * 0.07;

      const w = canvas.width;
      const h = canvas.height;
      const minDim = Math.min(w, h);
      const cx =
        w * 0.5 +
        Math.sin(t * 0.5) * minDim * 0.03 +
        (currentMouseX - 0.5) * minDim * mouseStrength;
      const cy =
        h * 0.5 +
        Math.cos(t * 0.4) * minDim * 0.03 +
        (0.5 - currentMouseY) * minDim * mouseStrength;

      ctx2d.clearRect(0, 0, w, h);

      for (let i = 0; i < ringCount; i++) {
        const cycle = (i / ringCount + t * 0.13) % 1;
        const lifeAlpha =
          Math.min(1, cycle / 0.16) * (1 - Math.max(0, (cycle - 0.72) / 0.28));
        const radius = minDim * (0.06 + cycle * 0.65);

        ctx2d.beginPath();
        ctx2d.arc(cx, cy, Math.max(4, radius), 0, Math.PI * 2);
        ctx2d.strokeStyle = i % 2 === 0 ? color : colorTwo;
        ctx2d.globalAlpha = Math.max(0.05, lifeAlpha * 0.75 * opacity);
        ctx2d.lineWidth = Math.max(2, minDim * 0.004);
        ctx2d.stroke();
      }

      rafId = window.requestAnimationFrame(render2d);
    };

    rafId = window.requestAnimationFrame(render2d);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer2d.disconnect();
      if (followMouse) {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerdown", handlePointerDown);
      }
    };
  }, [
    color,
    colorTwo,
    speed,
    ringCount,
    opacity,
    followMouse,
    mouseStrength,
  ]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`fixed inset-0 w-full h-full z-0 pointer-events-none overflow-hidden bg-[#0B192C] ${className}`}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, rgba(59, 130, 246, 0.1) 0%, rgba(11, 25, 44, 0.6) 100%)",
        }}
      />
    </div>
  );
}
