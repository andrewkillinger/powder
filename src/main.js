import {
  ELEMENTS,
  ELEMENT_LIST,
  PALETTE,
  EMPTY,
  WALL,
  SAND,
  WATER,
  OIL,
  FIRE,
} from './elements.js';
import { createRenderer } from './render.js';
import {
  createWorld,
  beginTick,
  endTick,
  step,
  paintCircle,
  fillRect,
  getParticleCount,
  idx,
  inBounds,
} from './sim.js';
import { initUI } from './ui.js';
import { runSelfChecksAll } from './selfcheck.js';

const SOFT_PARTICLE_CAP = 60000;
const PHYSICS_HZ = 60;
const WORLD_WIDTH = 256;
const WORLD_HEIGHT = 256;
const VIEWPORT_MIN_SCALE = 1;
const VIEWPORT_MAX_SCALE = 4;

// State root – must exist before anything runs
export const Game = (window.Game = {
  state: {
    paused: false,
    brushSize: 4,
    currentElementId: SAND,
    erasing: false,
    seed: 1337,
    frame: 0,
    zoom: 1,
  },
  world: null,
  renderer: null,
  hud: null,
  ui: null,
  metrics: {
    fps: 0,
    frames: 0,
    particles: 0,
  },
  limits: {
    softCap: SOFT_PARTICLE_CAP,
  },
  viewport: {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    minScale: VIEWPORT_MIN_SCALE,
    maxScale: VIEWPORT_MAX_SCALE,
  },
});

const stateListeners = new Set();

Game.onStateChange = function onStateChange(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
};

function emitState() {
  for (const listener of stateListeners) {
    try {
      listener(Game.state);
    } catch (error) {
      console.error('State listener error', error);
    }
  }
}

function setPaused(value) {
  const next = typeof value === 'boolean' ? value : !Game.state.paused;
  if (next !== Game.state.paused) {
    Game.state.paused = next;
    emitState();
  }
  return Game.state.paused;
}

function setBrushSize(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return Game.state.brushSize;
  }
  const next = Math.max(1, Math.min(20, Math.round(numeric)));
  if (next !== Game.state.brushSize) {
    Game.state.brushSize = next;
    emitState();
  }
  return Game.state.brushSize;
}

function setCurrentElement(id) {
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) {
    return Game.state.currentElementId;
  }
  const element = Math.max(0, Math.trunc(numeric));
  if (element !== Game.state.currentElementId) {
    Game.state.currentElementId = element;
    emitState();
  }
  return Game.state.currentElementId;
}

function setEraser(value) {
  const next = typeof value === 'boolean' ? value : !Game.state.erasing;
  if (next !== Game.state.erasing) {
    Game.state.erasing = next;
    emitState();
  }
  return Game.state.erasing;
}

function refreshParticleCount(world = Game.world) {
  if (!world || !world.cells) {
    return 0;
  }
  const count = getParticleCount(world);
  Game.metrics.particles = count;
  return count;
}

function clearWorld(world = Game.world) {
  if (!world || !world.cells) {
    return;
  }
  world.cells.fill(EMPTY);
  world.flags.fill(0);
  if (world.lastMoveDir) {
    world.lastMoveDir.fill(0);
  }
  if (world.lifetimes) {
    world.lifetimes.fill(0);
  }
  refreshParticleCount(world);
}

function installQC() {
  window.QC = {
    ping: () => 'pong',
    count: () => refreshParticleCount(Game.world),
    pause: (value) => setPaused(value ?? !Game.state.paused),
  };
}

