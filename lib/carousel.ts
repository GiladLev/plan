// Draggable, wrap-around carousel replacing the original's Flickity instances (same markup contract: .carousel > .carousel-cell).
import { Spring, projectMomentum, rubberBand } from './physics';

interface Options { wrapAround?: boolean; prevNextButtons?: boolean; pageDots?: boolean; dragThreshold?: number; setGallerySize?: boolean; cellAlign?: 'center' | 'left' | 'right'; contain?: boolean; arrowShape?: { x0: number; x1: number; y1: number; x2: number; y2: number; x3: number } | string; autoPlay?: number | boolean; initialIndex?: number }

const DEFAULT_ARROW = { x0: 10, x1: 60, y1: 50, x2: 70, y2: 40, x3: 30 };

function arrowPath(shape: Options['arrowShape']): string {
  if (typeof shape === 'string') return shape;
  const s = shape ?? DEFAULT_ARROW;
  return `M ${s.x0},50 L ${s.x1},${50 + s.y1} L ${s.x2},${50 + s.y2} L ${s.x3},50 L ${s.x2},${50 - s.y2} L ${s.x1},${50 - s.y1} Z`;
}

export function mountCarousel(root: HTMLElement): () => void {
  if (root.dataset.carouselMounted) return () => {};
  root.dataset.carouselMounted = '1';
  let opts: Options = {};
  try { opts = JSON.parse(root.getAttribute('data-flickity') || '{}'); } catch { /* defaults */ }
  const rtl = getComputedStyle(root).direction === 'rtl';
  const dirSign = rtl ? -1 : 1; // logical → physical x
  const cells = Array.from(root.children).filter((c): c is HTMLElement => c instanceof HTMLElement && c.classList.contains('carousel-cell'));
  if (!cells.length) return () => {};

  const viewport = document.createElement('div');
  viewport.className = 'carousel-viewport';
  const track = document.createElement('div');
  track.className = 'carousel-track';
  track.style[rtl ? 'right' : 'left'] = '0';
  viewport.appendChild(track);
  cells.forEach((c) => { c.style.position = 'absolute'; c.style[rtl ? 'right' : 'left'] = '0'; track.appendChild(c); });
  root.insertBefore(viewport, root.firstChild);
  root.classList.add('carousel-ready');

  const wrap = opts.wrapAround ?? false;
  const align = opts.cellAlign ?? 'center';
  let widths: number[] = []; let offsets: number[] = []; let total = 0; let vw = 0; let index = Math.min(opts.initialIndex ?? Number(root.dataset.initialIndex ?? 0), cells.length - 1);

  const measure = () => {
    vw = viewport.clientWidth;
    widths = cells.map((c) => c.offsetWidth || vw);
    offsets = []; total = 0;
    widths.forEach((w) => { offsets.push(total); total += w; });
    if (opts.setGallerySize !== false) viewport.style.height = Math.max(...cells.map((c) => c.offsetHeight)) + 'px';
  };
  // logical scroll position x: content shifted by -x along reading direction
  const anchorFor = (i: number) => { const a = align === 'center' ? (vw - widths[i]) / 2 : 0; return offsets[i] - a; };
  const minX = () => 0;
  const maxX = () => Math.max(0, total - vw);
  const loadLazy = (c: HTMLElement) => { const bg = c.dataset.bg; if (bg) { c.style.backgroundImage = `url('${bg}')`; delete c.dataset.bg; } };

  const render = (x: number) => {
    const start = -Math.max(...widths);
    cells.forEach((c, i) => {
      let p = offsets[i] - x;
      if (wrap && total > 0) { p = ((((p - start) % total) + total) % total) + start; }
      c.style.transform = `translate3d(${dirSign * p}px,0,0)`;
      if (p > -widths[i] * 1.5 && p < vw + widths[i] * 1.5) loadLazy(c);
    });
  };

  measure();
  const spring = new Spring(anchorFor(index), render, 0.4);
  spring.set(wrap ? anchorFor(index) : Math.min(Math.max(anchorFor(index), minX()), maxX()));

  const nearestIndex = (x: number) => {
    let best = 0; let bestD = Infinity;
    cells.forEach((_, i) => {
      let d = anchorFor(i) - x;
      if (wrap) d = ((d % total) + total * 1.5) % total - total / 2;
      if (Math.abs(d) < bestD) { bestD = Math.abs(d); best = i; }
    });
    return best;
  };
  const targetFor = (i: number, from: number) => {
    let t = anchorFor(i);
    if (wrap) { const d = ((t - from) % total + total * 1.5) % total - total / 2; t = from + d; } else t = Math.min(Math.max(t, minX()), maxX());
    return t;
  };
  const select = (i: number, velocity = 0) => {
    index = wrap ? ((i % cells.length) + cells.length) % cells.length : Math.max(0, Math.min(cells.length - 1, i));
    cells.forEach((c, k) => c.classList.toggle('is-selected', k === index));
    spring.to(targetFor(index, spring.value), velocity);
    updateButtons();
  };

  // arrows
  let prevBtn: HTMLButtonElement | null = null; let nextBtn: HTMLButtonElement | null = null;
  const path = arrowPath(opts.arrowShape);
  const mkBtn = (cls: 'previous' | 'next', label: string) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = `flickity-button flickity-prev-next-button ${cls}`; b.setAttribute('aria-label', label);
    const pointsLeft = (cls === 'previous') !== rtl;
    b.innerHTML = `<svg class="flickity-button-icon" viewBox="0 0 100 100" aria-hidden="true"><path class="arrow" d="${path}"${pointsLeft ? '' : ' transform="translate(100, 100) rotate(180) "'}></path></svg>`;
    b.addEventListener('click', () => select(index + (cls === 'next' ? 1 : -1)));
    root.appendChild(b);
    return b;
  };
  const updateButtons = () => { if (!wrap) { if (prevBtn) prevBtn.disabled = index === 0; if (nextBtn) nextBtn.disabled = index === cells.length - 1; } };
  if (opts.prevNextButtons !== false && cells.length > 1) {
    const he = document.documentElement.lang === 'he';
    prevBtn = mkBtn('previous', he ? 'הקודם' : 'Previous');
    nextBtn = mkBtn('next', he ? 'הבא' : 'Next');
  }
  cells.forEach((c, k) => c.classList.toggle('is-selected', k === index));
  updateButtons();

  // pointer drag — 1:1 tracking from the grab point, velocity captured from recent samples
  const threshold = opts.dragThreshold ?? 3;
  let down: { id: number; x: number; y: number; start: number; dragging: boolean; samples: { t: number; x: number }[] } | null = null;
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('.flickity-prev-next-button')) return;
    spring.stop(); // interrupt mid-flight: continue from the presentation value
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, start: spring.value, dragging: false, samples: [{ t: e.timeStamp, x: e.clientX }] };
    viewport.classList.add('is-pointer-down');
  };
  const onMove = (e: PointerEvent) => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.x; const dy = e.clientY - down.y;
    if (!down.dragging) {
      if (Math.abs(dx) < threshold) return;
      if (Math.abs(dy) > Math.abs(dx)) { down = null; viewport.classList.remove('is-pointer-down'); return; }
      down.dragging = true; viewport.setPointerCapture(e.pointerId);
    }
    e.preventDefault();
    let x = down.start - dirSign * dx;
    if (!wrap) { if (x < minX()) x = minX() + rubberBand(x - minX(), vw); else if (x > maxX()) x = maxX() + rubberBand(x - maxX(), vw); }
    spring.set(x);
    down.samples.push({ t: e.timeStamp, x: e.clientX }); if (down.samples.length > 6) down.samples.shift();
  };
  const onUp = (e: PointerEvent) => {
    viewport.classList.remove('is-pointer-down');
    if (!down || e.pointerId !== down.id) return;
    const d = down; down = null;
    if (!d.dragging) return;
    const s = d.samples; const a = s[0]; const b = s[s.length - 1];
    const v = b.t > a.t && e.timeStamp - b.t < 80 ? -dirSign * (b.x - a.x) / (b.t - a.t) : 0; // logical px/ms
    const projected = spring.value + projectMomentum(v);
    let i = nearestIndex(projected);
    if (i === index && Math.abs(v) > 0.3) i = index + Math.sign(v); // a decisive flick always advances
    select(i, v);
    const swallow = (ev: Event) => { ev.preventDefault(); ev.stopPropagation(); };
    root.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => root.removeEventListener('click', swallow, { capture: true }), 0);
  };
  viewport.addEventListener('pointerdown', onDown);
  viewport.addEventListener('pointermove', onMove);
  viewport.addEventListener('pointerup', onUp);
  viewport.addEventListener('pointercancel', onUp);
  viewport.addEventListener('dragstart', (e) => e.preventDefault());

  root.tabIndex = 0;
  const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') select(index + (rtl ? 1 : -1)); else if (e.key === 'ArrowRight') select(index + (rtl ? -1 : 1)); };
  root.addEventListener('keydown', onKey);

  const ro = new ResizeObserver(() => { measure(); spring.set(targetFor(index, spring.value)); });
  ro.observe(viewport);

  let timer = 0;
  if (opts.autoPlay) { const ms = typeof opts.autoPlay === 'number' ? opts.autoPlay : 3000; timer = window.setInterval(() => { if (!down && !root.matches(':hover')) select(index + 1); }, ms); }

  return () => { ro.disconnect(); spring.stop(); clearInterval(timer); };
}
