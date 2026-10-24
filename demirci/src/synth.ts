export class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private heartTimer: number | null = null;
  private heartTempo = 60;
  muted = false;

  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    const len = Math.floor(this.ctx.sampleRate * 0.5);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    this.noise = buf;
  }

  private get ac(): AudioContext | null {
    if (!this.ctx || this.muted) return null;
    return this.ctx;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number): void {
    const ac = this.ac;
    if (!ac || !this.master) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseBurst(dur: number, filterFreq: number, gain: number, sweepTo?: number): void {
    const ac = this.ac;
    if (!ac || !this.master || !this.noise) return;
    const t = ac.currentTime;
    const src = ac.createBufferSource();
    src.buffer = this.noise;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, t);
    if (sweepTo !== undefined) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  click(): void {
    this.tone(240, 0.045, 'square', 0.06, 180);
  }

  good(): void {
    this.noiseBurst(0.13, 900, 0.35, 220);
  }

  perfect(): void {
    this.noiseBurst(0.16, 1400, 0.4, 260);
    this.tone(1180, 0.45, 'sine', 0.14);
    this.tone(1770, 0.32, 'sine', 0.07);
  }

  miss(): void {
    this.noiseBurst(0.2, 400, 0.2, 120);
    this.tone(150, 0.22, 'sawtooth', 0.08, 80);
  }

  burn(): void {
    this.noiseBurst(0.9, 2000, 0.45, 160);
    this.tone(90, 1.3, 'sawtooth', 0.12, 40);
  }

  coin(): void {
    this.tone(880, 0.08, 'square', 0.06);
    window.setTimeout(() => this.tone(1320, 0.1, 'square', 0.05), 60);
  }

  heartbeat(): void {
    if (this.heartTimer !== null) return;
    const thump = () => {
      this.tone(58, 0.14, 'sine', 0.18);
      window.setTimeout(() => this.tone(48, 0.12, 'sine', 0.12), 130);
    };
    thump();
    this.heartTimer = window.setInterval(thump, Math.round(60000 / this.heartTempo));
  }

  setHeartTempo(bpm: number): void {
    this.heartTempo = bpm;
    if (this.heartTimer !== null) {
      this.stopHeartbeat();
      this.heartbeat();
    }
  }

  stopHeartbeat(): void {
    if (this.heartTimer !== null) {
      window.clearInterval(this.heartTimer);
      this.heartTimer = null;
    }
  }
}
