import confetti from "canvas-confetti";

type ConfettiOptions = NonNullable<Parameters<typeof confetti>[0]>;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function canRunConfetti(): boolean {
  if (prefersReducedMotion()) return false;
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  if (typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("jsdom")) return false;
  return typeof window.HTMLCanvasElement !== "undefined" && "getContext" in window.HTMLCanvasElement.prototype;
}

function runConfetti(options: ConfettiOptions): void {
  confetti({ disableForReducedMotion: true, ...options });
}

export function celebrateSmall(): void {
  if (!canRunConfetti()) return;
  runConfetti({
    particleCount: 30,
    spread: 42,
    origin: { y: 0.7 },
    colors: ["#7c3aed", "#d946ef", "#f472b6"],
    scalar: 0.72,
    gravity: 1.18,
    ticks: 90,
  });
}

export function celebrateMedium(): void {
  if (!canRunConfetti()) return;
  runConfetti({
    particleCount: 48,
    spread: 70,
    origin: { y: 0.62 },
    colors: ["#7c3aed", "#d946ef", "#f472b6", "#10b981", "#fbbf24"],
    scalar: 0.86,
    gravity: 0.96,
    ticks: 140,
  });

  window.setTimeout(() => {
    runConfetti({
      particleCount: 32,
      spread: 58,
      origin: { y: 0.68 },
      colors: ["#7c3aed", "#d946ef", "#f472b6", "#10b981"],
      scalar: 0.76,
      gravity: 1,
      ticks: 120,
    });
  }, 120);
}

export function celebrateLarge(): void {
  if (!canRunConfetti()) return;
  const origins = [0.22, 0.38, 0.62, 0.78];

  origins.forEach((x, index) => {
    window.setTimeout(() => {
      runConfetti({
        particleCount: 38,
        spread: 82,
        origin: { x, y: 0.58 },
        colors: ["#7c3aed", "#d946ef", "#f472b6", "#10b981", "#fbbf24"],
        scalar: 0.92,
        gravity: 0.88,
        ticks: 160,
      });
    }, index * 90);
  });
}