function clampViewport(viewport, world) {
  if (!viewport || !world) {
    return;
  }

  const minScale = Number.isFinite(viewport.minScale)
    ? Math.max(VIEWPORT_MIN_SCALE, viewport.minScale)
    : VIEWPORT_MIN_SCALE;
  const maxScale = Number.isFinite(viewport.maxScale)
    ? Math.max(minScale, viewport.maxScale)
    : VIEWPORT_MAX_SCALE;

  let scale = Number.isFinite(viewport.scale) && viewport.scale > 0 ? viewport.scale : minScale;
  scale = Math.max(minScale, Math.min(maxScale, scale));

  viewport.minScale = minScale;
  viewport.maxScale = maxScale;
  viewport.scale = scale;

  const viewWidth = world.width / scale;
  const viewHeight = world.height / scale;
  const maxOffsetX = Math.max(0, world.width - viewWidth);
  const maxOffsetY = Math.max(0, world.height - viewHeight);

  const offsetX = Number.isFinite(viewport.offsetX) ? viewport.offsetX : 0;
  const offsetY = Number.isFinite(viewport.offsetY) ? viewport.offsetY : 0;

  viewport.offsetX = Math.max(0, Math.min(maxOffsetX, offsetX));
  viewport.offsetY = Math.max(0, Math.min(maxOffsetY, offsetY));
}

function syncViewport(world = Game.world) {
  const viewport = Game.viewport;
  if (!viewport || !world) {
    return viewport;
  }

  const previousZoom = Game.state.zoom;
  clampViewport(viewport, world);
  Game.state.zoom = viewport.scale;
  if (previousZoom !== viewport.scale) {
    emitState();
  }
  return viewport;
}

function applyViewportTransform(transform = {}, world = Game.world) {
  const viewport = Game.viewport;
  if (!viewport || !world) {
    return viewport;
  }

  if (Number.isFinite(transform.scale)) {
    viewport.scale = transform.scale;
  }
  if (Number.isFinite(transform.offsetX)) {
    viewport.offsetX = transform.offsetX;
  }
  if (Number.isFinite(transform.offsetY)) {
    viewport.offsetY = transform.offsetY;
  }

  return syncViewport(world);
}

function setViewportScale(scale, { canvas, centerX, centerY, anchorWorld } = {}) {
  const world = Game.world;
  const viewport = Game.viewport;
  if (!world || !viewport) {
    return viewport;
  }

  const minScale = viewport.minScale ?? VIEWPORT_MIN_SCALE;
  const maxScale = viewport.maxScale ?? VIEWPORT_MAX_SCALE;
  let nextScale = Number(scale);
  if (!Number.isFinite(nextScale) || nextScale <= 0) {
    nextScale = viewport.scale;
  }
  nextScale = Math.max(minScale, Math.min(maxScale, nextScale));

  const rect = canvas?.getBoundingClientRect?.();
  if (rect && rect.width > 0 && rect.height > 0) {
    const localX = Number.isFinite(centerX) ? (centerX - rect.left) / rect.width : 0.5;
    const localY = Number.isFinite(centerY) ? (centerY - rect.top) / rect.height : 0.5;

    if (Number.isFinite(localX) && Number.isFinite(localY)) {
      const currentScale = viewport.scale || 1;
      const currentViewWidth = world.width / currentScale;
      const currentViewHeight = world.height / currentScale;
      const fallbackAnchor = {
        x: viewport.offsetX + localX * currentViewWidth,
        y: viewport.offsetY + localY * currentViewHeight,
      };
      const anchor =
        anchorWorld && Number.isFinite(anchorWorld.x) && Number.isFinite(anchorWorld.y)
          ? anchorWorld
          : fallbackAnchor;

      const viewWidth = world.width / nextScale;
      const viewHeight = world.height / nextScale;

      const offsetX = anchor.x - localX * viewWidth;
      const offsetY = anchor.y - localY * viewHeight;

      return applyViewportTransform({ scale: nextScale, offsetX, offsetY }, world);
    }
  }

  return applyViewportTransform({ scale: nextScale }, world);
}

