const IG_HANDLE = '@perlethriftedgoods';
const PLACEHOLDER_IMAGE = 'assets/items/placeholder.jpg';
const CART_KEY = 'ptg-cart';
const VALID_STATUSES = ['available', 'reserved', 'sold'];
const VALID_CONDITIONS = ['New', 'Very Good', 'Good', 'Fair'];
const VALID_CATEGORIES = ['Tops', 'Bottoms', 'Outerwear'];
const VALID_AUDIENCES = ['mens', 'womens', 'unisex'];
const LETTER_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const REQUIRED_FIELDS = ['id', 'title', 'category', 'price', 'size', 'fitsLike', 'condition', 'status', 'notes', 'images', 'createdAt', 'featured', 'audience'];

const state = {
  items: [],
  waistOptions: [],
  filters: {
    audience: 'all',
    category: 'all',
    condition: 'all',
    sort: 'Newest',
    search: '',
    newOnly: false,
    letterSizes: [],
    waistSizes: []
  },
  draftFilters: null
};

const formatPrice = (price) => `$${Number(price).toFixed(0)}`;
const formatDate = (date) => new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

function daysSince(dateString) {
  return (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24);
}

function isNewArrival(item) {
  return item.status !== 'sold' && daysSince(item.createdAt) <= 7;
}

function normalizeCategory(input) {
  const value = (input || '').trim().toLowerCase();
  if (value.startsWith('top')) return 'Tops';
  if (value.startsWith('bottom')) return 'Bottoms';
  if (value.startsWith('outer')) return 'Outerwear';
  return input;
}

function normalizeLetterSizes(str) {
  if (!str) return [];
  const clean = String(str).toUpperCase().replace(/XX-LARGE/g, 'XXL').replace(/X-LARGE/g, 'XL').replace(/\s+/g, '');
  return [...new Set(clean.split(/[\/,|-]/).map((token) => {
    if (token === '2XL') return 'XXL';
    if (token === '3XL') return 'XXXL';
    return token;
  }).filter((token) => LETTER_OPTIONS.includes(token)))];
}

function normalizeWaistSizes(str) {
  if (!str) return [];
  const text = String(str);
  const values = new Set();

  text.split('/').forEach((chunk) => {
    const part = chunk.trim();
    const range = part.match(/(\d{2})\s*-\s*(\d{2})/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      const min = Math.min(start, end);
      const max = Math.max(start, end);
      if (max - min <= 6) {
        for (let n = min; n <= max; n += 1) values.add(n);
      } else {
        values.add(start);
        values.add(end);
      }
      return;
    }

    const nums = part.match(/\d{2}/g);
    if (nums) nums.forEach((n) => values.add(Number(n)));
  });

  return [...values];
}

function getAllWaistOptions(items) {
  const values = new Set();
  items.forEach((item) => {
    normalizeWaistSizes(item.size).forEach((n) => values.add(n));
    normalizeWaistSizes(item.fitsLike).forEach((n) => values.add(n));
  });
  return [...values].sort((a, b) => a - b);
}

function safeImage(src) {
  return src || PLACEHOLDER_IMAGE;
}

function statusBadge(status) {
  return `<span class="badge ${status}">${status.toUpperCase()}</span>`;
}

function getCartIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isInCart(id) {
  return getCartIds().includes(id);
}

function setCartIds(ids) {
  const clean = [...new Set(ids.filter(Boolean))];
  localStorage.setItem(CART_KEY, JSON.stringify(clean));
  updateCartCount();
}

function updateCartCount() {
  const count = getCartIds().length;
  document.querySelectorAll('#cart-count').forEach((node) => {
    node.textContent = String(count);
  });
}

function addToCart(id) {
  const ids = getCartIds();
  if (!ids.includes(id)) ids.push(id);
  setCartIds(ids);
}

function removeFromCart(id) {
  setCartIds(getCartIds().filter((itemId) => itemId !== id));
}

