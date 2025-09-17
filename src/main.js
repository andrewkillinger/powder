import {
  createGameElements,
  ELEMENTS as ELEMENT_DEFS,
  ELEMENT_IDS,
  PALETTE as RAW_PALETTE,
  EMPTY,
  WALL,
  SAND,
  WATER,
} from './elements.js';
import { createRenderer } from './render.js';
import {
  createSimulation,
  paintCircle,
  fillRect,
  beginTick,
  endTick,
  step as stepWorld,
  setSimulationSeed,
  runWaterOverSandTest,
  getParticleCount,
} from './sim.js';
import { initializeUI } from './ui.js';
import { runSelfChecks, runSelfChecksPhase4 } from './selfcheck.js';

const MAX_WRITES_PER_FRAME = 50000;
const DEFAULT_BRUSH_SIZE = 6;
const FPS_SMOOTHING = 0.12;
const THROTTLE_NOTICE_MS = 800;
const SOFT_PARTICLE_CAP = 60000;
const CAP_WARNING_DURATION_MS = 1600;
const PARTICLE_SAMPLE_INTERVAL_MS = 200;
const PHYSICS_HZ = 30;
const PHYSICS_INTERVAL_MS = 1000 / PHYSICS_HZ;
const PHYSICS_STEP_SECONDS = 1 / PHYSICS_HZ;

function createPaletteLookup(rawPalette) {
  if (!rawPalette) {
    return {};
  }

  const lookup = {};
  const entryCount = Math.floor(rawPalette.length / 4);

  for (let id = 0; id < entryCount; id += 1) {
    const offset = id * 4;
    lookup[id] = [
      rawPalette[offset],
      rawPalette[offset + 1],
      rawPalette[offset + 2],
      rawPalette[offset + 3],
    ];
  }

  return lookup;
}

function createElementNameMap() {
  const names = {};

  if (Array.isArray(ELEMENT_DEFS)) {
    for (const definition of ELEMENT_DEFS) {
      if (!definition || typeof definition.id !== 'number') {
        continue;
      }

      if (typeof definition.name === 'string' && definition.name.length > 0) {
        names[definition.id] = definition.name;
      }
    }
  }

  for (const [name, id] of Object.entries(ELEMENT_IDS)) {
    if (typeof id !== 'number' || id < 0) {
      continue;
    }

    if (!names[id]) {
      const label = name.charAt(0) + name.slice(1).toLowerCase();
      names[id] = label;
    }
  }

  return names;
}

function isFormField(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    element.isContentEditable ||
    tagName === 'select'
  );
}

function createDebugOverlay(visible) {
  const overlay = document.createElement('div');
  overlay.id = 'powder-debug-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '8px';
  overlay.style.left = '8px';
  overlay.style.padding = '0.5rem 0.65rem';
  overlay.style.background = 'rgba(9, 12, 22, 0.78)';
  overlay.style.color = '#c7d5ff';
  overlay.style.fontFamily = 'monospace';
  overlay.style.fontSize = '12px';
  overlay.style.lineHeight = '1.45';
  overlay.style.borderRadius = '10px';
  overlay.style.boxShadow = '0 6px 14px rgba(0, 0, 0, 0.45)';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '1500';

  const fpsLine = document.createElement('div');
  const rafLine = document.createElement('div');
  const canvasLine = document.createElement('div');
  const noticeLine = document.createElement('div');
  noticeLine.style.color = '#ffba66';
  noticeLine.style.fontWeight = '600';

  overlay.append(fpsLine, rafLine, canvasLine, noticeLine);

  if (!visible) {
    overlay.style.display = 'none';
  }

  document.body.appendChild(overlay);

  return {
    element: overlay,
    update({ fps, frameCount, canvasWidth, canvasHeight, throttled }) {
      fpsLine.textContent = `FPS: ${fps.toFixed(1)}`;
      rafLine.textContent = `RAF: ${frameCount}`;
      canvasLine.textContent = `Canvas: ${canvasWidth}×${canvasHeight}`;
      noticeLine.textContent = throttled ? 'Painting throttled' : '';
    },
    destroy() {
      overlay.remove();
    },
  };
}

