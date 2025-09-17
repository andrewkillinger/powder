import { createGameElements, ELEMENTS } from './elements.js';
import { createRenderer } from './render.js';
import { createSimulation } from './sim.js';
import { initializeUI } from './ui.js';

const elements = createGameElements();
const simulation = createSimulation();
const renderer = createRenderer(elements.canvas, elements.context);
const ui = initializeUI(elements.canvas);
const viewport = window.visualViewport;

const world = simulation.state.world;

function paintDebugWorld(targetWorld) {
  if (!targetWorld) {
    return;
  }

  const { width, height, cells } = targetWorld;
  const { idx } = targetWorld;

  if (width === 0 || height === 0) {
    return;
  }

  // Draw a WALL border around the world bounds.
  for (let x = 0; x < width; x += 1) {
    cells[idx(x, 0)] = ELEMENTS.WALL;
    cells[idx(x, Math.max(height - 1, 0))] = ELEMENTS.WALL;
  }

  for (let y = 0; y < height; y += 1) {
    cells[idx(0, y)] = ELEMENTS.WALL;
    cells[idx(Math.max(width - 1, 0), y)] = ELEMENTS.WALL;
  }

  // Fill a 100x100 area with SAND (or as large as fits inside the border).
  const sandWidth = Math.max(Math.min(100, width - 2), 0);
  const sandHeight = Math.max(Math.min(100, height - 2), 0);

  for (let y = 0; y < sandHeight; y += 1) {
    const row = y + 1;
    for (let x = 0; x < sandWidth; x += 1) {
      cells[idx(x + 1, row)] = ELEMENTS.SAND;
    }
  }
}

paintDebugWorld(world);

renderer.resize(world);

let frameHandle = null;
let lastTimestamp = 0;

function loop(timestamp) {
  if (lastTimestamp === 0) {
    lastTimestamp = timestamp;
  }

  const deltaSeconds = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  simulation.update(deltaSeconds);
  renderer.render(simulation.state);

  frameHandle = window.requestAnimationFrame(loop);
}

function start() {
  if (frameHandle !== null) {
    return;
  }

  renderer.resize(simulation.state.world);
  lastTimestamp = 0;
  frameHandle = window.requestAnimationFrame(loop);
}

function stop() {
  if (frameHandle === null) {
    return;
  }

  window.cancelAnimationFrame(frameHandle);
  frameHandle = null;
}

function handleResize() {
  renderer.resize(simulation.state.world);
}

function handleViewportChange() {
  renderer.resize(simulation.state.world);
}

function handleVisibilityChange() {
  if (document.hidden) {
    stop();
  } else {
    start();
  }
}

window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);
document.addEventListener('visibilitychange', handleVisibilityChange);

if (viewport) {
  viewport.addEventListener('resize', handleViewportChange);
  viewport.addEventListener('scroll', handleViewportChange);
}

start();

const Game = {
  elements,
  simulation,
  renderer,
  ui,
  start,
  stop,
  destroy() {
    stop();
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    if (viewport) {
      viewport.removeEventListener('resize', handleViewportChange);
      viewport.removeEventListener('scroll', handleViewportChange);
    }
    ui.destroy();
  },
  get isRunning() {
    return frameHandle !== null;
  },
};

window.Game = Game;