function pointerToWorld(canvas, event) {
  const world = Game.world;
  const viewport = Game.viewport;
  if (!world || !viewport) {
    return null;
  }
  const clientX = Number(event?.clientX);
  const clientY = Number(event?.clientY);
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
    return null;
  }
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const localX = (clientX - rect.left) / rect.width;
  const localY = (clientY - rect.top) / rect.height;
  if (!Number.isFinite(localX) || !Number.isFinite(localY)) {
    return null;
  }
  const viewWidth = world.width / viewport.scale;
  const viewHeight = world.height / viewport.scale;
  const x = viewport.offsetX + localX * viewWidth;
  const y = viewport.offsetY + localY * viewHeight;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return { x, y };
}

function paintAt(worldX, worldY) {
  const world = Game.world;
  if (!world) {
    return 0;
  }
  const element = Game.state.erasing ? EMPTY : Game.state.currentElementId;
  if (element !== EMPTY && refreshParticleCount(world) >= Game.limits.softCap) {
    return 0;
  }
  const writes = paintCircle(world, worldX, worldY, Game.state.brushSize, element);
  if (writes > 0) {
    refreshParticleCount(world);
  }
  return writes;
}

function attachPointerHandlers(canvas) {
  const pointerState = {
    activePointers: new Map(),
    paintingPointerId: null,
    pendingTap: null,
    gesture: null,
  };

  function handlePointer(point) {
    if (!point) {
      return;
    }
    const coords = pointerToWorld(canvas, point);
    if (!coords) {
      return;
    }
    paintAt(coords.x, coords.y);
  }

  function updatePointer(event) {
    pointerState.activePointers.set(event.pointerId, {
      pointerType: event.pointerType,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  function removePointer(pointerId) {
    pointerState.activePointers.delete(pointerId);
    if (pointerState.activePointers.size < 2) {
      pointerState.gesture = null;
    }
  }

  function startGestureIfNeeded() {
    if (pointerState.activePointers.size < 2) {
      pointerState.gesture = null;
      return;
    }

    const pointers = Array.from(pointerState.activePointers.values());
    if (pointers.length < 2) {
      return;
    }

    const [first, second] = pointers;
    if (!first || !second) {
      return;
    }

    const dx = second.clientX - first.clientX;
    const dy = second.clientY - first.clientY;
    const distance = Math.hypot(dx, dy) || 1;
    const centerX = (first.clientX + second.clientX) / 2;
    const centerY = (first.clientY + second.clientY) / 2;
    const anchor = pointerToWorld(canvas, { clientX: centerX, clientY: centerY });

    pointerState.gesture = {
      startScale: Game.viewport?.scale ?? 1,
      startDistance: distance,
      anchorWorld:
        anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)
          ? anchor
          : (() => {
              const viewport = Game.viewport;
              const world = Game.world;
              if (!viewport || !world) {
                return { x: 0, y: 0 };
              }
              const viewWidth = world.width / (viewport.scale || 1);
              const viewHeight = world.height / (viewport.scale || 1);
              return {
                x: viewport.offsetX + viewWidth / 2,
                y: viewport.offsetY + viewHeight / 2,
              };
            })(),
    };

    pointerState.paintingPointerId = null;
    pointerState.pendingTap = null;
  }

  function updateGesture() {
    if (!pointerState.gesture || pointerState.activePointers.size < 2) {
      return;
    }

    const pointers = Array.from(pointerState.activePointers.values());
    if (pointers.length < 2) {
      return;
    }

    const [first, second] = pointers;
    if (!first || !second) {
      return;
    }

    const dx = second.clientX - first.clientX;
    const dy = second.clientY - first.clientY;
    const distance = Math.hypot(dx, dy) || pointerState.gesture.startDistance || 1;
    const centerX = (first.clientX + second.clientX) / 2;
    const centerY = (first.clientY + second.clientY) / 2;

    const factor =
      pointerState.gesture.startDistance > 0
        ? distance / pointerState.gesture.startDistance
        : 1;
    const rawScale = pointerState.gesture.startScale * (Number.isFinite(factor) ? factor : 1);

    setViewportScale(rawScale, {
      canvas,
      centerX,
      centerY,
      anchorWorld: pointerState.gesture.anchorWorld,
    });
  }

  canvas.addEventListener('pointerdown', (event) => {
    const isMouse = event.pointerType === 'mouse';
    const isPen = event.pointerType === 'pen';
    if (isMouse && event.button !== 0) {
      return;
    }

    updatePointer(event);

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      // ignore capture errors from synthetic events
    }

    event.preventDefault();

    if (pointerState.activePointers.size >= 2) {
      pointerState.paintingPointerId = null;
      pointerState.pendingTap = null;
      startGestureIfNeeded();
      return;
    }

    pointerState.gesture = null;

    if (isMouse || isPen) {
      pointerState.paintingPointerId = event.pointerId;
      pointerState.pendingTap = null;
      handlePointer(event);
      return;
    }

    pointerState.paintingPointerId = event.pointerId;
    pointerState.pendingTap = { clientX: event.clientX, clientY: event.clientY };
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!pointerState.activePointers.has(event.pointerId)) {
      return;
    }

    updatePointer(event);

    if (pointerState.activePointers.size >= 2) {
      event.preventDefault();
      if (!pointerState.gesture) {
        startGestureIfNeeded();
      }
      updateGesture();
      return;
    }

    if (pointerState.paintingPointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    if (pointerState.pendingTap) {
      handlePointer(pointerState.pendingTap);
      pointerState.pendingTap = null;
    }

    handlePointer(event);
  });

  function endPointer(event) {
    if (!pointerState.activePointers.has(event.pointerId)) {
      pointerState.pendingTap = null;
      pointerState.paintingPointerId = null;
      return;
    }

    if (pointerState.pendingTap && pointerState.paintingPointerId === event.pointerId) {
      handlePointer(pointerState.pendingTap);
    }

    pointerState.pendingTap = null;

    removePointer(event.pointerId);

    if (pointerState.paintingPointerId === event.pointerId) {
      pointerState.paintingPointerId = null;
    }

    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      // ignore
    }
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
}

function createOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'powder-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '8px';
  overlay.style.right = '8px';
  overlay.style.fontFamily = 'monospace';
  overlay.style.fontSize = '12px';
  overlay.style.padding = '0.35rem 0.5rem';
  overlay.style.background = 'rgba(10, 14, 24, 0.82)';
  overlay.style.color = '#e7f0ff';
  overlay.style.borderRadius = '8px';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '1500';
  const debugVisible = new URLSearchParams(window.location.search).get('debug') !== '0';
  overlay.style.display = debugVisible ? 'block' : 'none';
  overlay.textContent = 'FPS: 0   Particles: 0';
  document.body.appendChild(overlay);
  return overlay;
}