function createPerfHud() {
  const hud = document.createElement('div');
  hud.id = 'powder-perf-hud';
  hud.style.position = 'fixed';
  hud.style.top = '8px';
  hud.style.right = '8px';
  hud.style.padding = '0.45rem 0.65rem';
  hud.style.background = 'rgba(12, 16, 27, 0.82)';
  hud.style.color = '#e7edff';
  hud.style.fontFamily = 'monospace';
  hud.style.fontSize = '12px';
  hud.style.lineHeight = '1.45';
  hud.style.borderRadius = '10px';
  hud.style.boxShadow = '0 6px 14px rgba(0, 0, 0, 0.45)';
  hud.style.pointerEvents = 'none';
  hud.style.zIndex = '1600';
  hud.style.outline = 'none';

  const fpsLine = document.createElement('div');
  const particleLine = document.createElement('div');
  const warningLine = document.createElement('div');
  warningLine.style.color = '#ff8080';
  warningLine.style.fontWeight = '600';
  warningLine.style.minHeight = '1em';

  hud.append(fpsLine, particleLine, warningLine);
  document.body.appendChild(hud);

  return {
    element: hud,
    update({ fps, particles, warning }) {
      fpsLine.textContent = `FPS: ${Number.isFinite(fps) ? fps.toFixed(1) : '0.0'}`;
      particleLine.textContent = `Particles: ${Math.max(0, Math.trunc(particles))}`;
      warningLine.textContent = warning ? 'Particle cap reached' : '';
      hud.dataset.warning = warning ? 'true' : 'false';
      hud.style.outline = warning ? '2px solid rgba(255, 128, 128, 0.65)' : 'none';
    },
    destroy() {
      hud.remove();
    },
  };
}

const layout = { toolbarHeight: 0 };
const paletteLookup = Object.freeze(createPaletteLookup(RAW_PALETTE));
const elementNames = createElementNameMap();

const elements = createGameElements();

if (elements.canvas && elements.canvas.id !== 'game') {
  elements.canvas.id = 'game';
}

elements.names = elementNames;

const simulation = createSimulation();
const initialSeed = setSimulationSeed(Math.floor(Math.random() * 0xffffffff));
simulation.state.seed = initialSeed;
simulation.state.frame = 0;
const renderer = createRenderer(elements.canvas, elements.context, {
  palette: RAW_PALETTE,
  getToolbarHeight: () => layout.toolbarHeight,
});

const world = simulation.state.world;
refreshParticleCount(true);
const stateListeners = new Set();

const Game = {
  elements,
  simulation,
  renderer,
  layout,
  state: {
    paused: false,
    brushSize: DEFAULT_BRUSH_SIZE,
    currentElementId: SAND,
    erasing: false,
    rectClearing: false,
    frame: 0,
    seed: initialSeed,
  },
  metrics: {
    frameCount: 0,
    fps: 0,
    particleCount: 0,
    lastParticleSample: 0,
    capWarningUntil: 0,
  },
};

Game.ELEMENTS = ELEMENT_IDS;
Game.elementDefinitions = ELEMENT_DEFS;
Game.PALETTE = paletteLookup;
Game.constants = { EMPTY, WALL, SAND, WATER };
Game.getElementName = function getElementName(elementId) {
  return elementNames[elementId] ?? `Element ${elementId}`;
};

window.PALETTE = paletteLookup;
window.EMPTY = EMPTY;
window.WALL = WALL;
window.SAND = SAND;
window.WATER = WATER;

function notifyStateChange() {
  for (const listener of stateListeners) {
    try {
      listener(Game.state);
    } catch (error) {
      console.error('State listener error', error);
    }
  }
}

function refreshParticleCount(force = false) {
  const now = performance.now();
  const lastSample = Number(Game.metrics.lastParticleSample) || 0;

  if (force || now - lastSample >= PARTICLE_SAMPLE_INTERVAL_MS) {
    Game.metrics.particleCount = getParticleCount(world);
    Game.metrics.lastParticleSample = now;
  }

  return Game.metrics.particleCount;
}

Game.onStateChange = function onStateChange(listener) {
  if (typeof listener !== 'function') {
    return () => {};
  }

  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
};