function toggleCart(id) {
  if (isInCart(id)) removeFromCart(id);
  else addToCart(id);
}

function validateItems(items) {
  const idCounts = new Map();

  items.forEach((item, index) => {
    const label = item.id || `row ${index + 2}`;

    REQUIRED_FIELDS.forEach((field) => {
      const value = item[field];
      if (value === undefined || value === null || value === '') {
        console.warn(`[inventory validation] Missing required field "${field}" on ${label}`);
      }
    });

    if (!VALID_STATUSES.includes(item.status)) console.warn(`[inventory validation] Invalid status on ${label}: ${item.status}`);
    if (!VALID_CONDITIONS.includes(item.condition)) console.warn(`[inventory validation] Invalid condition on ${label}: ${item.condition}`);
    if (!VALID_CATEGORIES.includes(item.category)) console.warn(`[inventory validation] Invalid category on ${label}: ${item.category}`);
    if (!VALID_AUDIENCES.includes(item.audience)) console.warn(`[inventory validation] Invalid audience on ${label}: ${item.audience}`);
    if (typeof item.price !== 'number' || Number.isNaN(item.price)) console.warn(`[inventory validation] Price must be numeric on ${label}`);

    idCounts.set(item.id, (idCounts.get(item.id) || 0) + 1);
  });

  idCounts.forEach((count, id) => {
    if (count > 1) console.warn(`[inventory validation] Duplicate id: ${id}`);
  });
}

function sortItems(items, sort) {
  const list = [...items];
  if (sort === 'Price Low→High') list.sort((a, b) => a.price - b.price);
  else if (sort === 'Price High→Low') list.sort((a, b) => b.price - a.price);
  else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return list;
}

function intersects(a, b) {
  return a.some((token) => b.includes(token));
}

