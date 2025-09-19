import {
  ELEMENTS,
  PALETTE,
  MATERIAL_CATEGORIES,
  createPaletteBuffer,
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
  initSim,
  beginTick,
  endTick,
  step,
  paintCircle,
  fillRect,
  getParticleCount,
  idx,
  inBounds,
  mulberry32,
} from './sim.js';
import { initUI } from './ui.js';
import { serialize, deserialize, SAVE_FILE_VERSION } from './persistence.js';
import { runSelfChecksAll } from './selfcheck.js';

const SOFT_PARTICLE_CAP = 60000;
const PHYSICS_HZ = 60;
const WORLD_WIDTH = 256;
const WORLD_HEIGHT = 256;
const VIEWPORT_MIN_SCALE = 1;
const VIEWPORT_MAX_SCALE = 4;

const STORAGE_KEY_PREFIX = 'powder.save.slot.';
const STORAGE_TEST_KEY = 'powder.save.test';
const SAVE_SLOT_FORMAT_VERSION = 1;
const SAVE_SLOTS = [
  { id: 'slot-a', name: 'Slot A' },
  { id: 'slot-b', name: 'Slot B' },
  { id: 'slot-c', name: 'Slot C' },
];

const PALETTE_BUFFER = createPaletteBuffer();

let cachedStorage = undefined;

function getStorage() {
  if (cachedStorage !== undefined) {
    return cachedStorage;
  }
  cachedStorage = null;
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return cachedStorage;
    }
    const storage = window.localStorage;
    storage.setItem(STORAGE_TEST_KEY, '1');
    storage.removeItem(STORAGE_TEST_KEY);
    cachedStorage = storage;
  } catch (error) {
    console.warn('Local storage unavailable:', error);
    cachedStorage = null;
  }
  return cachedStorage;
}

function computeByteLength(value) {
  if (typeof value !== 'string') {
    return 0;
  }
  if (typeof TextEncoder !== 'undefined') {
    try {
      return new TextEncoder().encode(value).length;
    } catch (error) {
      // ignore encoder failures
    }
  }
  return value.length;
}

function getSlotDefinition(slotId) {
  return SAVE_SLOTS.find((slot) => slot.id === slotId) ?? { id: slotId, name: slotId };
}

function listSaveSlots() {
  const storage = getStorage();
  return SAVE_SLOTS.map((slot) => {
    if (!storage) {
      return {
        id: slot.id,
        name: slot.name,
        savedAt: null,
        hasData: false,
        corrupt: false,
        bytes: 0,
        storageAvailable: false,
      };
    }
    const key = `${STORAGE_KEY_PREFIX}${slot.id}`;
    const raw = storage.getItem(key);
    if (typeof raw !== 'string') {
      return {
        id: slot.id,
        name: slot.name,
        savedAt: null,
        hasData: false,
        corrupt: false,
        bytes: 0,
        storageAvailable: true,
      };
    }
    let payload = null;
    let corrupt = false;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      console.warn(`Corrupt save slot ${slot.id}`, error);
      corrupt = true;
    }
    const savedAt = typeof payload?.savedAt === 'string' ? payload.savedAt : null;
    const hasWorld = Boolean(payload?.world || payload?.cells);
    return {
      id: slot.id,
      name: slot.name,
      savedAt,
      hasData: hasWorld && !corrupt,
      corrupt,
      bytes: computeByteLength(raw),
      storageAvailable: true,
    };
  });
}

function formatSlotTimestamp(value) {
  if (!value) {
    return 'Empty';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }
  const now = Date.now();
  const diff = Math.abs(now - date.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) {
    return 'Just now';
  }
  if (diff < hour) {
    const mins = Math.round(diff / minute);
    return `${mins} min ago`;
  }
  if (diff < day) {
    const hours = Math.round(diff / hour);
    return `${hours} hr ago`;
  }
  return date.toLocaleString();
}

function formatSlotSize(bytes) {
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
}

