// Weekend Arcade Portal Logic
(function () {
  let games = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let soundEnabled = false;
  let audioCtx = null;

  // Web Audio Synth for subtle arcade feedback
  function playBeep(freq = 440, type = 'sine', duration = 0.08, gainVal = 0.04) {
    if (!soundEnabled) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // AudioContext unavailable or blocked
    }
  }

  // SVGs for Icons
  const ICONS = {
    anvil: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 11h10l-2 4H9z"/><rect x="10" y="15" width="4" height="5"/><path d="M4 8h16l-2-3H6z"/></svg>`,
    crown: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>`,
    shield: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    sparkle: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/></svg>`,
    gamepad: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><line x1="15" y1="13" x2="15.01" y2="13"/><line x1="18" y1="11" x2="18.01" y2="11"/><rect x="2" y="6" width="20" height="12" rx="2"/></svg>`
  };

  // Fallback embedded dataset if fetch fails (e.g., local file:// protocol)
  const FALLBACK_GAMES = [
    {
      id: "demirci",
      title: "Lanetli Demirci",
      tagline: "+9 Basma Roguelike",
      description: "Her vuruşta zamanlama ve risk seçimi: müşterilerin eşyalarını kırmadan +9'a bas, ustanın lanetinden kurtul.",
      genre: "Roguelite / Zamanlama",
      duration: "3 - 5 dk",
      status: "playable",
      badge: "Oynanabilir v1",
      tags: ["Zamanlama", "Risk Yönetimi", "Pixel FX", "Metin2 Havası"],
      path: "./demirci/",
      accentColor: "#f0a93c",
      icon: "anvil",
      featured: true,
      details: {
        controls: "Boşluk / Tıklama (Vuruş), 1-2-3 (Tutum / Eşya seçimi)",
        highlight: "Kritik vuruş penceresi, kutsama parşömeni ve çelik suyu kurtarma mekaniği.",
        version: "v1.0"
      }
    },
    {
      id: "imparatorluk",
      title: "3 Dakikalık İmparatorluk",
      tagline: "Tek Ekran Mikro-RTS",
      description: "180 saniyede köylüleri yönlendir, kaynakları topla, akınlara dayan ve İmparatorluk Çağı'na ulaşarak zafere eriş.",
      genre: "Mikro-RTS / Strateji",
      duration: "3 dk",
      status: "playable",
      badge: "Oynanabilir v1",
      tags: ["Gerçek Zamanlı", "Mikro-Yönetim", "Strateji", "180sn Run"],
      path: "./imparatorluk/",
      accentColor: "#e8bd56",
      icon: "crown",
      featured: true,
      details: {
        controls: "Tıklama / Dokunmatik (Köylü atama, bina basma, çağ atlama)",
        highlight: "Karanlık Çağ'dan İmparatorluk Çağı'na tek ekranda kompakt strateji akışı.",
        version: "v1.0"
      }
    },
    {
      id: "towerrogue",
      title: "Siper",
      tagline: "Roguelite Kule Savunma",
      description: "Sabit yollu, draft tabanlı taktik kule savunması. Her run yeni kule sinerjileri ve yatay meta keşfi.",
      genre: "Kule Savunma / Draft",
      duration: "8 - 12 dk",
      status: "in_development",
      badge: "Tasarım / Yakında",
      tags: ["Kule Savunma", "Draft", "Sinerji", "Roguelite"],
      path: "#",
      accentColor: "#6fb3d9",
      icon: "shield",
      featured: false,
      details: {
        controls: "Kart seçimi ve kule yerleşimi",
        highlight: "Kayıp atfını şansa değil karara bağlayan şeffaf kule ve düşman fiziği.",
        version: "Tasarım Aşaması (PRD Hazır)"
      }
    },
    {
      id: "nefes",
      title: "Nefes",
      tagline: "Tam Ekran Duyarlı Mola Aracı",
      description: "Tam ekran oyun veya film sırasında susan, ekrandan çıkıldığında su ve mola hatırlatan bağlam farkında araç.",
      genre: "Yardımcı Araç / Desktop",
      duration: "Sürekli",
      status: "in_development",
      badge: "Tasarım / Yakında",
      tags: ["Tray Uygulaması", "Oyun Dostu", "Bağlam Duyarlı", "Windows"],
      path: "#",
      accentColor: "#7fc29b",
      icon: "sparkle",
      featured: false,
      details: {
        controls: "Windows Sistem Tepsisi (Tray)",
        highlight: "Kullanıcıyı en kritik aksiyon anında bölmeyen akıllı bağlam tespiti.",
        version: "Tasarım Aşaması (PRD Hazır)"
      }
    }
  ];

  async function loadGames() {
    try {
      const res = await fetch('./games.json');
      if (!res.ok) throw new Error('Fetch failed');
      games = await res.json();
    } catch (e) {
      console.warn('games.json fetch failed, using fallback games', e);
      games = FALLBACK_GAMES;
    }
    updateStats();
    renderCards();
  }

  function updateStats() {
    const totalCount = games.length;
    const playableCount = games.filter(g => g.status === 'playable').length;
    const totalEl = document.getElementById('stat-total');
    const playableEl = document.getElementById('stat-playable');
    if (totalEl) totalEl.textContent = totalCount;
    if (playableEl) playableEl.textContent = playableCount;
  }

  function renderCards() {
    const grid = document.getElementById('games-grid');
    if (!grid) return;

    const filtered = games.filter(g => {
      if (currentFilter !== 'all' && g.status !== currentFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inTitle = g.title.toLowerCase().includes(q);
        const inDesc = g.description.toLowerCase().includes(q);
        const inTags = g.tags && g.tags.some(t => t.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inTags) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted);">
          <p style="font-size: 1.1rem; margin-bottom: 8px;">Aradığınız kriterlere uygun oyun bulunamadı.</p>
          <span style="font-size: 0.85rem; color: var(--text-faint);">Filtreleri veya arama kelimesini temizleyebilirsiniz.</span>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(game => {
      const isPlayable = game.status === 'playable';
      const iconSvg = ICONS[game.icon] || ICONS.gamepad;
      const accent = game.accentColor || '#f0a93c';

      return `
        <article class="game-card" style="--card-accent: ${accent}; --card-glow: ${accent}33;" data-id="${game.id}">
          <div class="card-top-bar">
            <div class="card-icon-shell">
              ${iconSvg}
            </div>
            <span class="status-badge ${game.status}">
              ${game.badge || (isPlayable ? 'Oynanabilir' : 'Yakında')}
            </span>
          </div>

          <h2 class="card-title">${game.title}</h2>
          <div class="card-tagline">${game.tagline || ''}</div>
          <p class="card-desc">${game.description}</p>

          <div class="card-meta-row">
            <span class="meta-pill">⏱ ${game.duration || 'Bilinmiyor'}</span>
            <span class="meta-pill">⚔️ ${game.genre || 'Mikro Oyun'}</span>
          </div>

          <div class="card-tags">
            ${(game.tags || []).map(t => `<span class="tag-item">${t}</span>`).join('')}
          </div>

          <div class="card-actions">
            ${isPlayable ? `
              <a href="${game.path}" class="btn-primary" data-play="${game.id}">
                <span>Oyuna Başla</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <button type="button" class="btn-secondary" data-details="${game.id}" title="Detaylar & İpuçları">
                Detay
              </button>
            ` : `
              <button type="button" class="btn-disabled" data-details="${game.id}">
                <span>Tasarım Aşaması</span>
              </button>
              <button type="button" class="btn-secondary" data-details="${game.id}">
                İncele
              </button>
            `}
          </div>
        </article>
      `;
    }).join('');

    // Attach listeners
    grid.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('mouseenter', () => playBeep(520, 'sine', 0.04, 0.02));
    });

    grid.querySelectorAll('[data-details]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-details');
        const game = games.find(g => g.id === id);
        if (game) openModal(game);
      });
    });

    grid.querySelectorAll('[data-play]').forEach(btn => {
      btn.addEventListener('click', () => {
        playBeep(780, 'triangle', 0.1, 0.05);
      });
    });
  }

  function openModal(game) {
    playBeep(440, 'sine', 0.06, 0.03);
    const modalOverlay = document.getElementById('details-modal');
    const modalBody = document.getElementById('modal-body');
    if (!modalOverlay || !modalBody) return;

    const isPlayable = game.status === 'playable';
    const accent = game.accentColor || '#f0a93c';

    modalBody.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
        <span class="status-badge ${game.status}">${game.badge || (isPlayable ? 'Oynanabilir' : 'Yakında')}</span>
        <span style="font-size:0.8rem; color:var(--text-faint);">Sürüm: ${game.details?.version || '1.0'}</span>
      </div>
      <h2 style="font-size:1.6rem; font-weight:800; margin-bottom:6px; color:#fff;">${game.title}</h2>
      <p style="color:${accent}; font-weight:600; font-size:0.95rem; margin-bottom:16px;">${game.tagline || ''}</p>
      
      <p style="color:var(--text-muted); line-height:1.6; margin-bottom:20px;">${game.description}</p>
      
      <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:16px; margin-bottom:20px;">
        <div style="font-size:0.82rem; font-weight:700; color:var(--text-main); margin-bottom:6px;">🎮 KONTROLLER & OYNANIŞ</div>
        <div style="font-size:0.86rem; color:var(--text-muted); margin-bottom:12px;">${game.details?.controls || 'Fare / Dokunmatik'}</div>
        
        <div style="font-size:0.82rem; font-weight:700; color:var(--text-main); margin-bottom:6px;">💡 ÖNE ÇIKAN MEKANİK</div>
        <div style="font-size:0.86rem; color:var(--text-muted);">${game.details?.highlight || 'Hızlı tur, derinleşen karar mekaniği.'}</div>
      </div>

      <div style="display:flex; gap:12px; justify-content:flex-end;">
        ${isPlayable ? `
          <a href="${game.path}" class="btn-primary" style="flex:initial; padding:10px 24px;">
            Oyunu Başlat →
          </a>
        ` : `
          <button class="btn-secondary" id="modal-close-action">Kapat</button>
        `}
      </div>
    `;

    modalOverlay.classList.add('active');

    const closeBtn = document.getElementById('modal-close-action');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
  }

  function closeModal() {
    const modalOverlay = document.getElementById('details-modal');
    if (modalOverlay) modalOverlay.classList.remove('active');
  }

  // Setup Event Handlers
  function setupEvents() {
    // Sound Toggle
    const soundBtn = document.getElementById('sound-toggle');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundBtn.innerHTML = soundEnabled ? '🔊 Ses Açık' : '🔇 Ses Kapalı';
        soundBtn.style.color = soundEnabled ? 'var(--accent-gold)' : 'var(--text-muted)';
        if (soundEnabled) playBeep(600, 'sine', 0.08, 0.04);
      });
    }

    // Filters
    document.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        playBeep(480, 'sine', 0.04, 0.02);
        document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.getAttribute('data-filter');
        renderCards();
      });
    });

    // Search Input
    const searchInput = document.getElementById('search-box');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderCards();
      });
    }

    // Modal Close
    const closeBtn = document.getElementById('modal-close');
    const modalOverlay = document.getElementById('details-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    setupEvents();
    loadGames();
  });
})();
