// Navbar vendor search: static index (directory categories + seeded brand names) instead of the live typeahead backend.
import index from '@/content/search-index.json';

type Entry = { label: string; href: string; group: string };

export function mountSearch(doc: Document): () => void {
  const offs: (() => void)[] = [];
  const he = doc.documentElement.lang === 'he';
  doc.querySelectorAll<HTMLElement>('#main_navigation .text-search').forEach((box) => {
    const input = box.querySelector<HTMLInputElement>('input');
    if (!input) return;
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
    let menu = box.querySelector<HTMLElement>('.tt-menu');
    if (!menu) { menu = doc.createElement('div'); menu.className = 'tt-menu'; menu.setAttribute('role', 'listbox'); box.appendChild(menu); }
    const links = box.querySelectorAll<HTMLAnchorElement>(':scope > a');
    let cursor = -1;
    const render = () => {
      const q = input.value.trim();
      box.classList.toggle('focus', doc.activeElement === input || !!q);
      if (q.length < 1) { menu!.classList.remove('open'); input.setAttribute('aria-expanded', 'false'); return; }
      const hits = (index as Entry[]).filter((e) => e.label.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
      menu!.innerHTML = hits.length ? hits.map((h, i) => `<a class="tt-suggestion${i === cursor ? ' tt-cursor' : ''}" role="option" href="${h.href}">${h.label.replace(/</g, '&lt;')}<small>${h.group}</small></a>`).join('') : `<div class="tt-empty">${he ? 'לא נמצאו תוצאות' : 'No results'}</div>`;
      menu!.classList.add('open'); input.setAttribute('aria-expanded', 'true');
    };
    const onInput = () => { cursor = -1; render(); };
    const onKey = (e: KeyboardEvent) => {
      const items = menu!.querySelectorAll<HTMLAnchorElement>('.tt-suggestion');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); cursor = (cursor + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % Math.max(items.length, 1); render(); }
      else if (e.key === 'Enter' && cursor >= 0 && items[cursor]) { e.preventDefault(); location.href = items[cursor].href; }
      else if (e.key === 'Escape') { input.value = ''; render(); input.blur(); }
    };
    const onFocus = () => box.classList.add('focus');
    const onBlur = () => setTimeout(() => { if (!input.value) box.classList.remove('focus'); menu!.classList.remove('open'); }, 150);
    input.addEventListener('input', onInput); input.addEventListener('keydown', onKey); input.addEventListener('focus', onFocus); input.addEventListener('blur', onBlur);
    links[0]?.addEventListener('click', (e) => { e.preventDefault(); input.focus(); });
    links[1]?.addEventListener('click', (e) => { e.preventDefault(); input.value = ''; render(); input.focus(); });
    offs.push(() => { input.removeEventListener('input', onInput); input.removeEventListener('keydown', onKey); input.removeEventListener('focus', onFocus); input.removeEventListener('blur', onBlur); });
  });
  return () => offs.forEach((f) => f());
}