function applyCatalogFilters(items) {
  const search = state.filters.search.trim().toLowerCase();

  return items.filter((item) => {
    if (!['available', 'reserved'].includes(item.status)) return false;
    if (state.filters.audience !== 'all' && item.audience !== state.filters.audience) return false;
    if (state.filters.category !== 'all' && item.category !== state.filters.category) return false;
    if (state.filters.condition !== 'all' && item.condition !== state.filters.condition) return false;
    if (state.filters.newOnly && !isNewArrival(item)) return false;

    const selectedLetters = state.filters.letterSizes;
    const selectedWaists = state.filters.waistSizes;

    if (selectedLetters.length || selectedWaists.length) {
      const itemLetters = [...new Set([...normalizeLetterSizes(item.size), ...normalizeLetterSizes(item.fitsLike)])];
      const itemWaists = [...new Set([...normalizeWaistSizes(item.size), ...normalizeWaistSizes(item.fitsLike)])];
      const letterHit = selectedLetters.length ? intersects(itemLetters, selectedLetters) : false;
      const waistHit = selectedWaists.length ? intersects(itemWaists, selectedWaists) : false;
      if (!(letterHit || waistHit)) return false;
    }

    if (search) {
      const hay = `${item.title} ${item.notes}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }

    return true;
  });
}

function sizeLine(item, { womensLabel = false } = {}) {
  if (womensLabel && item.audience === 'womens') return `Women's size ${item.size} • Fits like ${item.fitsLike}`;
  return `Size ${item.size} • Fits like ${item.fitsLike}`;
}

function renderCards(items, root, { soldView = false } = {}) {
  if (!root) return;
  if (!items.length) {
    root.innerHTML = '<p class="empty">Nothing here right now — check back soon.</p>';
    return;
  }

  root.innerHTML = items.map((item) => `
    <article class="card ${item.status === 'sold' ? 'sold' : ''}" data-id="${item.id}">
      <div class="card-media">
        ${isNewArrival(item) ? '<span class="new-badge">New Arrival</span>' : ''}
        <img src="${safeImage(item.images[0])}" alt="${item.title}" loading="lazy" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}'" />
      </div>
      <div class="card-body compact-card-body">
        <h3 class="clamp-1">${item.title}</h3>
        <div class="card-price-row"><span class="price ${item.status === 'sold' ? 'sold' : ''}">${formatPrice(item.price)}</span>${statusBadge(item.status)}</div>
        <p class="meta">${sizeLine(item, { womensLabel: soldView })}</p>
        <p class="meta">${item.condition} • ${item.audience === 'mens' ? "Men's" : item.audience === 'womens' ? "Women's" : 'Unisex'}</p>
        <p class="item-id">${item.id}</p>
        ${soldView ? '' : `<button class="add-cart-btn" type="button" data-add-cart="${item.id}" aria-label="Add ${item.id} to cart">+</button>`}
      </div>
    </article>
  `).join('');
}

function buildModal(items) {
  const modal = document.getElementById('item-modal');
  const content = document.getElementById('modal-content');
  if (!modal || !content) return;

  let gallery = null;
  let timer = null;
  let currentItem = null;

  const updateImage = (index) => {
    if (!gallery) return;
    const total = gallery.images.length;
    gallery.index = ((index % total) + total) % total;
    const main = document.getElementById('modal-main-image');
    if (main) main.src = safeImage(gallery.images[gallery.index]);
    content.querySelectorAll('.modal-thumb').forEach((thumb, i) => thumb.classList.toggle('active', i === gallery.index));
  };

  const stepImage = (dir) => {
    if (!gallery || gallery.images.length < 2) return;
    updateImage(gallery.index + dir);
  };

  const renderCartToggle = (item) => {
    if (item.status === 'sold') {
      return '<button type="button" class="modal-cart-btn" disabled>Sold</button>';
    }
    const inCart = isInCart(item.id);
    return `<button type="button" class="modal-cart-btn" data-modal-cart-toggle="${item.id}">${inCart ? 'Remove from Cart' : 'Add to Cart'}</button>`;
  };

  const open = (itemId) => {
    const item = items.find((x) => x.id === itemId);
    if (!item) return;
    currentItem = item;
    const images = item.images.length ? item.images : [PLACEHOLDER_IMAGE];

    gallery = { images, index: 0, touchX: null, touchY: null };

    content.innerHTML = `
      <div class="modal-gallery">
        <div class="modal-main-wrap" id="modal-main-wrap">
          <img id="modal-main-image" class="modal-main-image" src="${safeImage(images[0])}" alt="${item.title}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}'" />
          <button type="button" class="modal-nav-arrow prev" data-modal-nav="prev" aria-label="Previous photo" ${images.length > 1 ? '' : 'hidden'}>‹</button>
          <button type="button" class="modal-nav-arrow next" data-modal-nav="next" aria-label="Next photo" ${images.length > 1 ? '' : 'hidden'}>›</button>
        </div>
        <div class="modal-thumbs">${images.map((src, index) => `<button class="modal-thumb ${index === 0 ? 'active' : ''}" type="button" data-modal-index="${index}"><img src="${safeImage(src)}" alt="${item.title} ${index + 1}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}'" /></button>`).join('')}</div>
      </div>
      <h2>${item.title}</h2>
      <div class="copy-id-row">
        <p class="item-id">Item ID: ${item.id}</p>
        <button type="button" class="copy-id-btn" data-copy-id="${item.id}">Copy Item ID</button>
      </div>
      ${renderCartToggle(item)}
      <p id="copy-feedback" class="copy-feedback" aria-live="polite"></p>
      <p><strong>${formatPrice(item.price)}</strong> • ${sizeLine(item, { womensLabel: true })}</p>
      <p>${statusBadge(item.status)} <span class="meta">Condition: ${item.condition}</span></p>
      <p>${item.notes || 'No additional notes.'}</p>
      <p class="meta">Listed ${formatDate(item.createdAt)}</p>
      <p class="modal-callout">DM ${IG_HANDLE} with Item ID ${item.id} to reserve.</p>
    `;

    const wrap = document.getElementById('modal-main-wrap');
    if (wrap) {
      wrap.addEventListener('touchstart', (event) => {
        const t = event.changedTouches?.[0];
        if (!t || !gallery) return;
        gallery.touchX = t.clientX;
        gallery.touchY = t.clientY;
      }, { passive: true });

      wrap.addEventListener('touchend', (event) => {
        const t = event.changedTouches?.[0];
        if (!t || !gallery) return;
        const dx = t.clientX - (gallery.touchX ?? t.clientX);
        const dy = t.clientY - (gallery.touchY ?? t.clientY);
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) stepImage(dx < 0 ? 1 : -1);
      }, { passive: true });
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    gallery = null;
    currentItem = null;
  };

  const copyText = async (value) => {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
    const temp = document.createElement('textarea');
    temp.value = value;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    temp.remove();
  };

  document.addEventListener('click', async (event) => {
    const card = event.target.closest('.card[data-id]');
    if (card && !event.target.closest('[data-add-cart]')) {
      open(card.dataset.id);
      return;
    }

    const thumb = event.target.closest('[data-modal-index]');
    if (thumb && modal.classList.contains('open')) return updateImage(Number(thumb.dataset.modalIndex));

    const nav = event.target.closest('[data-modal-nav]');
    if (nav && modal.classList.contains('open')) return stepImage(nav.dataset.modalNav === 'next' ? 1 : -1);

    const copyBtn = event.target.closest('.copy-id-btn');
    if (copyBtn && modal.classList.contains('open') && copyBtn.dataset.copyId) {
      await copyText(copyBtn.dataset.copyId);
      const feedback = document.getElementById('copy-feedback');
      if (feedback) {
        feedback.textContent = `Copied! Now DM ${IG_HANDLE}`;
        feedback.classList.add('show');
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          feedback.textContent = '';
          feedback.classList.remove('show');
        }, 1500);
      }
      return;
    }

    const modalCart = event.target.closest('[data-modal-cart-toggle]');
    if (modalCart && currentItem && currentItem.status !== 'sold') {
      toggleCart(currentItem.id);
      modalCart.textContent = isInCart(currentItem.id) ? 'Remove from Cart' : 'Add to Cart';
      return;
    }

    if (event.target.matches('#modal-close') || event.target.matches('#item-modal')) close();

    const addBtn = event.target.closest('[data-add-cart]');
    if (addBtn) {
      event.stopPropagation();
      addToCart(addBtn.dataset.addCart);
    }

    const removeBtn = event.target.closest('[data-remove-cart]');
    if (removeBtn) {
      removeFromCart(removeBtn.dataset.removeCart);
      renderCartPage(items);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (!modal.classList.contains('open')) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') stepImage(-1);
    if (event.key === 'ArrowRight') stepImage(1);
  });
}

function renderFilterChips(rootId, options, current, onSelect, { multi = false } = {}) {
  const root = document.getElementById(rootId);
  if (!root) return;
  root.innerHTML = options.map((opt) => {
    const isActive = multi ? current.includes(opt.value) : current === opt.value;
    return `<button class="chip ${isActive ? 'active' : ''}" type="button" data-chip-value="${opt.value}">${opt.label}</button>`;
  }).join('');

  root.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => onSelect(chip.dataset.chipValue));
  });
}