Game.setBrushSize = function setBrushSize(size) {
  const numeric = Number(size);
  if (!Number.isFinite(numeric)) {
    return;
  }

  const clamped = Math.max(1, Math.min(20, Math.round(numeric)));

  if (clamped !== Game.state.brushSize) {
    Game.state.brushSize = clamped;
    notifyStateChange();
  }
};

Game.setCurrentElementId = function setCurrentElementId(elementId) {
  const numeric = Number(elementId);

  if (!Number.isFinite(numeric)) {
    return;
  }

  const id = Math.max(0, Math.trunc(numeric));

  if (!ELEMENT_DEFS[id] && id !== EMPTY) {
    return Game.state.currentElementId;
  }

  if (id !== Game.state.currentElementId) {
    Game.state.currentElementId = id;
    notifyStateChange();
  }

  return Game.state.currentElementId;
};

Game.togglePause = function togglePause(forceValue) {
  const next =
    typeof forceValue === 'boolean' ? forceValue : !Boolean(Game.state.paused);

  if (next !== Game.state.paused) {
    Game.state.paused = next;
    notifyStateChange();
  }
};

Game.toggleEraser = function toggleEraser(forceValue) {
  const next =
    typeof forceValue === 'boolean' ? forceValue : !Boolean(Game.state.erasing);

  let changed = false;

  if (next && Game.state.rectClearing) {
    Game.state.rectClearing = false;
    changed = true;
  }

  if (next !== Game.state.erasing) {
    Game.state.erasing = next;
    changed = true;
  }

  if (changed) {
    notifyStateChange();
  }
};

Game.toggleRectClear = function toggleRectClear(forceValue) {
  const next =
    typeof forceValue === 'boolean' ? forceValue : !Boolean(Game.state.rectClearing);

  let changed = false;

  if (next && Game.state.erasing) {
    Game.state.erasing = false;
    changed = true;
  }

  if (next !== Game.state.rectClearing) {
    Game.state.rectClearing = next;
    changed = true;
  }

  if (changed) {
    notifyStateChange();
  }
};

Game.setSeed = function setSeed(seed) {
  const normalized = setSimulationSeed(seed);

  if (Game.state.seed !== normalized) {
    Game.state.seed = normalized;
    notifyStateChange();
  } else {
    Game.state.seed = normalized;
  }

  simulation.state.seed = normalized;
  return normalized;
};

Game.clearWorld = function clearWorld() {
  world.cells.fill(EMPTY);
  world.flags.fill(0);
  if (world.lastMoveDir) {
    world.lastMoveDir.fill(0);
  }
  Game.metrics.particleCount = 0;
  Game.metrics.lastParticleSample = performance.now();
  Game.metrics.capWarningUntil = 0;
  renderer.draw(world);
  updatePerfHud();
};

Game.clearRectArea = function clearRectArea(x0, y0, x1, y1) {
  const writes = fillRect(world, EMPTY, x0, y0, x1, y1);
  if (writes > 0) {
    refreshParticleCount(true);
    Game.metrics.capWarningUntil = 0;
    renderer.draw(world);
    updatePerfHud();
  }
  return writes;
};

let paintFrameIndex = -1;
let paintWritesThisFrame = 0;
let throttleNoticeUntil = 0;

Game.paintAtWorld = function paintAtWorld(x, y, radius, elementId) {
  if (!world || !world.cells) {
    return 0;
  }

  if (Game.state.rectClearing) {
    return 0;
  }

  const numericX = Number(x);
  const numericY = Number(y);

  if (!Number.isFinite(numericX) || !Number.isFinite(numericY)) {
    return 0;
  }

  const frameCount = Game.metrics.frameCount;

  if (paintFrameIndex !== frameCount) {
    paintFrameIndex = frameCount;
    paintWritesThisFrame = 0;
  }

  if (paintWritesThisFrame >= MAX_WRITES_PER_FRAME) {
    throttleNoticeUntil = performance.now() + THROTTLE_NOTICE_MS;
    return 0;
  }

  const tx = Math.trunc(numericX);
  const ty = Math.trunc(numericY);

  if (tx < 0 || tx >= world.width || ty < 0 || ty >= world.height) {
    return 0;
  }

  const radiusValue = Number.isFinite(radius)
    ? Math.max(0, Math.trunc(radius))
    : Game.state.brushSize;

  const brushElement = Number.isFinite(elementId)
    ? Math.trunc(elementId)
    : Game.state.erasing
    ? EMPTY
    : Game.state.currentElementId;

  if (brushElement !== EMPTY && brushElement !== WALL) {
    const currentParticles = refreshParticleCount(true);
    if (currentParticles >= SOFT_PARTICLE_CAP) {
      Game.metrics.capWarningUntil = performance.now() + CAP_WARNING_DURATION_MS;
      updatePerfHud();
      return 0;
    }
  }

  const writes = paintCircle(world, tx, ty, radiusValue, brushElement);

  if (writes > 0) {
    paintWritesThisFrame += writes;
    if (paintWritesThisFrame >= MAX_WRITES_PER_FRAME) {
      throttleNoticeUntil = performance.now() + THROTTLE_NOTICE_MS;
    }
    refreshParticleCount(true);
    renderer.draw(world);
    updatePerfHud();
  }

  return writes;
};

