// Page behaviour for the replica: one delegated controller per document, re-run on navigation.
import { mountCarousel } from './carousel';
import { mountDirectory } from './directory';
import { mountSearch } from './search';

const COOKIE_KEY = 'replica_privacy_banner_ack';

function closeDropdowns(except?: Element | null) {
  document.querySelectorAll('#main_navigation .dropdown.open').forEach((li) => {
    if (li !== except) { li.classList.remove('open'); li.querySelector('[data-toggle="dropdown"]')?.setAttribute('aria-expanded', 'false'); }
  });
}

function openMenuSheet(open: boolean) {
  const modal = document.getElementById('main_navigation_modal');
  if (!modal) return;
  modal.classList.toggle('in', open);
  modal.classList.toggle('modal-full-screen', open);
  modal.style.display = open ? 'block' : '';
  modal.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('modal-open-full-screen', open);
  if (open) { window.scrollTo(0, 0); (modal.querySelector('.close') as HTMLElement | null)?.focus(); }
  else (document.querySelector('#main_navigation .navbar-toggle') as HTMLElement | null)?.focus();
}

function activateTab(link: HTMLAnchorElement) {
  const id = link.getAttribute('href');
  if (!id?.startsWith('#')) return;
  const li = link.closest('li');
  const nav = link.closest('ul, .nav');
  nav?.querySelectorAll(':scope > li').forEach((x) => { x.classList.toggle('active', x === li); x.querySelector('a')?.setAttribute('aria-selected', String(x === li)); });
  const pane = document.querySelector<HTMLElement>(id);
  if (!pane) return;
  pane.parentElement?.querySelectorAll(':scope > .tab-pane').forEach((p) => p.classList.toggle('active', p === pane));
  pane.classList.add('in');
}

let tooltipEl: HTMLDivElement | null = null;
function showTooltip(target: HTMLElement) {
  const text = target.getAttribute('data-original-title') || target.getAttribute('title') || target.getAttribute('data-title');
  if (!text) return;
  if (target.getAttribute('title')) { target.setAttribute('data-original-title', text); target.removeAttribute('title'); }
  hideTooltip();
  tooltipEl = document.createElement('div');
  const placement = target.getAttribute('data-placement') || 'top';
  tooltipEl.className = `tooltip fade ${placement} in`;
  tooltipEl.setAttribute('role', 'tooltip');
  tooltipEl.innerHTML = `<div class="tooltip-arrow"></div><div class="tooltip-inner"></div>`;
  (tooltipEl.querySelector('.tooltip-inner') as HTMLElement).textContent = text;
  document.body.appendChild(tooltipEl);
  const r = target.getBoundingClientRect(); const t = tooltipEl.getBoundingClientRect();
  const left = r.left + r.width / 2 - t.width / 2 + scrollX;
  const top = placement === 'bottom' ? r.bottom + scrollY : r.top - t.height + scrollY;
  Object.assign(tooltipEl.style, { left: `${Math.max(4, left)}px`, top: `${top}px`, display: 'block' });
}
function hideTooltip() { tooltipEl?.remove(); tooltipEl = null; }

