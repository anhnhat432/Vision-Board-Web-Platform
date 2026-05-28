const STORAGE_KEY = "dof_sound_enabled";

class SoundService {
  private audioCtx: AudioContext | null = null;
  private isEnabled: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        // If not set, default to false (Calm Productivity philosophy)
        this.isEnabled = stored === "true";
      } catch {
        this.isEnabled = false;
      }
    }
  }

  private initCtx() {
    if (this.audioCtx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    } catch {
      /* Web Audio API not supported */
    }
  }

  public getSoundsEnabled(): boolean {
    return this.isEnabled;
  }

  public setSoundsEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      /* ignore storage errors */
    }
  }

  /**
   * Synthesizes a soft haptic tick/pop sound.
   * Perfect for task checklist completions.
   */
  public click() {
    if (!this.isEnabled) return;
    this.initCtx();
    if (!this.audioCtx) return;

    // Resume context if suspended (browser security policy)
    if (this.audioCtx.state === "suspended") {
      void this.audioCtx.resume();
    }

    const ctx = this.audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Warm organic sine wave for haptics
    osc.type = "sine";

    const now = ctx.currentTime;
    
    // Very fast pitch drop to simulate mechanical haptic tap (150Hz -> 40Hz over 45ms)
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.045);

    // Dynamic clean click volume envelope
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  /**
   * Synthesizes a harmonic major pentatonic arpeggio chime.
   * Ideal for milestone completions and streak wins.
   */
  public success() {
    if (!this.isEnabled) return;
    this.initCtx();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === "suspended") {
      void this.audioCtx.resume();
    }

    const ctx = this.audioCtx;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (Major Pentatonic)
    const startTime = ctx.currentTime;

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Clean soft triangle wave
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime + index * 0.06);

      const noteStart = startTime + index * 0.06;
      const noteDuration = 0.28;

      // Soft envelope for each note
      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.04, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);

      osc.start(noteStart);
      osc.stop(noteStart + noteDuration);
    });
  }
}

export const soundService = new SoundService();