const pointerState = {
  touchActive: false,
  mouseActive: false,
  pendingPoint: null,
  scheduled: false,
  rectActive: false,
  rectStart: null,
  rectType: null,
  rectEnd: null,
};

function clientToWorld(clientX, clientY) {
  const rect = elements.canvas.getBoundingClientRect();

  if (!rect || rect.width === 0 || rect.height === 0) {
    return null;
  }

  const scaleX = world.width / rect.width;
  const scaleY = world.height / rect.height;

  const worldX = (clientX - rect.left) * scaleX;
  const worldY = (clientY - rect.top) * scaleY;

  if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
    return null;
  }

  return { x: worldX, y: worldY };
}

function beginRectSelection(clientX, clientY, type) {
  if (!Game.state.rectClearing) {
    return false;
  }

  const coords = clientToWorld(clientX, clientY);

  if (!coords) {
    pointerState.rectActive = false;
    pointerState.rectStart = null;
    pointerState.rectEnd = null;
    pointerState.rectType = null;
    return false;
  }

  pointerState.rectActive = true;
  pointerState.rectStart = coords;
  pointerState.rectEnd = coords;
  pointerState.rectType = type;
  return true;
}

function updateRectSelection(clientX, clientY) {
  if (!pointerState.rectActive) {
    return;
  }

  if (!Game.state.rectClearing) {
    cancelRectSelection();
    return;
  }

  const coords = clientToWorld(clientX, clientY);

  if (!coords) {
    return;
  }

  pointerState.rectEnd = coords;
}

function finalizeRectSelection(clientX, clientY) {
  if (!pointerState.rectActive) {
    return false;
  }

  if (!Game.state.rectClearing) {
    cancelRectSelection();
    return false;
  }

  const coords = clientToWorld(clientX, clientY);
  if (coords) {
    pointerState.rectEnd = coords;
  }

  const start = pointerState.rectStart;
  const end = pointerState.rectEnd;

  pointerState.rectActive = false;
  pointerState.rectStart = null;
  pointerState.rectEnd = null;
  pointerState.rectType = null;

  if (!start || !end) {
    return false;
  }

  return Game.clearRectArea(start.x, start.y, end.x, end.y) > 0;
}

function cancelRectSelection() {
  pointerState.rectActive = false;
  pointerState.rectStart = null;
  pointerState.rectEnd = null;
  pointerState.rectType = null;
}

function processScheduledPaint() {
  pointerState.scheduled = false;

  if (!pointerState.pendingPoint) {
    return;
  }

  const point = pointerState.pendingPoint;
  pointerState.pendingPoint = null;

  if (point.type === 'touch' && !pointerState.touchActive) {
    return;
  }

  if (point.type === 'mouse' && !pointerState.mouseActive) {
    return;
  }

  if (Game.state.rectClearing) {
    return;
  }

  if (Game.ui && typeof Game.ui.isElementModalOpen === 'function') {
    if (Game.ui.isElementModalOpen()) {
      return;
    }
  }

  const coords = clientToWorld(point.x, point.y);

  if (!coords) {
    return;
  }

  Game.paintAtWorld(coords.x, coords.y);
}