function activeFilterCount(filters) {
  let count = 0;
  ['audience', 'category', 'condition'].forEach((key) => {
    if (filters[key] !== 'all') count += 1;
  });
  if (filters.newOnly) count += 1;
  count += filters.letterSizes.length;
  count += filters.waistSizes.length;
  return count;
}

function setMobileSyncFromState() {
  const searchMobile = document.getElementById('search-filter-mobile');
  const sortMobile = document.getElementById('sort-filter-mobile');
  const searchDesktop = document.getElementById('search-filter');
  const sortDesktop = document.getElementById('sort-filter');

  if (searchMobile) searchMobile.value = state.filters.search;
  if (sortMobile) sortMobile.value = state.filters.sort;
  if (searchDesktop) searchDesktop.value = state.filters.search;
  if (sortDesktop) sortDesktop.value = state.filters.sort;

  const newDesktop = document.getElementById('new-arrivals-only');
  const newDrawer = document.getElementById('drawer-new-arrivals-only');
  if (newDesktop) newDesktop.checked = state.filters.newOnly;
  if (newDrawer) newDrawer.checked = state.filters.newOnly;

  const countNode = document.getElementById('active-filter-count');
  if (countNode) countNode.textContent = String(activeFilterCount(state.filters));
}

function renderFilterSummary() {
  const root = document.getElementById('active-filter-summary');
  if (!root) return;

  const tokens = [];
  if (state.filters.audience !== 'all') tokens.push(state.filters.audience);
  if (state.filters.category !== 'all') tokens.push(state.filters.category);
  if (state.filters.condition !== 'all') tokens.push(state.filters.condition);
  if (state.filters.newOnly) tokens.push('New Arrivals');
  tokens.push(...state.filters.letterSizes);
  tokens.push(...state.filters.waistSizes.map(String));

  root.innerHTML = tokens.map((token) => `<span class="chip active">${token}</span>`).join('');
  root.style.display = tokens.length ? 'flex' : 'none';
}

