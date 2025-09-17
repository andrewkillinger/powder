import { CATEGORY_ORDER } from './elements.js';

const STYLE_ID = 'powder-ui-style';
const TOOLBAR_ID = 'powder-toolbar';
const MENU_ID = 'powder-element-menu';

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
      font-size: 1.2rem;
      line-height: 1;
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
      gap: 0.4rem;
      font-weight: 600;
      transition: background 0.2s ease, border 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
      cursor: pointer;
      touch-action: manipulation;
    }

    #${MENU_ID} .element-option:active {
      transform: scale(0.97);
    }

    #${MENU_ID} .element-option.selected {
      border-color: rgba(150, 168, 255, 0.95);
      background: rgba(88, 108, 255, 0.25);
      box-shadow: inset 0 0 0 1px rgba(150, 168, 255, 0.6);
    }

    #${MENU_ID} .element-option-icon {
      font-size: 1.6rem;
      line-height: 1;
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

    #${MENU_ID} [hidden] {
      display: none !important;
    }
  `;

  document.head.appendChild(style);
}

function createElementModal({ elements = [], onSelect, onOpen, onClose }) {
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
  title.textContent = 'Choose element';
  panel.setAttribute('aria-labelledby', title.id);

  const header = document.createElement('div');
  header.className = 'panel-header';
  header.appendChild(title);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'close-button';
  closeButton.textContent = 'Close';
  closeButton.setAttribute('aria-label', 'Close element picker');
  header.appendChild(closeButton);

  const categoryBar = document.createElement('div');
  categoryBar.className = 'category-bar';
  categoryBar.setAttribute('role', 'tablist');

  const searchRow = document.createElement('div');
  searchRow.className = 'search-row';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'search-input';
  searchInput.placeholder = 'Search elements';
  searchInput.setAttribute('aria-label', 'Search elements');
  searchInput.autocomplete = 'off';
  searchInput.autocapitalize = 'none';
  searchInput.spellcheck = false;
  searchRow.appendChild(searchInput);

  const grid = document.createElement('div');
  grid.className = 'element-grid';
  grid.setAttribute('role', 'listbox');

  panel.appendChild(header);
  panel.appendChild(categoryBar);
  panel.appendChild(searchRow);
  panel.appendChild(grid);
  modal.appendChild(panel);

  const safeElements = elements.filter(Boolean);
  const elementButtons = new Map();
  const categoryButtons = new Map();
  const categoriesPresent = new Set();

  safeElements.forEach((element) => {
    if (element?.category) {
      categoriesPresent.add(element.category);
    }
  });

  const fallbackCategory =
    CATEGORY_ORDER.find((category) => categoriesPresent.has(category)) ??
    CATEGORY_ORDER[0] ??
    null;

  let activeCategory = fallbackCategory;
  let selectedElementId = null;
  let searchQuery = '';
  let lastFocused = null;
  let isOpen = false;
  let searchDebounce = null;

  function updateSelection(elementId) {
    selectedElementId = elementId;
    elementButtons.forEach((button, id) => {
      const selected = id === elementId;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
}

  function render() {
    const query = searchQuery.trim();
    const normalized = query.toLowerCase();
    const hasQuery = normalized.length > 0;
    safeElements.forEach((element) => {
      const button = elementButtons.get(element.id);
      if (!button) {
        return;
      }
      let visible = true;
      if (hasQuery) {
        const name = String(element.name ?? '').toLowerCase();
        const icon = String(element.icon ?? '').toLowerCase();
        visible = name.includes(normalized) || icon.includes(normalized);
      } else if (activeCategory) {
        visible = element.category === activeCategory;
      }
      button.hidden = !visible;
    });
  }

  function syncCategory(category, { user = false } = {}) {
    let nextCategory = category;
    if (!nextCategory || !categoryButtons.has(nextCategory)) {
      nextCategory = fallbackCategory;
    }
    const changed = activeCategory !== nextCategory;
    activeCategory = nextCategory;
    categoryButtons.forEach((button, key) => {
      const selected = key === activeCategory;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
      button.tabIndex = selected ? 0 : -1;
    });
    if (user) {
      if (searchDebounce) {
        window.clearTimeout(searchDebounce);
        searchDebounce = null;
      }
      searchQuery = '';
      searchInput.value = '';
    }
    if (changed || user) {
      render();
    }
  }

  CATEGORY_ORDER.forEach((category) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'category-chip';
    chip.dataset.category = category;
    chip.textContent = category;
    chip.setAttribute('role', 'tab');
    chip.setAttribute('aria-selected', 'false');
    chip.tabIndex = -1;
    chip.addEventListener('click', () => {
      syncCategory(category, { user: true });
    });
    chip.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
        return;
      }
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const index = CATEGORY_ORDER.indexOf(category);
      if (index < 0) {
        return;
      }
      let nextIndex = (index + direction + CATEGORY_ORDER.length) % CATEGORY_ORDER.length;
      const nextCategory = CATEGORY_ORDER[nextIndex];
      const nextChip = categoryButtons.get(nextCategory);
      if (nextChip) {
        event.preventDefault();
        nextChip.focus();
        syncCategory(nextCategory, { user: true });
      }
    });
    categoryButtons.set(category, chip);
    categoryBar.appendChild(chip);
  });

  safeElements.forEach((element) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'element-option';
    button.dataset.elementId = String(element.id);
    button.dataset.category = String(element.category ?? '');
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', 'false');
    const labelText = element.name ?? `Element ${element.id}`;
    const iconText = element.icon ? `${element.icon} ` : '';
    button.setAttribute('aria-label', `${iconText}${labelText}`.trim());

    const iconSpan = document.createElement('span');
    iconSpan.className = 'element-option-icon';
    iconSpan.textContent = element.icon ?? '';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'element-option-label';
    labelSpan.textContent = labelText;

    button.append(iconSpan, labelSpan);
    button.addEventListener('click', () => {
      updateSelection(element.id);
      if (typeof onSelect === 'function') {
        onSelect(element.id);
      }
      close();
    });
    elementButtons.set(element.id, button);
    grid.appendChild(button);
  });

  function handleSearch(value) {
    searchQuery = value.trim().toLowerCase();
    render();
  }

  searchInput.addEventListener('input', () => {
    const value = searchInput.value;
    if (searchDebounce) {
      window.clearTimeout(searchDebounce);
    }
    searchDebounce = window.setTimeout(() => {
      searchDebounce = null;
      handleSearch(value);
    }, 120);
  });

  searchInput.addEventListener('search', () => {
    if (searchDebounce) {
      window.clearTimeout(searchDebounce);
      searchDebounce = null;
    }
    handleSearch(searchInput.value);
  });

  closeButton.addEventListener('click', (event) => {
    event.preventDefault();
    close();
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      close();
    }
  });

  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });

  function open(trigger) {
    if (isOpen) {
      return;
    }
    isOpen = true;
    lastFocused = trigger ?? document.activeElement;
    modal.dataset.open = 'true';
    modal.removeAttribute('aria-hidden');
    if (typeof onOpen === 'function') {
      onOpen();
    }
    render();
    requestAnimationFrame(() => {
      searchInput.focus({ preventScroll: true });
      if (searchInput.value.length > 0) {
        searchInput.select();
      }
    });
  }

  function close() {
    if (!isOpen) {
      return;
    }
    isOpen = false;
    modal.dataset.open = 'false';
    modal.setAttribute('aria-hidden', 'true');
    if (typeof onClose === 'function') {
      onClose();
    }
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
    lastFocused = null;
  }

  syncCategory(activeCategory);
  updateSelection(selectedElementId);
  render();

  document.body.appendChild(modal);

  return {
    element: modal,
    open,
    close,
    isOpen() {
      return isOpen;
    },
    updateSelection,
    setActiveCategory(category) {
      syncCategory(category, { user: false });
      render();
    },
    destroy() {
      if (modal.parentElement) {
        modal.parentElement.removeChild(modal);
      }
    },
  };
}

export function initUI({
  Game,
  elements,
  palette,
  onPauseToggle,
  onClear,
  onBrushChange,
  onElementOpen,
  onEraserToggle,
}) {
  if (!Game) {
    throw new Error('initUI requires a Game reference.');
  }

  injectStyles();

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
  elementIcon.textContent = '⏳';

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

  const eraserButton = document.createElement('button');
  eraserButton.type = 'button';
  eraserButton.textContent = 'Eraser';

  toolbar.append(elementButton, pauseButton, clearButton, brushLabel, eraserButton);
  document.body.appendChild(toolbar);

  const availableElements = (elements || []).filter(Boolean);
  const elementMap = new Map();
  availableElements.forEach((item) => {
    if (item && typeof item.id === 'number') {
      elementMap.set(item.id, item);
    }
  });

  const elementPicker = createElementModal({
    elements: availableElements,
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
      elementIcon.textContent = element.icon ?? '•';
      elementLabel.textContent = label;
      elementButton.dataset.elementId = String(element.id);
      elementButton.setAttribute('aria-label', `Choose element (current: ${label})`);
      elementButton.title = `Choose element (current: ${label})`;
      if (element?.category) {
        elementPicker.setActiveCategory(element.category);
      }
    } else {
      elementIcon.textContent = '•';
      elementLabel.textContent = 'Element';
      elementButton.removeAttribute('data-element-id');
      elementButton.setAttribute('aria-label', 'Choose element');
      elementButton.title = 'Choose element';
    }

    elementPicker.updateSelection(state.currentElementId);
    pauseButton.classList.toggle('active', Boolean(state.paused));
    eraserButton.classList.toggle('active', Boolean(state.erasing));
    brushInput.value = String(state.brushSize);
    brushValue.textContent = String(state.brushSize);
  }

  update(Game.state);

  function destroy() {
    toolbar.remove();
    elementPicker.destroy();
  }

  return {
    toolbar,
    update,
    destroy,
    getHeight() {
      const rect = toolbar.getBoundingClientRect();
      return rect.height;
    },
  };
}
