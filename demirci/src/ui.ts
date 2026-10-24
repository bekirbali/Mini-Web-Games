import { CONFIG, STANCE_MAP, STANCES } from './config';
import type { Game } from './game';
import { barPosition } from './game';
import type { GameState, ItemKind } from './types';

const KIND_LABEL: Record<ItemKind, string> = {
  sword: 'kılıç',
  axe: 'balta',
  dagger: 'hançer',
  armor: 'zırh',
  shield: 'kalkan',
};

const TIER_CLASS = (tier: number) => (tier <= 3 ? 'bronze' : tier <= 6 ? 'steel' : 'legend');

const DAY_FLAVOR = [
  'Kepenk açıldı. Sırada üç köylü, bir maceracı var. Kimse +9 istemiyor. Şimdilik.',
  'Dün gece biri dükkânın önünde küfretti. Bugün daha dikkatli bas.',
  'Kraliyet habercisi kapıda. Bugün herkes +9 istiyor. Kimse "olmasa da olur" demiyor.',
];

export class UI {
  private hud: HTMLElement;
  private stage: HTMLElement;
  private overlay: HTMLElement;

  constructor(private game: Game) {
    this.hud = document.getElementById('hud')!;
    this.stage = document.getElementById('stage')!;
    this.overlay = document.getElementById('overlay')!;
    this.bindDelegates();
  }

  /* ------------------------------------------------------------- events */

