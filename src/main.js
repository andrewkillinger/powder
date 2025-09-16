import { createGameElements } from './elements.js';
import { createRenderer } from './render.js';
import { createSimulation } from './sim.js';
import { initializeUI } from './ui.js';

const elements = createGameElements();
const simulation = createSimulation();
const renderer = createRenderer(elements.canvas, elements.context);
const ui = initializeUI(elements.canvas);
const viewport = window.visualViewport;

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

  renderer.resize();
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
  renderer.resize();
}

function handleViewportChange() {
  renderer.resize();
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