function renderAllFilterUIs(rerender) {
  const targets = [
    ['audience-tabs', 'audience'],
    ['drawer-audience-tabs', 'audience']
  ];

  targets.forEach(([id]) => {
    renderFilterChips(id, [
      { label: 'All', value: 'all' },
      { label: "Men's", value: 'mens' },
      { label: "Women’s", value: 'womens' },
      { label: 'Unisex', value: 'unisex' }
    ], state.filters.audience, (value) => {
      state.filters.audience = value;
      renderAllFilterUIs(rerender);
      rerender();
    });
  });

  ['category-chips', 'drawer-category-chips'].forEach((id) => {
    renderFilterChips(id, [
      { label: 'All Categories', value: 'all' },
      { label: 'Tops', value: 'Tops' },
      { label: 'Bottoms', value: 'Bottoms' },
      { label: 'Outerwear', value: 'Outerwear' }
    ], state.filters.category, (value) => {
      state.filters.category = value;
      renderAllFilterUIs(rerender);
      rerender();
    });
  });

  ['condition-chips', 'drawer-condition-chips'].forEach((id) => {
    renderFilterChips(id, [{ label: 'All Conditions', value: 'all' }, ...VALID_CONDITIONS.map((c) => ({ label: c, value: c }))], state.filters.condition, (value) => {
      state.filters.condition = value;
      renderAllFilterUIs(rerender);
      rerender();
    });
  });

  ['letter-size-chips', 'drawer-letter-size-chips'].forEach((id) => {
    renderFilterChips(id, LETTER_OPTIONS.map((s) => ({ label: s, value: s })), state.filters.letterSizes, (value) => {
      const next = state.filters.letterSizes.includes(value)
        ? state.filters.letterSizes.filter((v) => v !== value)
        : [...state.filters.letterSizes, value];
      state.filters.letterSizes = next;
      renderAllFilterUIs(rerender);
      rerender();
    }, { multi: true });
  });

  ['waist-size-chips-wrap', 'drawer-waist-size-chips-wrap'].forEach((id) => {
    renderFilterChips(id, state.waistOptions.map((n) => ({ label: String(n), value: String(n) })), state.filters.waistSizes.map(String), (value) => {
      const n = Number(value);
      const next = state.filters.waistSizes.includes(n)
        ? state.filters.waistSizes.filter((v) => v !== n)
        : [...state.filters.waistSizes, n];
      state.filters.waistSizes = next;
      renderAllFilterUIs(rerender);
      rerender();
    }, { multi: true });
  });

  const waistVisible = state.waistOptions.length > 0;
  const drawerWaistSection = document.getElementById('drawer-waist-section');
  const desktopWaist = document.getElementById('waist-size-chips-wrap');
  if (drawerWaistSection) drawerWaistSection.style.display = waistVisible ? '' : 'none';
  if (desktopWaist) desktopWaist.style.display = waistVisible ? 'flex' : 'none';

  setMobileSyncFromState();
  renderFilterSummary();
}

