export type AmbienceMode = "none" | "rain" | "ocean" | "binaural";

class AmbienceService {
  private audioCtx: AudioContext | null = null;
  private currentMode: AmbienceMode = "none";
  private volume: number = 0.2; // default comfortable soft volume

  // Track Web Audio nodes to stop or adjust them
  private sourceNode: AudioBufferSourceNode | null = null;
  private lfoNode: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  // Binaural beats specific nodes
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;

  // Pre-compiled Pink Noise Buffer to save CPU
  private pinkNoiseBuffer: AudioBuffer | null = null;

  private initCtx() {
    if (this.audioCtx) return;
    try {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    } catch {
      /* Web Audio API not supported */
    }
  }

  /**
   * Generates Pink Noise buffer. Pink noise has a spectral density
   * that is proportional to 1/f, making it sound much warmer and more natural
   * (like constant rain or wind) than white noise.
   */
  private getPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.pinkNoiseBuffer) return this.pinkNoiseBuffer;

    const bufferSize = 4 * ctx.sampleRate; // 4 seconds loop
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11; // compensation for gain clipping
      b6 = white * 0.115926;
    }

    this.pinkNoiseBuffer = buffer;
    return buffer;
  }

  public getMode(): AmbienceMode {
    return this.currentMode;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode) {
      // Smooth volume transition to prevent audio popping
      this.gainNode.gain.setTargetAtTime(this.volume, this.audioCtx?.currentTime || 0, 0.1);
    }
  }

  public setMode(mode: AmbienceMode) {
    if (this.currentMode === mode) return;

    this.stopAll();
    this.currentMode = mode;

    if (mode === "none") return;

    this.initCtx();
    const ctx = this.audioCtx;
    if (!ctx) return;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;

    // Create master gain control for the ambience track
    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(this.volume, now);
    this.gainNode.connect(ctx.destination);

    if (mode === "rain") {
      const buffer = this.getPinkNoiseBuffer(ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Soft rain requires a lowpass filter to cut out harsh highs
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1000, now); // Warm rainy atmospheric filter

      source.connect(filter);
      filter.connect(this.gainNode);

      source.start(now);
      this.sourceNode = source;
    } else if (mode === "ocean") {
      const buffer = this.getPinkNoiseBuffer(ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Filter for water splash muffling
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(700, now);

      // Dedicated wave gain that will be modulated by an LFO
      const waveGain = ctx.createGain();
      waveGain.gain.setValueAtTime(0.3, now); // Baseline volume

      // Low-Frequency Oscillator to modulate wave gain (simulate 8-second wave rhythm)
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(0.12, now); // ~8.3 seconds full wave cycle

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.25, now); // wave swell amplitude

      // Connect LFO modulation into waveGain.gain
      lfo.connect(lfoGain);
      lfoGain.connect(waveGain.gain);

      source.connect(filter);
      filter.connect(waveGain);
      waveGain.connect(this.gainNode);

      lfo.start(now);
      source.start(now);

      this.sourceNode = source;
      this.lfoNode = lfo;
    } else if (mode === "binaural") {
      // 8Hz Alpha Binaural beats for focus. 432Hz in Left ear, 440Hz in Right ear.
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();

      oscL.type = "sine";
      oscL.frequency.setValueAtTime(432, now); // Earth focus tuning

      oscR.type = "sine";
      oscR.frequency.setValueAtTime(440, now); // Standard tuning (440 - 432 = 8Hz binaural differential)

      // Separate channels to Left and Right ears
      const panL = ctx.createStereoPanner();
      panL.pan.setValueAtTime(-1, now);

      const panR = ctx.createStereoPanner();
      panR.pan.setValueAtTime(1, now);

      // Low baseline volume for hum to avoid head fatigue
      const binauralGain = ctx.createGain();
      binauralGain.gain.setValueAtTime(0.15, now);

      oscL.connect(panL);
      oscR.connect(panR);

      panL.connect(binauralGain);
      panR.connect(binauralGain);
      binauralGain.connect(this.gainNode);

      oscL.start(now);
      oscR.start(now);

      this.leftOsc = oscL;
      this.rightOsc = oscR;
    }
  }

  private stopAll() {
    const now = this.audioCtx?.currentTime || 0;

    // Gracefully fade out volume before stopping to avoid speaker pops
    if (this.gainNode) {
      try {
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
        this.gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      } catch {
        /* gain already closed */
      }
    }

    const safeStopNode = (node: AudioScheduledSourceNode | null) => {
      if (node) {
        try {
          node.stop(now + 0.16);
        } catch {
          /* already stopped */
        }
      }
    };

    safeStopNode(this.sourceNode);
    safeStopNode(this.lfoNode);
    safeStopNode(this.leftOsc);
    safeStopNode(this.rightOsc);

    this.sourceNode = null;
    this.lfoNode = null;
    this.leftOsc = null;
    this.rightOsc = null;
    this.gainNode = null;
  }
}

export const ambienceService = new AmbienceService();
