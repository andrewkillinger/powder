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
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: rgba(10, 15, 26, 0.92);
      color: #f5f7ff;
      z-index: 1000;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.3);
    }

    #${TOOLBAR_ID} button,
    #${TOOLBAR_ID} label,
    #${TOOLBAR_ID} input {
      font-family: inherit;
    }

    #${TOOLBAR_ID} button {
      min-height: 40px;
      border-radius: 10px;
      border: none;
      background: rgba(34, 43, 67, 0.8);
      color: inherit;
      padding: 0 1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    #${TOOLBAR_ID} button.active {
      background: rgba(88, 108, 255, 0.95);
      color: #fff;
    }

    #${TOOLBAR_ID} input[type='range'] {
      width: 140px;
      accent-color: #6d86ff;
    }

    #${MENU_ID} {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(5, 8, 14, 0.55);
      backdrop-filter: blur(6px);
      z-index: 1100;
    }

    #${MENU_ID}[data-open='true'] {
      display: flex;
    }

    #${MENU_ID} .panel {
      background: rgba(16, 23, 38, 0.95);
      color: #f5f7ff;
      border-radius: 16px;
      padding: 1.25rem;
      min-width: 220px;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      box-shadow: 0 14px 32px rgba(0, 0, 0, 0.4);
    }

    #${MENU_ID} .panel button {
      width: 100%;
      justify-content: space-between;
    }
  `;

  document.head.appendChild(style);
}

function createElementMenu(elements, onSelect) {
  const menu = document.createElement('div');
  menu.id = MENU_ID;
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-modal', 'true');

  const panel = document.createElement('div');
  panel.className = 'panel';

  elements.forEach((element) => {
    if (!element) {
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    const label = element.name ?? `Element ${element.id}`;
    const icon = element.icon ? `${element.icon} ` : '';
    button.textContent = `${icon}${label}`;
    button.dataset.elementId = String(element.id);
    button.addEventListener('click', () => {
      onSelect(element.id);
      menu.dataset.open = 'false';
    });
    panel.appendChild(button);
  });

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Close';
  cancel.addEventListener('click', () => {
    menu.dataset.open = 'false';
  });

  panel.appendChild(cancel);
  menu.appendChild(panel);
  menu.addEventListener('click', (event) => {
    if (event.target === menu) {
      menu.dataset.open = 'false';
    }
  });

  document.body.appendChild(menu);
  return menu;
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
  elementButton.textContent = 'Element';

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

  const menu = createElementMenu(elements || [], (id) => {
    if (typeof onElementOpen === 'function') {
      onElementOpen(id);
    }
  });

  elementButton.addEventListener('click', () => {
    menu.dataset.open = menu.dataset.open === 'true' ? 'false' : 'true';
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
    const element = elements?.find((item) => item?.id === state.currentElementId);
    if (element) {
      const label = element.name ?? `Element ${element.id}`;
      const icon = element.icon ? `${element.icon} ` : '';
      elementButton.textContent = `Element: ${icon}${label}`;
    }

    pauseButton.classList.toggle('active', Boolean(state.paused));
    eraserButton.classList.toggle('active', Boolean(state.erasing));
    brushInput.value = String(state.brushSize);
    brushValue.textContent = String(state.brushSize);
  }

  update(Game.state);

  function destroy() {
    toolbar.remove();
    menu.remove();
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