function setupCatalog(items) {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  const rerender = () => {
    const filtered = applyCatalogFilters(items);
    const sorted = sortItems(filtered, state.filters.sort);
    renderCards(sorted, grid);
    setMobileSyncFromState();
    renderFilterSummary();
  };

  state.waistOptions = getAllWaistOptions(items);
  renderAllFilterUIs(rerender);

  const searchDesktop = document.getElementById('search-filter');
  const searchMobile = document.getElementById('search-filter-mobile');
  const sortDesktop = document.getElementById('sort-filter');
  const sortMobile = document.getElementById('sort-filter-mobile');
  const newDesktop = document.getElementById('new-arrivals-only');
  const newDrawer = document.getElementById('drawer-new-arrivals-only');

  [searchDesktop, searchMobile].forEach((node) => node?.addEventListener('input', () => {
    state.filters.search = node.value || '';
    rerender();
  }));

  [sortDesktop, sortMobile].forEach((node) => node?.addEventListener('change', () => {
    state.filters.sort = node.value;
    rerender();
  }));

  [newDesktop, newDrawer].forEach((node) => node?.addEventListener('change', () => {
    state.filters.newOnly = node.checked;
    rerender();
  }));

  const drawer = document.getElementById('filter-drawer');
  const openDrawerBtn = document.getElementById('open-filter-drawer');
  const closeDrawerBtn = document.getElementById('filter-drawer-close');
  const clearFiltersBtn = document.getElementById('clear-filters');
  const applyFiltersBtn = document.getElementById('apply-filters');

  const closeDrawer = () => {
    if (!drawer) return;
    drawer.classList.remove('open');
    document.body.style.overflow = '';
  };

  openDrawerBtn?.addEventListener('click', () => {
    drawer?.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
  closeDrawerBtn?.addEventListener('click', closeDrawer);
  drawer?.addEventListener('click', (e) => {
    if (e.target === drawer) closeDrawer();
  });

  applyFiltersBtn?.addEventListener('click', () => {
    closeDrawer();
    rerender();
  });

  clearFiltersBtn?.addEventListener('click', () => {
    state.filters = {
      ...state.filters,
      audience: 'all',
      category: 'all',
      condition: 'all',
      newOnly: false,
      letterSizes: [],
      waistSizes: []
    };
    renderAllFilterUIs(rerender);
    rerender();
  });

  rerender();
}

function setupSoldPage(items) {
  const grid = document.getElementById('sold-grid');
  if (!grid) return;
  const soldItems = sortItems(items.filter((item) => item.status === 'sold'), 'Newest');
  renderCards(soldItems, grid, { soldView: true });
}

function setupHome(items) {
  const arrivalsRoot = document.getElementById('arrivals-grid');
  if (!arrivalsRoot) return;
  const arrivals = sortItems(items.filter((item) => ['available', 'reserved'].includes(item.status)), 'Newest').slice(0, 8);
  renderCards(arrivals, arrivalsRoot);
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
      } else inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      cell = '';
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    cell += ch;
  }

  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((v) => v.trim() !== '')) rows.push(row);
  }

  if (inQuotes) throw new Error('CSV format error: unmatched quote.');
  return rows;
}

