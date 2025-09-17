const STYLE_ID = 'powder-ui-style';
const TOOLBAR_ID = 'powder-toolbar';
const MODAL_ID = 'powder-element-modal';

function injectStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #app {
      position: relative;
    }

    #${TOOLBAR_ID} {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(10, 15, 26, 0.92);
      color: #f5f7ff;
      z-index: 1000;
      font-family: inherit;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
      backdrop-filter: blur(12px);
    }

    #${TOOLBAR_ID} * {
      font-family: inherit;
    }

    #${TOOLBAR_ID} button,
    #${TOOLBAR_ID} .ui-chip,
    #${TOOLBAR_ID} .ui-brush {
      min-height: 44px;
      border: none;
      border-radius: 12px;
      background: rgba(34, 43, 67, 0.78);
      color: inherit;
      font-size: 0.9rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0 0.85rem;
      gap: 0.5rem;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
      transition: background 0.2s ease;
    }

    #${TOOLBAR_ID} button {
      cursor: pointer;
    }

    #${TOOLBAR_ID} button:focus-visible,
    #${TOOLBAR_ID} input:focus-visible {
      outline: 2px solid rgba(118, 154, 255, 0.9);
      outline-offset: 2px;
    }

    #${TOOLBAR_ID} button.active {
      background: rgba(84, 112, 255, 0.88);
      color: #ffffff;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
    }

    #${TOOLBAR_ID} .ui-chip {
      cursor: default;
    }

    #${TOOLBAR_ID} .chip-color {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.12);
    }

    #${TOOLBAR_ID} .chip-name {
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    #${TOOLBAR_ID} .ui-brush {
      padding: 0 0.85rem;
      gap: 0.75rem;
    }

    #${TOOLBAR_ID} .ui-brush span {
      font-size: 0.8rem;
      opacity: 0.8;
    }

    #${TOOLBAR_ID} input[type='range'] {
      width: 140px;
      accent-color: #7088ff;
    }

    #${MODAL_ID} {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(5, 8, 14, 0.55);
      backdrop-filter: blur(6px);
      z-index: 1100;
    }

    #${MODAL_ID}[data-open='true'] {
      display: flex;
    }

    #${MODAL_ID} .ui-modal-panel {
      background: rgba(18, 25, 40, 0.96);
      color: #f7f9ff;
      border-radius: 18px;
      padding: 1.5rem;
      min-width: 220px;
      max-width: min(90vw, 360px);
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      box-shadow: 0 18px 42px rgba(0, 0, 0, 0.45);
    }

    #${MODAL_ID} .ui-modal-panel button {
      align-self: center;
      min-width: 140px;
    }
  `;

  document.head.appendChild(style);
}

function stopEventPropagation(event) {
  event.stopPropagation();
}

function applyLayout(canvas) {
  const app = document.getElementById('app');

  if (app) {
    app.style.display = 'flex';
    app.style.flexDirection = 'column';
    app.style.alignItems = 'stretch';
    app.style.justifyContent = 'flex-start';
    app.style.height = '100%';
    app.style.width = '100%';
    app.style.boxSizing = 'border-box';
  }

  if (canvas) {
    canvas.style.flex = '1 1 auto';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
  }
}

export function initializeUI(game) {
  if (!game || !game.elements || !game.elements.canvas) {
    throw new Error('initializeUI expects a Game reference with canvas elements.');
  }

  injectStyles();

  const canvas = game.elements.canvas;
  applyLayout(canvas);

  const toolbar = document.createElement('div');
  toolbar.id = TOOLBAR_ID;
  toolbar.setAttribute('role', 'toolbar');
  toolbar.dataset.uiToolbar = 'true';

  const chip = document.createElement('div');
  chip.className = 'ui-chip';
  const chipColor = document.createElement('span');
  chipColor.className = 'chip-color';
  const chipName = document.createElement('span');
  chipName.className = 'chip-name';
  chip.append(chipColor, chipName);

  const elementButton = document.createElement('button');
  elementButton.type = 'button';
  elementButton.className = 'ui-button elements';
  elementButton.textContent = 'Elements';

  const pauseButton = document.createElement('button');
  pauseButton.type = 'button';
  pauseButton.className = 'ui-button pause';
  pauseButton.textContent = 'Pause';

  const eraserButton = document.createElement('button');
  eraserButton.type = 'button';
  eraserButton.className = 'ui-button eraser';
  eraserButton.textContent = 'Eraser';

  const clearButton = document.createElement('button');
  clearButton.type = 'button';
  clearButton.className = 'ui-button clear';
  clearButton.textContent = 'Clear';

  const brushWrapper = document.createElement('label');
  brushWrapper.className = 'ui-brush';
  brushWrapper.setAttribute('for', 'brush-size-control');
  const brushLabel = document.createElement('span');
  brushLabel.textContent = 'Brush';
  const brushInput = document.createElement('input');
  brushInput.type = 'range';
  brushInput.min = '1';
  brushInput.max = '20';
  brushInput.step = '1';
  brushInput.value = String(game.state?.brushSize ?? 4);
  brushInput.id = 'brush-size-control';
  brushWrapper.append(brushLabel, brushInput);

  toolbar.append(chip, elementButton, pauseButton, eraserButton, clearButton, brushWrapper);
  document.body.appendChild(toolbar);

  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.setAttribute('aria-hidden', 'true');

  const modalPanel = document.createElement('div');
  modalPanel.className = 'ui-modal-panel';
  const modalHeading = document.createElement('h2');
  modalHeading.textContent = 'Elements';
  const modalBody = document.createElement('p');
  modalBody.textContent = 'Element selection coming soon.';
  const modalClose = document.createElement('button');
  modalClose.type = 'button';
  modalClose.textContent = 'Close';

  modalPanel.append(modalHeading, modalBody, modalClose);
  modal.append(modalPanel);
  document.body.appendChild(modal);

  const stopPropagationTargets = [
    toolbar,
    elementButton,
    pauseButton,
    eraserButton,
    clearButton,
    brushWrapper,
    brushInput,
    modal,
    modalPanel,
    modalClose,
  ];

  const pointerEvents = [
    'touchstart',
    'touchmove',
    'touchend',
    'pointerdown',
    'pointermove',
    'pointerup',
    'mousedown',
    'mousemove',
    'mouseup',
    'click',
  ];

  for (const target of stopPropagationTargets) {
    for (const type of pointerEvents) {
      target.addEventListener(type, stopEventPropagation, { capture: true });
    }
  }

  let modalOpen = false;

  function setModalOpen(next) {
    modalOpen = Boolean(next);
    modal.setAttribute('data-open', modalOpen ? 'true' : 'false');
    modal.setAttribute('aria-hidden', modalOpen ? 'false' : 'true');
  }

  elementButton.addEventListener('click', () => {
    setModalOpen(true);
  });

  modalClose.addEventListener('click', () => {
    setModalOpen(false);
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      setModalOpen(false);
    }
  });

  pauseButton.addEventListener('click', () => {
    if (typeof game.togglePause === 'function') {
      game.togglePause();
    }
  });

  eraserButton.addEventListener('click', () => {
    if (typeof game.toggleEraser === 'function') {
      game.toggleEraser();
    }
  });

  clearButton.addEventListener('click', () => {
    if (typeof game.clearWorld === 'function') {
      game.clearWorld();
    }
  });

  brushInput.addEventListener('input', () => {
    if (typeof game.setBrushSize === 'function') {
      game.setBrushSize(Number(brushInput.value));
    }
  });

  let lastKnownState = null;

  function formatElementName(elementId) {
    if (typeof game.getElementName === 'function') {
      return game.getElementName(elementId);
    }

    if (game.elements && game.elements.names && game.elements.names[elementId]) {
      return game.elements.names[elementId];
    }

    return `Element ${elementId}`;
  }

  function updateChipColor(elementId) {
    const palette = game.PALETTE || {};
    const swatch = palette[elementId];

    if (Array.isArray(swatch)) {
      const [r, g, b, a = 255] = swatch;
      chipColor.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
    } else {
      chipColor.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    }
  }

  function refresh(state = game.state) {
    if (!state || state === lastKnownState) {
      return;
    }

    chipName.textContent = formatElementName(state.currentElementId ?? 0);
    updateChipColor(state.currentElementId ?? 0);

    pauseButton.classList.toggle('active', Boolean(state.paused));
    pauseButton.textContent = state.paused ? 'Resume' : 'Pause';

    eraserButton.classList.toggle('active', Boolean(state.erasing));

    if (Number(brushInput.value) !== Number(state.brushSize)) {
      brushInput.value = String(state.brushSize);
    }

    lastKnownState = state;
  }

  refresh(game.state);

  const unsubscribe = typeof game.onStateChange === 'function'
    ? game.onStateChange((state) => {
        refresh(state);
      })
    : null;

  function updateToolbarMetrics() {
    const rect = toolbar.getBoundingClientRect();
    const height = Number.isFinite(rect.height) ? rect.height : toolbar.offsetHeight;

    if (Number.isFinite(height)) {
      if (game.layout) {
        game.layout.toolbarHeight = height;
      }

      const app = document.getElementById('app');
      if (app) {
        app.style.paddingTop = `${height}px`;
      }

      if (typeof game.renderer?.resize === 'function' && game.simulation?.state?.world) {
        game.renderer.resize(game.simulation.state.world);
      }
    }
  }

  updateToolbarMetrics();
  window.addEventListener('resize', updateToolbarMetrics);
  window.addEventListener('orientationchange', updateToolbarMetrics);

  return {
    destroy() {
      for (const target of stopPropagationTargets) {
        for (const type of pointerEvents) {
          target.removeEventListener(type, stopEventPropagation, { capture: true });
        }
      }

      window.removeEventListener('resize', updateToolbarMetrics);
      window.removeEventListener('orientationchange', updateToolbarMetrics);

      if (unsubscribe) {
        unsubscribe();
      }

      toolbar.remove();
      modal.remove();
    },
    refresh,
    elements: {
      toolbar,
      pauseToggle: pauseButton,
      brushSize: brushInput,
      eraserToggle: eraserButton,
      elementButton,
    },
    isElementModalOpen() {
      return modalOpen;
    },
  };
}
