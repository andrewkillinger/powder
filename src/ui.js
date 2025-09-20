const STYLE_ID = 'powder-ui-style';
const TOOLBAR_ID = 'powder-toolbar';
const MENU_ID = 'powder-element-menu';
const SLOT_MENU_ID = 'powder-slot-menu';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${TOOLBAR_ID} {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: rgba(10, 15, 26, 0.92);
      color: #f5f7ff;
      z-index: 1000;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(14px);
    }

    #${TOOLBAR_ID} button,
    #${TOOLBAR_ID} label,
    #${TOOLBAR_ID} input {
      font-family: inherit;
    }

    #${TOOLBAR_ID} button {
      min-height: 44px;
      border-radius: 12px;
      border: none;
      background: rgba(34, 43, 67, 0.82);
      color: inherit;
      padding: 0 1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease;
      touch-action: manipulation;
    }

    #${TOOLBAR_ID} button:active {
      transform: scale(0.97);
    }

    #${TOOLBAR_ID} button.active {
      background: rgba(88, 108, 255, 0.95);
      color: #fff;
    }

    #${TOOLBAR_ID} .element-pill {
      min-height: 48px;
      padding: 0.35rem 1rem;
      border-radius: 999px;
      background: rgba(88, 108, 255, 0.22);
      border: 1px solid rgba(120, 140, 255, 0.35);
      color: #e1e5ff;
      font-weight: 600;
      gap: 0.6rem;
      flex-shrink: 0;
    }

    #${TOOLBAR_ID} .element-pill:hover {
      background: rgba(88, 108, 255, 0.32);
    }

    #${TOOLBAR_ID} .element-pill-icon {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.4);
      background: rgba(150, 160, 220, 0.65);
      box-shadow: 0 0 0 2px rgba(17, 24, 43, 0.6);
    }

    #${TOOLBAR_ID} .element-pill-prefix {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0.75;
    }

    #${TOOLBAR_ID} .element-pill-label {
      font-size: 0.95rem;
    }

    #${TOOLBAR_ID} input[type='range'] {
      width: 140px;
      accent-color: #6d86ff;
    }

    #${TOOLBAR_ID} label {
      color: #d0d5f8;
      font-size: 0.9rem;
    }

    #${TOOLBAR_ID} .zoom-controls {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }

    #${TOOLBAR_ID} .zoom-controls button {
      min-width: 56px;
      font-weight: 600;
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID} {
      flex: 1 0 100%;
      display: none;
      flex-direction: column;
      gap: 0.75rem;
      background: rgba(18, 26, 44, 0.92);
      border-radius: 16px;
      padding: 0.75rem;
      border: 1px solid rgba(56, 70, 110, 0.7);
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID}[data-open='true'] {
      display: flex;
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID} .slot-menu-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID} .slot-menu-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID} .slot-menu-close {
      border: none;
      border-radius: 999px;
      padding: 0.35rem 0.75rem;
      background: rgba(34, 43, 67, 0.85);
      color: inherit;
      cursor: pointer;
      min-height: 36px;
      touch-action: manipulation;
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID} .slot-menu-close:hover {
      background: rgba(88, 108, 255, 0.32);
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID} .slot-menu-subtitle {
      margin: 0;
      font-size: 0.8rem;
      opacity: 0.75;
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID} .slot-menu-empty {
      margin: 0;
      font-size: 0.85rem;
      opacity: 0.7;
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID} .slot-menu-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID} .slot-menu-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: 12px;
      border: 1px solid rgba(60, 72, 112, 0.6);
      padding: 0.65rem 0.75rem;
      background: rgba(30, 38, 62, 0.82);
      color: inherit;
      cursor: pointer;
      transition: background 0.2s ease, border 0.2s ease, transform 0.2s ease;
      text-align: left;
      touch-action: manipulation;
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID} .slot-menu-item:hover:not(:disabled) {
      background: rgba(88, 108, 255, 0.22);
      border-color: rgba(150, 168, 255, 0.55);
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID} .slot-menu-item:active:not(:disabled) {
      transform: scale(0.98);
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID} .slot-menu-item:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID} .slot-menu-item-label {
      font-weight: 600;
    }

    #${TOOLBAR_ID} #${SLOT_MENU_ID} .slot-menu-item-meta {
      font-size: 0.75rem;
      opacity: 0.75;
      margin-left: 1rem;
    }

    #${MENU_ID} {
      position: fixed;
      inset: 0;
      display: none;
      align-items: flex-end;
      justify-content: center;
      padding: 1rem;
      background: rgba(5, 8, 14, 0.55);
      backdrop-filter: blur(8px);
      z-index: 1100;
    }

    #${MENU_ID}[data-open='true'] {
      display: flex;
    }

    #${MENU_ID} .panel {
      background: rgba(16, 23, 38, 0.96);
      color: #f5f7ff;
      border-radius: 22px 22px 16px 16px;
      padding: 1rem 1.25rem 1.25rem;
      width: min(520px, 100%);
      max-height: min(640px, calc(100vh - 2rem));
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
      overflow: hidden;
    }

    #${MENU_ID} .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    #${MENU_ID} .panel-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    #${MENU_ID} .close-button {
      border: none;
      border-radius: 999px;
      padding: 0.5rem 1rem;
      background: rgba(34, 43, 67, 0.85);
      color: inherit;
      font-weight: 600;
      cursor: pointer;
      min-height: 44px;
      touch-action: manipulation;
    }

    #${MENU_ID} .close-button:hover {
      background: rgba(88, 108, 255, 0.3);
    }

    #${MENU_ID} .category-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow-x: auto;
      padding: 0.25rem 0.25rem 0.25rem 0.25rem;
      margin: 0 -0.25rem;
      scrollbar-width: none;
    }

    #${MENU_ID} .category-bar::-webkit-scrollbar {
      display: none;
    }

    #${MENU_ID} .category-chip {
      flex: 0 0 auto;
      min-height: 48px;
      padding: 0.35rem 1.1rem;
      border-radius: 999px;
      border: 1px solid transparent;
      background: rgba(34, 43, 67, 0.75);
      color: inherit;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease, border 0.2s ease, transform 0.2s ease;
      touch-action: manipulation;
    }

    #${MENU_ID} .category-chip:active {
      transform: scale(0.96);
    }

    #${MENU_ID} .category-chip[aria-selected='true'] {
      background: rgba(88, 108, 255, 0.95);
      border-color: rgba(150, 168, 255, 0.9);
      color: #fff;
    }

    #${MENU_ID} .search-row {
      display: flex;
      align-items: center;
      background: rgba(23, 32, 52, 0.95);
      border-radius: 14px;
      padding: 0.25rem 0.75rem;
      box-shadow: inset 0 0 0 1px rgba(40, 56, 92, 0.65);
    }

    #${MENU_ID} .search-row:focus-within {
      box-shadow: 0 0 0 2px rgba(150, 168, 255, 0.55);
    }

    #${MENU_ID} .search-input {
      flex: 1;
      background: transparent;
      border: none;
      color: inherit;
      font-size: 1rem;
      min-height: 44px;
      padding: 0;
      outline: none;
    }

    #${MENU_ID} .search-input::placeholder {
      color: rgba(213, 222, 255, 0.6);
    }

    #${MENU_ID} .element-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 0.75rem;
      overflow-y: auto;
      padding-right: 0.25rem;
      margin-right: -0.25rem;
      flex: 1;
    }

    @media (orientation: landscape) {
      #${MENU_ID} .element-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      }
    }

    #${MENU_ID} .element-option {
      border: 1px solid rgba(60, 72, 112, 0.75);
      border-radius: 16px;
      background: rgba(24, 33, 52, 0.88);
      color: inherit;
      min-height: 86px;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-weight: 600;
      transition: background 0.2s ease, border 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
      cursor: pointer;
      touch-action: manipulation;
      position: relative;
      overflow: hidden;
    }

    #${MENU_ID} .element-option:active {
      transform: scale(0.97);
    }

    #${MENU_ID} .element-option.selected {
      border-color: rgba(150, 168, 255, 0.95);
      background: rgba(88, 108, 255, 0.25);
      box-shadow: inset 0 0 0 1px rgba(150, 168, 255, 0.6);
    }

    #${MENU_ID} .element-option-swatch {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(12, 18, 30, 0.65);
      background: rgba(180, 190, 220, 0.4);
    }

    #${MENU_ID} .element-option-label {
      display: block;
      text-align: center;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.95rem;
    }

    #${MENU_ID} .element-option-badge {
      position: absolute;
      top: 6px;
      right: 8px;
      padding: 0.15rem 0.45rem;
      border-radius: 999px;
      background: rgba(255, 92, 92, 0.9);
      color: #fff;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      pointer-events: none;
    }

    #${MENU_ID} .element-option[data-wip='true'] {
      opacity: 0.55;
      cursor: not-allowed;
    }

    #${MENU_ID} .element-option::after {
      content: '';
      position: absolute;
      left: 8px;
      right: 8px;
      bottom: 8px;
      padding: 0.3rem 0.5rem;
      border-radius: 8px;
      background: rgba(18, 24, 40, 0.95);
      color: #fff;
      font-size: 0.7rem;
      letter-spacing: 0.03em;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
      text-align: center;
    }

    #${MENU_ID} .element-option[data-tooltip-visible='true']::after {
      content: attr(data-tooltip);
      opacity: 1;
      transform: translateY(0);
    }

    #${MENU_ID} [hidden] {
      display: none !important;
    }
  `;

  document.head.appendChild(style);
}

function createElementModal({
  materials = [],
  categories = [],
  getCurrentId = () => null,
  onSelect,
  onOpen,
  onClose,
}) {
  const modal = document.createElement('div');
  modal.id = MENU_ID;
  modal.dataset.open = 'false';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-hidden', 'true');
  modal.tabIndex = -1;

  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.setAttribute('role', 'document');

  const title = document.createElement('h2');
  title.className = 'panel-title';
  title.id = `${MENU_ID}-title`;
  title.textContent = 'Choose material';
  panel.setAttribute('aria-labelledby', title.id);

  const header = document.createElement('div');
  header.className = 'panel-header';
  header.appendChild(title);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'close-button';
  closeButton.textContent = 'Close';
  closeButton.setAttribute('aria-label', 'Close material picker');
  header.appendChild(closeButton);

  const categoryBar = document.createElement('div');
  categoryBar.className = 'category-bar';
  categoryBar.setAttribute('role', 'tablist');

  const searchRow = document.createElement('div');
  searchRow.className = 'search-row';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'search-input';
  searchInput.placeholder = 'Search materials';
  searchInput.setAttribute('aria-label', 'Search materials');
  searchInput.autocomplete = 'off';
  searchInput.autocapitalize = 'none';
  searchInput.spellcheck = false;
  searchRow.appendChild(searchInput);

  const grid = document.createElement('div');
  grid.className = 'element-grid';
  grid.setAttribute('role', 'listbox');

  panel.append(header, categoryBar, searchRow, grid);
  modal.appendChild(panel);

  const tooltipTimers = new Map();
  const categoryButtons = new Map();
  const buttonMap = new Map();
  const categoryOrder = categories.map((cat) => cat.key);

  const availableMaterials = materials.filter(Boolean).slice();
  availableMaterials.sort((a, b) => {
    const aKey = a.cat || a.category || '';
    const bKey = b.cat || b.category || '';
    const ai = categoryOrder.indexOf(aKey);
    const bi = categoryOrder.indexOf(bKey);
    if (ai !== bi) {
      return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) -
        (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
    }
    return (a.id ?? 0) - (b.id ?? 0);
  });

  const fallbackCategory = categoryOrder[0] ?? null;
  let activeCategory = fallbackCategory;
  let searchQuery = '';
  let selectedId = getCurrentId();
  let lastFocused = null;
  let isOpen = false;
  let searchDebounce = null;

  function colorToCss(color) {
    if (!Array.isArray(color)) {
      return 'rgba(255, 255, 255, 0.6)';
    }
    const [r = 255, g = 255, b = 255, a = 255] = color;
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(255, a)) / 255})`;
  }

  function showTooltip(button) {
    if (!button) {
      return;
    }
    button.dataset.tooltipVisible = 'true';
    if (tooltipTimers.has(button)) {
      clearTimeout(tooltipTimers.get(button));
    }
    const timer = setTimeout(() => {
      button.dataset.tooltipVisible = 'false';
      tooltipTimers.delete(button);
    }, 1400);
    tooltipTimers.set(button, timer);
  }

  function matchesQuery(material, query) {
    if (!query) {
      return true;
    }
    const name = String(material.name ?? '').toLowerCase();
    const idText = String(material.id ?? '');
    return name.includes(query) || idText.includes(query);
  }

  function renderButtons() {
    availableMaterials.forEach((material) => {
      if (buttonMap.has(material.id)) {
        return;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'element-option';
      button.dataset.materialId = String(material.id);
      button.dataset.category = material.cat || material.category || '';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', 'false');

      const swatch = document.createElement('span');
      swatch.className = 'element-option-swatch';
      swatch.style.backgroundColor = colorToCss(material.color);

      const name = document.createElement('span');
      name.className = 'element-option-label';
      name.textContent = material.name ?? `Material ${material.id}`;

      button.append(swatch, name);

      if (!material.implemented) {
        const badge = document.createElement('span');
        badge.className = 'element-option-badge';
        badge.textContent = material.ui?.badge || 'WIP';
        button.dataset.wip = 'true';
        button.dataset.tooltip = 'Coming soon';
        button.setAttribute('aria-disabled', 'true');
        button.appendChild(badge);
      }

      button.addEventListener('click', (event) => {
        event.preventDefault();
        if (!material.implemented) {
          showTooltip(button);
          return;
        }
        if (typeof onSelect === 'function') {
          onSelect(material.id);
        }
        updateSelection(material.id);
        close();
      });

      buttonMap.set(material.id, { button, material });
      grid.appendChild(button);
    });
  }

  function applyFilters() {
    const query = searchQuery.trim().toLowerCase();
    const usingQuery = query.length > 0;
    buttonMap.forEach(({ button, material }) => {
      const cat = material.cat || material.category || '';
      let visible = true;
      if (usingQuery) {
        visible = matchesQuery(material, query);
      } else if (activeCategory) {
        visible = cat === activeCategory;
      }
      button.hidden = !visible;
    });
  }

  function updateSelection(id) {
    selectedId = id;
    buttonMap.forEach(({ button, material }) => {
      const selected = material.id === id;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  function syncCategory(categoryKey, { user = false } = {}) {
    let next = categoryKey;
    if (!next || !categoryButtons.has(next)) {
      next = fallbackCategory;
    }
    if (activeCategory !== next) {
      activeCategory = next;
      applyFilters();
    }
    categoryButtons.forEach((button, key) => {
      const selected = key === activeCategory;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      if (selected && user) {
        button.scrollIntoView({ block: 'nearest', inline: 'center' });
      }
    });
  }

  categories.forEach((category) => {
    const hasAny = availableMaterials.some((material) => (material.cat || material.category) === category.key);
    if (!hasAny) {
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'category-chip';
    button.textContent = category.label;
    button.dataset.category = category.key;
    button.setAttribute('role', 'tab');
    button.addEventListener('click', () => {
      syncCategory(category.key, { user: true });
    });
    categoryButtons.set(category.key, button);
    categoryBar.appendChild(button);
  });

  function open(focusTarget) {
    if (isOpen) {
      return;
    }
    isOpen = true;
    modal.dataset.open = 'true';
    modal.setAttribute('aria-hidden', 'false');
    lastFocused = focusTarget || document.activeElement;
    document.body.style.overflow = 'hidden';
    modal.focus({ preventScroll: true });
    if (typeof onOpen === 'function') {
      onOpen();
    }
    requestAnimationFrame(() => {
      searchInput.focus({ preventScroll: true });
      searchInput.select();
    });
  }

  function close({ returnFocus = true } = {}) {
    if (!isOpen) {
      return;
    }
    isOpen = false;
    modal.dataset.open = 'false';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (typeof onClose === 'function') {
      onClose();
    }
    if (returnFocus && lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
    lastFocused = null;
  }

  closeButton.addEventListener('click', () => close());
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      close();
    }
  });
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  });

  searchInput.addEventListener('input', (event) => {
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }
    const value = String(event.target.value ?? '');
    searchDebounce = setTimeout(() => {
      searchQuery = value;
      applyFilters();
    }, 80);
  });

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const firstVisible = availableMaterials.find((material) => {
        const entry = buttonMap.get(material.id);
        return entry && !entry.button.hidden;
      });
      if (firstVisible) {
        buttonMap.get(firstVisible.id)?.button.focus({ preventScroll: true });
      }
    }
  });

  modal.addEventListener('focusin', (event) => {
    if (!modal.contains(event.target)) {
      modal.focus({ preventScroll: true });
    }
  });

  renderButtons();
  syncCategory(activeCategory);
  applyFilters();
  updateSelection(selectedId);

  document.body.appendChild(modal);

  return {
    element: modal,
    open,
    close,
    isOpen() {
      return isOpen;
    },
    updateSelection(id) {
      updateSelection(id);
    },
    setActiveCategory(categoryKey) {
      syncCategory(categoryKey, { user: false });
      applyFilters();
    },
    destroy() {
      tooltipTimers.forEach((timer) => clearTimeout(timer));
      tooltipTimers.clear();
      if (modal.parentElement) {
        modal.parentElement.removeChild(modal);
      }
    },
  };
}