function saveSlot(slotId, world, state, viewport) {
  const storage = getStorage();
  if (!storage) {
    return { ok: false, error: 'Local storage is unavailable.' };
  }
  const slot = getSlotDefinition(slotId);
  let snapshot;
  try {
    snapshot = serialize(world);
  } catch (error) {
    console.error('Failed to serialize world:', error);
    return { ok: false, error: 'Unable to serialize world.' };
  }

  const payload = {
    formatVersion: SAVE_SLOT_FORMAT_VERSION,
    worldVersion: SAVE_FILE_VERSION,
    slot: { id: slot.id, name: slot.name },
    savedAt: new Date().toISOString(),
    world: snapshot,
    state: {
      seed: state?.seed,
      frame: state?.frame,
      brushSize: state?.brushSize,
      currentElementId: state?.currentElementId,
      erasing: state?.erasing,
      paused: state?.paused,
    },
    viewport: {
      scale: viewport?.scale,
      offsetX: viewport?.offsetX,
      offsetY: viewport?.offsetY,
    },
  };

  let json;
  try {
    json = JSON.stringify(payload);
  } catch (error) {
    console.error('Failed to encode save payload:', error);
    return { ok: false, error: 'Unable to encode save payload.' };
  }

  try {
    storage.setItem(`${STORAGE_KEY_PREFIX}${slot.id}`, json);
  } catch (error) {
    console.error('Failed to write save slot:', error);
    return { ok: false, error: 'Failed to write to local storage.' };
  }

  return {
    ok: true,
    savedAt: payload.savedAt,
    bytes: computeByteLength(json),
  };
}

function loadSlot(slotId) {
  const storage = getStorage();
  if (!storage) {
    return { ok: false, error: 'Local storage is unavailable.' };
  }
  const key = `${STORAGE_KEY_PREFIX}${slotId}`;
  const raw = storage.getItem(key);
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Save slot is empty.', empty: true };
  }

  let payload = null;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to parse save slot data:', error);
    return { ok: false, error: 'Save data is corrupted.', corrupt: true };
  }

  const worldData = payload?.world ?? payload;
  const world = deserialize(worldData);
  if (!world) {
    return { ok: false, error: 'Save data is incompatible with this version.' };
  }

  return {
    ok: true,
    world,
    savedAt: typeof payload?.savedAt === 'string' ? payload.savedAt : null,
    state: typeof payload?.state === 'object' ? payload.state : null,
    viewport: typeof payload?.viewport === 'object' ? payload.viewport : null,
    bytes: computeByteLength(raw),
  };
}

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

function applyLoadedState(state) {
  let needsEmit = false;

  if (!state || typeof state !== 'object') {
    if (Game.state.frame !== 0) {
      Game.state.frame = 0;
      needsEmit = true;
    }
    if (needsEmit) {
      emitState();
    }
    return;
  }

  if (Number.isFinite(state.seed)) {
    const nextSeed = Math.trunc(state.seed);
    if (Game.state.seed !== nextSeed) {
      Game.state.seed = nextSeed;
      needsEmit = true;
    }
  }

  if (Number.isFinite(state.frame)) {
    const nextFrame = Math.max(0, Math.trunc(state.frame));
    if (Game.state.frame !== nextFrame) {
      Game.state.frame = nextFrame;
      needsEmit = true;
    }
  } else if (Game.state.frame !== 0) {
    Game.state.frame = 0;
    needsEmit = true;
  }

  if (Number.isFinite(state.brushSize)) {
    setBrushSize(state.brushSize);
  }

  if (Number.isFinite(state.currentElementId)) {
    setCurrentElement(state.currentElementId);
  }

  if (typeof state.erasing === 'boolean') {
    setEraser(state.erasing);
  }

  if (typeof state.paused === 'boolean') {
    setPaused(state.paused);
  }

  if (needsEmit) {
    emitState();
  }
}

function applyLoadedViewport(viewport) {
  const target = Game.viewport;
  if (!target) {
    return;
  }

  if (viewport && typeof viewport === 'object') {
    if (Number.isFinite(viewport.scale)) {
      target.scale = viewport.scale;
    }
    if (Number.isFinite(viewport.offsetX)) {
      target.offsetX = viewport.offsetX;
    } else {
      target.offsetX = 0;
    }
    if (Number.isFinite(viewport.offsetY)) {
      target.offsetY = viewport.offsetY;
    } else {
      target.offsetY = 0;
    }
  } else {
    target.offsetX = 0;
    target.offsetY = 0;
  }

  syncViewport(Game.world);
}