function updateOverlay(overlay, info) {
  if (!overlay) {
    return;
  }
  const fps = Number.isFinite(info?.fps) ? info.fps : 0;
  const particles = Number.isFinite(info?.count) ? info.count : 0;
  overlay.textContent = `FPS: ${Math.round(fps)}   Particles: ${Math.max(0, Math.trunc(particles))}`;
}

function ensureDocumentLayout() {
  document.documentElement.style.overflow = 'hidden';
  document.documentElement.style.height = '100%';
  document.body.style.overflow = 'hidden';
  document.body.style.height = '100%';
  document.body.style.margin = '0';
}

export async function start() {
  if (Game.booted) {
    return;
  }
  Game.booted = true;

  ensureDocumentLayout();

  const root = document.getElementById('app') ?? document.body;
  const canvas = document.createElement('canvas');
  canvas.id = 'game';
  canvas.style.display = 'block';
  canvas.style.width = 'min(512px, 100%)';
  canvas.style.maxWidth = '100%';
  canvas.style.height = 'min(512px, calc(100vh - 140px))';
  canvas.style.maxHeight = 'calc(100vh - 80px)';
  canvas.style.margin = '0 auto';
  canvas.style.touchAction = 'none';
  canvas.setAttribute('aria-label', 'Powder Mobile canvas');
  root.appendChild(canvas);

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const baseCtx = canvas.getContext('2d');
  if (baseCtx) {
    baseCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const world = createWorld(WORLD_WIDTH, WORLD_HEIGHT);
  Game.world = world;
  syncViewport(world);

  const renderer = createRenderer(canvas, world, PALETTE);
  Game.renderer = renderer;
  renderer.draw(world, { viewport: Game.viewport });

  const overlay = createOverlay();
  Game.hud = {
    element: overlay,
    update: (info) => updateOverlay(overlay, info),
  };
  updateOverlay(overlay, { fps: 0, count: refreshParticleCount(world) });

  const ui = initUI({
    Game,
    elements: ELEMENT_LIST,
    palette: PALETTE,
    onPauseToggle: () => setPaused(),
    onClear: () => {
      clearWorld();
      renderer.draw(Game.world, { viewport: Game.viewport });
      updateOverlay(overlay, { fps: Game.metrics.fps, count: Game.metrics.particles });
    },
    onBrushChange: (value) => setBrushSize(value),
    onZoomChange: (level) => {
      const rectNow = canvas.getBoundingClientRect();
      const centerX = rectNow.left + rectNow.width / 2;
      const centerY = rectNow.top + rectNow.height / 2;
      const anchor = pointerToWorld(canvas, { clientX: centerX, clientY: centerY });
      setViewportScale(level, { canvas, centerX, centerY, anchorWorld: anchor });
    },
    onElementOpen: (id) => {
      setCurrentElement(id);
      setEraser(false);
    },
    onEraserToggle: () => setEraser(),
  });
  Game.ui = ui;

  stateListeners.add((state) => {
    ui.update(state);
  });
  ui.update(Game.state);

  attachPointerHandlers(canvas);

  window.addEventListener('resize', () => {
    const newRect = canvas.getBoundingClientRect();
    const nextDpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(newRect.width * nextDpr));
    canvas.height = Math.max(1, Math.floor(newRect.height * nextDpr));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(nextDpr, 0, 0, nextDpr, 0, 0);
    }
    syncViewport(Game.world);
    renderer.draw(Game.world, { viewport: Game.viewport });
  });

  installQC();

  const api = {
    createWorld,
    beginTick,
    endTick,
    step,
    paintCircle,
    fillRect,
    getParticleCount,
    idx,
    inBounds,
    Renderer: { createRenderer },
    ELEMENTS,
    PALETTE,
    EMPTY,
    WALL,
    SAND,
    WATER,
    OIL,
    FIRE,
  };

  const self = await runSelfChecksAll(Game, api);
  if (!self.ok) {
    console.groupCollapsed('❌ Self-check failures');
    self.failures.forEach((failure) => console.warn(failure));
    console.groupEnd();
  } else {
    console.info('✅ All self-checks passed');
  }

  let last = performance.now();
  let frames = 0;
  let fps = 0;

  function raf() {
    frames += 1;
    const now = performance.now();
    if (now - last >= 1000) {
      fps = frames;
      frames = 0;
      last = now;
      Game.metrics.fps = fps;
    }

    const count = refreshParticleCount(Game.world);
    renderer.draw(Game.world, { fps, count, viewport: Game.viewport });
    updateOverlay(overlay, { fps, count });
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  const physics = setInterval(() => {
    if (!Game.world || Game.state.paused) {
      return;
    }
    beginTick(Game.world);
    step(Game.world, { state: Game.state, limits: Game.limits, metrics: Game.metrics });
    endTick(Game.world);
    Game.state.frame += 1;
  }, 1000 / PHYSICS_HZ);
  Game.physicsHandle = physics;

  console.info(
    '[Powder Mobile] Boot OK | world=%dx%d | elements=%d',
    Game.world.width,
    Game.world.height,
    ELEMENT_LIST.length,
  );
}

document.addEventListener('DOMContentLoaded', start, { once: true });
