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

// State root – must exist before anything runs
export const Game = (window.Game = {
  state: {
    paused: false,
    brushSize: 4,
    currentElementId: SAND,
    erasing: false,
    seed: 1337,
    frame: 0,
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

function pointerToWorld(canvas, event) {
  const world = Game.world;
  if (!world) {
    return null;
  }
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const scaleX = world.width / rect.width;
  const scaleY = world.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
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
  const pointerState = { active: false };

  function handlePointer(event) {
    const coords = pointerToWorld(canvas, event);
    if (!coords) {
      return;
    }
    paintAt(coords.x, coords.y);
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      return;
    }
    pointerState.active = true;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      // ignore capture errors from synthetic events
    }
    event.preventDefault();
    handlePointer(event);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!pointerState.active) {
      return;
    }
    event.preventDefault();
    handlePointer(event);
  });

  const endPointer = (event) => {
    pointerState.active = false;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      // ignore
    }
  };

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

  const renderer = createRenderer(canvas, world, PALETTE);
  Game.renderer = renderer;
  renderer.draw(world);

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
      renderer.draw(Game.world);
      updateOverlay(overlay, { fps: Game.metrics.fps, count: Game.metrics.particles });
    },
    onBrushChange: (value) => setBrushSize(value),
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
    renderer.draw(Game.world);
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
    renderer.draw(Game.world, { fps, count });
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
