/* ── MY SECRET · landing behaviour ──────────────────────────
   No dependencies. Everything degrades gracefully without JS.
   ───────────────────────────────────────────────────────── */

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const STUCK_AFTER = 24;
/* Most visitors are on a phone, so the call bar shows almost immediately
   rather than waiting for a deep scroll. */
const DOCK_AFTER = 40;
const REVEAL_STAGGER_MS = 70;
const COUNT_DURATION_MS = 1400;

/* Sticky top bar + mobile call dock ------------------------------------- */
function initScrollChrome() {
  const bar = document.querySelector('[data-topbar]');
  const dock = document.querySelector('[data-dock]');
  if (!bar && !dock) return;

  let ticking = false;
  const sync = () => {
    const y = window.scrollY;
    bar?.classList.toggle('is-stuck', y > STUCK_AFTER);
    dock?.classList.toggle('is-up', y > DOCK_AFTER);
    ticking = false;
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(sync);
    },
    { passive: true }
  );
  sync();
}

/* Reveal on scroll ------------------------------------------------------ */
function initReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;

  if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
  );

  targets.forEach((el, i) => {
    const group = el.closest('[data-stagger]');
    if (group) {
      const peers = [...group.querySelectorAll('.reveal')];
      el.style.setProperty('--reveal-delay', `${peers.indexOf(el) * REVEAL_STAGGER_MS}ms`);
    } else {
      el.style.setProperty('--reveal-delay', `${(i % 3) * REVEAL_STAGGER_MS}ms`);
    }
    observer.observe(el);
  });
}

