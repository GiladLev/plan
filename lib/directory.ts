// Directory search page: filter sidebar, advanced filters, list/map views, card filtering over the seeded results.
import { CITY_COORDS, ISRAEL_CENTER } from './geo';

let leafletPromise: Promise<typeof import('leaflet')> | null = null;
function loadLeaflet() {
  if (!leafletPromise) {
    if (!document.querySelector('link[data-leaflet]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/vendor/leaflet/leaflet.css'; l.dataset.leaflet = '1'; document.head.appendChild(l); }
    leafletPromise = import('leaflet');
  }
  return leafletPromise;
}

export function mountDirectory(doc: Document): () => void {
  const wrapper = doc.querySelector<HTMLElement>('.search_wrapper')!;
  const he = doc.documentElement.lang === 'he';
  let map: import('leaflet').Map | null = null;
  const markers = new Map<HTMLElement, import('leaflet').Marker>();

  const cards = () => Array.from(wrapper.querySelectorAll<HTMLElement>('.tiles .brand-col'));
  const cityOf = (card: HTMLElement) => card.querySelector('[data-action="focus-map"]')?.textContent?.trim() ?? '';

  const ensureMap = async () => {
    const el = doc.getElementById('google_map');
    if (!el || map) { map?.invalidateSize(); return map; }
    const mod = (await loadLeaflet()) as unknown as { default?: typeof import('leaflet') } & typeof import('leaflet');
    const L = mod.default ?? mod;
    const m = L.map(el, { zoomControl: true, attributionControl: true }).setView(ISRAEL_CENTER, 8);
    map = m;
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 19 }).addTo(m);
    const icon = L.divIcon({ className: 'replica-marker', html: '<span></span>', iconSize: [26, 34], iconAnchor: [13, 34] });
    const bounds: [number, number][] = [];
    cards().forEach((card, i) => {
      const base = CITY_COORDS[cityOf(card)]; if (!base) return;
      const jitter = (i % 5) * 0.004; const ll: [number, number] = [base[0] + jitter, base[1] - jitter];
      const name = card.querySelector('.content a.strong')?.textContent?.trim() ?? '';
      const href = card.querySelector('.content a.strong')?.getAttribute('href') ?? '#';
      const mk = L.marker(ll, { icon, title: name }).addTo(m).bindPopup(`<a href="${href}" target="_blank" rel="noopener">${name.replace(/</g, '&lt;')}</a><div>${cityOf(card)}</div>`);
      markers.set(card, mk); bounds.push(ll);
    });
    if (bounds.length > 1) m.fitBounds(bounds, { padding: [40, 40] });
    el.parentElement?.querySelector('.loading-spinner')?.classList.add('hidden');
    return m;
  };

  const setMapView = (on: boolean) => {
    wrapper.classList.toggle('full-screen-map', on);
    wrapper.querySelector('.show_map')?.classList.toggle('active', on);
    wrapper.querySelector('.show_tiles')?.classList.toggle('active', !on);
    if (on) void ensureMap().then(() => setTimeout(() => map?.invalidateSize(), 50));
  };

  const applyFilters = () => {
    const form = wrapper.querySelector<HTMLFormElement>('form');
    if (!form) return;
    const groups = Array.from(form.querySelectorAll<HTMLElement>('.filter-wrapper:not(.advanced)'));
    const typeChecked: string[] = []; const capChecked: [number, number][] = [];
    groups.forEach((g) => {
      const title = g.querySelector('.form-group > a > div:not(.pull-right)')?.textContent?.trim() ?? '';
      g.querySelectorAll<HTMLInputElement>('input[type=checkbox]:checked').forEach((cb) => {
        const label = cb.closest('label')?.textContent?.trim() ?? '';
        if (/סוג|type/i.test(title)) typeChecked.push(label.split('(')[0].trim());
        if (/אורחים|guests/i.test(title)) { const nums = label.match(/\d+/g)?.map(Number) ?? []; if (/עד|up to/i.test(label)) capChecked.push([0, nums[0]]); else if (/מעל|over/i.test(label)) capChecked.push([nums[0], Infinity]); else if (nums.length === 2) capChecked.push([Math.min(...nums), Math.max(...nums)]); }
      });
    });
    let shown = 0;
    cards().forEach((card) => {
      const detail = Array.from(card.querySelectorAll('.content > .text-ellipsis')).map((n) => n.textContent ?? '').join(' ');
      const cap = Number(detail.match(/•\s*(\d+)/)?.[1] ?? NaN);
      const okType = !typeChecked.length || typeChecked.some((t) => detail.includes(t));
      const okCap = !capChecked.length || (!Number.isNaN(cap) && capChecked.some(([a, b]) => cap >= a && cap <= b));
      const ok = okType && okCap;
      card.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });
    const meta = wrapper.querySelector('.meta-data');
    if (meta) meta.textContent = he ? `מוצגות ${shown} תוצאות מתוך הדוגמה` : `Showing ${shown} results from the sample`;
    wrapper.classList.remove('full-screen-filters');
    wrapper.querySelector('.results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-toggle="side-filters"]')) { e.preventDefault(); wrapper.classList.toggle('side-filters'); setTimeout(() => map?.invalidateSize(), 350); return; }
    if (t.closest('[data-toggle="full-screen-filters"]')) { e.preventDefault(); wrapper.classList.toggle('full-screen-filters'); return; }
    const adv = t.closest('[data-toggle="advanced-filters"]');
    if (adv) { e.preventDefault(); const open = !wrapper.classList.contains('advanced-filters'); wrapper.classList.toggle('advanced-filters', open); wrapper.querySelectorAll('.filter-wrapper.advanced').forEach((w) => w.classList.toggle('collapsed', !open)); adv.closest('.filter-wrapper')?.classList.toggle('expanded', open); return; }
    const head = t.closest<HTMLElement>('.filter-wrapper:not(.advanced) > .form-group > a');
    if (head) { e.preventDefault(); head.closest('.filter-wrapper')?.classList.toggle('collapsed'); head.setAttribute('aria-expanded', String(!head.closest('.filter-wrapper')?.classList.contains('collapsed'))); return; }
    if (t.closest('[data-action="map_view"]')) { e.preventDefault(); setMapView(true); return; }
    if (t.closest('[data-action="list_view"]')) { e.preventDefault(); setMapView(false); return; }
    const focus = t.closest<HTMLElement>('[data-action="focus-map"]');
    if (focus) { e.preventDefault(); const card = focus.closest<HTMLElement>('.brand-col'); setMapView(true); void ensureMap().then((m) => { const mk = card && markers.get(card); if (m && mk) { m.setView(mk.getLatLng(), 13); mk.openPopup(); } }); return; }
    if (t.closest('[data-action="submit"]')) { e.preventDefault(); applyFilters(); }
  };
  const onSubmit = (e: Event) => { if ((e.target as HTMLElement).closest('.search_wrapper')) { e.preventDefault(); e.stopImmediatePropagation(); applyFilters(); } };
  doc.addEventListener('click', onClick);
  doc.addEventListener('submit', onSubmit, true);
  wrapper.querySelectorAll<HTMLElement>('.filter-wrapper:not(.advanced) > .form-group > a').forEach((a) => { a.setAttribute('role', 'button'); a.setAttribute('aria-expanded', String(!a.closest('.filter-wrapper')?.classList.contains('collapsed'))); });
  return () => { doc.removeEventListener('click', onClick); doc.removeEventListener('submit', onSubmit, true); map?.remove(); };
}