function installQC() {
  const qc = {
    ping: () => 'pong',
    count: () => refreshParticleCount(Game.world),
    pause: (value) => setPaused(value ?? !Game.state.paused),
    listAll: () =>
      Object.values(Game.materials || ELEMENTS || {}).map((m) => ({
        id: m.id,
        name: m.name,
        cat: m.cat,
        implemented: Boolean(m.implemented),
      })),
    listUnimplemented: () =>
      Object.values(Game.materials || ELEMENTS || {})
        .filter((m) => !m?.implemented)
        .map((m) => m.name),
    pickById: (id) => setCurrentElement(id),
    colorOf: (id) => (Array.isArray(PALETTE) ? PALETTE[id] : undefined),
    demoContact: (a, b) => {
      const router = Game.interactions?.router;
      if (!router || typeof router.onContact !== 'function') {
        return false;
      }
      router.onContact(a, b, () => {});
      return true;
    },
  };

  window.QC = qc;
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
  const rng = mulberry32(Game.state.seed || 1337);
  const simCtx = initSim(world, rng);
  Game.sim = simCtx;
  Game.interactions = simCtx;
  Game.materials = ELEMENTS;
  Game.palette = PALETTE;
  Game.paletteBuffer = PALETTE_BUFFER;
  syncViewport(world);

  const renderer = createRenderer(canvas, world, PALETTE_BUFFER);
  Game.renderer = renderer;
  renderer.draw(world, { viewport: Game.viewport });

  const overlay = createOverlay();
  Game.hud = {
    element: overlay,
    update: (info) => updateOverlay(overlay, info),
  };
  function refreshHud() {
    const count = refreshParticleCount(Game.world);
    updateOverlay(overlay, { fps: Game.metrics.fps, count });
  }
  refreshHud();

  function handleSaveSlotRequest(slotId) {
    const result = saveSlot(slotId, Game.world, Game.state, Game.viewport);
    if (!result?.ok && result?.error) {
      window.alert(result.error);
    } else if (result?.ok) {
      console.info(
        '[Powder Mobile] Saved %s (%s)',
        slotId,
        formatSlotSize(result.bytes) || 'size unknown',
      );
    }
    Game.ui?.refreshSlots?.();
    return result;
  }

  function handleLoadSlotRequest(slotId) {
    const result = loadSlot(slotId);
    if (!result?.ok) {
      if (!result?.empty && result?.error) {
        window.alert(result.error);
      }
      Game.ui?.refreshSlots?.();
      return result;
    }

    const nextWorld = result.world;
    if (!nextWorld) {
      return { ok: false, error: 'Loaded save did not contain a world.' };
    }

    Game.world = nextWorld;
    applyLoadedViewport(result.viewport);
    if (renderer?.resize) {
      renderer.resize(nextWorld);
    }
    renderer.draw(nextWorld, { viewport: Game.viewport });
    refreshParticleCount(nextWorld);
    refreshHud();
    applyLoadedState(result.state);
    Game.ui?.refreshSlots?.();
    console.info(
      '[Powder Mobile] Loaded %s (%s)',
      slotId,
      formatSlotSize(result.bytes) || 'size unknown',
    );
    return result;
  }

  const ui = initUI({
    Game,
    materials: ELEMENTS,
    categories: MATERIAL_CATEGORIES,
    onPauseToggle: () => setPaused(),
    onClear: () => {
      clearWorld();
      renderer.draw(Game.world, { viewport: Game.viewport });
      refreshHud();
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
    getSlots: () => listSaveSlots(),
    onSaveSlot: handleSaveSlotRequest,
    onLoadSlot: handleLoadSlotRequest,
    formatSlotTimestamp,
    formatSlotSize,
  });
  Game.ui = ui;

  stateListeners.add((state) => {
    ui.update(state);
  });
  ui.update(Game.state);
  if (ui.refreshSlots) {
    ui.refreshSlots();
  }

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
    initSim,
    beginTick,
    endTick,
    step,
    paintCircle,
    fillRect,
    getParticleCount,
    idx,
    inBounds,
    Renderer: { createRenderer },
    mulberry32,
    materials: ELEMENTS,
    palette: PALETTE,
    paletteBuffer: PALETTE_BUFFER,
    categories: MATERIAL_CATEGORIES,
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
    step(Game.world, {
      state: Game.state,
      limits: Game.limits,
      metrics: Game.metrics,
      router: Game.interactions?.router,
    });
    endTick(Game.world);
    Game.state.frame += 1;
  }, 1000 / PHYSICS_HZ);
  Game.physicsHandle = physics;

  console.info('[Materials] Boot OK — interactions router active');
}

document.addEventListener('DOMContentLoaded', start, { once: true });
