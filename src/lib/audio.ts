// Lightweight Web Audio API Synthesizer (Zero asset download, instant, zero memory lag)

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Soft pleasant wedding chime on click
  playChime(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  // Countdown beep (3, 2, 1)
  playCountdown(count: number): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const freq = count === 1 ? 980 : 520;
    const duration = count === 1 ? 0.35 : 0.18;

    osc.type = count === 1 ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  // Realistic mechanical shutter click + flash pop
  playShutter(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    // 1. Noise click
    const bufferSize = ctx.sampleRate * 0.08;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();

    // 2. High mechanical snap
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(2200, ctx.currentTime + 0.02);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.09);

    oscGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(ctx.currentTime + 0.02);
    osc.stop(ctx.currentTime + 0.1);
  }

  // Celebratory wedding completion fanfare
  playFanfare(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.1;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }
}

export const soundFx = new AudioSynthesizer();
