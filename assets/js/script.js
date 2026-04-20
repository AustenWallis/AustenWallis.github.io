'use strict';

const sidebar = document.querySelector('[data-sidebar]');
const sidebarButton = document.querySelector('[data-sidebar-btn]');
const navLinks = Array.from(document.querySelectorAll('[data-nav-link]'));
const pages = Array.from(document.querySelectorAll('[data-page]'));
const contactForm = document.querySelector('[data-contact-form]');
const formButton = document.querySelector('[data-form-btn]');
const orcidList = document.querySelector('[data-orcid-list]');
const publicationCount = document.querySelector('[data-publication-count]');
const flipCards = Array.from(document.querySelectorAll('[data-flip-card]'));
const desktopQuery = window.matchMedia('(min-width: 1080px)');
const ORCID_ID = '0000-0003-0770-9015';
const ORCID_WORKS_URL = `https://pub.orcid.org/v3.0/${ORCID_ID}/works`;

function setSidebarState(isExpanded) {
  if (!sidebar || !sidebarButton) {
    return;
  }

  sidebar.classList.toggle('active', isExpanded);
  sidebarButton.setAttribute('aria-expanded', String(isExpanded));
  sidebarButton.textContent = isExpanded ? 'Hide contacts' : 'Show contacts';
}

function normalisePageName(pageName) {
  const availablePages = new Set(pages.map((page) => page.dataset.page));
  return availablePages.has(pageName) ? pageName : 'about';
}

function activatePage(pageName, updateHash = true) {
  const target = normalisePageName(pageName);

  pages.forEach((page) => {
    const isActive = page.dataset.page === target;
    page.classList.toggle('active', isActive);
    page.hidden = !isActive;
  });

  navLinks.forEach((link) => {
    const isActive = link.dataset.target === target;
    link.classList.toggle('active', isActive);

    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  if (updateHash) {
    history.replaceState(null, '', `#${target}`);
  }
}

function syncSidebarWithViewport() {
  setSidebarState(desktopQuery.matches);
}

function getPublicationDate(summary) {
  const publicationDate = summary['publication-date'] || {};
  const year = publicationDate.year?.value || '';
  const month = String(publicationDate.month?.value || '01').padStart(2, '0');
  const day = String(publicationDate.day?.value || '01').padStart(2, '0');

  return {
    year,
    sortKey: year ? `${year}-${month}-${day}` : '0000-01-01',
  };
}

function getPublicationLink(summary) {
  const externalIds = summary['external-ids']?.['external-id'] || [];
  const doi = externalIds.find((item) => item['external-id-type'] === 'doi')?.['external-id-value'];
  const externalUrl = externalIds.find((item) => item['external-id-url']?.value)?.['external-id-url']?.value;

  if (doi) {
    return `https://doi.org/${doi}`;
  }

  if (externalUrl) {
    return externalUrl;
  }

  return `https://orcid.org/${ORCID_ID}`;
}

function selectGroupSummary(group) {
  const summaries = group['work-summary'] || [];

  return summaries.find((summary) => {
    const externalIds = summary['external-ids']?.['external-id'] || [];
    return externalIds.length > 0;
  }) || summaries[0] || null;
}

function buildPublicationRecord(summary) {
  const { year, sortKey } = getPublicationDate(summary);
  const journal = summary['journal-title']?.value?.trim() || '';
  const title = summary.title?.title?.value?.trim() || '';

  return {
    title,
    meta: [journal, year].filter(Boolean).join(' · ') || 'Publication record',
    sortKey,
    link: getPublicationLink(summary),
  };
}

function createPublicationCard(work) {
  const link = document.createElement('a');
  link.href = work.link;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';

  const title = document.createElement('strong');
  title.textContent = work.title;

  const meta = document.createElement('span');
  meta.textContent = work.meta;

  link.append(title, meta);
  return link;
}

function createPublicationFallback() {
  const message = document.createElement('p');
  message.className = 'publication-status';
  message.textContent = 'Recent papers are unavailable right now. ';

  const link = document.createElement('a');
  link.className = 'text-link';
  link.href = `https://orcid.org/${ORCID_ID}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'View ORCID directly.';

  message.append(link);
  return message;
}

async function loadOrcidWorks() {
  if (!orcidList) {
    return;
  }

  try {
    const response = await fetch(ORCID_WORKS_URL, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`ORCID request failed: ${response.status}`);
    }

    const data = await response.json();
    const groups = data.group || [];
    const works = groups
      .map(selectGroupSummary)
      .filter(Boolean)
      .map(buildPublicationRecord)
      .filter((work) => work.title)
      .sort((left, right) => right.sortKey.localeCompare(left.sortKey))
      .slice(0, 4);

    if (publicationCount && groups.length) {
      publicationCount.textContent = String(groups.length);
    }

    if (!works.length) {
      orcidList.replaceChildren(createPublicationFallback());
      return;
    }

    orcidList.replaceChildren(...works.map(createPublicationCard));
  } catch (error) {
    console.error(error);
    orcidList.replaceChildren(createPublicationFallback());
  }
}

flipCards.forEach((card) => {
  card.addEventListener('click', () => {
    const isFlipped = card.classList.toggle('is-flipped');
    card.setAttribute('aria-pressed', String(isFlipped));
  });
});

if (sidebarButton) {
  sidebarButton.addEventListener('click', () => {
    setSidebarState(!sidebar.classList.contains('active'));
  });
}

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    activatePage(link.dataset.target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

if (contactForm && formButton) {
  const updateFormState = () => {
    formButton.disabled = !contactForm.checkValidity();
  };

  contactForm.addEventListener('input', updateFormState);
  updateFormState();

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const name = String(formData.get('name')).trim();
    const email = String(formData.get('email')).trim();
    const subject = String(formData.get('subject')).trim();
    const message = String(formData.get('message')).trim();
    const body = [
      'Hi Austen,',
      '',
      message,
      '',
      `From: ${name}`,
      `Reply to: ${email}`,
    ].join('\n');

    window.location.href = `mailto:A.Wallis@soton.ac.uk?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

syncSidebarWithViewport();
desktopQuery.addEventListener('change', syncSidebarWithViewport);

activatePage(normalisePageName(window.location.hash.replace('#', '').toLowerCase()), false);
loadOrcidWorks();

window.addEventListener('hashchange', () => {
  activatePage(window.location.hash.replace('#', '').toLowerCase(), false);
});