export function initUI({
  Game,
  materials,
  categories,
  onPauseToggle,
  onClear,
  onBrushChange,
  onZoomChange,
  onElementOpen,
  onEraserToggle,
  getSlots,
  onSaveSlot,
  onLoadSlot,
  formatSlotTimestamp,
  formatSlotSize,
}) {
  if (!Game) {
    throw new Error('initUI requires a Game reference.');
  }

  injectStyles();

  const readSlots = typeof getSlots === 'function' ? getSlots : () => [];
  const saveSlotHandler = typeof onSaveSlot === 'function' ? onSaveSlot : null;
  const loadSlotHandler = typeof onLoadSlot === 'function' ? onLoadSlot : null;
  const formatTimestampFn =
    typeof formatSlotTimestamp === 'function'
      ? formatSlotTimestamp
      : (value) => {
          if (!value) {
            return 'Empty';
          }
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) {
            return 'Unknown';
          }
          return date.toLocaleString();
        };
  const formatSizeFn =
    typeof formatSlotSize === 'function'
      ? formatSlotSize
      : (bytes) => {
          if (!Number.isFinite(bytes) || bytes <= 0) {
            return '';
          }
          if (bytes < 1024) {
            return `${bytes} B`;
          }
          if (bytes < 1024 * 1024) {
            return `${Math.round((bytes / 1024) * 10) / 10} KB`;
          }
          const mb = bytes / (1024 * 1024);
          return `${Math.round(mb * 100) / 100} MB`;
        };

  const toolbar = document.createElement('div');
  toolbar.id = TOOLBAR_ID;
  toolbar.dataset.uiToolbar = 'true';
  toolbar.setAttribute('role', 'toolbar');

  const elementButton = document.createElement('button');
  elementButton.type = 'button';
  elementButton.classList.add('element-pill');
  elementButton.setAttribute('aria-haspopup', 'dialog');
  elementButton.setAttribute('aria-expanded', 'false');

  const elementIcon = document.createElement('span');
  elementIcon.className = 'element-pill-icon';
  elementIcon.textContent = '';
  elementIcon.style.backgroundColor = 'rgba(150, 160, 220, 0.85)';

  const elementPrefix = document.createElement('span');
  elementPrefix.className = 'element-pill-prefix';
  elementPrefix.textContent = 'Element';

  const elementLabel = document.createElement('span');
  elementLabel.className = 'element-pill-label';
  elementLabel.textContent = 'Tap to choose';

  elementButton.append(elementIcon, elementPrefix, elementLabel);
  elementButton.setAttribute('aria-label', 'Choose element');
  elementButton.title = 'Choose element';

  const pauseButton = document.createElement('button');
  pauseButton.type = 'button';
  pauseButton.textContent = 'Pause';

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.textContent = 'Clear';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Save';
  saveButton.setAttribute('aria-haspopup', 'listbox');
  saveButton.setAttribute('aria-expanded', 'false');
  saveButton.setAttribute('aria-controls', SLOT_MENU_ID);
  saveButton.title = 'Save the current scene';

  const loadButton = document.createElement('button');
  loadButton.type = 'button';
  loadButton.textContent = 'Load';
  loadButton.setAttribute('aria-haspopup', 'listbox');
  loadButton.setAttribute('aria-expanded', 'false');
  loadButton.setAttribute('aria-controls', SLOT_MENU_ID);
  loadButton.title = 'Load a saved scene';

  const brushLabel = document.createElement('label');
  brushLabel.textContent = 'Brush';
  brushLabel.style.display = 'inline-flex';
  brushLabel.style.alignItems = 'center';
  brushLabel.style.gap = '0.5rem';

  const brushInput = document.createElement('input');
  brushInput.type = 'range';
  brushInput.min = '1';
  brushInput.max = '20';
  brushInput.value = String(Game.state.brushSize || 4);

  const brushValue = document.createElement('span');
  brushValue.textContent = brushInput.value;

  brushLabel.append(brushInput, brushValue);

  const zoomControls = document.createElement('div');
  zoomControls.className = 'zoom-controls';
  zoomControls.setAttribute('role', 'group');
  zoomControls.setAttribute('aria-label', 'Zoom level');
  const zoomButtons = [];
  [1, 2, 4].forEach((level) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${level}x`;
    button.dataset.zoomLevel = String(level);
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', `Set zoom to ${level}x`);
    button.addEventListener('click', () => {
      if (typeof onZoomChange === 'function') {
        onZoomChange(level);
      }
    });
    zoomControls.appendChild(button);
    zoomButtons.push({ level, button });
  });

  const eraserButton = document.createElement('button');
  eraserButton.type = 'button';
  eraserButton.textContent = 'Eraser';

  const slotMenu = document.createElement('div');
  slotMenu.id = SLOT_MENU_ID;
  slotMenu.className = 'slot-menu';
  slotMenu.dataset.open = 'false';
  slotMenu.dataset.mode = '';
  slotMenu.setAttribute('aria-hidden', 'true');
  slotMenu.setAttribute('role', 'region');
  slotMenu.tabIndex = -1;

  const slotHeader = document.createElement('div');
  slotHeader.className = 'slot-menu-header';

  const slotTitle = document.createElement('h3');
  slotTitle.className = 'slot-menu-title';
  slotTitle.textContent = 'Save slots';
  slotTitle.id = `${SLOT_MENU_ID}-title`;

  const slotClose = document.createElement('button');
  slotClose.type = 'button';
  slotClose.className = 'slot-menu-close';
  slotClose.textContent = 'Close';
  slotClose.setAttribute('aria-label', 'Close save and load menu');

  slotHeader.append(slotTitle, slotClose);

  const slotSubtitle = document.createElement('p');
  slotSubtitle.className = 'slot-menu-subtitle';
  slotSubtitle.textContent = 'Choose a slot to save the current scene.';

  const slotStatus = document.createElement('p');
  slotStatus.className = 'slot-menu-empty';
  slotStatus.hidden = true;

  const slotList = document.createElement('div');
  slotList.className = 'slot-menu-list';
  slotList.setAttribute('role', 'listbox');

  slotMenu.setAttribute('aria-labelledby', slotTitle.id);
  slotList.setAttribute('aria-labelledby', slotTitle.id);

  slotMenu.append(slotHeader, slotSubtitle, slotStatus, slotList);

  let slotMode = null;

  function syncSlotButtonStates() {
    const isOpen = slotMenu.dataset.open === 'true';
    const activeMode = isOpen ? slotMode : null;
    const saveActive = activeMode === 'save';
    const loadActive = activeMode === 'load';
    saveButton.classList.toggle('active', saveActive);
    loadButton.classList.toggle('active', loadActive);
    saveButton.setAttribute('aria-expanded', saveActive ? 'true' : 'false');
    loadButton.setAttribute('aria-expanded', loadActive ? 'true' : 'false');
  }

  function renderSlots() {
    let slots = [];
    try {
      const result = readSlots();
      if (Array.isArray(result)) {
        slots = result;
      } else if (result && typeof result[Symbol.iterator] === 'function') {
        slots = Array.from(result);
      }
    } catch (error) {
      console.warn('Failed to read save slots:', error);
      slots = [];
    }

    const storageAvailable = slots.some((slot) => slot?.storageAvailable !== false);
    const hasLoadable = slots.some(
      (slot) => slot?.storageAvailable !== false && slot?.hasData && !slot?.corrupt,
    );

    saveButton.disabled = !storageAvailable;
    loadButton.disabled = !storageAvailable || !hasLoadable;

    if (slotMenu.dataset.open !== 'true') {
      return;
    }

    slotList.textContent = '';

    if (!storageAvailable) {
      slotStatus.hidden = false;
      slotStatus.textContent = 'Storage is unavailable in this browser.';
      return;
    }

    slotStatus.hidden = true;

    let added = 0;
    slots.forEach((slot) => {
      if (!slot || typeof slot !== 'object') {
        return;
      }
      const canSave = slot.storageAvailable !== false;
      const canLoad = canSave && slot.hasData && !slot.corrupt;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'slot-menu-item';
      item.dataset.slotId = String(slot.id ?? '');
      item.setAttribute('role', 'option');
      const label = document.createElement('span');
      label.className = 'slot-menu-item-label';
      label.textContent = slot.name ?? `Slot ${added + 1}`;
      const meta = document.createElement('span');
      meta.className = 'slot-menu-item-meta';
      let metaText = '';
      if (slot.storageAvailable === false) {
        metaText = 'Unavailable';
      } else if (slot.corrupt) {
        metaText = 'Corrupted';
      } else if (!slot.hasData) {
        metaText = 'Empty';
      } else {
        metaText = formatTimestampFn(slot.savedAt);
      }
      const sizeText = slot.hasData && !slot.corrupt ? formatSizeFn(slot.bytes) : '';
      if (sizeText) {
        metaText = metaText ? `${metaText} • ${sizeText}` : sizeText;
      }
      meta.textContent = metaText;
      item.append(label, meta);

      if ((slotMode === 'save' && !canSave) || (slotMode === 'load' && !canLoad)) {
        item.disabled = true;
      }

      item.addEventListener('click', () => {
        handleSlotAction(slot, { canSave, canLoad });
      });

      slotList.appendChild(item);
      added += 1;
    });

    if (added === 0) {
      slotStatus.hidden = false;
      slotStatus.textContent = slotMode === 'save' ? 'No slots available.' : 'No saved scenes yet.';
    } else {
      slotStatus.hidden = true;
    }
  }

  function openSlotMenu(mode) {
    if (!mode) {
      return;
    }
    if (slotMenu.dataset.open === 'true' && slotMode === mode) {
      closeSlotMenu();
      return;
    }
    slotMode = mode;
    slotMenu.dataset.mode = mode;
    slotMenu.dataset.open = 'true';
    slotMenu.setAttribute('aria-hidden', 'false');
    if (mode === 'save') {
      slotTitle.textContent = 'Save scene';
      slotSubtitle.textContent = 'Choose a slot to save the current scene. Existing data will be replaced.';
    } else {
      slotTitle.textContent = 'Load scene';
      slotSubtitle.textContent = 'Choose a slot to load. Current scene will be replaced.';
    }
    syncSlotButtonStates();
    renderSlots();
    slotMenu.focus();
  }

  function closeSlotMenu({ focusButton = false } = {}) {
    const previous = slotMode;
    slotMenu.dataset.open = 'false';
    slotMenu.dataset.mode = '';
    slotMenu.setAttribute('aria-hidden', 'true');
    slotMode = null;
    syncSlotButtonStates();
    if (focusButton) {
      if (previous === 'save') {
        saveButton.focus();
      } else if (previous === 'load') {
        loadButton.focus();
      }
    }
  }

  function handleSlotAction(slot, { canSave, canLoad }) {
    if (slotMode === 'save') {
      if (!canSave || !saveSlotHandler) {
        return;
      }
      const shouldConfirm = slot.hasData && !slot.corrupt;
      if (shouldConfirm) {
        const confirmed = window.confirm(
          `Overwrite ${slot.name ?? 'this slot'}? This cannot be undone.`,
        );
        if (!confirmed) {
          return;
        }
      }
      let outcome;
      try {
        outcome = saveSlotHandler(slot.id ?? slot.name ?? '');
      } catch (error) {
        console.error('Save slot handler error:', error);
        return;
      }
      Promise.resolve(outcome)
        .then((result) => {
          if (!result || result.ok) {
            closeSlotMenu();
          }
        })
        .catch((error) => {
          console.error('Save slot error:', error);
        })
        .finally(() => {
          renderSlots();
        });
    } else if (slotMode === 'load') {
      if (!canLoad || !loadSlotHandler) {
        return;
      }
      const confirmed = window.confirm('Load this slot? The current scene will be replaced.');
      if (!confirmed) {
        return;
      }
      let outcome;
      try {
        outcome = loadSlotHandler(slot.id ?? slot.name ?? '');
      } catch (error) {
        console.error('Load slot handler error:', error);
        return;
      }
      Promise.resolve(outcome)
        .then((result) => {
          if (result && result.ok) {
            closeSlotMenu();
          }
        })
        .catch((error) => {
          console.error('Load slot error:', error);
        })
        .finally(() => {
          renderSlots();
        });
    }
  }

  saveButton.addEventListener('click', () => {
    openSlotMenu('save');
  });

  loadButton.addEventListener('click', () => {
    openSlotMenu('load');
  });

  slotClose.addEventListener('click', () => {
    closeSlotMenu({ focusButton: true });
  });

  slotMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeSlotMenu({ focusButton: true });
    }
  });

  const handleDocumentClick = (event) => {
    if (slotMenu.dataset.open !== 'true') {
      return;
    }
    const path = event.composedPath ? event.composedPath() : [];
    if (path.includes(slotMenu) || path.includes(saveButton) || path.includes(loadButton)) {
      return;
    }
    closeSlotMenu();
  };

  document.addEventListener('click', handleDocumentClick);

  syncSlotButtonStates();

  toolbar.append(
    elementButton,
    pauseButton,
    clearButton,
    saveButton,
    loadButton,
    brushLabel,
    zoomControls,
    eraserButton,
    slotMenu,
  );
  document.body.appendChild(toolbar);

  const materialEntries = Object.values(materials || {}).filter(Boolean);
  const categoryList = Array.isArray(categories) ? categories : [];
  const elementMap = new Map();
  materialEntries.forEach((item) => {
    if (item && typeof item.id === 'number') {
      elementMap.set(item.id, item);
    }
  });

  function colorToCss(color) {
    if (!Array.isArray(color)) {
      return 'rgba(150, 160, 220, 0.85)';
    }
    const [r = 255, g = 255, b = 255, a = 255] = color;
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(255, a)) / 255})`;
  }

  const elementPicker = createElementModal({
    materials: materialEntries,
    categories: categoryList,
    getCurrentId: () => Game.state.currentElementId,
    onSelect: (id) => {
      if (typeof onElementOpen === 'function') {
        onElementOpen(id);
      }
    },
    onOpen: () => {
      elementButton.setAttribute('aria-expanded', 'true');
    },
    onClose: () => {
      elementButton.setAttribute('aria-expanded', 'false');
    },
  });

  elementButton.addEventListener('click', () => {
    if (elementPicker.isOpen()) {
      elementPicker.close();
    } else {
      elementPicker.open(elementButton);
    }
  });

  pauseButton.addEventListener('click', () => {
    if (typeof onPauseToggle === 'function') {
      onPauseToggle();
    }
  });

  clearButton.addEventListener('click', () => {
    if (typeof onClear === 'function') {
      onClear();
    }
  });

  eraserButton.addEventListener('click', () => {
    if (typeof onEraserToggle === 'function') {
      onEraserToggle();
    }
  });

  brushInput.addEventListener('input', (event) => {
    const value = Number(event.target.value);
    brushValue.textContent = String(value);
    if (typeof onBrushChange === 'function') {
      onBrushChange(value);
    }
  });

  function update(state) {
    const element = elementMap.get(state.currentElementId);
    if (element) {
      const label = element.name ?? `Element ${element.id}`;
      elementIcon.style.backgroundColor = colorToCss(element.color);
      elementLabel.textContent = label;
      elementButton.dataset.elementId = String(element.id);
      elementButton.setAttribute('aria-label', `Choose element (current: ${label})`);
      elementButton.title = `Choose element (current: ${label})`;
      if (element?.cat || element?.category) {
        elementPicker.setActiveCategory(element.cat || element.category);
      }
    } else {
      elementIcon.style.backgroundColor = colorToCss(null);
      elementLabel.textContent = 'Element';
      elementButton.removeAttribute('data-element-id');
      elementButton.setAttribute('aria-label', 'Choose element');
      elementButton.title = 'Choose element';
    }

    const zoomLevel = Number(state.zoom);
    zoomButtons.forEach(({ level, button }) => {
      const active = Number.isFinite(zoomLevel) && Math.abs(zoomLevel - level) < 0.05;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    elementPicker.updateSelection(state.currentElementId);
    pauseButton.classList.toggle('active', Boolean(state.paused));
    eraserButton.classList.toggle('active', Boolean(state.erasing));
    brushInput.value = String(state.brushSize);
    brushValue.textContent = String(state.brushSize);
  }

  update(Game.state);
  renderSlots();

  function destroy() {
    toolbar.remove();
    elementPicker.destroy();
    document.removeEventListener('click', handleDocumentClick);
  }

  return {
    toolbar,
    update,
    destroy,
    refreshSlots: renderSlots,
    getHeight() {
      const rect = toolbar.getBoundingClientRect();
      return rect.height;
    },
  };
}
