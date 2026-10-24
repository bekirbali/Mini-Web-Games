import { BUILDINGS, COLORS, RESOURCES, UNIT_COLORS, W, H, SPAWNS } from './config';
import type { Game } from './game';
import { dist, hash2 } from './rng';
import type { Building, BuildingKind, GameEvent, GameState, ResourceKind, Side, Unit } from './types';
import { DECOR, WATER_HOLE } from './world';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  grav: number;
}

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  max: number;
}

const GLYPHS: Record<string, string[]> = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '+': ['000', '010', '111', '010', '000'],
  '-': ['000', '000', '111', '000', '000'],
  '!': ['010', '010', '010', '000', '010'],
  '?': ['111', '001', '011', '000', '010'],
  '.': ['000', '000', '000', '000', '010'],
  ':': ['000', '010', '000', '010', '000'],
  '/': ['001', '001', '010', '100', '100'],
};

const FOG_SIDES: { side: Side; x: number; y: number; w: number; h: number }[] = [
  { side: 'west', x: 0, y: 0, w: 26, h: H },
  { side: 'east', x: W - 26, y: 0, w: 26, h: H },
  { side: 'north', x: 0, y: 0, w: W, h: 22 },
  { side: 'south', x: 0, y: H - 20, w: W, h: 20 },
];

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  hover: { x: number; y: number } | null = null;
  drag: { x1: number; y1: number; x2: number; y2: number } | null = null;
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private shake = 0;
  private flash = 0;
  private flashColor = '#ffffff';
  private last = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private game: Game,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D yok');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  fx(e: GameEvent): void {
    switch (e.type) {
      case 'chop':
        this.burst(e.x, e.y, 4, ['#8a5a2b', '#b98548', '#5b3e25'], 18, 0.5);
        break;
      case 'mine':
        this.burst(e.x, e.y, 4, [COLORS.gold, '#fff0b0', COLORS.goldDark], 22, 0.45);
        break;
      case 'stone':
        this.burst(e.x, e.y, 3, [COLORS.stone, COLORS.stoneLight], 12, 0.45);
        break;
      case 'deposit': {
        const color = RESOURCES[e.resource].color;
        this.floater(e.x, e.y, `+${Math.round(e.amount)}`, color);
        this.burst(e.x, e.y, 3, [color, '#fff3c9'], 26, 0.5);
        break;
      }
      case 'assign':
        this.burst(e.x, e.y, 3, [RESOURCES[e.resource].color], 10, 0.4);
        break;
      case 'build-start':
        this.burst(e.x, e.y, 5, ['#b08a58', '#d2c19a'], 16, 0.55);
        break;
      case 'build-done':
        this.burst(e.x, e.y, 12, ['#d2c19a', '#f0e6c8', '#8a7a58'], 30, 0.7);
        this.shake = Math.max(this.shake, 1.2);
        break;
      case 'train':
      case 'militia':
        this.burst(e.x, e.y, 4, ['#f0e6c8', '#c7b88f'], 18, 0.5);
        break;
      case 'arrow':
        this.particles.push({
          x: e.x,
          y: e.y,
          vx: 0,
          vy: 0,
          life: 0.12,
          max: 0.12,
          color: '#e8d6a0',
          size: 1,
          grav: 0,
        });
        break;
      case 'clash':
        this.burst(e.x, e.y, 3, ['#f6e7a8', '#ffffff', '#c9a85a'], 34, 0.28);
        break;
      case 'arrow-hit':
        this.burst(e.x, e.y, 2, ['#d8c090', '#8a6a3a'], 18, 0.3);
        break;
      case 'kill':
        this.burst(e.x, e.y, 7, ['#6b2f27', '#9c4a3a', '#2d1c18'], 26, 0.55);
        if (e.loot > 0) this.floater(e.x, e.y - 10, `+${e.loot}`, COLORS.gold);
        break;
      case 'villager-death':
        this.burst(e.x, e.y, 6, ['#2f5778', '#7a2f2a', '#d8c9a3'], 20, 0.6);
        break;
      case 'destroy':
        this.burst(e.x, e.y, 16, ['#6b6b62', '#a19a88', '#3c3b33'], 34, 0.9);
        this.burst(e.x, e.y - 8, 8, ['#f0a93c', '#d0553f'], 26, 0.7);
        this.shake = Math.max(this.shake, 4);
        break;
      case 'horn':
        this.flash = 0.5;
        this.flashColor = '#c0392b';
        this.shake = Math.max(this.shake, 2);
        break;
      case 'raid':
        this.shake = Math.max(this.shake, 3);
        break;
      case 'age':
        this.flash = 0.65;
        this.flashColor = '#e8bd56';
        break;
      case 'victory':
        this.flash = 0.9;
        this.flashColor = '#f2d27a';
        this.shake = Math.max(this.shake, 3);
        break;
      case 'defeat':
        this.flash = 0.6;
        this.flashColor = '#7a1e18';
        this.shake = Math.max(this.shake, 4);
        break;
      default:
        break;
    }
  }

  private burst(x: number, y: number, n: number, colors: string[], speed: number, life: number): void {
    for (let i = 0; i < n; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 8,
        life: life * (0.5 + Math.random() * 0.6),
        max: life,
        color: colors[i % colors.length] ?? '#fff',
        size: Math.random() < 0.3 ? 2 : 1,
        grav: 46,
      });
    }
    if (this.particles.length > 180) this.particles.splice(0, this.particles.length - 180);
  }

  private floater(x: number, y: number, text: string, color: string): void {
    this.floaters.push({ x, y, text, color, life: 1.1, max: 1.1 });
    if (this.floaters.length > 24) this.floaters.shift();
  }

  render(s: GameState, now: number): void {
    const dt = Math.min(0.05, Math.max(0, now - this.last));
    this.last = now;
    const ctx = this.ctx;
    this.updateFx(dt);

    ctx.save();
    if (this.shake > 0.05) {
      const a = this.shake * 0.9;
      ctx.translate(Math.sin(now * 77) * a, Math.cos(now * 91) * a);
    }

    this.drawTerrain(now);
    this.drawPaths();
    this.drawWater(now);
    this.drawDecor();
    this.drawNodes(s, now);
    this.drawFog(now);
    this.drawRaidEdge(s, now);
    this.drawPlacement(s, now);

    type Ent = { y: number; draw: () => void };
    const ents: Ent[] = [];
    for (const b of s.buildings) {
      ents.push({ y: b.y + b.h / 2, draw: () => this.drawBuilding(b, s, now) });
    }
    for (const u of s.units) {
      if (u.dead) continue;
      ents.push({ y: u.y, draw: () => this.drawUnit(u, s) });
    }
    ents.sort((a, b) => a.y - b.y);
    for (const e of ents) e.draw();

    this.drawProjectiles(s);
    this.drawParticles();
    this.drawFloaters();
    this.drawHover(s);
    this.drawDrag();
    this.drawVignette();
    ctx.restore();

    if (this.flash > 0.01) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.45, this.flash * 0.6);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  private updateFx(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 9);
    this.flash = Math.max(0, this.flash - dt * 1.8);
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const f of this.floaters) {
      f.life -= dt;
      f.y -= dt * 12;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
  }

  private drawTerrain(now: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 8) {
      for (let y = 0; y < H; y += 8) {
        const h = hash2(x >> 3, y >> 3, 3);
        if (h > 0.82) {
          ctx.fillStyle = COLORS.grassDark;
          ctx.fillRect(x + 2, y + 3, 4, 2);
        } else if (h < 0.14) {
          ctx.fillStyle = COLORS.grassLight;
          ctx.fillRect(x + 1, y + 5, 3, 2);
        } else if (h > 0.62) {
          ctx.fillStyle = COLORS.grassDeep;
          ctx.fillRect(x + 5, y + 1, 1, 2);
        }
      }
    }
    // hafif rüzgâr: birkaç ot tutamı
    for (let i = 0; i < 26; i += 1) {
      const x = 12 + ((i * 97) % (W - 24));
      const y = 14 + ((i * 151) % (H - 28));
      const sway = Math.sin(now * 1.4 + i) * 1;
      ctx.fillStyle = i % 3 === 0 ? COLORS.grassLight : COLORS.grassDark;
      ctx.fillRect(Math.round(x + sway), y, 1, 3);
      ctx.fillRect(Math.round(x + sway) + 2, y + 1, 1, 2);
    }
  }

  private drawPaths(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(103, 82, 50, 0.28)';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    for (const n of this.game.state.nodes) {
      ctx.beginPath();
      ctx.moveTo(240, 196);
      const mx = (240 + n.x) / 2 + (n.y < 120 ? 10 : -10);
      const my = (196 + n.y) / 2 + (n.x < 240 ? 12 : -6);
      ctx.quadraticCurveTo(mx, my, n.x, n.y + n.radius * 0.5);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(122, 100, 64, 0.22)';
    ctx.lineWidth = 4;
    for (const n of this.game.state.nodes) {
      ctx.beginPath();
      ctx.moveTo(240, 192);
      ctx.quadraticCurveTo((240 + n.x) / 2, (192 + n.y) / 2, n.x, n.y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(122, 100, 64, 0.28)';
    ctx.beginPath();
    ctx.ellipse(240, 195, 42, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawWater(now: number): void {
    const ctx = this.ctx;
    const { x, y, r } = WATER_HOLE;
    ctx.save();
    ctx.fillStyle = '#2b4340';
    ctx.beginPath();
    ctx.ellipse(x, y, r + 3, r * 0.55 + 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3c5d57';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180, 220, 205, 0.25)';
    ctx.lineWidth = 1;
    const wob = Math.sin(now * 1.2) * 2;
    ctx.beginPath();
    ctx.moveTo(x - r + 4 + wob, y);
    ctx.lineTo(x - 1 + wob, y);
    ctx.stroke();
    ctx.fillStyle = '#4e7a52';
    ctx.fillRect(x - r - 1, y - 6, 1, 4);
    ctx.fillRect(x + r - 4, y - 7, 1, 5);
    ctx.restore();
  }

  private drawDecor(): void {
    const ctx = this.ctx;
    for (const d of DECOR) {
      if (d.kind === 'flower') {
        const c = hash2(d.x, d.y, 7) > 0.5 ? '#e8d9a6' : '#c9857c';
        ctx.fillStyle = COLORS.grassDeep;
        ctx.fillRect(d.x, d.y, 1, 2);
        ctx.fillStyle = c;
        ctx.fillRect(d.x, d.y - 1, 1, 1);
      } else if (d.kind === 'rock') {
        ctx.fillStyle = COLORS.stoneDark;
        ctx.fillRect(d.x, d.y, 3, 2);
        ctx.fillStyle = COLORS.stone;
        ctx.fillRect(d.x, d.y, 2, 1);
      } else {
        ctx.fillStyle = COLORS.grassDeep;
        ctx.fillRect(d.x, d.y, 1, 3);
        ctx.fillRect(d.x + 2, d.y + 1, 1, 2);
      }
    }
  }

  private drawNodes(s: GameState, now: number): void {
    const ctx = this.ctx;
    for (const n of s.nodes) {
      const ratio = n.reserve / n.maxReserve;
      if (n.kind === 'wood') {
        const count = ratio <= 0 ? 0 : 2 + Math.round(ratio * 6);
        const trees: { x: number; y: number; size: number }[] = [];
        for (let i = 0; i < count; i += 1) {
          const a = i * 2.399963 + hash2(i, 3, 7) * 0.8;
          const r = n.radius * (0.25 + hash2(i, 9, 11) * 0.7);
          trees.push({
            x: n.x + Math.cos(a) * r,
            y: n.y + Math.sin(a) * r * 0.66 + 6,
            size: hash2(i, 5, 13) > 0.5 ? 1 : 0,
          });
        }
        trees.sort((a, b) => a.y - b.y);
        for (const t of trees) this.drawTree(t.x, t.y, t.size);
        if (ratio <= 0) {
          for (let i = 0; i < 3; i += 1) {
            const x = n.x - 8 + i * 8;
            const y = n.y + 4 + (i % 2) * 4;
            ctx.fillStyle = '#6b4c2c';
            ctx.fillRect(x, y, 3, 2);
            ctx.fillStyle = '#8a6a42';
            ctx.fillRect(x, y - 1, 3, 1);
          }
        }
      } else {
        this.drawOre(n.x, n.y, n.kind, ratio, now);
      }

      if (
        this.hover &&
        dist(this.hover.x, this.hover.y, n.x, n.y) <= n.radius + 5 &&
        ratio > 0
      ) {
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 238, 210, 0.55)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.ellipse(n.x, n.y + 4, n.radius, n.radius * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private drawTree(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    const s = size ? 1 : 0;
    ctx.fillStyle = 'rgba(20, 24, 14, 0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 5 + s, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.trunk;
    ctx.fillRect(x - 1, y - 4, 2, 5 + s);
    ctx.fillStyle = COLORS.leafDark;
    ctx.fillRect(x - 5 - s, y - 11 - s, 10 + s * 2, 5);
    ctx.fillRect(x - 4 - s, y - 14 - s, 8 + s * 2, 4);
    ctx.fillStyle = COLORS.leaf;
    ctx.fillRect(x - 4 - s, y - 10 - s, 8 + s * 2, 3);
    ctx.fillRect(x - 2 - s, y - 13 - s, 5 + s, 3);
    ctx.fillStyle = COLORS.leafLight;
    ctx.fillRect(x - 3 - s, y - 13 - s, 3, 2);
    ctx.fillRect(x + 1, y - 10 - s, 2, 1);
  }

  private drawOre(x: number, y: number, kind: ResourceKind, ratio: number, now: number): void {
    const ctx = this.ctx;
    const gold = kind === 'gold';
    const base = gold ? '#756a57' : COLORS.stoneDark;
    const light = gold ? '#9b8b70' : COLORS.stone;
    const rocks = [
      { x: -6, y: 3, w: 8, h: 6 },
      { x: 2, y: 0, w: 9, h: 7 },
      { x: -1, y: 6, w: 6, h: 3 },
    ];
    for (let i = 0; i < rocks.length; i += 1) {
      const r = rocks[i];
      if (!r) continue;
      ctx.fillStyle = 'rgba(20,24,14,0.2)';
      ctx.beginPath();
      ctx.ellipse(x + r.x + r.w / 2, y + r.y + r.h + 1, r.w / 2 + 1, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = base;
      ctx.fillRect(x + r.x, y + r.y, r.w, r.h);
      ctx.fillStyle = light;
      ctx.fillRect(x + r.x + 1, y + r.y, r.w - 3, 2);
      ctx.fillStyle = gold ? COLORS.goldDark : COLORS.stoneDark;
      ctx.fillRect(x + r.x + 1, y + r.y + r.h - 1, r.w - 2, 1);
    }
    if (gold && ratio > 0) {
      const tw = Math.sin(now * 3 + x) > 0.55;
      ctx.fillStyle = tw ? '#fff2b0' : COLORS.gold;
      ctx.fillRect(x - 3, y + 3, 2, 1);
      ctx.fillRect(x + 4, y + 1, 1, 2);
      if (ratio > 0.3) {
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(x + 7, y + 5, 1, 1);
        ctx.fillRect(x - 6, y + 6, 1, 1);
      }
    }
    if (!gold && ratio > 0) {
      ctx.fillStyle = '#6f7d54';
      ctx.fillRect(x - 5, y + 2, 2, 1);
      ctx.fillRect(x + 5, y + 3, 2, 1);
    }
  }

  private drawFog(now: number): void {
    const ctx = this.ctx;
    for (const side of FOG_SIDES) {
      const grad =
        side.side === 'west'
          ? ctx.createLinearGradient(0, 0, side.w, 0)
          : side.side === 'east'
            ? ctx.createLinearGradient(W, 0, W - side.w, 0)
            : side.side === 'north'
              ? ctx.createLinearGradient(0, 0, 0, side.h)
              : ctx.createLinearGradient(0, H, 0, H - side.h);
      grad.addColorStop(0, 'rgba(10, 13, 8, 0.88)');
      grad.addColorStop(1, 'rgba(10, 13, 8, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(side.x, side.y, side.w, side.h);
    }
    // sürüklenen sis
    ctx.save();
    ctx.fillStyle = 'rgba(19, 26, 18, 0.3)';
    for (let i = 0; i < 5; i += 1) {
      const t = now * 0.15 + i * 1.7;
      const x = 18 + ((i * 103 + now * 4) % (W - 36));
      const y = i < 2 ? 4 + Math.sin(t) * 3 : H - 8 + Math.cos(t) * 3;
      ctx.beginPath();
      ctx.ellipse(x, y, 24 + Math.sin(t) * 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 4; i += 1) {
      const y = 30 + ((i * 67 + now * 3) % (H - 50));
      ctx.beginPath();
      ctx.ellipse(i % 2 === 0 ? 4 : W - 4, y, 5, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawRaidEdge(s: GameState, now: number): void {
    if (!s.warning) return;
    const ctx = this.ctx;
    const pulse = 0.55 + Math.sin(now * 10) * 0.3;
    const side = s.warning.side;
    const sp = SPAWNS[side];
    const dir = side === 'west' ? 1 : side === 'east' ? -1 : side === 'north' ? 1 : -1;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#d24a3c';
    for (let i = 0; i < 3; i += 1) {
      const off = 6 + i * 5;
      ctx.beginPath();
      if (side === 'west' || side === 'east') {
        const x = side === 'west' ? off : W - off;
        ctx.moveTo(x, sp.y - 6 + i * 2);
        ctx.lineTo(x + dir * 9, sp.y);
        ctx.lineTo(x, sp.y + 6 - i * 2);
      } else {
        const y = side === 'north' ? off : H - off;
        ctx.moveTo(sp.x - 6 + i * 2, y);
        ctx.lineTo(sp.x, y + dir * 9);
        ctx.lineTo(sp.x + 6 - i * 2, y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPlacement(s: GameState, now: number): void {
    if (!s.placement || !this.hover) return;
    const ctx = this.ctx;
    const kind = s.placement;
    const def = BUILDINGS[kind];
    const x = Math.round(this.hover.x);
    const y = Math.round(this.hover.y);
    const ok = this.game.canPlaceAt(kind, x, y);
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(now * 5) * 0.06;
    this.drawBuildingShape(kind, x, y, now);
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = ok ? 'rgba(140, 220, 120, 0.95)' : 'rgba(230, 90, 74, 0.95)';
    ctx.fillStyle = ok ? 'rgba(120, 200, 100, 0.13)' : 'rgba(220, 80, 60, 0.14)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.rect(x - def.w / 2, y - def.h / 2, def.w, def.h);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (kind === 'tower') {
      ctx.save();
      ctx.strokeStyle = 'rgba(230, 210, 140, 0.28)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(x, y, def.range ?? 72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawBuilding(b: Building, s: GameState, now: number): void {
    const ctx = this.ctx;
    if (b.state === 'destroyed') {
      this.drawRubble(b.x, b.y, b.kind);
      return;
    }
    const selected = s.selectedBuilding === b.id;
    if (selected) {
      ctx.save();
      ctx.strokeStyle = b.flash > 0 ? '#fff2c0' : '#e8bd56';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.rect(b.x - b.w / 2 - 3, b.y - b.h / 2 - 3, b.w + 6, b.h + 6);
      ctx.stroke();
      ctx.restore();
    }
    if (b.state === 'building') {
      ctx.save();
      ctx.globalAlpha = 0.3;
      this.drawBuildingShape(b.kind, b.x, b.y, now);
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x - b.w - 4, b.y + b.h / 2 - b.h * 2 * b.progress, b.w * 2 + 8, b.h * 2 * b.progress);
      ctx.clip();
      this.drawBuildingShape(b.kind, b.x, b.y, now);
      ctx.restore();
      this.drawScaffold(b);
      this.drawBar(
        b.x - b.w / 2,
        b.y - b.h / 2 - 9,
        b.w,
        3,
        b.progress,
        '#e8bd56',
        'rgba(0,0,0,0.55)',
      );
    } else {
      this.drawBuildingShape(b.kind, b.x, b.y, now);
    }
    if (b.flash > 0) {
      ctx.save();
      ctx.globalAlpha = b.flash * 2.4;
      ctx.fillStyle = '#fff';
      ctx.fillRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
      ctx.restore();
    }
    if (b.hp < b.maxHp && b.state !== 'building') {
      this.drawBar(
        b.x - b.w / 2,
        b.y - b.h / 2 - 8,
        b.w,
        3,
        b.hp / b.maxHp,
        b.hp / b.maxHp > 0.5 ? '#79b55e' : b.hp / b.maxHp > 0.25 ? '#e0b44c' : '#d4553f',
        'rgba(0,0,0,0.6)',
      );
    }
    if (selected && b.kind === 'tower') {
      ctx.save();
      ctx.strokeStyle = 'rgba(232, 189, 86, 0.22)';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(b.x, b.y, BUILDINGS.tower.range ?? 72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawBuildingShape(kind: BuildingKind, x: number, y: number, now: number): void {
    if (kind === 'tc') this.drawTC(x, y, now);
    else if (kind === 'tower') this.drawTower(x, y, now);
    else this.drawBarracks(x, y, now);
  }

  private drawTC(x: number, y: number, now: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(20, 24, 14, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y + 18, 25, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(x - 22, y - 3, 44, 21);
    ctx.fillStyle = COLORS.stone;
    ctx.fillRect(x - 21, y - 4, 42, 18);
    ctx.fillStyle = COLORS.stoneLight;
    ctx.fillRect(x - 20, y - 4, 40, 2);
    ctx.fillStyle = '#7b7e74';
    for (let i = 0; i < 7; i += 1) {
      ctx.fillRect(x - 18 + i * 6, y + 1 + (i % 2) * 3, 4, 1);
    }
    ctx.fillStyle = COLORS.woodDark;
    ctx.fillRect(x - 4, y + 3, 8, 14);
    ctx.fillStyle = '#3a2b1b';
    ctx.fillRect(x - 3, y + 5, 6, 12);
    ctx.fillStyle = COLORS.wood;
    ctx.fillRect(x - 3, y + 5, 2, 12);

    ctx.fillStyle = COLORS.redDark;
    ctx.fillRect(x - 25, y - 10, 50, 8);
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(x - 24, y - 12, 48, 5);
    ctx.fillStyle = '#c25a4b';
    ctx.fillRect(x - 20, y - 12, 40, 2);
    ctx.fillStyle = COLORS.woodDark;
    ctx.fillRect(x - 17, y - 20, 34, 9);
    ctx.fillStyle = COLORS.wood;
    ctx.fillRect(x - 16, y - 22, 32, 8);
    ctx.fillStyle = COLORS.woodLight;
    ctx.fillRect(x - 12, y - 22, 24, 1);
    ctx.fillStyle = COLORS.woodDark;
    ctx.fillRect(x - 9, y - 27, 18, 6);
    ctx.fillStyle = '#8a5a2b';
    ctx.fillRect(x - 8, y - 29, 16, 5);

    ctx.fillStyle = COLORS.steelDark;
    ctx.fillRect(x + 18, y - 32, 2, 15);
    const wave = Math.sin(now * 2.2) * 1.2;
    ctx.fillStyle = '#3f6f9a';
    ctx.beginPath();
    ctx.moveTo(x + 20, y - 31);
    ctx.lineTo(x + 32 + wave, y - 29);
    ctx.lineTo(x + 20, y - 23);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#6fa2c8';
    ctx.fillRect(x + 21, y - 29, 5, 1);

    ctx.fillStyle = '#e8bd56';
    ctx.fillRect(x - 14, y + 3, 2, 3);
    ctx.fillRect(x + 12, y + 3, 2, 3);
    ctx.fillStyle = '#6b4a22';
    ctx.fillRect(x - 1, y + 4, 2, 5);
  }

  private drawTower(x: number, y: number, now: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(20, 24, 14, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(x - 8, y - 4, 16, 18);
    ctx.fillStyle = COLORS.stone;
    ctx.fillRect(x - 7, y - 3, 14, 16);
    ctx.fillStyle = COLORS.stoneLight;
    ctx.fillRect(x - 6, y - 3, 6, 1);
    ctx.fillStyle = COLORS.stoneDark;
    ctx.fillRect(x - 9, y - 7, 18, 4);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = COLORS.stone;
      ctx.fillRect(x - 8 + i * 6, y - 10, 4, 4);
    }
    ctx.fillStyle = '#2b2d25';
    ctx.fillRect(x - 1, y - 4, 2, 5);
    ctx.fillStyle = COLORS.woodDark;
    ctx.fillRect(x - 6, y - 14, 12, 4);
    ctx.fillStyle = COLORS.wood;
    ctx.fillRect(x - 7, y - 17, 14, 4);
    ctx.fillStyle = '#c9a25a';
    ctx.fillRect(x - 4, y - 16, 8, 1);
    ctx.fillStyle = COLORS.steelDark;
    ctx.fillRect(x + 5, y - 25, 1, 11);
    ctx.fillStyle = '#3f6f9a';
    ctx.fillRect(x + 6, y - 25 + Math.sin(now * 2) * 0.6, 6, 3);
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(x + 2, y - 12, 2, 2);
    ctx.fillStyle = COLORS.steel;
    ctx.fillRect(x + 2, y - 13, 2, 1);
  }

  private drawBarracks(x: number, y: number, now: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(20, 24, 14, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y + 14, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.woodDark;
    ctx.fillRect(x - 17, y - 3, 34, 17);
    ctx.fillStyle = COLORS.wood;
    ctx.fillRect(x - 16, y - 2, 32, 15);
    for (let i = 0; i < 5; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? COLORS.woodLight : '#96623a';
      ctx.fillRect(x - 15 + i * 6, y - 2, 5, 14);
    }
    ctx.fillStyle = '#4b3320';
    ctx.fillRect(x - 4, y + 3, 8, 11);
    ctx.fillStyle = '#6d4a2a';
    ctx.fillRect(x - 3, y + 4, 6, 10);
    ctx.fillStyle = COLORS.redDark;
    ctx.fillRect(x - 20, y - 11, 40, 7);
    ctx.fillStyle = COLORS.red;
    ctx.fillRect(x - 18, y - 14, 36, 6);
    ctx.fillStyle = '#c25a4b';
    ctx.fillRect(x - 14, y - 14, 28, 2);
    ctx.fillStyle = COLORS.woodDark;
    ctx.fillRect(x + 14, y - 25, 2, 13);
    ctx.fillStyle = '#3f6f9a';
    ctx.fillRect(x + 16, y - 25 + Math.sin(now * 2.4) * 0.7, 8, 4);
    ctx.fillStyle = COLORS.steel;
    ctx.fillRect(x - 19, y - 2, 1, 15);
    ctx.fillRect(x - 15, y - 1, 1, 14);
    ctx.fillStyle = COLORS.steelDark;
    ctx.fillRect(x - 20, y - 3, 3, 2);
    ctx.fillRect(x - 16, y - 2, 3, 2);
  }

  private drawScaffold(b: Building): void {
    const ctx = this.ctx;
    const x = b.x;
    const y = b.y;
    const hw = b.w / 2 + 4;
    const top = y - b.h / 2 - 6;
    const bottom = y + b.h / 2 + 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(210, 183, 128, 0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - hw, bottom);
    ctx.lineTo(x - hw, top);
    ctx.moveTo(x + hw, bottom);
    ctx.lineTo(x + hw, top);
    for (let yy = bottom; yy > top; yy -= 7) {
      ctx.moveTo(x - hw, yy);
      ctx.lineTo(x + hw, yy);
    }
    ctx.stroke();
    ctx.restore();
  }

  private drawRubble(x: number, y: number, kind: BuildingKind): void {
    const ctx = this.ctx;
    const w = kind === 'tc' ? 44 : kind === 'barracks' ? 32 : 16;
    const h = kind === 'tc' ? 18 : kind === 'barracks' ? 14 : 10;
    ctx.save();
    ctx.fillStyle = 'rgba(20,24,14,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + h / 2, w / 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 9; i += 1) {
      const dx = (hash2(i, 3, 21) - 0.5) * w;
      const dy = (hash2(i, 7, 23) - 0.5) * h;
      ctx.fillStyle = i % 3 === 0 ? COLORS.woodDark : i % 3 === 1 ? COLORS.stoneDark : COLORS.stone;
      ctx.fillRect(Math.round(x + dx), Math.round(y + dy), 3 + (i % 2), 2);
    }
    ctx.fillStyle = 'rgba(40, 40, 34, 0.35)';
    ctx.fillRect(x - w / 4, y - 2, 2, 4);
    ctx.restore();
  }

  private drawUnit(u: Unit, s: GameState): void {
    const ctx = this.ctx;
    const selected = s.selection.includes(u.id);
    const enemy = u.kind === 'raider' || u.kind === 'warrior' || u.kind === 'chief';
    const scale = u.kind === 'chief' ? 1.35 : u.kind === 'warrior' ? 1.08 : 1;
    const moving = u.state === 'moving';
    const bob = moving ? Math.round(Math.sin(u.anim * 11) * 1) : 0;
    const colors = UNIT_COLORS[u.kind];

    ctx.save();
    ctx.fillStyle = 'rgba(16, 20, 12, 0.25)';
    ctx.beginPath();
    ctx.ellipse(u.x, u.y + 1, 5 * scale, 2 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    if (selected) {
      ctx.strokeStyle = '#e8bd56';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.ellipse(u.x, u.y + 1, 8, 3.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.translate(u.x, u.y + bob);
    ctx.scale(u.facing * scale, scale);
    const swing = u.state === 'gathering' || u.state === 'building' || u.state === 'fighting'
      ? Math.sin(u.anim * 10) * 2
      : 0;

    // bacaklar
    const legOff = moving ? Math.round(Math.sin(u.anim * 13) * 1.5) : 0;
    ctx.fillStyle = colors.clothDark;
    ctx.fillRect(-2, -3, 1, 3 + (legOff > 0 ? 1 : 0));
    ctx.fillRect(1, -3, 1, 3 + (legOff < 0 ? 1 : 0));
    // gövde
    ctx.fillStyle = colors.cloth;
    ctx.fillRect(-3, -9, 6, 6);
    ctx.fillStyle = colors.clothDark;
    ctx.fillRect(-3, -4, 6, 1);
    ctx.fillStyle = colors.trim;
    ctx.fillRect(-3, -9, 6, 1);
    // kol
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(3, -8, 1, 4);
    // kafa
    ctx.fillStyle = COLORS.skin;
    ctx.fillRect(-2, -13, 4, 4);
    ctx.fillStyle = COLORS.skinDark;
    ctx.fillRect(-2, -10, 4, 1);
    // saç / başlık
    if (u.kind === 'villager') {
      ctx.fillStyle = '#6b4526';
      ctx.fillRect(-2, -13, 4, 1);
      ctx.fillRect(-3, -12, 1, 2);
    } else if (u.kind === 'militia') {
      ctx.fillStyle = COLORS.steel;
      ctx.fillRect(-3, -14, 6, 3);
      ctx.fillStyle = COLORS.steelDark;
      ctx.fillRect(-3, -12, 6, 1);
      ctx.fillRect(-1, -12, 2, 2);
      ctx.fillStyle = COLORS.red;
      ctx.fillRect(1, -14, 2, 1);
    } else {
      ctx.fillStyle = u.kind === 'chief' ? '#2a1c17' : '#4a3326';
      ctx.fillRect(-3, -14, 6, 2);
      ctx.fillRect(-3, -12, 1, 2);
      ctx.fillStyle = u.kind === 'chief' ? COLORS.gold : COLORS.steelDark;
      ctx.fillRect(-5, -14, 2, 1);
      ctx.fillRect(3, -14, 2, 1);
      if (u.kind === 'chief') {
        ctx.fillStyle = '#d8d2bd';
        ctx.fillRect(-2, -11, 4, 1);
      }
    }

    // silah
    this.drawTool(u, swing);

    if (u.kind === 'militia') {
      ctx.fillStyle = colors.trim;
      ctx.fillRect(-5, -9, 2, 5);
      ctx.fillStyle = COLORS.steelDark;
      ctx.fillRect(-5, -7, 2, 1);
    }
    if (u.kind === 'chief') {
      ctx.fillStyle = '#2a1c17';
      ctx.fillRect(-4, -9, 1, 6);
    }

    // taşınan kaynak
    if (u.kind === 'villager' && u.carry > 0.05 && u.carryType) {
      ctx.fillStyle = 'rgba(24, 20, 12, 0.5)';
      ctx.fillRect(-3, -19, 6, 5);
      ctx.fillStyle = RESOURCES[u.carryType].color;
      ctx.fillRect(-2, -18, 4, 3);
      ctx.fillStyle = RESOURCES[u.carryType].dark;
      ctx.fillRect(-2, -16, 4, 1);
    }

    if (u.flash > 0) {
      ctx.globalAlpha = u.flash * 3;
      ctx.fillStyle = '#fff';
      ctx.fillRect(-3, -13, 7, 12);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (u.fleeing && u.kind === 'villager') {
      ctx.fillStyle = '#e0554a';
      ctx.fillRect(u.x, u.y - 21, 1, 3);
      ctx.fillRect(u.x, u.y - 17, 1, 1);
    }

    if (u.hp < u.maxHp && u.hp > 0) {
      const ratio = u.hp / u.maxHp;
      this.drawBar(
        u.x - 6,
        u.y - 19 - (u.kind === 'chief' ? 4 : 0),
        12,
        2,
        ratio,
        enemy ? '#d4553f' : ratio > 0.5 ? '#79b55e' : ratio > 0.25 ? '#e0b44c' : '#d4553f',
        'rgba(0,0,0,0.65)',
      );
    }
    if (enemy && this.hover && dist(this.hover.x, this.hover.y, u.x, u.y) < 10) {
      ctx.strokeStyle = 'rgba(220, 90, 74, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(u.x, u.y - 2, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawTool(u: Unit, swing: number): void {
    const ctx = this.ctx;
    if (u.kind === 'militia') {
      ctx.fillStyle = '#6b4a2a';
      ctx.fillRect(4, -11, 1, 9);
      ctx.fillStyle = COLORS.steel;
      ctx.fillRect(4, -13 + Math.round(swing * 0.3), 1, 3);
      return;
    }
    if (u.kind === 'villager') {
      const tool = u.state === 'building' ? 'hammer' : u.carryType === 'gold' || u.carryType === 'stone' ? 'pick' : 'axe';
      if (u.state === 'gathering' || u.state === 'building') {
        if (tool === 'hammer') {
          ctx.fillStyle = '#7c512c';
          ctx.fillRect(4, -10, 1, 7);
          ctx.fillStyle = COLORS.steel;
          ctx.fillRect(3, -11 + Math.round(swing * 0.4), 3, 2);
        } else if (tool === 'pick') {
          ctx.fillStyle = '#7c512c';
          ctx.fillRect(4, -10 + Math.round(swing * 0.2), 1, 7);
          ctx.fillStyle = COLORS.steel;
          ctx.fillRect(2, -11 + Math.round(swing * 0.5), 5, 1);
        } else {
          ctx.fillStyle = '#7c512c';
          ctx.fillRect(4, -10 + Math.round(swing * 0.2), 1, 7);
          ctx.fillStyle = COLORS.steel;
          ctx.fillRect(3, -11 + Math.round(swing * 0.5), 3, 2);
        }
      }
      return;
    }
    // barbar silahları
    const chief = u.kind === 'chief';
    ctx.fillStyle = '#5b3e25';
    ctx.fillRect(4, -12 + Math.round(swing * 0.3), 1, chief ? 12 : 9);
    ctx.fillStyle = chief ? COLORS.gold : COLORS.steelDark;
    ctx.fillRect(3, -14 + Math.round(swing * 0.5), chief ? 4 : 3, 2);
  }

  private drawProjectiles(s: GameState): void {
    const ctx = this.ctx;
    for (const p of s.projectiles) {
      const a = Math.atan2(p.ty - p.y, p.tx - p.x);
      ctx.save();
      ctx.strokeStyle = '#e8d6a0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - Math.cos(a) * 5, p.y - Math.sin(a) * 5);
      ctx.stroke();
      ctx.fillStyle = '#6b6b62';
      ctx.fillRect(p.x, p.y, 1, 1);
      ctx.restore();
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.min(1, p.life / (p.max * 0.6));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawFloaters(): void {
    const ctx = this.ctx;
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, f.life / (f.max * 0.5));
      this.pixelText(f.text, Math.round(f.x - (f.text.length * 4) / 2), Math.round(f.y), f.color);
    }
    ctx.globalAlpha = 1;
  }

  private pixelText(text: string, x: number, y: number, color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(12, 14, 9, 0.5)';
    let cx = x;
    for (const ch of text) {
      const g = GLYPHS[ch];
      if (!g) {
        cx += 2;
        continue;
      }
      for (let row = 0; row < g.length; row += 1) {
        const line = g[row] ?? '';
        for (let col = 0; col < line.length; col += 1) {
          if (line[col] === '1') ctx.fillRect(cx + col + 1, y + row + 1, 1, 1);
        }
      }
      cx += 4;
    }
    cx = x;
    ctx.fillStyle = color;
    for (const ch of text) {
      const g = GLYPHS[ch];
      if (!g) {
        cx += 2;
        continue;
      }
      for (let row = 0; row < g.length; row += 1) {
        const line = g[row] ?? '';
        for (let col = 0; col < line.length; col += 1) {
          if (line[col] === '1') ctx.fillRect(cx + col, y + row, 1, 1);
        }
      }
      cx += 4;
    }
  }

  private drawHover(s: GameState): void {
    if (!this.hover || s.placement) return;
    const ctx = this.ctx;
    const pick = this.game.pickAt(this.hover.x, this.hover.y);
    if (pick.type === 'none') return;
    ctx.save();
    ctx.strokeStyle = 'rgba(245, 238, 210, 0.28)';
    ctx.lineWidth = 1;
    if (pick.type === 'unit') {
      ctx.beginPath();
      ctx.arc(pick.x, pick.y - 3, 9, 0, Math.PI * 2);
      ctx.stroke();
    } else if (pick.type === 'building' && pick.id) {
      const b = this.game.building(pick.id);
      if (b) ctx.strokeRect(b.x - b.w / 2 - 2, b.y - b.h / 2 - 2, b.w + 4, b.h + 4);
    }
    ctx.restore();
  }

  private drawDrag(): void {
    if (!this.drag) return;
    const ctx = this.ctx;
    const x = Math.min(this.drag.x1, this.drag.x2);
    const y = Math.min(this.drag.y1, this.drag.y2);
    const w = Math.abs(this.drag.x2 - this.drag.x1);
    const h = Math.abs(this.drag.y2 - this.drag.y1);
    ctx.save();
    ctx.fillStyle = 'rgba(232, 189, 86, 0.08)';
    ctx.strokeStyle = 'rgba(232, 189, 86, 0.85)';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x + 0.5, y + 0.5, w, h);
    ctx.restore();
  }

  private drawVignette(): void {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.92);
    grad.addColorStop(0, 'rgba(10, 12, 8, 0)');
    grad.addColorStop(1, 'rgba(10, 12, 8, 0.28)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  private drawBar(
    x: number,
    y: number,
    w: number,
    h: number,
    ratio: number,
    color: string,
    bg: string,
  ): void {
    const ctx = this.ctx;
    ctx.fillStyle = bg;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w * Math.max(0, Math.min(1, ratio))), h);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w * Math.max(0, Math.min(1, ratio))), 1);
  }
}