function schedulePaint(point) {
  pointerState.pendingPoint = point;

  if (!pointerState.scheduled) {
    pointerState.scheduled = true;
    window.requestAnimationFrame(processScheduledPaint);
  }
}

function handleTouchStart(event) {
  if (event.touches.length > 1) {
    if (event.cancelable) {
      event.preventDefault();
    }
    pointerState.touchActive = false;
    pointerState.pendingPoint = null;
    cancelRectSelection();
    return;
  }

  const touch = event.touches[0] || event.changedTouches[0];

  if (!touch) {
    return;
  }

  pointerState.touchActive = true;

  if (Game.state.rectClearing) {
    if (event.cancelable) {
      event.preventDefault();
    }
    beginRectSelection(touch.clientX, touch.clientY, 'touch');
    return;
  }

  if (event.cancelable) {
    event.preventDefault();
  }

  schedulePaint({ x: touch.clientX, y: touch.clientY, type: 'touch' });
}

function handleTouchMove(event) {
  if (!pointerState.touchActive) {
    return;
  }

  if (event.touches.length > 1) {
    if (event.cancelable) {
      event.preventDefault();
    }
    pointerState.touchActive = false;
    pointerState.pendingPoint = null;
    cancelRectSelection();
    return;
  }

  const touch = event.touches[0] || event.changedTouches[0];

  if (!touch) {
    return;
  }

  if (event.cancelable) {
    event.preventDefault();
  }

  if (Game.state.rectClearing && pointerState.rectActive) {
    updateRectSelection(touch.clientX, touch.clientY);
    return;
  }

  schedulePaint({ x: touch.clientX, y: touch.clientY, type: 'touch' });
}

function handleTouchEnd(event) {
  if (event.cancelable) {
    event.preventDefault();
  }

  if (Game.state.rectClearing && pointerState.rectActive) {
    const touch = event.changedTouches[0] || event.touches[0];
    finalizeRectSelection(touch?.clientX, touch?.clientY);
  }

  pointerState.touchActive = event.touches.length > 0;
  pointerState.pendingPoint = null;
}

function handleTouchCancel() {
  pointerState.touchActive = false;
  pointerState.pendingPoint = null;
  cancelRectSelection();
}

function handleMouseDown(event) {
  if (event.button !== 0) {
    return;
  }

  pointerState.mouseActive = true;
  event.preventDefault();

  if (Game.state.rectClearing) {
    beginRectSelection(event.clientX, event.clientY, 'mouse');
    return;
  }

  schedulePaint({ x: event.clientX, y: event.clientY, type: 'mouse' });
}

function handleMouseMove(event) {
  if (!pointerState.mouseActive) {
    return;
  }

  event.preventDefault();

  if (Game.state.rectClearing && pointerState.rectActive) {
    updateRectSelection(event.clientX, event.clientY);
    return;
  }

  schedulePaint({ x: event.clientX, y: event.clientY, type: 'mouse' });
}

function handleMouseUp(event) {
  if (event.button !== 0) {
    return;
  }

  if (Game.state.rectClearing && pointerState.rectActive) {
    finalizeRectSelection(event.clientX, event.clientY);
  }

  pointerState.mouseActive = false;
  pointerState.pendingPoint = null;
}

function handleMouseLeave() {
  pointerState.mouseActive = false;
  pointerState.pendingPoint = null;
  cancelRectSelection();
}

const canvas = elements.canvas;
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('touchcancel', handleTouchCancel, { passive: false });
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseleave', handleMouseLeave);
canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

const debugVisible = new URLSearchParams(window.location.search).get('debug') !== '0';
const debugOverlay = createDebugOverlay(debugVisible);
const perfHud = createPerfHud();

function updateDebugOverlay() {
  if (!debugOverlay) {
    return;
  }

  const size = renderer.getCanvasSize();
  const now = performance.now();

  debugOverlay.update({
    fps: Game.metrics.fps || 0,
    frameCount: Game.metrics.frameCount,
    canvasWidth: size.width,
    canvasHeight: size.height,
    throttled: now < throttleNoticeUntil,
  });
}

function updatePerfHud() {
  if (!perfHud) {
    return;
  }

  const now = performance.now();
  const particles = refreshParticleCount(false);
  const warning = now < Game.metrics.capWarningUntil;

  perfHud.update({
    fps: Game.metrics.fps || 0,
    particles,
    warning,
  });
}