function csvRowsToItems(rows) {
  const requiredHeader = ['id', 'title', 'category', 'price', 'size', 'fitsLike', 'condition', 'status', 'notes', 'images', 'createdAt', 'featured', 'audience'];
  if (!rows.length) throw new Error('CSV format error: file is empty.');

  const header = rows[0].map((h) => h.trim());
  const ok = requiredHeader.length === header.length && requiredHeader.every((name, idx) => header[idx] === name);
  if (!ok) throw new Error(`CSV format error: header must be exactly ${requiredHeader.join(',')}`);

  return rows.slice(1).map((values, rowIndex) => {
    if (values.length !== requiredHeader.length) {
      throw new Error(`CSV format error: row ${rowIndex + 2} has ${values.length} columns; expected ${requiredHeader.length}.`);
    }

    const raw = Object.fromEntries(requiredHeader.map((key, idx) => [key, values[idx].trim()]));
    return {
      ...raw,
      category: normalizeCategory(raw.category),
      price: Number(raw.price),
      status: raw.status.toLowerCase(),
      images: raw.images ? raw.images.split('|').map((s) => s.trim()).filter(Boolean) : [],
      featured: raw.featured.toLowerCase() === 'true',
      audience: (raw.audience || '').toLowerCase()
    };
  });
}

async function loadItems() {
  const res = await fetch('data/items.csv');
  if (!res.ok) throw new Error('Could not load inventory CSV');
  return csvRowsToItems(parseCsv(await res.text()));
}

function showCopyFeedback(message) {
  const node = document.getElementById('cart-feedback');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  setTimeout(() => {
    node.textContent = '';
    node.classList.remove('show');
  }, 1500);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const temp = document.createElement('textarea');
  temp.value = value;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand('copy');
  temp.remove();
}

function applySharedCartFromQuery() {
  const incoming = new URLSearchParams(window.location.search).get('items');
  if (!incoming) return;
  setCartIds(incoming.split('|').map((id) => id.trim()).filter(Boolean));
}

function renderCartPage(items) {
  const cartList = document.getElementById('cart-list');
  if (!cartList) return;

  const ids = getCartIds();
  const cartItems = ids.map((id) => items.find((item) => item.id === id)).filter(Boolean);

  if (!cartItems.length) {
    cartList.innerHTML = '<p class="empty">Your cart is empty.</p>';
  } else {
    cartList.innerHTML = cartItems.map((item) => `
      <article class="cart-row">
        <img src="${safeImage(item.images[0])}" alt="${item.title}" onerror="this.onerror=null;this.src='${PLACEHOLDER_IMAGE}'" />
        <div>
          <h3>${item.title}</h3>
          <p class="meta">${formatPrice(item.price)} • ${sizeLine(item, { womensLabel: true })} • ${item.id}</p>
          <button type="button" class="copy-id-btn" data-remove-cart="${item.id}">Remove</button>
        </div>
      </article>
    `).join('');
  }

  const shareBtn = document.getElementById('share-cart-link');
  const clearBtn = document.getElementById('clear-cart');

  shareBtn?.addEventListener('click', async () => {
    const current = getCartIds();
    const base = `${window.location.origin}${window.location.pathname.replace(/[^/]+$/, 'cart.html')}`;
    await copyText(`${base}?items=${current.join('|')}`);
    showCopyFeedback('Share link copied');
  });

  clearBtn?.addEventListener('click', () => {
    if (!window.confirm('Clear all items from your cart?')) return;
    setCartIds([]);
    renderCartPage(items);
    showCopyFeedback('Cart cleared');
  });
}

(async function init() {
  updateCartCount();
  applySharedCartFromQuery();

  try {
    const items = await loadItems();
    validateItems(items);
    state.items = items;

    setupHome(items);
    setupCatalog(items);
    setupSoldPage(items);
    renderCartPage(items);
    buildModal(items);
  } catch (error) {
    console.error(error);
    document.querySelectorAll('#catalog-grid,#sold-grid,#arrivals-grid,#cart-list').forEach((root) => {
      if (root) root.innerHTML = '<p class="empty">Unable to load inventory right now.</p>';
    });
  }
})();