/* Category tabs — drives both the service menu and the photo gallery ----- */
function initTabGroup(root) {
  const name = root.dataset.tabs;
  const tabs = [...root.querySelectorAll('[data-tab]')];
  const panel = document.querySelector(`[data-tabpanel="${name}"]`);
  if (!tabs.length || !panel) return;

  const items = [...panel.querySelectorAll('[data-cat]')];
  const empty = document.querySelector(`[data-empty="${name}"]`);

  const apply = (key) => {
    let shown = 0;
    items.forEach((item) => {
      const match = key === 'all' || item.dataset.cat.split(' ').includes(key);
      item.hidden = !match;
      if (match) shown += 1;
    });
    tabs.forEach((tab) => {
      const on = tab.dataset.tab === key;
      tab.setAttribute('aria-selected', String(on));
      if (on) tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
    if (empty) empty.hidden = shown > 0;
  };

  tabs.forEach((tab) => tab.addEventListener('click', () => apply(tab.dataset.tab)));
  apply(tabs[0]?.dataset.tab ?? 'all');
}

function initTabs() {
  document.querySelectorAll('[data-tabs]').forEach(initTabGroup);
}

/* Phones open on a single category instead of all eight service cards —
   showing everything at once made the menu 13 screens tall. */
const PHONE = window.matchMedia('(max-width: 759px)');

function initMobileDefaults() {
  if (!PHONE.matches) return;
  document.querySelector('[data-tabs="menu"] [data-tab="lash"]')?.click();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/* Gallery starts trimmed on phones; the button reveals the rest. */
const GALLERY_PREVIEW = 8;

function initShowMore() {
  const btn = document.querySelector('[data-more="gallery"]');
  const panel = document.querySelector('[data-tabpanel="gallery"]');
  if (!btn || !panel || !PHONE.matches) return;

  const trim = () => {
    // clear first — otherwise trims from a previous tab stick around and the
    // next category shows fewer than GALLERY_PREVIEW
    panel.querySelectorAll('.is-trimmed').forEach((el) => el.classList.remove('is-trimmed'));

    const visible = [...panel.querySelectorAll('[data-cat]')].filter((el) => !el.hidden);
    const excess = visible.slice(GALLERY_PREVIEW);
    excess.forEach((el) => el.classList.add('is-trimmed'));
    btn.hidden = excess.length === 0;
    btn.textContent = `사진 ${excess.length}장 더 보기`;
  };

  btn.addEventListener('click', () => {
    panel.querySelectorAll('.is-trimmed').forEach((el) => el.classList.remove('is-trimmed'));
    btn.hidden = true;
  });

  document.querySelectorAll('[data-tabs="gallery"] [data-tab]').forEach((tab) =>
    tab.addEventListener('click', () => window.requestAnimationFrame(trim))
  );

  trim();
}

/* Count-up numerals ----------------------------------------------------- */
function countUp(el) {
  const target = Number(el.dataset.count);
  if (!Number.isFinite(target)) return;

  const suffix = el.dataset.suffix ?? '';
  if (REDUCED_MOTION) {
    el.textContent = target.toLocaleString('ko-KR') + suffix;
    return;
  }

  const start = performance.now();
  const step = (now) => {
    const progress = Math.min((now - start) / COUNT_DURATION_MS, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased).toLocaleString('ko-KR') + suffix;
    if (progress < 1) window.requestAnimationFrame(step);
  };
  window.requestAnimationFrame(step);
}

function initCounters() {
  const nums = document.querySelectorAll('[data-count]');
  if (!nums.length) return;

  if (!('IntersectionObserver' in window)) {
    nums.forEach(countUp);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  nums.forEach((el) => observer.observe(el));
}

/* Duplicate marquee content so the loop is seamless --------------------- */
function initMarquee() {
  const track = document.querySelector('[data-marquee]');
  if (!track) return;
  track.append(...[...track.children].map((node) => node.cloneNode(true)));
}

/* Review bands ----------------------------------------------------------
   Driven by scrollLeft rather than a CSS transform, so a visitor can swipe
   or drag a card into view instead of waiting for it to come around.
   The track is cloned once and the offset wraps at the halfway point, which
   keeps the loop seamless in both directions.
   ---------------------------------------------------------------------- */
const TICKER_PX_PER_SEC = 18;
const STRIP_PX_PER_SEC = 15;
const RESUME_DELAY_MS = 2500;

function initAutoScroll(viewport, track, pxPerSec) {
  if (!viewport || !track || !track.children.length) return;

  track.append(...[...track.children].map((node) => node.cloneNode(true)));
  const half = () => track.scrollWidth / 2;

  let paused = false;
  let resumeTimer = 0;
  let last = performance.now();

  const wrap = () => {
    const h = half();
    if (h <= 0) return;
    if (viewport.scrollLeft >= h) viewport.scrollLeft -= h;
    else if (viewport.scrollLeft <= 0) viewport.scrollLeft += h;
  };

  const pause = () => {
    paused = true;
    window.clearTimeout(resumeTimer);
  };

  const resumeSoon = () => {
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      paused = false;
      last = performance.now();
    }, RESUME_DELAY_MS);
  };

  if (!REDUCED_MOTION) {
    const step = (now) => {
      const dt = Math.min(now - last, 100);
      last = now;
      if (!paused) {
        viewport.scrollLeft += (pxPerSec * dt) / 1000;
        wrap();
      }
      window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }

  /* touch + trackpad: let the browser scroll, we only pause the drift */
  ['pointerdown', 'touchstart', 'wheel'].forEach((type) =>
    viewport.addEventListener(type, pause, { passive: true })
  );
  ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'mouseleave'].forEach((type) =>
    viewport.addEventListener(type, resumeSoon, { passive: true })
  );
  viewport.addEventListener('scroll', wrap, { passive: true });

  /* mouse drag — desktop has no swipe, so grab-and-pull the band */
  let dragging = false;
  let startX = 0;
  let startScroll = 0;

  viewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    dragging = true;
    startX = e.clientX;
    startScroll = viewport.scrollLeft;
    viewport.classList.add('is-dragging');
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    e.preventDefault();
    viewport.scrollLeft = startScroll - (e.clientX - startX);
    wrap();
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('is-dragging');
    resumeSoon();
  };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) =>
    viewport.addEventListener(t, endDrag)
  );

  /* a drag shouldn't fire the link underneath */
  viewport.addEventListener('click', (e) => {
    if (Math.abs(viewport.scrollLeft - startScroll) > 6) e.preventDefault();
  });
}

function initStrip() {
  const track = document.querySelector('[data-strip]');
  initAutoScroll(track?.closest('.strip'), track, STRIP_PX_PER_SEC);
}

function initTickers() {
  document.querySelectorAll('[data-ticker]').forEach((track) =>
    initAutoScroll(track.closest('.ticker__viewport'), track, TICKER_PX_PER_SEC)
  );
}

initScrollChrome();
initReveal();
initTabs();
initCounters();
initMarquee();
initStrip();
initTickers();
initMobileDefaults();
initShowMore();