export function mountBehaviors(doc: Document): () => void {
  const cleanups: (() => void)[] = [];

  // cookie banner
  const banner = doc.querySelector<HTMLElement>('.privacy_cookies_banner');
  if (banner && localStorage.getItem(COOKIE_KEY)) banner.classList.add('is-hidden');

  // carousels
  doc.querySelectorAll<HTMLElement>('.carousel[data-flickity]').forEach((c) => cleanups.push(mountCarousel(c)));

  // feature/collapsible hover classes used by the callout animations
  doc.querySelectorAll('[data-toggle="dropdown"]').forEach((a) => { a.setAttribute('aria-haspopup', 'true'); a.setAttribute('aria-expanded', 'false'); a.setAttribute('role', 'button'); });
  doc.querySelectorAll('#main_navigation .navbar-toggle').forEach((b) => { b.setAttribute('aria-controls', 'main_navigation_modal'); b.setAttribute('aria-expanded', 'false'); });

  cleanups.push(mountSearch(doc));
  if (doc.querySelector('.search_wrapper')) cleanups.push(mountDirectory(doc));

  const onClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement;

    const dd = t.closest<HTMLElement>('[data-toggle="dropdown"]');
    if (dd && !dd.closest('#main_navigation_modal')) {
      e.preventDefault();
      const li = dd.parentElement!;
      const willOpen = !li.classList.contains('open');
      closeDropdowns(li);
      li.classList.toggle('open', willOpen);
      dd.setAttribute('aria-expanded', String(willOpen));
      return;
    }
    if (!t.closest('#main_navigation .dropdown-menu')) closeDropdowns();

    if (t.closest('#main_navigation .navbar-toggle, [data-toggle="modal"][data-target="#main_navigation_modal"]')) { e.preventDefault(); openMenuSheet(true); return; }
    if (t.closest('#main_navigation_modal .close')) { e.preventDefault(); openMenuSheet(false); return; }
    const sheetToggle = t.closest<HTMLElement>('#main_navigation_modal .dropdown-toggle');
    if (sheetToggle) { e.preventDefault(); sheetToggle.parentElement?.classList.toggle('open'); return; }

    const pill = t.closest<HTMLAnchorElement>('[data-toggle="pill"], [data-toggle="tab"]');
    if (pill) { e.preventDefault(); activateTab(pill); return; }

    const ack = t.closest('[data-action="hide_privacy_cookies_banner"]');
    if (ack) { localStorage.setItem(COOKIE_KEY, '1'); doc.querySelector('.privacy_cookies_banner')?.classList.add('is-hidden'); return; }

    const pw = t.closest<HTMLElement>('[data-toggle="password"]');
    if (pw) {
      e.preventDefault();
      const input = pw.closest('.input-group, .form-group, form')?.querySelector<HTMLInputElement>('input[type="password"], input[data-password-visible]');
      if (input) { const show = input.type === 'password'; input.type = show ? 'text' : 'password'; input.toggleAttribute('data-password-visible', show); pw.querySelector('i')?.classList.toggle('fa-eye-slash', show); }
      return;
    }

    const vis = t.closest<HTMLElement>('[data-toggle="visibility"]');
    if (vis) {
      const target = vis.getAttribute('data-target') || vis.getAttribute('href');
      if (target && target.startsWith('#') || target?.startsWith('.')) { e.preventDefault(); doc.querySelectorAll<HTMLElement>(target!).forEach((n) => n.classList.toggle('hidden')); }
    }

    const collapse = t.closest<HTMLElement>('[data-toggle="collapse"]');
    if (collapse) {
      e.preventDefault();
      const sel = collapse.getAttribute('data-target') || collapse.getAttribute('href');
      if (sel) doc.querySelectorAll<HTMLElement>(sel).forEach((n) => { n.classList.toggle('in'); collapse.classList.toggle('collapsed', !n.classList.contains('in')); });
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    closeDropdowns();
    hideTooltip();
    if (doc.body.classList.contains('modal-open-full-screen')) openMenuSheet(false);
  };
  const onOver = (e: MouseEvent) => { const t = (e.target as HTMLElement).closest<HTMLElement>('[data-toggle="tooltip"], .rating_stars[data-original-title]'); if (t) showTooltip(t); };
  const onOut = (e: MouseEvent) => { if ((e.target as HTMLElement).closest('[data-toggle="tooltip"], .rating_stars[data-original-title]')) hideTooltip(); };
  const onSubmit = (e: SubmitEvent) => {
    const form = e.target as HTMLFormElement;
    if (!form.hasAttribute('data-replica-form')) return;
    e.preventDefault();
    let ok = true;
    form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[required], textarea[required], select[required]').forEach((f) => {
      const bad = !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
      f.closest('.form-group')?.classList.toggle('has-error', bad);
      if (bad) ok = false;
    });
    const note = form.querySelector('.replica-form-note') ?? Object.assign(doc.createElement('div'), { className: 'replica-form-note alert space-t-xs-2' });
    note.className = `replica-form-note alert space-t-xs-2 ${ok ? 'alert-success' : 'alert-danger'}`;
    note.setAttribute('role', 'status');
    const he = doc.documentElement.lang === 'he';
    note.textContent = ok ? (he ? 'זהו עותק הדגמה — הטופס לא נשלח.' : 'This is a demo replica — the form was not sent.') : (he ? 'נא למלא את כל שדות החובה.' : 'Please fill in all required fields.');
    form.appendChild(note);
  };

  doc.addEventListener('click', onClick);
  doc.addEventListener('keydown', onKey);
  doc.addEventListener('mouseover', onOver);
  doc.addEventListener('mouseout', onOut);
  doc.addEventListener('submit', onSubmit as EventListener);
  // form submits triggered by anchor buttons ("data-action=submit")
  return () => {
    doc.removeEventListener('click', onClick);
    doc.removeEventListener('keydown', onKey);
    doc.removeEventListener('mouseover', onOver);
    doc.removeEventListener('mouseout', onOut);
    doc.removeEventListener('submit', onSubmit as EventListener);
    cleanups.forEach((c) => c());
    hideTooltip();
  };
}
