type Wave = OscillatorType;

export class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private muted = false;
  private last: Record<string, number> = {};

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.34, this.ctx.currentTime, 0.02);
    }
  }

  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.34;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      let seed = 12345;
      for (let i = 0; i < data.length; i += 1) {
        seed = (seed * 16807) % 2147483647;
        data[i] = (seed / 2147483647) * 2 - 1;
      }
    } catch {
      this.ctx = null;
    }
  }

  private ready(key: string, gap: number): boolean {
    if (!this.ctx || !this.master) return false;
    const now = this.ctx.currentTime;
    if (this.last[key] !== undefined && now - this.last[key] < gap) return false;
    this.last[key] = now;
    return true;
  }

  private tone(
    freq: number,
    dur: number,
    type: Wave = 'square',
    gain = 0.18,
    slide = 0,
    delay = 0,
  ): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, gain = 0.12, freq = 900, type: BiquadFilterType = 'bandpass', delay = 0): void {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t0);
    filter.Q.value = 0.9;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  play(name: string): void {
    if (!this.ctx) return;
    switch (name) {
      case 'chop':
        if (!this.ready('chop', 0.075)) return;
        this.noise(0.045, 0.09, 1200, 'bandpass');
        this.tone(150, 0.05, 'sine', 0.05, -40);
        break;
      case 'mine':
        if (!this.ready('mine', 0.09)) return;
        this.tone(980, 0.045, 'square', 0.055, -120);
        this.noise(0.03, 0.045, 2600, 'highpass');
        break;
      case 'stone':
        if (!this.ready('stone', 0.1)) return;
        this.noise(0.06, 0.07, 520, 'lowpass');
        this.tone(120, 0.06, 'sine', 0.04, -30);
        break;
      case 'deposit':
        if (!this.ready('deposit', 0.06)) return;
        this.tone(880, 0.06, 'triangle', 0.06);
        this.tone(1320, 0.07, 'triangle', 0.045, 0, 0.035);
        break;
      case 'assign':
        if (!this.ready('assign', 0.06)) return;
        this.tone(520, 0.05, 'triangle', 0.045);
        break;
      case 'click':
        this.tone(440, 0.03, 'square', 0.035, -80);
        break;
      case 'error':
        if (!this.ready('error', 0.12)) return;
        this.tone(150, 0.1, 'square', 0.06, -40);
        break;
      case 'build':
        this.noise(0.06, 0.08, 700, 'bandpass');
        this.tone(220, 0.06, 'triangle', 0.06, -30);
        break;
      case 'build-done':
        this.tone(392, 0.09, 'triangle', 0.07);
        this.tone(523, 0.1, 'triangle', 0.07, 0, 0.08);
        this.tone(659, 0.12, 'triangle', 0.06, 0, 0.16);
        break;
      case 'train':
        this.tone(660, 0.06, 'square', 0.05);
        this.tone(880, 0.07, 'square', 0.045, 0, 0.06);
        break;
      case 'militia':
        this.tone(220, 0.12, 'sawtooth', 0.05, -30);
        this.tone(165, 0.16, 'sawtooth', 0.04, -20, 0.08);
        break;
      case 'arrow':
        if (!this.ready('arrow', 0.07)) return;
        this.noise(0.07, 0.035, 2400, 'highpass');
        break;
      case 'clash':
        if (!this.ready('clash', 0.06)) return;
        this.noise(0.045, 0.05, 1800, 'bandpass');
        this.tone(1200, 0.03, 'square', 0.025, -300);
        break;
      case 'arrow-hit':
        if (!this.ready('arrow-hit', 0.06)) return;
        this.noise(0.04, 0.04, 900, 'bandpass');
        break;
      case 'kill':
        this.noise(0.12, 0.07, 500, 'lowpass');
        this.tone(180, 0.14, 'triangle', 0.05, -80);
        break;
      case 'villager-death':
        this.tone(340, 0.22, 'triangle', 0.06, -120);
        break;
      case 'destroy':
        this.noise(0.3, 0.12, 320, 'lowpass');
        this.tone(90, 0.3, 'sine', 0.08, -30);
        break;
      case 'horn':
        this.tone(110, 0.55, 'sawtooth', 0.075);
        this.tone(82, 0.6, 'sawtooth', 0.055, 0, 0.05);
        this.noise(0.4, 0.03, 300, 'lowpass');
        break;
      case 'raid':
        this.noise(0.18, 0.11, 260, 'lowpass');
        this.tone(70, 0.25, 'sine', 0.09, -20);
        break;
      case 'age':
        [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.08, 0, i * 0.09));
        break;
      case 'victory':
        [523, 659, 784, 1046, 1318].forEach((f, i) =>
          this.tone(f, 0.32, 'triangle', 0.09, 0, i * 0.11),
        );
        break;
      case 'defeat':
        [392, 330, 262, 196].forEach((f, i) =>
          this.tone(f, 0.3, 'sawtooth', 0.05, -20, i * 0.14),
        );
        break;
      default:
        break;
    }
  }
}
