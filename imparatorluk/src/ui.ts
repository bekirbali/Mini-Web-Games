import {
  AGE_II_COST,
  AGE_III_COST,
  AGES,
  BUILDINGS,
  MATCH_SECONDS,
  MILITIA_COST,
  RESOURCES,
  VILLAGER_COST,
  VILLAGER_LIMIT,
  WAVES,
} from './config';
import type { Game } from './game';
import { formatClock, formatTime } from './rng';
import type { BuildingKind, GameState, Meta, ResourceKind, RunRecord, Side, Unit } from './types';

export interface UIActions {
  start(): void;
  restart(): void;
  quit(): void;
  pauseOnly(): void;
  togglePause(): void;
  setName(name: string): void;
  toggleMute(): void;
  share(): void;
  unlockAudio(): void;
  trainVillager(): void;
  trainMilitia(): void;
  researchAge(): void;
  beginBuild(kind: BuildingKind): void;
}

type OverlayKind = 'title' | 'howto' | 'board' | 'pause' | 'result';

const SIDE_LABEL: Record<Side, string> = {
  west: 'BATI',
  east: 'DOĞU',
  north: 'KUZEY',
  south: 'GÜNEY',
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function costItems(cost: Partial<Record<ResourceKind, number>>): string {
  return (Object.keys(cost) as ResourceKind[])
    .map(
      (k) =>
        `<span class="cost-item"><i class="ico ${k}"></i>${cost[k] ?? 0}</span>`,
    )
    .join('');
}

function costText(cost: Partial<Record<ResourceKind, number>>): string {
  return (Object.keys(cost) as ResourceKind[])
    .map((k) => `${cost[k] ?? 0} ${RESOURCES[k].name.toLocaleLowerCase('tr')}`)
    .join(' + ');
}

export class UI {
  private hud: HTMLElement;
  private dock: HTMLElement;
  private stage: HTMLElement;
  private overlay: HTMLElement;
  private tip: HTMLElement;
  private toastEl!: HTMLElement;
  private banner!: HTMLElement;
  private overlayKind: OverlayKind | null = null;
  private overlayBack: 'title' | 'pause' | 'result' = 'title';
  private overlayOpen = false;
  private lastRecord: RunRecord | null = null;
  private toastTimer = 0;
  private flashUntil = 0;
  private ageCostKey = '';
  private tipText = '';

  private el: Record<string, HTMLElement> = {};

  constructor(
    private game: Game,
    private meta: Meta,
    private actions: UIActions,
  ) {
    this.hud = document.getElementById('hud') as HTMLElement;
    this.dock = document.getElementById('dock') as HTMLElement;
    this.stage = document.getElementById('stage') as HTMLElement;
    this.overlay = document.getElementById('overlay') as HTMLElement;
    this.tip = document.getElementById('tip') as HTMLElement;
    this.buildHud();
    this.buildDock();
    this.buildExtras();
    this.bind();
  }

  private q(id: string): HTMLElement {
    const node = document.getElementById(id);
    if (!node) throw new Error(`Eksik DOM: ${id}`);
    return node;
  }

  private buildHud(): void {
    this.hud.innerHTML = `
      <div class="hud-wrap">
        <div class="res-group">
          <div class="res-chip" id="res-wood"><i class="ico wood"></i><b data-res-val>100</b><span>ODUN</span></div>
          <div class="res-chip" id="res-gold"><i class="ico gold"></i><b data-res-val>40</b><span>ALTIN</span></div>
          <div class="res-chip" id="res-stone"><i class="ico stone"></i><b data-res-val>0</b><span>TAŞ</span></div>
        </div>
        <div class="clock">
          <div class="clock-row">
            <span class="clock-time" id="clock">0:00</span>
            <span class="clock-max">/ ${formatClock(MATCH_SECONDS)}</span>
            <span class="age-pill" id="age-pill">KABİLE</span>
          </div>
          <div class="clock-bar"><i id="clock-fill"></i></div>
          <div class="clock-sub">
            <span class="raid-chip" id="raid-chip">İlk akın 0:45</span>
            <span class="split-chip" id="split-chip"></span>
          </div>
        </div>
        <div class="hud-right">
          <div class="hud-stat"><b id="pop">3</b><span id="pop-max">/${VILLAGER_LIMIT} köylü</span></div>
          <div class="hud-stat"><b id="mil-pop">0</b><span>/8 milis</span></div>
          <div class="hud-stat best-stat"><b id="best">—</b><span>rekor</span></div>
          <div class="hud-btns">
            <button class="icon-btn" data-act="help" title="Nasıl oynanır" aria-label="Nasıl oynanır">?</button>
            <button class="icon-btn" data-act="mute" id="mute-btn" title="Ses" aria-label="Ses">♪</button>
            <button class="icon-btn" data-act="pause" title="Duraklat (Boşluk)" aria-label="Duraklat">II</button>
          </div>
        </div>
      </div>
    `;
  }

  private buildDock(): void {
    this.dock.innerHTML = `
      <div class="dock-wrap">
        <div class="sel-card" id="sel-card">
          <div class="sel-kicker" id="sel-kicker">HEDEF</div>
          <div class="sel-title" id="sel-title">Köylüleri kaynağa gönder</div>
          <div class="sel-sub" id="sel-sub">Bir kaynağa tıkla — köylü işe gitsin.</div>
        </div>
        <div class="commands">
          <div class="cmd-row">
            <button class="cmd" data-act="villager" title="Köylü üret (V)">
              <kbd>V</kbd>
              <span class="cmd-top"><span class="cmd-name">Köylü</span><span class="cmd-badge" id="badge-villager"></span></span>
              <span class="cmd-cost">${costItems(VILLAGER_COST)}</span>
            </button>
            <button class="cmd age" data-act="age" title="Çağ yükselt (F)">
              <kbd>F</kbd>
              <span class="cmd-top"><span class="cmd-name" id="age-label">Çağ II</span><span class="cmd-badge" id="age-note"></span></span>
              <span class="cmd-cost" id="age-cost"></span>
              <span class="cmd-progress"><i id="age-fill"></i></span>
            </button>
            <button class="cmd" data-act="militia" title="Milis üret (M)">
              <kbd>M</kbd>
              <span class="cmd-top"><span class="cmd-name">Milis</span><span class="cmd-badge" id="badge-militia"></span></span>
              <span class="cmd-cost">${costItems(MILITIA_COST)}</span>
            </button>
          </div>
          <div class="cmd-row build-row">
            <button class="cmd build" data-act="tower" title="Okçu kulesi (T)">
              <kbd>T</kbd>
              <span class="cmd-top"><span class="cmd-name">Okçu Kulesi</span></span>
              <span class="cmd-cost">${costItems(BUILDINGS.tower.cost)}</span>
            </button>
            <button class="cmd build" data-act="barracks" title="Kışla (K)">
              <kbd>K</kbd>
              <span class="cmd-top"><span class="cmd-name">Kışla</span><span class="cmd-note" id="barracks-note"></span></span>
              <span class="cmd-cost">${costItems(BUILDINGS.barracks.cost)}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private buildExtras(): void {
    this.banner = document.createElement('div');
    this.banner.id = 'raid-banner';
    this.stage.appendChild(this.banner);

    this.toastEl = document.createElement('div');
    this.toastEl.id = 'toast';
    this.stage.appendChild(this.toastEl);

    const rotate = document.createElement('div');
    rotate.className = 'rotate-hint';
    rotate.textContent = 'Daha iyi deneyim için telefonu yatır';
    this.stage.appendChild(rotate);
  }

  private bind(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      const actEl = target?.closest<HTMLElement>('[data-act]');
      if (!actEl) return;
      const act = actEl.dataset.act;
      this.actions.unlockAudio();
      switch (act) {
        case 'start':
          this.actions.start();
          break;
        case 'restart':
          this.actions.restart();
          break;
        case 'quit':
          this.actions.quit();
          break;
        case 'pause':
          this.actions.togglePause();
          break;
        case 'resume':
          this.actions.togglePause();
          break;
        case 'mute':
          this.actions.toggleMute();
          break;
        case 'share':
          this.actions.share();
          break;
        case 'help':
          if (this.game.state.phase === 'playing') {
            this.actions.pauseOnly();
            this.showHowto('pause');
          } else if (this.game.state.phase === 'paused') {
            this.showHowto('pause');
          } else if (this.game.state.phase === 'victory' || this.game.state.phase === 'defeat') {
            this.showHowto('result');
          } else {
            this.showHowto('title');
          }
          break;
        case 'howto':
          this.showHowto(this.overlayKind === 'pause' ? 'pause' : this.overlayKind === 'result' ? 'result' : 'title');
          break;
        case 'board':
          this.showBoard(this.overlayKind === 'pause' ? 'pause' : this.overlayKind === 'result' ? 'result' : 'title');
          break;
        case 'back':
          this.back();
          break;
        case 'villager':
          this.actions.trainVillager();
          break;
        case 'militia':
          this.actions.trainMilitia();
          break;
        case 'age':
          this.actions.researchAge();
          break;
        case 'tower':
          this.actions.beginBuild('tower');
          break;
        case 'barracks':
          this.actions.beginBuild('barracks');
          break;
        default:
          break;
      }
    });

    this.overlay.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement | null;
      if (t && t.id === 'name-input') this.actions.setName(t.value);
    });

    document.addEventListener('keydown', (e) => {
      if (!this.overlayOpen) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA';
      if (this.overlayKind === 'title') {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.actions.start();
        }
        return;
      }
      if (this.overlayKind === 'result') {
        if (e.key === 'r' || e.key === 'R' || e.key === 'Enter') {
          e.preventDefault();
          this.actions.restart();
        }
        return;
      }
      if (this.overlayKind === 'pause') {
        if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          e.stopImmediatePropagation();
          this.actions.togglePause();
        }
        return;
      }
      if ((this.overlayKind === 'howto' || this.overlayKind === 'board') && e.key === 'Escape' && !inInput) {
        e.preventDefault();
        this.back();
      }
    });
  }

  isOverlayOpen(): boolean {
    return this.overlayOpen;
  }

  sync(s: GameState): void {
    this.set('clock', formatClock(s.time));
    const fill = this.el['clock-fill'] ?? this.q('clock-fill');
    this.el['clock-fill'] = fill;
    fill.style.width = `${Math.min(100, (s.time / MATCH_SECONDS) * 100)}%`;

    const agePill = this.el['age-pill'] ?? this.q('age-pill');
    this.el['age-pill'] = agePill;
    agePill.textContent = AGES[s.age]?.short ?? '';
    agePill.dataset.age = String(s.age);

    this.setText('pop', String(this.game.villagerCount()));
    this.setText('mil-pop', String(this.game.militiaCount()));
    this.setText('best', this.meta.best ? formatTime(this.meta.best.time) : '—');
    this.setText('res-wood', String(Math.floor(s.resources.wood)));
    this.setText('res-gold', String(Math.floor(s.resources.gold)));
    this.setText('res-stone', String(Math.floor(s.resources.stone)));

    const mute = this.el['mute-btn'] ?? this.q('mute-btn');
    this.el['mute-btn'] = mute;
    mute.textContent = this.meta.muted ? '×' : '♪';
    mute.classList.toggle('off', this.meta.muted);
    if (this.overlayOpen) {
      this.overlay.querySelectorAll<HTMLElement>('[data-act="mute"]').forEach((btn) => {
        btn.textContent =
          this.overlayKind === 'pause'
            ? this.meta.muted
              ? 'SESİ AÇ'
              : 'SESİ KAPAT'
            : this.meta.muted
              ? 'SES: KAPALI'
              : 'SES: AÇIK';
      });
    }

    this.syncRaid(s);
    this.syncSplit(s);
    this.syncSelection(s);
    this.syncButtons(s);
    this.syncBanner(s);
  }

  private set(key: string, text: string): void {
    const node = this.el[key] ?? this.q(key);
    this.el[key] = node;
    if (node.textContent !== text) node.textContent = text;
  }

  private setText(key: string, text: string): void {
    if (key.startsWith('res-')) {
      const chip = this.el[key] ?? this.q(key);
      this.el[key] = chip;
      const val = chip.querySelector<HTMLElement>('[data-res-val]');
      if (val && val.textContent !== text) val.textContent = text;
      return;
    }
    this.set(key, text);
  }

  private syncRaid(s: GameState): void {
    const chip = this.el['raid-chip'] ?? this.q('raid-chip');
    this.el['raid-chip'] = chip;
    chip.classList.remove('danger', 'calm');
    if (s.phase !== 'playing' && s.phase !== 'paused') {
      chip.textContent = 'Tur bitti';
      return;
    }
    if (s.warning) {
      chip.textContent = `${SIDE_LABEL[s.warning.side]}'DAN AKIN · ${s.warning.remaining.toFixed(1)}`;
      chip.classList.add('danger');
      return;
    }
    if (s.waveIndex < WAVES.length) {
      const wave = WAVES[s.waveIndex];
      if (!wave) return;
      const left = wave.at - s.time;
      chip.textContent = `Akın ${formatClock(left)} sonra`;
      if (left <= 12) chip.classList.add('danger');
    } else {
      chip.textContent = 'Son akın!';
      chip.classList.add('calm');
    }
  }

  private syncSplit(s: GameState): void {
    const chip = this.el['split-chip'] ?? this.q('split-chip');
    this.el['split-chip'] = chip;
    chip.classList.remove('good', 'bad');
    const best = this.meta.best;
    if (s.stats.age2Time !== null && best?.age2 != null) {
      const delta = s.stats.age2Time - best.age2;
      chip.textContent = `Çağ II ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`;
      chip.classList.add(delta <= 0 ? 'good' : 'bad');
    } else if (best?.age2 != null) {
      chip.textContent = `Çağ II hedefi ${formatClock(best.age2)}`;
    } else {
      chip.textContent = '';
    }
  }

  private syncSelection(s: GameState): void {
    const kicker = this.el['sel-kicker'] ?? this.q('sel-kicker');
    const title = this.el['sel-title'] ?? this.q('sel-title');
    const sub = this.el['sel-sub'] ?? this.q('sel-sub');
    const card = this.el['sel-card'] ?? this.q('sel-card');
    this.el['sel-kicker'] = kicker;
    this.el['sel-title'] = title;
    this.el['sel-sub'] = sub;
    this.el['sel-card'] = card;
    card.classList.remove('alert');

    const b = this.game.selectedBuilding();
    if (b && s.phase !== 'title') {
      kicker.textContent = 'BİNA';
      title.textContent = BUILDINGS[b.kind].name;
      const bits = [`${Math.ceil(b.hp)}/${b.maxHp} can`];
      if (b.state === 'building') bits.push(`inşaat %${Math.round(b.progress * 100)}`);
      else if (b.queue > 0) bits.push(`kuyruk ${b.queue}`);
      if (b.kind === 'tc' && s.research) bits.push(`araştırma ${s.research.remaining.toFixed(1)} sn`);
      if (b.kind === 'tower') bits.push(`menzil ${BUILDINGS.tower.range}`);
      sub.textContent = bits.join(' · ');
      return;
    }

    const units = this.game.selectedUnits();
    if (units.length && s.phase !== 'title') {
      kicker.textContent = 'SEÇİM';
      const villagers = units.filter((u) => u.kind === 'villager');
      const militia = units.filter((u) => u.kind === 'militia');
      title.textContent = [
        villagers.length ? `${villagers.length} köylü` : '',
        militia.length ? `${militia.length} milis` : '',
      ]
        .filter(Boolean)
        .join(' + ');
      if (villagers.length) sub.textContent = this.villagerSummary(villagers);
      else sub.textContent = militia.some((u) => u.state === 'fighting') ? 'Savaşıyor' : 'Savunmada';
      return;
    }

    kicker.textContent = 'HEDEF';
    title.textContent = s.phase === 'title' ? '3 dakikada imparatorluk' : this.game.objectiveText();
    if (s.warning) {
      sub.textContent = `${SIDE_LABEL[s.warning.side]} yönünden akın! ${s.warning.remaining.toFixed(1)} sn`;
      card.classList.add('alert');
      return;
    }
    if (s.phase === 'title') {
      sub.textContent = 'Başla: 3 köylü, 180 saniye.';
      return;
    }
    if (s.age === 0) {
      sub.textContent = `${costText(AGE_II_COST)} · Kule ${costText(BUILDINGS.tower.cost)}`;
    } else if (!this.game.hasStructure('tower')) {
      sub.textContent = `Kule ${costText(BUILDINGS.tower.cost)} · ilk akın 0:45`;
    } else if (!this.game.hasStructure('barracks')) {
      sub.textContent = `Kışla ${costText(BUILDINGS.barracks.cost)}`;
    } else if (s.age === 1) {
      sub.textContent = `İmparatorluk: ${costText(AGE_III_COST)}`;
    } else {
      sub.textContent = 'Köylü bas, kaynakları dengele.';
    }
  }

  private villagerSummary(villagers: Unit[]): string {
    const counts: Record<string, number> = {};
    for (const u of villagers) {
      let key = 'boşta';
      if (u.fleeing) key = 'kaçıyor';
      else if (u.order?.type === 'gather') {
        const node = this.game.node(u.order.nodeId);
        key = node ? RESOURCES[node.kind].name.toLocaleLowerCase('tr') : 'yolda';
      } else if (u.order?.type === 'build') key = 'inşa';
      else if (u.order?.type === 'move') key = 'yolda';
      else if (u.carry > 0.1) key = 'taşıyor';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([k, v]) => `${v} ${k}`)
      .join(' · ');
  }

  private syncButtons(s: GameState): void {
    const villager = this.el['btn-villager'] ?? this.findAct('villager');
    const age = this.el['btn-age'] ?? this.findAct('age');
    const militia = this.el['btn-militia'] ?? this.findAct('militia');
    const tower = this.el['btn-tower'] ?? this.findAct('tower');
    const barracks = this.el['btn-barracks'] ?? this.findAct('barracks');
    this.el['btn-villager'] = villager;
    this.el['btn-age'] = age;
    this.el['btn-militia'] = militia;
    this.el['btn-tower'] = tower;
    this.el['btn-barracks'] = barracks;

    const tc = this.game.activeBuilding('tc');
    const rk = this.game.activeBuilding('barracks');

    villager.classList.toggle('poor', !this.game.affordable(VILLAGER_COST));
    villager.classList.toggle('locked', this.game.villagerCount() + (tc?.queue ?? 0) >= VILLAGER_LIMIT);
    this.setBadge('badge-villager', tc?.queue ?? 0);

    const hasTower = this.game.hasStructure('tower');
    const hasBarracks = this.game.hasStructure('barracks');
    const targetAge = s.age + 1;
    const cost = targetAge === 1 ? AGE_II_COST : AGE_III_COST;
    const reqMissing = targetAge === 2 && (!hasTower || !hasBarracks);
    const ageKey = `${s.age}:${hasTower}:${hasBarracks}`;
    const label = this.el['age-label'] ?? this.q('age-label');
    this.el['age-label'] = label;
    const ageCost = this.el['age-cost'] ?? this.q('age-cost');
    this.el['age-cost'] = ageCost;
    const ageNote = this.el['age-note'] ?? this.q('age-note');
    this.el['age-note'] = ageNote;
    const ageFill = this.el['age-fill'] ?? this.q('age-fill');
    this.el['age-fill'] = ageFill;

    if (s.age >= 2) {
      label.textContent = 'İmparatorluk';
      ageCost.textContent = 'Kuruldu ✓';
      ageNote.textContent = '';
      age.classList.add('done');
      age.classList.remove('poor', 'locked', 'working');
      ageFill.style.width = '100%';
    } else {
      age.classList.remove('done');
      if (s.research) {
        label.textContent = targetAge === 1 ? 'Çağ II' : 'İmparatorluk';
        ageCost.textContent = s.research.target === 1 ? 'Krallık yolu' : 'Son adım';
        ageNote.textContent = `${s.research.remaining.toFixed(1)} sn`;
        ageFill.style.width = `${(1 - s.research.remaining / s.research.total) * 100}%`;
        age.classList.add('working');
        age.classList.remove('poor', 'locked');
      } else {
        if (this.ageCostKey !== ageKey) {
          this.ageCostKey = ageKey;
          label.textContent = targetAge === 1 ? 'Çağ II' : 'İmparatorluk';
          ageCost.innerHTML = costItems(cost);
        }
        ageFill.style.width = '0%';
        age.classList.remove('working');
        age.classList.toggle('poor', !this.game.affordable(cost));
        age.classList.toggle('locked', reqMissing);
        ageNote.textContent = reqMissing ? 'kule + kışla' : '';
      }
    }

    militia.classList.toggle('poor', !this.game.affordable(MILITIA_COST));
    militia.classList.toggle('locked', s.age < 1 || !rk);
    this.setBadge('badge-militia', rk?.queue ?? 0);

    tower.classList.toggle('poor', !this.game.affordable(BUILDINGS.tower.cost));
    tower.classList.toggle('active', s.placement === 'tower');
    barracks.classList.toggle('poor', !this.game.affordable(BUILDINGS.barracks.cost));
    barracks.classList.toggle('locked', s.age < 1);
    barracks.classList.toggle('active', s.placement === 'barracks');
    const bnote = this.el['barracks-note'] ?? this.q('barracks-note');
    this.el['barracks-note'] = bnote;
    bnote.textContent = s.age < 1 ? 'Çağ II' : '';
  }

  private setBadge(id: string, n: number): void {
    const badge = this.el[id] ?? this.q(id);
    this.el[id] = badge;
    badge.textContent = n > 0 ? String(n) : '';
    badge.classList.toggle('show', n > 0);
  }

  private findAct(act: string): HTMLElement {
    const node = this.dock.querySelector<HTMLElement>(`[data-act="${act}"]`);
    if (!node) throw new Error(`Eksik buton: ${act}`);
    return node;
  }

  private syncBanner(s: GameState): void {
    const now = performance.now();
    if (s.warning) {
      this.banner.textContent = `${SIDE_LABEL[s.warning.side]}'DAN AKIN · ${Math.ceil(s.warning.remaining)}`;
      this.banner.classList.add('show', 'warn');
      return;
    }
    if (now < this.flashUntil) {
      this.banner.classList.add('show', 'warn');
      return;
    }
    this.banner.classList.remove('show', 'warn');
  }

  showRaid(side: Side): void {
    this.flashUntil = performance.now() + 1600;
    this.banner.textContent = `${SIDE_LABEL[side]}'DAN AKIN BAŞLADI!`;
    this.banner.classList.add('show', 'warn');
  }

  pulse(resource: ResourceKind): void {
    const chip = this.q(`res-${resource}`);
    chip.classList.remove('pulse');
    void chip.offsetWidth;
    chip.classList.add('pulse');
    window.setTimeout(() => chip.classList.remove('pulse'), 220);
  }

  toast(message: string): void {
    this.toastEl.textContent = message;
    this.toastEl.classList.add('show');
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 1900);
  }

  showTip(text: string, clientX: number, clientY: number): void {
    if (!text) {
      this.hideTip();
      return;
    }
    if (this.tipText !== text) {
      this.tip.textContent = text;
      this.tipText = text;
    }
    this.tip.classList.add('show');
    const rect = this.stage.getBoundingClientRect();
    let x = clientX - rect.left + 16;
    let y = clientY - rect.top + 18;
    const w = this.tip.offsetWidth;
    const h = this.tip.offsetHeight;
    if (x + w + 10 > rect.width) x = clientX - rect.left - w - 16;
    if (y + h + 10 > rect.height) y = clientY - rect.top - h - 14;
    x = Math.max(6, Math.min(rect.width - w - 6, x));
    y = Math.max(6, Math.min(rect.height - h - 6, y));
    this.tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  hideTip(): void {
    this.tip.classList.remove('show');
  }

  private setOverlay(kind: OverlayKind, html: string): void {
    this.overlayKind = kind;
    this.overlayOpen = true;
    this.overlay.innerHTML = `<div class="overlay-bg"></div>${html}`;
    this.overlay.classList.add('open');
    this.overlay.setAttribute('aria-hidden', 'false');
    this.hideTip();
  }

  hideOverlay(): void {
    this.overlayOpen = false;
    this.overlayKind = null;
    this.overlay.classList.remove('open');
    this.overlay.setAttribute('aria-hidden', 'true');
    this.overlay.innerHTML = '';
  }

  private back(): void {
    if (this.overlayBack === 'pause') this.showPause();
    else if (this.overlayBack === 'result') this.showResult(this.game.state, this.lastRecord);
    else this.showTitle();
  }

  showTitle(): void {
    this.overlayBack = 'title';
    this.lastRecord = null;
    const best = this.meta.best;
    const top = this.meta.board.slice(0, 3);
    const topHTML = top.length
      ? `<div class="mini-board">${top
          .map(
            (e, i) =>
              `<div class="mini-row"><span>${i + 1}</span><b>${esc(e.name)}</b><em>${formatTime(e.time)}</em></div>`,
          )
          .join('')}</div>`
      : `<div class="mini-empty">Henüz rekor yok. İlk imparatorluğu sen kur.</div>`;
    this.setOverlay(
      'title',
      `<div class="modal title-modal">
        <div class="kicker">TEK EKRAN · MİKRO RTS</div>
        <h1 class="game-title"><span>3 DAKİKALIK</span>İMPARATORLUK</h1>
        <p class="tagline">3 köylü. 180 saniye. Tek bir imparatorluk.</p>
        <div class="best-line">${best ? `REKOR <b>${formatTime(best.time)}</b> · ${esc(this.meta.board[0]?.name ?? this.meta.name)}` : 'REKOR <b>—</b>'}</div>
        <div class="title-grid">
          <label class="name-field">
            <span>Komutan adı</span>
            <input id="name-input" maxlength="12" spellcheck="false" value="${esc(this.meta.name)}" />
          </label>
          <div class="title-actions">
            <button class="btn primary big" data-act="start">BAŞLA <kbd>ENTER</kbd></button>
            <button class="btn" data-act="howto">NASIL OYNANIR</button>
            <button class="btn" data-act="board">LİDERLİK</button>
            <button class="btn ghost" data-act="mute">${this.meta.muted ? 'SES: KAPALI' : 'SES: AÇIK'}</button>
          </div>
        </div>
        ${topHTML}
        <div class="title-foot">En kısa sürede İmparatorluk Çağı · sabit harita · kişisel rekor</div>
      </div>`,
    );
  }

  showHowto(back: 'title' | 'pause' | 'result'): void {
    this.overlayBack = back;
    this.setOverlay(
      'howto',
      `<div class="modal howto-modal">
        <div class="kicker">NASIL OYNANIR</div>
        <h2>180 saniyede çağ atla</h2>
        <ol class="steps">
          <li><b>Topla.</b> Köylü seç, kaynağa tıkla. Boşta köylü varsa kaynağa tek tık yeter.</li>
          <li><b>Bas.</b> Merkez'de köylü üret. Her köylü daha hızlı ekonomi demek.</li>
          <li><b>Yükselt.</b> Çağ II'yi aç; kule ve kışla dik. İlk akın 0:45'te.</li>
          <li><b>Savun.</b> Okçu kulesi otomatik ateş eder, milisler yakındaki düşmana girer.</li>
          <li><b>İmparatorluk.</b> Kule + kışla şartıyla Çağ III'ü araştır — süre kaydedilir.</li>
        </ol>
        <div class="howto-grid">
          <div><kbd>Sol tık</kbd><span>Seç · gönder · yerleştir</span></div>
          <div><kbd>Sürükle</kbd><span>Kutuyla seçim</span></div>
          <div><kbd>Sağ tık / Esc</kbd><span>İptal · seçimi bırak</span></div>
          <div><kbd>A / S / H</kbd><span>Tüm köylü / milis / merkez</span></div>
          <div><kbd>Q / W / E</kbd><span>Odun / altın / taş</span></div>
          <div><kbd>V / F / M</kbd><span>Köylü / çağ / milis</span></div>
          <div><kbd>T / K</kbd><span>Kule / kışla</span></div>
          <div><kbd>Boşluk</kbd><span>Duraklat</span></div>
        </div>
        <div class="tip-line">İpucu: İlk akından önce bir kule, Çağ II'den önce de ikinci köylüyü düşün.</div>
        <div class="btn-row">
          ${back === 'title' ? '<button class="btn primary" data-act="start">BAŞLA</button>' : ''}
          <button class="btn" data-act="back">GERİ</button>
        </div>
      </div>`,
    );
  }

  showBoard(back: 'title' | 'pause' | 'result' = 'title'): void {
    this.overlayBack = back;
    const rows = this.meta.board
      .map(
        (e, i) => `<tr class="${i === 0 ? 'first' : ''}">
          <td class="rank">${i + 1}</td>
          <td class="who">${esc(e.name)}</td>
          <td class="num">${formatTime(e.time)}</td>
          <td class="num">${e.age2 != null ? formatClock(e.age2) : '—'}</td>
          <td class="num">${e.kills}</td>
        </tr>`,
      )
      .join('');
    this.setOverlay(
      'board',
      `<div class="modal board-modal">
        <div class="kicker">KİŞİSEL LİDERLİK</div>
        <h2>İmparatorluk sıralaması</h2>
        ${
          this.meta.board.length
            ? `<table class="board-table">
                <thead><tr><th>#</th><th>Komutan</th><th>Süre</th><th>Çağ II</th><th>Av</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>`
            : `<div class="empty-board">Henüz kayıt yok.<br />İlk imparatorluğu sen kur.</div>`
        }
        <div class="tip-line">Tablo bu tarayıcıda saklanır. Rekor süre küçük olan kazanır.</div>
        <div class="btn-row">
          <button class="btn" data-act="back">GERİ</button>
          ${back === 'title' ? '<button class="btn primary" data-act="start">BAŞLA</button>' : ''}
        </div>
      </div>`,
    );
  }

  showPause(): void {
    this.overlayBack = 'pause';
    this.setOverlay(
      'pause',
      `<div class="modal small-modal">
        <div class="kicker">DURAKLATILDI</div>
        <h2>Süre durdu</h2>
        <div class="pause-time">${formatClock(this.game.state.time)} <span>/ 3:00</span></div>
        <p class="muted">Kaynaklar ve akınlar bekliyor. Devam ettiğinde kaldığın yerden sürer.</p>
        <div class="btn-col">
          <button class="btn primary" data-act="resume">DEVAM <kbd>BOŞLUK</kbd></button>
          <button class="btn" data-act="help">NASIL OYNANIR</button>
          <button class="btn" data-act="restart">YENİDEN BAŞLA</button>
          <button class="btn" data-act="mute">${this.meta.muted ? 'SESİ AÇ' : 'SESİ KAPAT'}</button>
          <button class="btn ghost" data-act="quit">ANA MENÜ</button>
        </div>
      </div>`,
    );
  }

  showResult(s: GameState, record: RunRecord | null): void {
    const res = s.result;
    if (!res) return;
    this.overlayBack = 'result';
    this.lastRecord = record;
    const win = res.win;
    const best = this.meta.best;
    const why =
      res.reason === 'imperial'
        ? 'İmparatorluk Çağı tamamlandı.'
        : res.reason === 'tc'
          ? 'Merkez yıkıldı. Kule ve milis savunması şart.'
          : 'Süre doldu. Çağ III için kule + kışla + araştırma gerekiyor.';
    const age2 = s.stats.age2Time;
    const lossTime = res.reason === 'time' ? MATCH_SECONDS : res.time;
    const title = win
      ? 'İMPARATORLUK KURULDU'
      : res.reason === 'time'
        ? 'SÜRE DOLDU'
        : 'MERKEZ YIKILDI';
    const topRows = this.meta.board
      .slice(0, 5)
      .map(
        (e, i) => `<div class="mini-row ${record && i + 1 === record.rank ? 'me' : ''}">
          <span>${i + 1}</span><b>${esc(e.name)}</b><em>${formatTime(e.time)}</em>
        </div>`,
      )
      .join('');

    this.setOverlay(
      'result',
      `<div class="modal result-modal ${win ? 'win' : 'lose'}">
        <div class="kicker">${win ? 'ZAFFER' : 'YENİLGİ'}</div>
        <h2>${title}</h2>
        <div class="result-time">${win ? formatTime(res.time) : formatClock(lossTime)}</div>
        ${win && record?.isBest ? '<div class="newbest">YENİ REKOR</div>' : ''}
        ${win && record && record.rank > 0 ? `<div class="rankline">Liderlik tablosunda <b>#${record.rank}</b></div>` : ''}
        ${!win ? `<p class="why">${why}</p>` : ''}
        <div class="stats-grid">
          <div><span>Çağ II</span><b>${age2 != null ? formatTime(age2) : '—'}</b></div>
          <div><span>Öldürme</span><b>${s.stats.kills}</b></div>
          <div><span>Kayıp köylü</span><b>${s.stats.lostVillagers}</b></div>
          <div><span>Toplanan</span><b>${Math.round(s.stats.gathered)}</b></div>
        </div>
        ${
          win && best && !record?.isBest
            ? `<div class="tip-line">Rekorun ${formatTime(best.time)} — ${(res.time - best.time).toFixed(1)} sn geride.</div>`
            : ''
        }
        ${
          win
            ? `<div class="mini-board result-board"><div class="mini-head">EN İYİ 5</div>${topRows}</div>`
            : `<div class="tip-line">Bir kule + iki milis ilk akını çevirir. Sonra İmparatorluk.</div>`
        }
        <div class="btn-row">
          <button class="btn primary" data-act="restart">TEKRAR <kbd>R</kbd></button>
          <button class="btn" data-act="board">LİDERLİK</button>
          ${win ? '<button class="btn" data-act="share">PAYLAŞ</button>' : ''}
          <button class="btn ghost" data-act="quit">ANA MENÜ</button>
        </div>
      </div>`,
    );
  }
}
