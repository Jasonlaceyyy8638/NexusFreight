/** High-density celebration when onboarding finishes (canvas-confetti). */
export async function burstLaunchpadConfetti(): Promise<void> {
  const { default: confetti } = await import("canvas-confetti");
  const colors = ["#007bff", "#38bdf8", "#a78bfa", "#fbbf24", "#34d399"];
  const fire = (partial: {
    particleCount?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    ticks?: number;
    scalar?: number;
    origin?: { x: number; y: number };
  }) => {
    void confetti({
      particleCount: partial.particleCount ?? 160,
      spread: partial.spread ?? 100,
      startVelocity: partial.startVelocity ?? 48,
      decay: partial.decay ?? 0.92,
      gravity: partial.gravity ?? 0.95,
      ticks: partial.ticks ?? 420,
      scalar: partial.scalar ?? 1.05,
      origin: partial.origin ?? { x: 0.5, y: 0.65 },
      colors,
    });
  };
  fire({ particleCount: 220, spread: 110, origin: { x: 0.2, y: 0.65 } });
  fire({ particleCount: 220, spread: 110, origin: { x: 0.8, y: 0.65 } });
  window.setTimeout(() => {
    fire({ particleCount: 280, spread: 180, origin: { x: 0.5, y: 0.55 } });
  }, 180);
}
