'use strict';
(() => {
  const root = document.getElementById('aw-blueprint');
  if (!root) return;
  const panels = [...root.querySelectorAll('[data-panel]')];
  const numbers = { about: '01', publications: '02', places: '03', cv: '04' };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activePage = 'about', generation = 0, animation = null;
  root.classList.add('bp-has-js');
  function pageName(value) {
    const name = String(value || '').replace(/^#/, '').toLowerCase();
    if (name === 'papers') return 'publications';
    return Object.hasOwn(numbers, name) ? name : 'about';
  }
  function show(page) {
    activePage = page; root.dataset.activePage = page;
    root.querySelector('.bp-scene-info').open = false;
    panels.forEach(panel => { panel.hidden = panel.dataset.panel !== page; panel.style.opacity = '1'; });
    root.querySelectorAll('.bp-nav [data-page]').forEach(link => {
      if (link.dataset.page === page) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    root.querySelector('.bp-page-number').textContent = `SHEET ${numbers[page]} — ${page.toUpperCase()}`;
    document.title = page === 'about' ? 'Austen Wallis | Computational Astrophysicist' : `Austen Wallis | ${page === 'cv' ? 'Curriculum vitae' : page[0].toUpperCase() + page.slice(1)}`;
    root.dispatchEvent(new CustomEvent('aw:pagechange', { detail: { page } }));
  }
  async function changePage(value, { updateHistory = true, focus = true } = {}) {
    const page = pageName(value), currentGeneration = ++generation;
    const outgoing = root.querySelector(`[data-panel="${activePage}"]`), opacity = Number(getComputedStyle(outgoing).opacity);
    if (animation) { animation.cancel(); animation = null; }
    if (updateHistory && window.location.hash !== `#${page}`) history.pushState(null, '', `#${page}`);
    if (page !== activePage && !reduced.matches && outgoing.animate) {
      animation = outgoing.animate([{ opacity }, { opacity: 0 }], { duration: 120, easing: 'ease-in', fill: 'forwards' });
      await animation.finished.catch(() => {});
      if (generation !== currentGeneration) return;
      animation.cancel(); animation = null;
    }
    show(page);
    if (focus) window.scrollTo({ top: 0, behavior: 'auto' });
    const incoming = root.querySelector(`[data-panel="${page}"]`);
    // Move focus before the fade so a quick interaction in the new page is
    // never overwritten when its animation finishes.
    if (focus) { const heading = incoming.querySelector('h1, h2'); heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    if (!reduced.matches && incoming.animate && page !== outgoing.dataset.panel) {
      incoming.style.opacity = '0';
      animation = incoming.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out', fill: 'forwards' });
      await animation.finished.catch(() => {});
      if (generation !== currentGeneration) return;
      animation.cancel(); animation = null; incoming.style.opacity = '1';
    }
  }
  root.querySelectorAll('[data-page]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault(); changePage(link.dataset.page);
  }));
  document.querySelector('.bp-skip-link').addEventListener('click', event => {
    event.preventDefault();
    const main = document.getElementById('main-content');
    main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true });
    main.scrollIntoView({ block: 'start' });
  });
  window.addEventListener('hashchange', () => changePage(window.location.hash, { updateHistory: false }));
  show(pageName(window.location.hash));
  // The selected panel is now hidden/shown directly; retire the first-paint rule.
  delete document.documentElement.dataset.initialPage;
  window.addEventListener('load', () => {
    if (window.location.hash && Object.hasOwn(numbers, pageName(window.location.hash))) window.scrollTo({ top: 0, behavior: 'auto' });
  }, { once: true });
  // Secondary navigation scrolls within the CV without changing the page hash.
  root.querySelectorAll('[data-scroll-target]').forEach(button => button.addEventListener('click', () => {
    const target = document.getElementById(button.dataset.scrollTarget);
    if (!target) return;
    target.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
    target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true });
  }));
  const modelInfo = root.querySelector('.bp-scene-info');
  document.addEventListener('click', event => {
    if (modelInfo.open && !modelInfo.contains(event.target)) modelInfo.open = false;
  });
  modelInfo.addEventListener('keydown', event => {
    if (event.key === 'Escape') { modelInfo.open = false; modelInfo.querySelector('summary').focus(); }
  });

  // Photographs remain normal links without JavaScript or dialog support.
  const galleryLinks = [...root.querySelectorAll('[data-gallery-open]')];
  const gallery = root.querySelector('.bp-lightbox');
  let photoIndex = 0, photoTrigger = null, photoRequest = 0, photoLoader = null;
  function cancelPhotoLoad() {
    photoRequest++;
    photoLoader?.removeAttribute('src');
    photoLoader = null;
  }
  async function showPhoto(index) {
    cancelPhotoLoad();
    const request = photoRequest;
    photoIndex = (index + galleryLinks.length) % galleryLinks.length;
    const link = galleryLinks[photoIndex], figure = link.closest('figure'), original = figure.querySelector('img');
    const image = gallery.querySelector('.bp-lightbox-image');
    image.src = original.currentSrc || original.src; image.alt = original.alt;
    image.style.setProperty('--bp-photo-ratio', Number(original.getAttribute('width')) / Number(original.getAttribute('height')));
    image.dataset.resolution = 'preview';
    image.setAttribute('aria-busy', 'true');
    gallery.querySelector('#gallery-title').textContent = figure.querySelector('h3').textContent;
    gallery.querySelector('.bp-gallery-caption').textContent = figure.querySelector('figcaption p').textContent;
    gallery.querySelector('.bp-gallery-count').textContent = `${String(photoIndex + 1).padStart(2, '0')} / ${String(galleryLinks.length).padStart(2, '0')}`;

    // Keep the cached preview visible until the selected full-size image has
    // decoded. A stale request must never replace a newer photo or reopen it.
    const loader = new Image();
    photoLoader = loader;
    loader.decoding = 'async';
    loader.src = link.href;
    try {
      await loader.decode();
      if (request !== photoRequest) return;
      image.src = loader.src;
      image.dataset.resolution = 'full';
    } catch (_) {
      // The preview remains usable if a full-size image fails to arrive.
    } finally {
      if (request === photoRequest) {
        image.setAttribute('aria-busy', 'false');
        photoLoader = null;
      }
    }
  }
  galleryLinks.forEach((link, index) => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0 || !gallery.showModal) return;
    event.preventDefault(); photoTrigger = link; showPhoto(index); gallery.showModal(); document.body.classList.add('bp-gallery-open');
    gallery.querySelector('[data-gallery-close]').focus();
  }));
  gallery.querySelector('[data-gallery-close]').addEventListener('click', () => gallery.close());
  gallery.querySelector('[data-gallery-previous]').addEventListener('click', () => showPhoto(photoIndex - 1));
  gallery.querySelector('[data-gallery-next]').addEventListener('click', () => showPhoto(photoIndex + 1));
  gallery.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); showPhoto(photoIndex + (event.key === 'ArrowLeft' ? -1 : 1)); }
  });
  gallery.addEventListener('click', event => {
    const box = gallery.getBoundingClientRect();
    if (event.target === gallery && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) gallery.close();
  });
  gallery.addEventListener('close', () => {
    cancelPhotoLoad();
    gallery.querySelector('.bp-lightbox-image').setAttribute('aria-busy', 'false');
    document.body.classList.remove('bp-gallery-open'); photoTrigger?.focus({ preventScroll: true });
  });

  const ORCID_ID = '0000-0003-0770-9015';
  const publicationTypes = new Set(['journal-article', 'preprint', 'conference-paper', 'conference-abstract', 'conference-poster', 'book', 'book-chapter', 'edited-book', 'report', 'review', 'working-paper']);
  const fallback = JSON.parse(document.querySelector('[data-work-data]').textContent);
  function safeLink(value) {
    try { const url = new URL(value); if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href; } catch {}
    return `https://orcid.org/${ORCID_ID}`;
  }
  function cleanTitle(value) {
    const text = document.createElement('textarea'); text.innerHTML = String(value || '').replace(/<[^>]*>/g, '');
    return text.value.replace(/\s+/g, ' ').trim();
  }
  function selectSummary(group) {
    const summaries = group['work-summary'] || [];
    return summaries.find(summary => summary['external-ids']?.['external-id']?.some(id => id['external-id-type'] === 'doi')) || summaries[0];
  }
  function record(summary) {
    const date = summary['publication-date'] || {}, year = date.year?.value || '';
    const month = String(date.month?.value || '01').padStart(2, '0'), day = String(date.day?.value || '01').padStart(2, '0');
    const ids = summary['external-ids']?.['external-id'] || [], doi = ids.find(id => id['external-id-type'] === 'doi')?.['external-id-value'];
    const externalUrl = ids.find(id => id['external-id-url']?.value)?.['external-id-url']?.value;
    return { title: cleanTitle(summary.title?.title?.value), type: summary.type,
      meta: [cleanTitle(summary['journal-title']?.value), year].filter(Boolean).join(' · ') || 'Publication record',
      date: year ? `${year}-${month}-${day}` : '0000-01-01',
      link: safeLink(doi ? `https://doi.org/${String(doi).trim().replace(/^(https?:\/\/doi\.org\/|doi:\s*)/i, '')}` : externalUrl) };
  }
  function publicationRow(work) {
    const row = document.createElement('li'), link = document.createElement('a'), body = document.createElement('span');
    const title = document.createElement('span'), year = document.createElement('time'), meta = document.createElement('span');
    row.dataset.year = work.date.slice(0, 4);
    link.className = 'bp-publication-link'; link.href = safeLink(work.link); link.target = '_blank'; link.rel = 'noopener noreferrer';
    year.className = 'bp-publication-year'; year.dateTime = work.date; year.textContent = row.dataset.year === '0000' ? '—' : row.dataset.year;
    body.className = 'bp-publication-body'; title.className = 'bp-publication-title'; title.textContent = work.title;
    meta.className = 'bp-publication-meta'; meta.title = work.meta;
    meta.textContent = work.meta.replace(/ · \d{4}$/, '').replace('Monthly Notices of the Royal Astronomical Society', 'MNRAS');
    body.append(title, meta);
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'bp-icon'); icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use'); use.setAttribute('href', './assets/icons/lucide.svg#arrow-up-right'); icon.append(use);
    link.append(year, body, icon); row.append(link); return row;
  }
  const yearFilters = root.querySelector('[data-year-filters]'), fullList = root.querySelector('[data-publication-list]');
  fullList.id = 'publication-results';
  let selectedYear = 'all';
  function filterPublications(year) {
    selectedYear = year; let visible = 0;
    [...fullList.children].forEach(row => { row.hidden = year !== 'all' && row.dataset.year !== year; if (!row.hidden) visible++; });
    yearFilters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.year === year)));
    root.querySelector('[data-filter-status]').textContent = `Showing ${visible} publication${visible === 1 ? '' : 's'}${year === 'all' ? '' : ` from ${year}`}.`;
  }
  function renderYearFilters(papers) {
    const years = ['all', ...new Set(papers.map(work => work.date.slice(0, 4)).filter(year => year !== '0000'))];
    yearFilters.replaceChildren(...years.map(year => {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.year = year;
      button.textContent = year === 'all' ? 'All years' : year; button.setAttribute('aria-controls', fullList.id);
      button.addEventListener('click', () => filterPublications(year)); return button;
    }));
    filterPublications(years.includes(selectedYear) ? selectedYear : 'all');
  }
  function renderPublications(data, live = false) {
    const papers = data.works.filter(work => publicationTypes.has(work.type) && work.title).sort((a, b) => b.date.localeCompare(a.date));
    root.querySelectorAll('[data-paper-count]').forEach(item => item.textContent = String(papers.length));
    root.querySelectorAll('[data-orcid-count]').forEach(item => item.textContent = String(data.count));
    fullList.replaceChildren(...papers.map(publicationRow));
    renderYearFilters(papers);
    const date = live ? new Date() : new Date(`${data.updated}T12:00:00Z`);
    const label = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' }).format(date);
    root.querySelectorAll('[data-publication-source]').forEach(item => { item.textContent = `ORCID · ${live ? 'updated' : 'snapshot'} ${label}`; item.dateTime = live ? date.toISOString() : data.updated; });
  }
  async function loadPublications() {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`https://pub.orcid.org/v3.0/${ORCID_ID}/works`, { headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) throw new Error(`ORCID ${response.status}`);
      const data = await response.json(); if (!Array.isArray(data.group)) throw new Error('Invalid ORCID response');
      const works = data.group.map(selectSummary).filter(Boolean).map(record).filter(work => work.title);
      if (data.group.length && !works.length) throw new Error('Empty publication records');
      renderPublications({ count: data.group.length, works }, true);
    } catch { /* Keep the dated, crawlable fallback when ORCID is unavailable. */ }
    finally { clearTimeout(timeout); }
  }
  renderPublications(fallback); loadPublications();
})();
