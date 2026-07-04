const MINDFULNESS_AUDIO_ENABLED_KEY = "smart-goal-audio-enabled";

export function isMindfulStepSuccessEnabled(): boolean {
  try {
    const stored = sessionStorage.getItem(MINDFULNESS_AUDIO_ENABLED_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

export function setMindfulStepSuccessEnabled(enabled: boolean): void {
  try {
    sessionStorage.setItem(MINDFULNESS_AUDIO_ENABLED_KEY, String(enabled));
  } catch {
    // ignore
  }
}

export function playMindfulStepSuccess(): void {
  if (!isMindfulStepSuccessEnabled()) return;

  try {
    const AudioCtxClass =
      window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext;
    if (!AudioCtxClass) return;

    const ctx = new AudioCtxClass();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(639, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.03, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch {
    // Bỏ qua nếu bị chặn phát
  }
}