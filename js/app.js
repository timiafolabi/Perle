const IG_HANDLE = '@perlethriftedgoods';
const PLACEHOLDER_IMAGE = 'assets/items/placeholder.jpg';
const CART_KEY = 'ptg-cart';
const VALID_STATUSES = ['available', 'reserved', 'sold'];
const VALID_CONDITIONS = ['New', 'Very Good', 'Good', 'Fair'];
const VALID_CATEGORIES = ['Tops', 'Bottoms', 'Outerwear'];
const VALID_AUDIENCES = ['mens', 'womens', 'unisex'];

const REQUIRED_FIELDS = [
  'id', 'title', 'category', 'price', 'size', 'fitsLike', 'condition', 'status', 'notes', 'images', 'createdAt', 'featured', 'audience'
];

const state = {
  items: [],
  filters: {
    audience: 'all',
    category: 'all',
    condition: 'all',
    sort: 'Newest',
    search: '',
    newOnly: false
  }
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

    if (!VALID_STATUSES.includes(item.status)) {
      console.warn(`[inventory validation] Invalid status on ${label}: ${item.status}`);
    }

    if (!VALID_CONDITIONS.includes(item.condition)) {
      console.warn(`[inventory validation] Invalid condition on ${label}: ${item.condition}. Must be one of ${VALID_CONDITIONS.join(', ')}`);
    }

    if (!VALID_CATEGORIES.includes(item.category)) {
      console.warn(`[inventory validation] Invalid category on ${label}: ${item.category}. Must be one of ${VALID_CATEGORIES.join(', ')}`);
    }

    if (!VALID_AUDIENCES.includes(item.audience)) {
      console.warn(`[inventory validation] Invalid audience on ${label}: ${item.audience}. Must be mens/womens/unisex`);
    }

    if (typeof item.price !== 'number' || Number.isNaN(item.price)) {
      console.warn(`[inventory validation] Price must be numeric on ${label}`);
    }

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

function applyCatalogFilters(items) {
  const search = state.filters.search.trim().toLowerCase();

  return items.filter((item) => {
    if (!['available', 'reserved'].includes(item.status)) return false;
    if (state.filters.audience !== 'all' && item.audience !== state.filters.audience) return false;
    if (state.filters.category !== 'all' && item.category !== state.filters.category) return false;
    if (state.filters.condition !== 'all' && item.condition !== state.filters.condition) return false;
    if (state.filters.newOnly && !isNewArrival(item)) return false;

    if (search) {
      const hay = `${item.title} ${item.notes}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }

    return true;
  });
}

function sizeLine(item, { womensLabel = false } = {}) {
  if (womensLabel && item.audience === 'womens') {
    return `Women's size ${item.size} • Fits like ${item.fitsLike}`;
  }
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

  const open = (itemId) => {
    const item = items.find((x) => x.id === itemId);
    if (!item) return;
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
    if (copyBtn && modal.classList.contains('open')) {
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

function renderFilterChips(rootId, options, current, onSelect) {
  const root = document.getElementById(rootId);
  if (!root) return;
  root.innerHTML = options.map((opt) => `
    <button class="chip ${current === opt.value ? 'active' : ''}" type="button" data-chip-value="${opt.value}">${opt.label}</button>
  `).join('');
  root.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => onSelect(chip.dataset.chipValue));
  });
}

function setupCatalog(items) {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  const sort = document.getElementById('sort-filter');
  const search = document.getElementById('search-filter');
  const newOnly = document.getElementById('new-arrivals-only');

  const rerender = () => {
    renderFilterChips('audience-tabs', [
      { label: 'All', value: 'all' },
      { label: "Men's", value: 'mens' },
      { label: "Women’s", value: 'womens' },
      { label: 'Unisex', value: 'unisex' }
    ], state.filters.audience, (value) => {
      state.filters.audience = value;
      rerender();
    });

    renderFilterChips('category-chips', [
      { label: 'All Categories', value: 'all' },
      { label: 'Tops', value: 'Tops' },
      { label: 'Bottoms', value: 'Bottoms' },
      { label: 'Outerwear', value: 'Outerwear' }
    ], state.filters.category, (value) => {
      state.filters.category = value;
      rerender();
    });

    renderFilterChips('condition-chips', [
      { label: 'All Conditions', value: 'all' },
      ...VALID_CONDITIONS.map((condition) => ({ label: condition, value: condition }))
    ], state.filters.condition, (value) => {
      state.filters.condition = value;
      rerender();
    });

    const filtered = applyCatalogFilters(items);
    const sorted = sortItems(filtered, state.filters.sort);
    renderCards(sorted, grid);
  };

  sort?.addEventListener('change', () => {
    state.filters.sort = sort.value;
    rerender();
  });

  search?.addEventListener('input', () => {
    state.filters.search = search.value || '';
    rerender();
  });

  newOnly?.addEventListener('change', () => {
    state.filters.newOnly = newOnly.checked;
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

  const arrivals = sortItems(items.filter((item) => item.status !== 'sold'), 'Newest').slice(0, 8);
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
    const normalizedCategory = normalizeCategory(raw.category);

    return {
      ...raw,
      category: normalizedCategory,
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
  const rows = parseCsv(await res.text());
  return csvRowsToItems(rows);
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
  const params = new URLSearchParams(window.location.search);
  const incoming = params.get('items');
  if (!incoming) return;
  const ids = incoming.split('|').map((id) => id.trim()).filter(Boolean);
  setCartIds(ids);
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
    const url = `${window.location.origin}${window.location.pathname.replace('cart.html', 'cart.html')}?items=${current.join('|')}`;
    await copyText(url);
    showCopyFeedback('Share link copied');
  });

  clearBtn?.addEventListener('click', () => {
    const ok = window.confirm('Clear all items from your cart?');
    if (!ok) return;
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
