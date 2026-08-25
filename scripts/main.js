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

/* Review tickers — clone once for a seamless loop, and pace each one by its
   own width so long and short tickers drift at the same speed.            */
const TICKER_PX_PER_SEC = 34;

/* Photo strip under the word marquee — same seamless-clone trick, paced by
   width so it drifts at a readable speed regardless of how many photos. */
/* Cards are wide, so the strip needs more speed than the photo band did —
   fast enough to feel alive, slow enough to read a line while it passes. */
const STRIP_PX_PER_SEC = 46;

function initStrip() {
  const track = document.querySelector('[data-strip]');
  if (!track) return;
  track.append(...[...track.children].map((node) => node.cloneNode(true)));
  const halfWidth = track.scrollWidth / 2;
  track.style.setProperty('--strip-duration', `${Math.round(halfWidth / STRIP_PX_PER_SEC)}s`);
}

function initTickers() {
  document.querySelectorAll('[data-ticker]').forEach((track) => {
    const cards = [...track.children];
    if (!cards.length) return;
    track.append(...cards.map((node) => node.cloneNode(true)));
    const halfWidth = track.scrollWidth / 2;
    track.style.setProperty('--ticker-duration', `${Math.round(halfWidth / TICKER_PX_PER_SEC)}s`);
  });
}

initScrollChrome();
initReveal();
initTabs();
initCounters();
initMarquee();
initStrip();
initTickers();
