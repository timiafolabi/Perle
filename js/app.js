const IG_HANDLE = '@perlethriftedgoods';
const PLACEHOLDER_IMAGE = 'assets/items/placeholder.jpg';
const VALID_STATUSES = ['available', 'reserved', 'sold'];

const state = {
  items: [],
  filters: {
    status: 'All',
    size: 'All',
    sort: 'Newest',
    search: ''
  }
};

const REQUIRED_FIELDS = [
  'id',
  'title',
  'category',
  'price',
  'size',
  'fitsLike',
  'condition',
  'status',
  'notes',
  'images',
  'createdAt'
];

const CATALOG_SECTIONS = [
  { key: 'new-arrivals', match: (item) => (item.status || '').toLowerCase() !== 'sold' },
  { key: 'tops', match: (item) => item.category === 'Tops' },
  { key: 'bottoms', match: (item) => item.category === 'Bottoms' },
  { key: 'outerwear', match: (item) => item.category === 'Outerwear' },
  { key: 'accessories', match: (item) => item.category === 'Accessories' },
  { key: 'under-25', match: (item) => Number(item.price) <= 25 || item.category === 'Under $25' },
  { key: 'recently-sold', match: (item) => (item.status || '').toLowerCase() === 'sold' }
];

const formatPrice = (price) => `$${Number(price).toFixed(0)}`;
const formatDate = (date) => new Date(date).toLocaleDateString(undefined, {
  year: 'numeric', month: 'short', day: 'numeric'
});

function statusBadge(status) {
  const value = (status || '').toLowerCase();
  return `<span class="badge ${value}">${value.toUpperCase()}</span>`;
}

function safeImage(src) {
  return src || PLACEHOLDER_IMAGE;
}

function isFeatured(item) {
  return item?.featured === true;
}

function validateItems(items) {
  const idCounts = new Map();

  items.forEach((item, index) => {
    const itemRef = item?.id || `item at index ${index}`;

    REQUIRED_FIELDS.forEach((field) => {
      const value = item?.[field];
      const isMissing = value === undefined || value === null || value === '';
      if (isMissing) {
        console.warn(`[inventory validation] Missing required field "${field}" on ${itemRef}`, item);
      }
    });

    if (!VALID_STATUSES.includes((item?.status || '').toLowerCase())) {
      console.warn(`[inventory validation] Invalid status on ${itemRef}: "${item?.status}". Expected one of ${VALID_STATUSES.join(', ')}`);
    }

    if (typeof item?.price !== 'number' || Number.isNaN(item.price)) {
      console.warn(`[inventory validation] Price must be a number on ${itemRef}. Received:`, item?.price);
    }

    if (item?.id) {
      idCounts.set(item.id, (idCounts.get(item.id) || 0) + 1);
    }
  });

  idCounts.forEach((count, id) => {
    if (count > 1) {
      console.warn(`[inventory validation] Duplicate id detected: ${id} appears ${count} times.`);
    }
  });
}

