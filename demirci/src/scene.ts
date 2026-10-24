import type { ForgeItem, ItemKind } from './types';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
  kind: 'spark' | 'smoke' | 'gold';
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
}

function tierColor(tier: number): string {
  if (tier <= 0) return '#8a8378';
  if (tier <= 3) return '#bab4a6';
  if (tier <= 6) return '#6fb3d9';
  if (tier <= 8) return '#b389e8';
  return '#ffd166';
}

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private particles: Particle[] = [];
  private embers: Ember[] = [];
  private shakeAmt = 0;
  private flash = 0;
  private item: ForgeItem | null = null;
  private lastT = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D desteklenmiyor');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initEmbers();
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.initEmbers();
  }

  private initEmbers(): void {
    this.embers = Array.from({ length: 26 }, () => ({
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vx: (Math.random() - 0.5) * 8,
      vy: -8 - Math.random() * 18,
      life: Math.random() * this.h,
      size: 0.7 + Math.random() * 1.8,
    }));
  }

  setItem(item: ForgeItem | null): void {
    this.item = item;
  }

  shake(amount: number): void {
    this.shakeAmt = Math.min(18, this.shakeAmt + amount);
  }

  private addParticles(n: number, kind: 'spark' | 'smoke' | 'gold', power: number): void {
    const cx = this.w / 2;
    const cy = this.h * 0.4 - 90;
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const speed = (0.4 + Math.random()) * power;
      const color =
        kind === 'smoke'
          ? `rgba(${90 + Math.random() * 40},${85 + Math.random() * 30},${80 + Math.random() * 30},`
          : kind === 'gold'
            ? `rgba(${230 + Math.random() * 25},${180 + Math.random() * 50},${80 + Math.random() * 40},`
            : `rgba(${240 + Math.random() * 15},${140 + Math.random() * 90},${40 + Math.random() * 40},`;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy + (Math.random() - 0.5) * 24,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - (kind === 'smoke' ? 30 : 10),
        life: kind === 'smoke' ? 1.6 : 0.55 + Math.random() * 0.4,
        max: kind === 'smoke' ? 1.6 : 0.95,
        size: kind === 'smoke' ? 6 + Math.random() * 10 : 1 + Math.random() * 2.5,
        color,
        gravity: kind === 'smoke' ? -8 : kind === 'gold' ? -14 : 260,
        kind,
      });
    }
  }

  burst(kind: 'perfect' | 'good' | 'miss' | 'burn' | 'deliver'): void {
    switch (kind) {
      case 'perfect':
        this.addParticles(30, 'spark', 300);
        this.addParticles(8, 'gold', 180);
        this.shake(5);
        this.flash = 0.5;
        break;
      case 'good':
        this.addParticles(14, 'spark', 200);
        this.shake(2);
        break;
      case 'miss':
        this.addParticles(8, 'spark', 120);
        this.shake(3);
        break;
      case 'burn':
        this.addParticles(46, 'smoke', 120);
        this.addParticles(24, 'spark', 220);
        this.shake(14);
        this.flash = 0.8;
        break;
      case 'deliver':
        this.addParticles(24, 'gold', 150);
        this.shake(2);
        break;
    }
  }

  render(t: number): void {
    const ctx = this.ctx;
    const dt = Math.min(0.05, (t - this.lastT) / 1000 || 0.016);
    this.lastT = t;

    const cx = this.w / 2;
    const cy = this.h * 0.4;

    ctx.save();
    if (this.shakeAmt > 0.3) {
      ctx.translate((Math.random() - 0.5) * this.shakeAmt, (Math.random() - 0.5) * this.shakeAmt);
      this.shakeAmt *= 0.88;
    } else {
      this.shakeAmt = 0;
    }

    const g = ctx.createRadialGradient(cx, cy - 40, 40, cx, cy, Math.max(this.w, this.h) * 0.7);
    g.addColorStop(0, '#1a1510');
    g.addColorStop(0.45, '#0e0b08');
    g.addColorStop(1, '#070605');
    ctx.fillStyle = g;
    ctx.fillRect(-40, -40, this.w + 80, this.h + 80);

    // korlar
    for (const e of this.embers) {
      e.life += e.vy * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.y < -20) {
        e.y = this.h + 20;
        e.x = Math.random() * this.w;
      }
      const alpha = 0.10 + 0.18 * Math.abs(Math.sin((t / 1400 + e.x) * 0.7));
      ctx.fillStyle = `rgba(255,150,60,${alpha})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
    }

    const tier = this.item?.tier ?? 0;
    const heat = 0.35 + Math.min(0.65, tier * 0.075);
    const pulse = 0.85 + Math.sin(t / 420) * 0.15;
    const glow = ctx.createRadialGradient(cx, cy - 55, 10, cx, cy - 55, 230 * heat * pulse);
    glow.addColorStop(0, `rgba(255,140,40,${0.30 * heat})`);
    glow.addColorStop(0.5, `rgba(220,90,20,${0.12 * heat})`);
    glow.addColorStop(1, 'rgba(120,40,10,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 360, cy - 380, 720, 620);

    this.drawAnvil(cx, cy);
    this.drawItem(cx, cy - 56, t);

    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(255,190,90,${this.flash * 0.22})`;
      ctx.fillRect(-40, -40, this.w + 80, this.h + 80);
      this.flash *= 0.86;
    }

    this.drawParticles(dt);

    // vinyet
    const vig = ctx.createRadialGradient(cx, cy, Math.min(this.w, this.h) * 0.35, cx, cy, Math.max(this.w, this.h) * 0.85);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(-40, -40, this.w + 80, this.h + 80);

    ctx.restore();
  }

  private drawAnvil(cx: number, cy: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1.28, 1.28);

    // zemin gölgesi
    const shadow = ctx.createRadialGradient(0, 118, 10, 0, 118, 180);
    shadow.addColorStop(0, 'rgba(0,0,0,0.55)');
    shadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(0, 118, 180, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1d1a16';
    ctx.strokeStyle = '#3a3229';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-100, 34);
    ctx.lineTo(96, 34);
    ctx.lineTo(72, 54);
    ctx.lineTo(-74, 54);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(92, 34);
    ctx.lineTo(152, 41);
    ctx.lineTo(94, 52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillRect(-44, 54, 88, 52);
    ctx.fillRect(-78, 104, 156, 14);

    ctx.fillStyle = 'rgba(255,150,70,0.13)';
    ctx.beginPath();
    ctx.ellipse(-4, 32, 86, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,170,90,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-96, 34);
    ctx.lineTo(92, 34);
    ctx.stroke();
    ctx.restore();
  }

  private drawItem(cx: number, y: number, t: number): void {
    const item = this.item;
    if (!item) return;
    const ctx = this.ctx;
    const color = tierColor(item.tier);
    const bob = Math.sin(t / 620) * 4;

    ctx.save();
    ctx.translate(cx, y + bob);
    ctx.scale(1.15, 1.15);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 14 + item.tier * 4;

    this.drawShape(item.kind);

    ctx.restore();
  }

  private drawShape(kind: ItemKind): void {
    const ctx = this.ctx;
    switch (kind) {
      case 'sword': {
        // namlu
        ctx.beginPath();
        ctx.moveTo(0, -50);
        ctx.lineTo(5, -38);
        ctx.lineTo(5, 8);
        ctx.lineTo(-5, 8);
        ctx.lineTo(-5, -38);
        ctx.closePath();
        ctx.fill();
        // balçak
        ctx.beginPath();
        ctx.roundRect(-19, 8, 38, 6, 3);
        ctx.fill();
        // kabza
        ctx.beginPath();
        ctx.roundRect(-4, 14, 8, 22, 3);
        ctx.fill();
        // topuz
        ctx.beginPath();
        ctx.arc(0, 40, 5.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'axe': {
        ctx.beginPath();
        ctx.roundRect(-4, -42, 8, 82, 3);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2, -40);
        ctx.quadraticCurveTo(40, -30, 34, 0);
        ctx.quadraticCurveTo(24, -8, 2, -6);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-2, -40);
        ctx.quadraticCurveTo(-34, -32, -30, -4);
        ctx.quadraticCurveTo(-22, -10, -2, -8);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'dagger': {
        ctx.beginPath();
        ctx.moveTo(0, -34);
        ctx.lineTo(4, -26);
        ctx.lineTo(4, 6);
        ctx.lineTo(-4, 6);
        ctx.lineTo(-4, -26);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(-13, 6, 26, 5, 2);
        ctx.fill();
        ctx.beginPath();
        ctx.roundRect(-3, 11, 6, 16, 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 30, 4.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'armor': {
        ctx.beginPath();
        ctx.moveTo(-22, -32);
        ctx.lineTo(22, -32);
        ctx.lineTo(29, 6);
        ctx.lineTo(14, 34);
        ctx.lineTo(-14, 34);
        ctx.lineTo(-29, 6);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(0, 32);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-22, -14);
        ctx.lineTo(0, -4);
        ctx.lineTo(22, -14);
        ctx.stroke();
        break;
      }
      case 'shield': {
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.lineTo(29, -25);
        ctx.lineTo(25, 12);
        ctx.lineTo(0, 38);
        ctx.lineTo(-25, 12);
        ctx.lineTo(-29, -25);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(0, 20);
        ctx.moveTo(-14, -14);
        ctx.lineTo(14, -14);
        ctx.stroke();
        break;
      }
    }
  }

  private drawParticles(dt: number): void {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const a = Math.min(1, p.life / (p.max * 0.6));
      ctx.fillStyle = `${p.color}${(a * (p.kind === 'smoke' ? 0.35 : 0.95)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.kind === 'smoke' ? 1 + (p.max - p.life) : 1), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
