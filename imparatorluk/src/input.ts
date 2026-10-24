import type { Game } from './game';
import type { Renderer } from './render';

export interface InputActions {
  togglePause(): void;
  unlockAudio(): void;
  showTip(text: string, clientX: number, clientY: number): void;
  hideTip(): void;
  isBlocked(): boolean;
}

export class Input {
  private canvas: HTMLCanvasElement;
  private game: Game;
  private renderer: Renderer;
  private actions: InputActions;
  private dragging = false;
  private down = { x: 0, y: 0, moved: false, button: 0 };

  constructor(canvas: HTMLCanvasElement, game: Game, renderer: Renderer, actions: InputActions) {
    this.canvas = canvas;
    this.game = game;
    this.renderer = renderer;
    this.actions = actions;
    this.bind();
  }

  private coords(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 480,
      y: ((e.clientY - r.top) / r.height) * 270,
    };
  }

  private bind(): void {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => e.preventDefault());

    c.addEventListener('pointerdown', (e) => {
      if (this.actions.isBlocked()) return;
      this.actions.unlockAudio();
      const p = this.coords(e);
      this.down = { x: p.x, y: p.y, moved: false, button: e.button };
      c.setPointerCapture(e.pointerId);

      if (e.button === 2) {
        if (this.game.state.placement) this.game.cancelPlacement();
        else {
          this.game.state.selection = [];
          this.game.state.selectedBuilding = null;
        }
        this.actions.hideTip();
        return;
      }
      if (e.button !== 0) return;

      if (this.game.state.placement) {
        this.game.tryPlace(p.x, p.y);
        this.actions.hideTip();
        return;
      }

      const pick = this.game.pickAt(p.x, p.y);
      if (pick.type === 'unit' || pick.type === 'building') {
        this.game.selectAt(p.x, p.y, e.shiftKey);
        this.actions.hideTip();
      } else if (pick.type === 'node') {
        this.game.issueAt(p.x, p.y);
        this.actions.hideTip();
      } else {
        this.dragging = true;
        this.renderer.drag = { x1: p.x, y1: p.y, x2: p.x, y2: p.y };
        this.actions.hideTip();
      }
    });

    c.addEventListener('pointermove', (e) => {
      const p = this.coords(e);
      this.renderer.hover = p;
      if (this.dragging) {
        const d = Math.hypot(p.x - this.down.x, p.y - this.down.y);
        if (d > 6) this.down.moved = true;
        this.renderer.drag = { x1: this.down.x, y1: this.down.y, x2: p.x, y2: p.y };
        this.actions.hideTip();
        return;
      }
      if (this.actions.isBlocked()) {
        this.actions.hideTip();
        return;
      }
      if (this.game.state.placement) {
        const def = this.game.state.placement;
        const ok = this.game.canPlaceAt(def, p.x, p.y);
        this.actions.showTip(
          `${def === 'tower' ? 'Okçu Kulesi' : 'Kışla'} — ${ok ? 'sol tık: kur' : 'buraya kurulamaz'}\nsağ tık: iptal`,
          e.clientX,
          e.clientY,
        );
        return;
      }
      const text = this.game.describeAt(p.x, p.y);
      if (text) this.actions.showTip(text, e.clientX, e.clientY);
      else this.actions.hideTip();
    });

    const finish = (e: PointerEvent): void => {
      if (!this.dragging) return;
      this.dragging = false;
      const p = this.coords(e);
      if (this.down.moved) {
        this.game.selectRect(this.down.x, this.down.y, p.x, p.y, e.shiftKey);
      } else if (this.game.state.selection.length || this.game.state.selectedBuilding) {
        this.game.issueAt(p.x, p.y);
      } else {
        this.game.selectAt(p.x, p.y, e.shiftKey);
      }
      this.renderer.drag = null;
    };
    c.addEventListener('pointerup', finish);
    c.addEventListener('pointercancel', () => {
      this.dragging = false;
      this.renderer.drag = null;
    });
    c.addEventListener('pointerleave', () => {
      this.renderer.hover = null;
      if (!this.dragging) this.actions.hideTip();
    });

    window.addEventListener('keydown', (e) => {
      if (this.actions.isBlocked()) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      const g = this.game;

      if (e.key === 'Escape') {
        if (g.state.placement) g.cancelPlacement();
        else this.actions.togglePause();
        e.preventDefault();
        return;
      }
      if (e.key === ' ') {
        this.actions.togglePause();
        e.preventDefault();
        return;
      }
      if (g.state.phase !== 'playing') return;
      this.actions.unlockAudio();

      switch (k) {
        case 'a':
          g.selectAllVillagers();
          break;
        case 's':
          g.selectAllMilitia();
          break;
        case 'h':
          g.selectTC();
          break;
        case 'q':
          g.assignSelected('wood');
          break;
        case 'w':
          g.assignSelected('gold');
          break;
        case 'e':
          g.assignSelected('stone');
          break;
        case 'v':
          g.trainVillager();
          break;
        case 'f':
          g.researchAge();
          break;
        case 't':
          g.beginBuild('tower');
          break;
        case 'k':
          g.beginBuild('barracks');
          break;
        case 'm':
          g.trainMilitia();
          break;
        default:
          break;
      }
    });
  }
}
