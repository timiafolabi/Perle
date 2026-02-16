const IG_HANDLE = '@perlethriftedgoods';
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
  {
    key: 'new-arrivals',
    match: (item) => (item.status || '').toLowerCase() !== 'sold'
  },
  {
    key: 'tops',
    match: (item) => item.category === 'Tops'
  },
  {
    key: 'bottoms',
    match: (item) => item.category === 'Bottoms'
  },
  {
    key: 'outerwear',
    match: (item) => item.category === 'Outerwear'
  },
  {
    key: 'accessories',
    match: (item) => item.category === 'Accessories'
  },
  {
    key: 'under-40',
    match: (item) => Number(item.price) <= 40 || item.category === 'Under $40'
  }
];

const formatPrice = (price) => `$${Number(price).toFixed(0)}`;
const formatDate = (date) => new Date(date).toLocaleDateString(undefined, {
  year: 'numeric', month: 'short', day: 'numeric'
});

function statusBadge(status) {
  const value = (status || '').toLowerCase();
  return `<span class="badge ${value}">${value.toUpperCase()}</span>`;
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

function renderGrid(items, root, { interactive = true, showEmptyMessage = true } = {}) {
  if (!root) return;
  if (!items.length) {
    root.innerHTML = showEmptyMessage ? '<p class="empty">No items match your filters right now.</p>' : '';
    return;
  }

  root.innerHTML = items.map((item) => `
    <article class="card" ${interactive ? `data-id="${item.id}"` : ''}>
      <div class="card-media">
        <img src="${item.images?.[0] || ''}" alt="${item.title}" loading="lazy" />
      </div>
      <div class="card-body">
        <h3>${item.title}</h3>
        <div><span class="price">${formatPrice(item.price)}</span>${statusBadge(item.status)}</div>
        <p class="meta">Size ${item.size} • ${item.condition}</p>
        <p class="item-id">${item.id}</p>
      </div>
    </article>
  `).join('');
}

function buildModal(items) {
  const modal = document.getElementById('item-modal');
  const content = document.getElementById('modal-content');
  if (!modal || !content) return;

  function open(itemId) {
    const item = items.find((x) => x.id === itemId);
    if (!item) return;

    content.innerHTML = `
      <div class="modal-gallery">
        ${(item.images || []).map((src) => `<img src="${src}" alt="${item.title}" loading="lazy"/>`).join('')}
      </div>
      <h2>${item.title}</h2>
      <p class="item-id">Item ID: ${item.id}</p>
      <p><strong>${formatPrice(item.price)}</strong> • Size ${item.size} • Fits like ${item.fitsLike}</p>
      <p>${statusBadge(item.status)} <span class="meta">Condition: ${item.condition}</span></p>
      <p>${item.notes || 'No additional notes.'}</p>
      <p class="meta">Listed ${formatDate(item.createdAt)}</p>
      <p class="modal-callout">DM ${IG_HANDLE} with this Item ID to reserve: <strong>${item.id}</strong>.</p>
    `;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (e) => {
    const card = e.target.closest('.card[data-id]');
    if (card) open(card.dataset.id);

    if (e.target.matches('#modal-close') || e.target.matches('#item-modal')) {
      close();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
}

function setupCatalog(items) {
  const status = document.getElementById('status-filter');
  const size = document.getElementById('size-filter');
  const sort = document.getElementById('sort-filter');
  const search = document.getElementById('search-filter');

  if (!status || !size || !sort || !search) return;

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

      const sectionItems = sortItems(
        globallyFiltered.filter((item) => sectionConfig.match(item)),
        state.filters.sort
      );

      sectionEl.style.display = sectionItems.length ? '' : 'none';
      renderGrid(sectionItems, grid, { showEmptyMessage: false });
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

async function loadItems() {
  const res = await fetch('/data/items.json');
  if (!res.ok) throw new Error('Could not load inventory');
  return res.json();
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