function handleResize() {
  renderer.resize(world);
  updateDebugOverlay();
  updatePerfHud();
}

function handleViewportChange() {
  renderer.resize(world);
  updateDebugOverlay();
  updatePerfHud();
}

let physicsHandle = null;
function physicsTick() {
  if (!world || Game.state.paused) {
    return;
  }

  beginTick(world);
  stepWorld(world, Game.state);
  endTick(world);

  Game.state.frame += 1;
  simulation.state.frame = (simulation.state.frame || 0) + 1;

  const stepSeconds = Number.isFinite(simulation.state?.stepSeconds)
    ? simulation.state.stepSeconds
    : PHYSICS_STEP_SECONDS;

  simulation.state.elapsed += stepSeconds;
}

function startPhysics() {
  if (physicsHandle !== null) {
    return;
  }

  physicsHandle = window.setInterval(physicsTick, PHYSICS_INTERVAL_MS);
}

function stopPhysics() {
  if (physicsHandle === null) {
    return;
  }

  window.clearInterval(physicsHandle);
  physicsHandle = null;
}

let frameHandle = null;
let lastTimestamp = 0;

function loop(timestamp) {
  if (lastTimestamp === 0) {
    lastTimestamp = timestamp;
  }

  const deltaSeconds = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  Game.metrics.frameCount += 1;

  if (deltaSeconds > 0) {
    const instant = 1 / deltaSeconds;
    if (Game.metrics.fps === 0) {
      Game.metrics.fps = instant;
    } else {
      Game.metrics.fps =
        Game.metrics.fps * (1 - FPS_SMOOTHING) + instant * FPS_SMOOTHING;
    }
  }

  renderer.draw(world);
  updateDebugOverlay();
  updatePerfHud();

  frameHandle = window.requestAnimationFrame(loop);
}

function start() {
  if (frameHandle === null) {
    renderer.resize(world);
    renderer.draw(world);
    updateDebugOverlay();
    updatePerfHud();
    lastTimestamp = 0;
    frameHandle = window.requestAnimationFrame(loop);
  }

  startPhysics();
}

function stop() {
  if (frameHandle !== null) {
    window.cancelAnimationFrame(frameHandle);
    frameHandle = null;
  }

  stopPhysics();
}

function handleVisibilityChange() {
  if (document.hidden) {
    stop();
  } else if (frameHandle === null) {
    start();
  }
}

Game.start = start;
Game.stop = stop;
Game.destroy = function destroy() {
  stop();
  canvas.removeEventListener('touchstart', handleTouchStart);
  canvas.removeEventListener('touchmove', handleTouchMove);
  canvas.removeEventListener('touchend', handleTouchEnd);
  canvas.removeEventListener('touchcancel', handleTouchCancel);
  canvas.removeEventListener('mousedown', handleMouseDown);
  canvas.removeEventListener('mousemove', handleMouseMove);
  canvas.removeEventListener('mouseup', handleMouseUp);
  canvas.removeEventListener('mouseleave', handleMouseLeave);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('orientationchange', handleResize);
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', handleViewportChange);
    window.visualViewport.removeEventListener('scroll', handleViewportChange);
  }
  window.removeEventListener('keydown', handleKeydown);
  if (Game.ui && typeof Game.ui.destroy === 'function') {
    Game.ui.destroy();
  }
  if (debugOverlay) {
    debugOverlay.destroy();
  }
  if (perfHud) {
    perfHud.destroy();
  }
};

Object.defineProperty(Game, 'isRunning', {
  get() {
    return frameHandle !== null;
  },
});

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);
document.addEventListener('visibilitychange', handleVisibilityChange);

const viewport = window.visualViewport;

if (viewport) {
  viewport.addEventListener('resize', handleViewportChange);
  viewport.addEventListener('scroll', handleViewportChange);
}

function handleKeydown(event) {
  if (event.defaultPrevented) {
    return;
  }

  if (event.key === 'e' || event.key === 'E') {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    if (isFormField(event.target)) {
      return;
    }

    Game.toggleEraser();
  }
}

window.addEventListener('keydown', handleKeydown);

const ui = initializeUI(Game);
Game.ui = ui;