  private bindDelegates(): void {
    document.addEventListener('pointerdown', (ev) => {
      const target = ev.target as HTMLElement;
      if (!target.closest('.bar-shell')) return;
      if (this.game.state.phase !== 'strike') return;
      ev.preventDefault();
      this.game.strike(performance.now());
    });

    document.addEventListener('click', (ev) => {
      const el = (ev.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
      const up = (ev.target as HTMLElement).closest('[data-upgrade]') as HTMLElement | null;
      const st = (ev.target as HTMLElement).closest('[data-stance]') as HTMLElement | null;

      if (up) {
        this.game.pickUpgrade(up.dataset.upgrade!);
        return;
      }
      if (st) {
        this.game.chooseStance(st.dataset.stance!);
        return;
      }
      if (!el) return;
      const act = el.dataset.act;
      switch (act) {
        case 'start':
        case 'restart':
          this.game.start();
          break;
        case 'open':
          this.game.openShop();
          break;
        case 'accept':
          this.game.accept();
          break;
        case 'reject':
          this.game.reject();
          break;
        case 'scroll':
          this.game.resolveRescue('scroll');
          break;
        case 'anvil':
          this.game.resolveRescue('anvil');
          break;
        case 'none':
          this.game.resolveRescue('none');
          break;
        case 'ownForge':
          this.game.startOwnForge();
          break;
        case 'skip':
          this.game.skipShop();
          break;
        case 'sell':
          this.game.auctionSell();
          break;
        case 'hold':
          this.game.auctionContinue();
          break;
        default:
          break;
      }
    });

    document.addEventListener('keydown', (ev) => {
      const s = this.game.state;
      const k = ev.key;

      if (k === 'Enter') {
        if (s.phase === 'title') this.game.start();
        else if (s.phase === 'dayIntro') this.game.openShop();
        else if (s.phase === 'arrive') this.game.accept();
        else if (s.phase === 'ownForgeIntro') this.game.startOwnForge();
        else if (s.phase === 'ended') this.game.start();
        return;
      }
      if (k === ' ' && s.phase === 'strike') {
        ev.preventDefault();
        this.game.strike(performance.now());
        return;
      }
      if ((k === '1' || k === '2' || k === '3') && s.phase === 'stance') {
        const id = k === '1' ? 'careful' : k === '2' ? 'normal' : 'bold';
        this.game.chooseStance(id);
        return;
      }
      if ((k === '1' || k === '2' || k === '3') && s.phase === 'shop') {
        const card = s.shopOptions[Number(k) - 1];
        if (card) this.game.pickUpgrade(card.id);
        return;
      }
      if ((k === '1' || k === '2' || k === '3') && s.phase === 'rescue') {
        if (k === '1') this.game.resolveRescue('scroll');
        else if (k === '2') this.game.resolveRescue('anvil');
        else this.game.resolveRescue('none');
        return;
      }
      if (k === 's' && s.phase === 'auction') this.game.auctionSell();
      if (k === 'b' && s.phase === 'auction') this.game.auctionContinue();
    });
  }

  /* -------------------------------------------------------------- render */

  render(s: GameState): void {
    this.hud.innerHTML = this.hudHtml(s);
    this.stage.innerHTML = this.stageHtml(s);
    const overlayHtml = this.overlayHtml(s);
    this.overlay.innerHTML = overlayHtml;
    this.overlay.classList.toggle('hidden', overlayHtml === '');
    this.applyBarGeometry(s);
  }

  private hudHtml(s: GameState): string {
    if (s.phase === 'title') return '';
    const pips = Array.from({ length: s.maxReputation }, (_, i) => {
      const filled = i < Math.round(s.reputation);
      return `<i class="${filled ? 'on' : ''}"></i>`;
    }).join('');

    const chips: string[] = [];
    if (s.scrolls > 0) chips.push(`<span class="chip" title="Kutsama parşömeni">✧ ${s.scrolls}</span>`);
    if (s.steelCharges > 0) chips.push(`<span class="chip" title="Çelik suyu">❖ ${s.steelCharges}</span>`);
    if (s.candleCharges > 0) chips.push(`<span class="chip" title="Şans mumu">✶ ${s.candleCharges}</span>`);

    return `
      <div class="hud-left">
        <span class="hud-day">GÜN ${s.day}<b>/${CONFIG.days}</b></span>
        <span class="hud-gold">◈ ${Math.round(s.gold)}</span>
      </div>
      <div class="hud-right">
        ${chips.join('')}
        <span class="hud-rep" title="İtibar">${pips}</span>
      </div>`;
  }

  private itemStrip(s: GameState): string {
    const item = s.item;
    if (!item) return '';
    const pips = Array.from({ length: item.maxDurability }, (_, i) => {
      return `<i class="${i < item.durability ? 'on' : ''}"></i>`;
    }).join('');
    const special = s.customer?.special;
    return `
      <div class="item-strip">
        <div class="item-head">
          <span class="item-name ${TIER_CLASS(item.tier)}">${item.name}</span>
          <span class="item-tier ${TIER_CLASS(item.tier)}">+${item.tier}<b>/${item.target}</b></span>
        </div>
        <div class="item-sub">
          <span class="dur" title="Dayanıklılık">${pips}</span>
          <span class="kind">${KIND_LABEL[item.kind]}</span>
          ${special === 'blind' ? '<span class="warn-chip">gözü kapalı</span>' : ''}
          ${special === 'shaky' ? '<span class="warn-chip">sabırsız</span>' : ''}
          ${special === 'noble' ? '<span class="warn-chip">soylu</span>' : ''}
        </div>
      </div>`;
  }

  private barHtml(s: GameState): string {
    const blind = s.customer?.special === 'blind';
    const goodMul = STANCE_MAP[s.stance]?.goodMul ?? 1.6;
    const goodW = Math.min(100, s.zoneW * goodMul * 100);
    const perfW = s.zoneW * 100;
    const flash =
      s.phase === 'result' && s.result
        ? `<div class="bar-flash ${s.result.kind}">${
            s.result.kind === 'perfect'
              ? 'MÜKEMMEL'
              : s.result.kind === 'good'
                ? 'SAĞLAM'
                : s.result.kind === 'burn'
                  ? 'YANDI'
                  : 'ISKA'
          }</div>`
        : '';
    return `
      <div class="bar-shell ${blind ? 'blind' : ''} ${s.phase === 'strike' ? 'live' : ''}" id="barShell">
        ${blind ? '<div class="blind-hint">bölge gizli — merkezi hisset</div>' : ''}
        <div class="bar-good" style="left:${50 - goodW / 2}%;width:${goodW}%"></div>
        <div class="bar-zone" style="left:${50 - perfW / 2}%;width:${perfW}%"></div>
        <div class="bar-marker" id="barMarker" style="left:50%"></div>
        ${flash}
      </div>`;
  }

  private stanceHtml(s: GameState): string {
    if (s.item?.own) {
      return `
        <div class="stances static">
          ${STANCES.map(
            (st) => `
            <button class="stance ${st.id} ${s.stance === st.id ? 'sel' : ''}" data-stance="${st.id}" ${s.phase !== 'stance' || !this.game.canUseStance(st.id) ? 'disabled' : ''}>
              <span class="key">${st.key}</span>
              <b>${st.name}</b>
              <small>${st.desc}</small>
            </button>`,
          ).join('')}
        </div>
        <div class="hint">Kendi kılıcın: ödeme yok, sadece risk.</div>`;
    }
    const pay = (id: string) => this.game.payFor(id);
    return `
      <div class="stances">
        ${STANCES.map(
          (st) => `
          <button class="stance ${st.id} ${s.stance === st.id ? 'sel' : ''}" data-stance="${st.id}" ${s.phase !== 'stance' || !this.game.canUseStance(st.id) ? 'disabled' : ''}>
            <span class="key">${st.key}</span>
            <b>${st.name}</b>
            <small>${st.desc}</small>
            <em>+${pay(st.id)} altın</em>
          </button>`,
        ).join('')}
      </div>`;
  }

  private stageHtml(s: GameState): string {
    if (s.phase === 'arrive') return this.customerHtml(s);
    if (s.phase === 'stance' || s.phase === 'strike' || s.phase === 'result' || s.phase === 'rescue') {
      return `
        <div class="forge-ui">
          ${this.itemStrip(s)}
          ${this.barHtml(s)}
          <div class="message ${s.messageTone}">${s.message || '&nbsp;'}</div>
          ${this.stanceHtml(s)}
          <div class="hint">${
            s.phase === 'strike'
              ? 'BOŞLUK veya tıkla — altın bölgede vur'
              : s.phase === 'stance'
                ? 'Duruş seç (1/2/3), sonra bar başlar'
                : ''
          }</div>
        </div>`;
    }
    return '';
  }

  private customerHtml(s: GameState): string {
    const c = s.customer!;
    const item = s.item!;
    const first = c.name.charAt(0).toUpperCase();
    return `
      <div class="customer-card">
        <div class="avatar">${first}</div>
        <div class="cust-body">
          <div class="cust-name">${c.name} <span>· ${c.title}</span></div>
          <p class="cust-line">${c.line.replace(/\n/g, '<br>')}</p>
          <div class="order">
            <span class="item-name ${TIER_CLASS(0)}">${item.name}</span>
            <span class="arrow">→</span>
            <span class="target">+${c.target}</span>
            <span class="dur">${'●'.repeat(item.durability)}</span>
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="btn primary" data-act="accept">Kabul Et <small>Enter</small></button>
        <button class="btn ghost" data-act="reject">Geri Çevir <small>itibar −0.2</small></button>
      </div>`;
  }

  private overlayHtml(s: GameState): string {
    switch (s.phase) {
      case 'title': {
        const meta = this.game.getMeta();
        return `
          <div class="card title-card">
            <div class="kicker">+9 BASMA SİMÜLATÖRÜ</div>
            <h1>LANETLİ DEMİRCİ</h1>
            <p class="sub">Müşterinin kılıcı senin elinde. Onun da parası senin cebinde.</p>
            <button class="btn primary big" data-act="start">Dükkânı Aç <small>Enter</small></button>
            <div class="meta-line">Rekor: <b>${Math.round(meta.best)}</b> altın · ${meta.runs} sefer</div>
            <ul class="how">
              <li>Barın ortasındaki altın bölgede vur. Merkez = mükemmel.</li>
              <li>Her vuruşta duruş seç: temkinli, normal ya da cüretkâr.</li>
              <li>Metal yorulur. 3 ıska = eşya yanar, müşteri taşlar.</li>
              <li>3 gün sonra kendi kılıcını dövüp müzayedeye çıkar.</li>
            </ul>
          </div>`;
      }
      case 'dayIntro':
        return `
          <div class="card">
            <div class="kicker">GÜN ${s.day} / ${CONFIG.days}</div>
            <h2>${s.day === 1 ? 'Kepenk açılıyor' : s.day === 2 ? 'Dün gece küfredenler oldu' : 'Son gün'}</h2>
            <p class="sub">${DAY_FLAVOR[s.day - 1] ?? ''}</p>
            <div class="stat-row">
              <span>◈ ${Math.round(s.gold)}</span>
              <span>İtibar ${s.reputation.toFixed(1)}</span>
              <span>✧ ${s.scrolls}</span>
            </div>
            <button class="btn primary" data-act="open">Dükkânı Aç <small>Enter</small></button>
          </div>`;
      case 'rescue':
        return `
          <div class="card rescue">
            <div class="kicker danger">EŞYA YANMAK ÜZERE</div>
            <p class="sub">Bir saniye. Bir şey yap.</p>
            <div class="countdown"><i id="rescueBar"></i></div>
            <div class="actions col">
              <button class="btn primary" data-act="scroll" ${s.scrolls > 0 ? '' : 'disabled'}>
                ✧ Parşömen kullan <small>${s.scrolls} adet</small>
              </button>
              <button class="btn" data-act="anvil" ${s.upgrades.anvil > 0 ? '' : 'disabled'}>
                ⚒ Örsü feda et <small>seviye ${s.upgrades.anvil}</small>
              </button>
              <button class="btn ghost" data-act="none">Boş ver, yansın</button>
            </div>
          </div>`;
      case 'shop':
        return `
          <div class="card wide">
            <div class="kicker">GÜN SONU</div>
            <h2>Dükkânı geliştir</h2>
            <p class="sub">Bir tanesini seç. Diğerleri kaybolur. Harcadığın altın, skorundan düşer.</p>
            <div class="cards">
              ${s.shopOptions
                .map(
                  (c, i) => `
                <button class="shop-card" data-upgrade="${c.id}" ${s.gold >= this.game.shopCost() ? '' : 'disabled'}>
                  <span class="icon">${c.icon}</span>
                  <b>${c.name}</b>
                  <small>${c.desc}</small>
                  <span class="cost">◈ ${this.game.shopCost()}</span>
                  <em>${i + 1}</em>
                </button>`,
                )
                .join('')}
            </div>
            <button class="btn ghost skip" data-act="skip">Hiçbirini alma <small>altını sakla</small></button>
          </div>`;
      case 'ownForgeIntro':
        return `
          <div class="card">
            <div class="kicker">SON GÜN · MÜZAYEDE</div>
            <h2>Kendi kılıcını döv</h2>
            <p class="sub">Müşteri yok, komisyon yok. +4'ten +9'a. Tek bir hata kılıcı götürür.</p>
            <p class="warn-line">Yanarsa müzayede iptal, elinde sadece hurdacı parası kalır.</p>
            <button class="btn primary" data-act="ownForge">Örsün başına geç <small>Enter</small></button>
          </div>`;
      case 'auction': {
        const a = s.auction!;
        return `
          <div class="card wide">
            <div class="kicker">KRALLIK MÜZAYEDESİ</div>
            <h2>${s.item?.name ?? 'Kılıç'} <span class="tier-big">+9</span></h2>
            <div class="price">◈ ${a.price}</div>
            <div class="bidders">
              ${a.bidders
                .map(
                  (b) => `
                <div class="bidder ${b.alive ? 'alive' : 'out'}">
                  <b>${b.name}</b>
                  <small>${b.persona}</small>
                  <span>${b.alive ? 'teklif veriyor' : 'çekildi'}</span>
                </div>`,
                )
                .join('')}
            </div>
            <p class="sub">Her turda fiyat yükselir. Bütçesi yetmeyen çekilir. Hepsi çekilirse kılıç hurdacıya gider.</p>
            <div class="actions">
              <button class="btn primary" data-act="sell">◈ ${a.price} altına sat <small>S</small></button>
              <button class="btn" data-act="hold">Bir tur daha bekle <small>B</small></button>
            </div>
          </div>`;
      }
      case 'ended':
        return `
          <div class="card">
            <div class="kicker">DÜKKÂN KAPANDI</div>
            <h2>${s.endReason}</h2>
            <div class="score">◈ ${Math.round(s.score)}</div>
            <div class="stat-grid">
              <span>${s.stats.delivered} teslim</span>
              <span>${s.stats.burns} yanma</span>
              <span>${s.stats.perfects} mükemmel</span>
              <span>${s.stats.strikes} vuruş</span>
            </div>
            <button class="btn primary big" data-act="restart">Tekrar Aç <small>Enter</small></button>
            <div class="meta-line">Rekor: <b>${Math.round(this.game.getMeta().best)}</b> altın</div>
          </div>`;
      default:
        return '';
    }
  }

  /* ---------------------------------------------------------------- tick */

  private applyBarGeometry(s: GameState): void {
    const marker = document.getElementById('barMarker');
    if (marker) marker.style.left = '50%';
    const shell = document.getElementById('barShell');
    if (shell) shell.classList.toggle('blind', s.customer?.special === 'blind');
  }

  tick(t: number, s: GameState): void {
    const marker = document.getElementById('barMarker');

    if (marker) {
      if (s.phase === 'strike') {
        const pos = barPosition(s.barStart, s.barSpeed, t);
        marker.style.left = `${(pos * 100).toFixed(3)}%`;
      } else if (s.phase === 'result' && s.result) {
        marker.style.left = `${(s.result.pos * 100).toFixed(3)}%`;
      }
    }

    if (s.phase === 'rescue') {
      const bar = document.getElementById('rescueBar');
      if (bar) {
        const left = Math.max(0, s.phaseUntil - t);
        bar.style.width = `${(left / CONFIG.rescueMs) * 100}%`;
      }
    }
  }
}