function sortItems(items, sort) {
  const result = [...items];
  if (sort === 'Price Low→High') {
    result.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sort === 'Price High→Low') {
    result.sort((a, b) => Number(b.price) - Number(a.price));
  } else {
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  return result;
}

function applyGlobalFilters(items, filters) {
  const search = filters.search.trim().toLowerCase();

  return items.filter((item) => {
    if (filters.status !== 'All' && (item.status || '').toLowerCase() !== filters.status.toLowerCase()) {
      return false;
    }

    if (filters.size !== 'All' && (item.size || '').toUpperCase() !== filters.size.toUpperCase()) {
      return false;
    }

    if (search) {
      const haystack = `${item.id || ''} ${item.title || ''} ${item.notes || ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
}

function renderGrid(items, root, { interactive = true, showEmptyMessage = true, emptyMessage = 'Nothing here right now — check back soon.' } = {}) {
  if (!root) return;
  if (!items.length) {
    root.innerHTML = showEmptyMessage ? `<p class="empty">${emptyMessage}</p>` : '';
    return;
  }

  root.innerHTML = items.map((item) => {
    const isSold = (item.status || '').toLowerCase() === 'sold';
    const featuredBadge = isFeatured(item) ? '<span class="perle-pick-badge">🔥 Perle Pick</span>' : '';
    return `
      <article class="card ${isSold ? 'sold' : ''}" ${interactive ? `data-id="${item.id}"` : ''}>
        <div class="card-media">
          <img src="${safeImage(item.images?.[0])}" alt="${item.title}" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}'" />
        </div>
        <div class="card-body">
          <h3>${item.title}</h3>
          ${featuredBadge}
          <div><span class="price ${isSold ? 'sold' : ''}">${formatPrice(item.price)}</span>${statusBadge(item.status)}</div>
          <p class="meta">Size ${item.size} • ${item.condition}</p>
          <p class="item-id">${item.id}</p>
          <p class="reserve-helper">DM @perlethriftedgoods with the ID or a screenshot to reserve.</p>
        </div>
      </article>
    `;
  }).join('');
}

function buildModal(items) {
  const modal = document.getElementById('item-modal');
  const content = document.getElementById('modal-content');
  if (!modal || !content) return;

  let copyToastTimer = null;
  let modalState = null;

  function updateMainImage(nextIndex) {
    if (!modalState || !modalState.images.length) return;
    const total = modalState.images.length;
    const normalized = ((nextIndex % total) + total) % total;
    modalState.currentIndex = normalized;

    const main = document.getElementById('modal-main-image');
    if (main) {
      main.src = safeImage(modalState.images[normalized]);
      main.alt = modalState.title;
    }

    content.querySelectorAll('.modal-thumb').forEach((node, index) => {
      node.classList.toggle('active', index === normalized);
    });
  }

  function navigateGallery(direction) {
    if (!modalState || modalState.images.length < 2) return;
    updateMainImage(modalState.currentIndex + direction);
  }

  function open(itemId) {
    const item = items.find((x) => x.id === itemId);
    if (!item) return;

    const images = item.images && item.images.length ? item.images : [PLACEHOLDER_IMAGE];
    const showArrows = images.length > 1;

    modalState = {
      itemId: item.id,
      title: item.title,
      images,
      currentIndex: 0,
      touchStartX: null,
      touchStartY: null
    };

    content.innerHTML = `
      <div class="modal-gallery">
        <div class="modal-main-wrap" id="modal-main-wrap">
          <img id="modal-main-image" class="modal-main-image" src="${safeImage(images[0])}" alt="${item.title}" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}'" />
          <button type="button" class="modal-nav-arrow prev" data-modal-nav="prev" aria-label="Previous photo" ${showArrows ? '' : 'hidden'}>‹</button>
          <button type="button" class="modal-nav-arrow next" data-modal-nav="next" aria-label="Next photo" ${showArrows ? '' : 'hidden'}>›</button>
        </div>
        <div class="modal-thumbs">
          ${images.map((src, index) => `
            <button class="modal-thumb ${index === 0 ? 'active' : ''}" type="button" data-modal-index="${index}" aria-label="View image ${index + 1} for ${item.title}">
              <img src="${safeImage(src)}" alt="${item.title} thumbnail ${index + 1}" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}'" />
            </button>
          `).join('')}
        </div>
      </div>
      <h2>${item.title}</h2>
      ${isFeatured(item) ? '<p class="perle-pick-badge in-modal">🔥 Perle Pick</p>' : ''}
      <div class="copy-id-row">
        <p class="item-id">Item ID: ${item.id}</p>
        <button type="button" class="copy-id-btn" data-copy-id="${item.id}">Copy Item ID</button>
      </div>
      <p id="copy-feedback" class="copy-feedback" aria-live="polite"></p>
      <p><strong>${formatPrice(item.price)}</strong> • Size ${item.size} • Fits like ${item.fitsLike}</p>
      <p>${statusBadge(item.status)} <span class="meta">Condition: ${item.condition}</span></p>
      <p>${item.notes || 'No additional notes.'}</p>
      <p class="meta">Listed ${formatDate(item.createdAt)}</p>
      <p class="modal-callout">DM ${IG_HANDLE} with Item ID ${item.id} to reserve.</p>
    `;

    const mainWrap = document.getElementById('modal-main-wrap');
    if (mainWrap) {
      mainWrap.addEventListener('touchstart', (event) => {
        const touch = event.changedTouches?.[0];
        if (!touch || !modalState) return;
        modalState.touchStartX = touch.clientX;
        modalState.touchStartY = touch.clientY;
      }, { passive: true });

      mainWrap.addEventListener('touchend', (event) => {
        const touch = event.changedTouches?.[0];
        if (!touch || !modalState) return;

        const diffX = touch.clientX - (modalState.touchStartX ?? touch.clientX);
        const diffY = touch.clientY - (modalState.touchStartY ?? touch.clientY);
        if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX < 0) navigateGallery(1);
          else navigateGallery(-1);
        }
      }, { passive: true });
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    modalState = null;
  }

  async function copyItemId(itemId) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(itemId);
      return;
    }

    const temp = document.createElement('textarea');
    temp.value = itemId;
    temp.setAttribute('readonly', '');
    temp.style.position = 'absolute';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
  }

  function showCopyFeedback() {
    const feedback = document.getElementById('copy-feedback');
    if (!feedback) return;

    feedback.textContent = `Copied! Now DM ${IG_HANDLE}`;
    feedback.classList.add('show');

    if (copyToastTimer) clearTimeout(copyToastTimer);
    copyToastTimer = setTimeout(() => {
      feedback.textContent = '';
      feedback.classList.remove('show');
    }, 1500);
  }

  document.addEventListener('click', async (e) => {
    const card = e.target.closest('.card[data-id]');
    if (card) {
      open(card.dataset.id);
      return;
    }

    const thumb = e.target.closest('.modal-thumb[data-modal-index]');
    if (thumb && modal.classList.contains('open')) {
      updateMainImage(Number(thumb.dataset.modalIndex));
      return;
    }

    const navArrow = e.target.closest('.modal-nav-arrow[data-modal-nav]');
    if (navArrow && modal.classList.contains('open')) {
      navigateGallery(navArrow.dataset.modalNav === 'next' ? 1 : -1);
      return;
    }

    const copyBtn = e.target.closest('.copy-id-btn[data-copy-id]');
    if (copyBtn && modal.classList.contains('open')) {
      try {
        await copyItemId(copyBtn.dataset.copyId);
        showCopyFeedback();
      } catch (error) {
        console.error('Copy failed', error);
      }
      return;
    }

    if (e.target.matches('#modal-close') || e.target.matches('#item-modal')) {
      close();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;

    if (e.key === 'Escape') {
      close();
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigateGallery(-1);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateGallery(1);
    }
  });
}

function setupCatalogJumpLinks() {
  const root = document.querySelector('.jump-links');
  if (!root) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const getStickyOffset = () => {
    const sticky = document.querySelector('.sticky-filters');
    const siteHeader = document.querySelector('.site-header');
    const stickyHeight = sticky ? sticky.getBoundingClientRect().height : 0;
    const headerHeight = siteHeader ? siteHeader.getBoundingClientRect().height : 0;
    return stickyHeight + headerHeight + 14;
  };

  function scrollToHash(hash) {
    if (!hash || hash === '#') return;
    const target = document.querySelector(hash);
    if (!target) return;

    const absoluteTop = window.scrollY + target.getBoundingClientRect().top;
    const offsetTop = Math.max(0, absoluteTop - getStickyOffset());

    window.scrollTo({
      top: offsetTop,
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
  }

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link || !root.contains(link)) return;

    const hash = link.getAttribute('href');
    const target = hash ? document.querySelector(hash) : null;
    if (!target) return;

    e.preventDefault();
    scrollToHash(hash);
    history.replaceState(null, '', hash);
  });

  if (window.location.hash) {
    setTimeout(() => {
      scrollToHash(window.location.hash);
    }, 40);
  }
}

function setupConditionGuide() {
  const trigger = document.getElementById('condition-guide-trigger');
  const modal = document.getElementById('condition-guide-modal');
  const closeBtn = document.getElementById('condition-guide-close');
  if (!trigger || !modal || !closeBtn) return;

  function openGuide() {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeGuide() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  trigger.addEventListener('click', openGuide);
  closeBtn.addEventListener('click', closeGuide);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeGuide();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeGuide();
  });
}

function setLastUpdated() {
  const node = document.getElementById('last-updated');
  if (!node) return;
  node.textContent = `Last updated: ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}`;
}

function setupCatalog(items) {
  const status = document.getElementById('status-filter');
  const size = document.getElementById('size-filter');
  const sort = document.getElementById('sort-filter');
  const search = document.getElementById('search-filter');

  if (!status || !size || !sort || !search) return;

  setLastUpdated();
  setupCatalogJumpLinks();
  setupConditionGuide();

  const sizes = [...new Set(items.map((x) => x.size).filter(Boolean))].sort();
  size.innerHTML = '<option>All</option>' + sizes.map((s) => `<option>${s}</option>`).join('');

  function update() {
    state.filters = {
      status: status.value,
      size: size.value,
      sort: sort.value,
      search: search.value || ''
    };

    const globallyFiltered = applyGlobalFilters(items, state.filters);

    CATALOG_SECTIONS.forEach((sectionConfig) => {
      const sectionEl = document.getElementById(sectionConfig.key);
      const grid = document.querySelector(`[data-section-grid="${sectionConfig.key}"]`);
      if (!sectionEl || !grid) return;

      let sectionItems = globallyFiltered.filter((item) => sectionConfig.match(item));

      if (sectionConfig.key === 'recently-sold') {
        sectionItems = sectionItems
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 6);
      } else {
        sectionItems = sortItems(sectionItems, state.filters.sort);
      }

      const soldSectionAllowed = sectionConfig.key !== 'recently-sold' || ['All', 'Sold'].includes(state.filters.status);
      sectionEl.style.display = soldSectionAllowed ? '' : 'none';
      renderGrid(soldSectionAllowed ? sectionItems : [], grid, {
        showEmptyMessage: soldSectionAllowed,
        emptyMessage: 'Nothing here right now — check back soon.'
      });
    });
  }

  [status, size, sort].forEach((node) => node.addEventListener('change', update));
  search.addEventListener('input', update);
  update();
  buildModal(items);
}

function setupHome(items) {
  const arrivalsRoot = document.getElementById('arrivals-grid');
  if (!arrivalsRoot) return;

  const arrivals = items
    .filter((item) => (item.status || '').toLowerCase() !== 'sold')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  renderGrid(arrivals, arrivalsRoot, { interactive: true });
  buildModal(items);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if ((ch === ',') && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      cell = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }

    cell += ch;
  }

  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim() !== '')) rows.push(row);
  }

  if (inQuotes) {
    throw new Error('CSV format error: unmatched quote.');
  }

  return rows;
}

function csvRowsToItems(rows) {
  const requiredHeader = ['id', 'title', 'category', 'price', 'size', 'fitsLike', 'condition', 'status', 'notes', 'images', 'createdAt', 'featured'];

  if (!rows.length) {
    throw new Error('CSV format error: file is empty.');
  }

  const header = rows[0].map((h) => h.trim());
  const headerOk = requiredHeader.length === header.length && requiredHeader.every((name, idx) => header[idx] === name);

  if (!headerOk) {
    throw new Error(`CSV format error: header must be exactly ${requiredHeader.join(',')}`);
  }

  return rows.slice(1).map((values, rowIndex) => {
    if (values.length !== requiredHeader.length) {
      throw new Error(`CSV format error: row ${rowIndex + 2} has ${values.length} columns; expected ${requiredHeader.length}.`);
    }

    const item = Object.fromEntries(requiredHeader.map((key, idx) => [key, values[idx].trim()]));

    return {
      ...item,
      price: Number(item.price),
      status: item.status.toLowerCase(),
      images: item.images ? item.images.split('|').map((src) => src.trim()).filter(Boolean) : [],
      featured: (item.featured || '').toLowerCase() === 'true'
    };
  });
}

async function loadItems() {
  const res = await fetch('data/items.csv');
  if (!res.ok) throw new Error('Could not load inventory CSV');

  const csvText = await res.text();
  const rows = parseCsv(csvText);
  return csvRowsToItems(rows);
}

(async function init() {
  try {
    const items = await loadItems();
    validateItems(items);
    state.items = items;
    setupHome(items);
    setupCatalog(items);
  } catch (err) {
    const arrivalsNode = document.getElementById('arrivals-grid');
    if (arrivalsNode) arrivalsNode.innerHTML = '<p class="empty">Unable to load inventory right now.</p>';

    document.querySelectorAll('[data-section-grid]').forEach((grid) => {
      grid.innerHTML = '<p class="empty">Unable to load inventory right now.</p>';
    });
    console.error(err);
  }
})();