renderer.resize(world);
renderer.draw(world);
updateDebugOverlay();
updatePerfHud();

start();

Promise.resolve(runSelfChecks())
  .then((baseResult) => Promise.all([baseResult, runSelfChecksPhase4(baseResult)]))
  .then(([baseResult, phase4Result]) => {
    if (!baseResult || typeof baseResult !== 'object') {
      console.error('❌ Phase 0–3 checks failed: Self-check did not return a result');
      return;
    }

    const baseIssues = [];
    if (Array.isArray(baseResult.failures)) {
      baseIssues.push(...baseResult.failures);
    }
    if (Array.isArray(baseResult.phase2?.failures)) {
      baseIssues.push(...baseResult.phase2.failures);
    }
    if (Array.isArray(baseResult.phase3?.failures)) {
      baseIssues.push(...baseResult.phase3.failures);
    }

    if (baseIssues.length === 0) {
      console.log('✅ Phase 0–3 checks passed');
    } else {
      const lines = ['❌ Phase 0–3 checks failed:'];
      for (const failure of baseIssues) {
        lines.push(String(failure));
      }
      console.error(lines.join('\n'));
    }

    if (!phase4Result || typeof phase4Result !== 'object') {
      console.error('❌ Phase 4 regressions: Self-check did not return a result');
    }

    console.info(
      'Modified: src/elements.js, src/sim.js, src/main.js, src/selfcheck.js — reload or rerun self-checks via console to validate.',
    );
  })
  .catch((error) => {
    console.error('❌ Phase 0–3 checks failed:', error);
  });

function installQC() {
  const helper = {
    paintDot(x, y) {
      Game.paintAtWorld(Number(x), Number(y), 0, SAND);
    },
    paintLine(x0, y0, x1, y1) {
      const startX = Number(x0);
      const startY = Number(y0);
      const endX = Number(x1);
      const endY = Number(y1);

      if (!Number.isFinite(startX) || !Number.isFinite(startY) || !Number.isFinite(endX) || !Number.isFinite(endY)) {
        return;
      }

      const dx = endX - startX;
      const dy = endY - startY;
      const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);

      for (let step = 0; step <= steps; step += 1) {
        const t = steps === 0 ? 0 : step / steps;
        const px = startX + dx * t;
        const py = startY + dy * t;
        Game.paintAtWorld(px, py);
      }
    },
    togglePause() {
      Game.togglePause();
      return Game.state.paused;
    },
    clear() {
      Game.clearWorld();
    },
    clearRect(x0, y0, x1, y1) {
      Game.clearRectArea(Number(x0), Number(y0), Number(x1), Number(y1));
    },
    setBrush(size) {
      Game.setBrushSize(size);
      return Game.state.brushSize;
    },
    setElement(id) {
      Game.setCurrentElementId(id);
      return Game.state.currentElementId;
    },
    toggleEraser() {
      Game.toggleEraser();
      return Game.state.erasing;
    },
    toggleRectClear() {
      Game.toggleRectClear();
      return Game.state.rectClearing;
    },
    particles() {
      refreshParticleCount(true);
      return Game.metrics.particleCount;
    },
    setSeed(seed) {
      return Game.setSeed(seed);
    },
    testWaterOverSand() {
      const testWorld = Game.simulation?.state?.world;

      if (!testWorld) {
        return null;
      }

      const wasPaused = Boolean(Game.state.paused);
      Game.togglePause(true);

      const stats = runWaterOverSandTest(testWorld, {
        seed: Game.state.seed,
        frame: Game.state.frame,
      });

      renderer.draw(testWorld);
      updateDebugOverlay();
      updatePerfHud();

      if (!wasPaused) {
        Game.togglePause(false);
      }

      return stats;
    },
  };

  const hostname = (window.location && window.location.hostname) || '';
  const likelyProduction =
    window.location.protocol !== 'file:' &&
    hostname !== '' &&
    !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(hostname);

  if (likelyProduction) {
    Object.defineProperty(window, 'QC', {
      value: undefined,
      configurable: true,
    });
  } else {
    Object.defineProperty(window, 'QC', {
      value: helper,
      writable: false,
      configurable: true,
    });
  }
}

installQC();

window.Game = Game;
