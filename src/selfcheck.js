import { createWorld } from './sim.js';
import { ELEMENTS, EMPTY, WALL, SAND } from './elements.js';

function normalizeMetaContent(value) {
  return (value || '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function contentsMatch(expectedParts, actualParts) {
  return expectedParts.every((part) => actualParts.includes(part));
}

async function runCheck(fn, bucket) {
  try {
    const result = await fn();
    if (typeof result === 'string' && result.length > 0) {
      bucket.push(result);
    }
  } catch (error) {
    bucket.push(error?.message || String(error));
  }
}

async function verifyRenderLoop() {
  return new Promise((resolve) => {
    let resolved = false;
    let frames = 0;
    const start = performance.now();

    function finish(message) {
      if (resolved) {
        return;
      }
      resolved = true;
      resolve(message);
    }

    function step() {
      frames += 1;

      if (frames >= 2) {
        finish(null);
        return;
      }

      if (performance.now() - start > 300) {
        finish('Render loop did not advance within 300 ms.');
        return;
      }

      window.requestAnimationFrame(step);
    }

    window.requestAnimationFrame(step);

    setTimeout(() => {
      finish('Render loop did not advance within 300 ms.');
    }, 320);
  });
}

function compareBuffers(before, after) {
  if (!before || !after) {
    return false;
  }

  const length = Math.min(before.length, after.length);

  for (let i = 0; i < length; i += 1) {
    if (before[i] !== after[i]) {
      return true;
    }
  }

  return false;
}

export async function runSelfChecks() {
  const failures = [];
  const phase2Failures = [];

  await runCheck(() => {
    if (!window.Game || typeof window.Game !== 'object') {
      return 'window.Game is missing or not an object.';
    }
    return null;
  }, failures);

  await runCheck(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      return 'Viewport meta tag is missing.';
    }

    const expected = [
      'width=device-width',
      'initial-scale=1',
      'maximum-scale=1',
      'user-scalable=no',
    ];
    const actualParts = normalizeMetaContent(meta.getAttribute('content'));

    if (!contentsMatch(expected, actualParts)) {
      return 'Viewport meta content must include width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no.';
    }

    return null;
  }, failures);

  await runCheck(() => {
    const canvas = document.getElementById('game');

    if (!(canvas instanceof HTMLCanvasElement)) {
      return 'Main canvas #game was not found.';
    }

    if (canvas.width <= 0 || canvas.height <= 0) {
      return 'Canvas #game must have a positive width and height.';
    }

    const root = document.documentElement;
    const body = document.body;
    const tolerance = 1;

    const rootScrollable =
      root.scrollHeight - root.clientHeight > tolerance ||
      root.scrollWidth - root.clientWidth > tolerance;
    const bodyScrollable =
      body.scrollHeight - body.clientHeight > tolerance ||
      body.scrollWidth - body.clientWidth > tolerance;

    if (rootScrollable || bodyScrollable) {
      return 'Document should not have scrollbars when the game canvas fills the viewport.';
    }

    return null;
  }, failures);

  await runCheck(async () => {
    if (typeof window.requestAnimationFrame !== 'function') {
      return 'requestAnimationFrame is unavailable.';
    }

    return await verifyRenderLoop();
  }, failures);

  await runCheck(() => {
    if (typeof createWorld !== 'function') {
      return 'createWorld is not a function.';
    }

    const testWorld = createWorld(8, 8);

    if (!testWorld || typeof testWorld !== 'object') {
      return 'createWorld did not return a valid world object.';
    }

    if (typeof testWorld.width !== 'number' || typeof testWorld.height !== 'number') {
      return 'World dimensions must be numeric.';
    }

    if (!(testWorld.cells instanceof Uint16Array)) {
      return 'world.cells must be a Uint16Array.';
    }

    if (!(testWorld.flags instanceof Uint8Array)) {
      return 'world.flags must be a Uint8Array.';
    }

    return null;
  }, failures);

  await runCheck(() => {
    const world = createWorld(4, 4);

    if (typeof world.idx !== 'function' || typeof world.inBounds !== 'function') {
      return 'World helper functions idx and inBounds must exist.';
    }

    try {
      if (world.idx(1, 0) !== 1) {
        return 'idx(1, 0) should equal 1.';
      }
    } catch (error) {
      return `idx(1, 0) threw an error: ${error?.message || error}`;
    }

    if (world.inBounds(0, 0) !== true) {
      return 'inBounds(0, 0) should return true.';
    }

    if (world.inBounds(-1, 0) !== false) {
      return 'inBounds(-1, 0) should return false.';
    }

    if (world.inBounds(world.width, 0) !== false) {
      return 'inBounds(width, 0) should return false.';
    }

    return null;
  }, failures);

  await runCheck(() => {
    const game = window.Game;

    if (!game) {
      return 'Game object is unavailable.';
    }

    const elements = game.ELEMENTS || ELEMENTS;
    const palette = window.PALETTE || game.PALETTE;
    const emptyId = window.EMPTY ?? game.constants?.EMPTY ?? elements.EMPTY;
    const wallId = window.WALL ?? game.constants?.WALL ?? elements.WALL;
    const sandId = window.SAND ?? game.constants?.SAND ?? elements.SAND;

    if (!elements) {
      return 'ELEMENTS constants are unavailable.';
    }

    if (typeof emptyId !== 'number' || typeof wallId !== 'number' || typeof sandId !== 'number') {
      return 'EMPTY, WALL, and SAND constants must be numbers.';
    }

    if (!palette) {
      return 'PALETTE is unavailable.';
    }

    const wallColor = palette[wallId];
    const sandColor = palette[sandId];

    const validSwatch = (swatch) =>
      Array.isArray(swatch) &&
      swatch.length === 4 &&
      swatch.every((value) => Number.isInteger(value) && value >= 0 && value <= 255);

    if (!validSwatch(wallColor) || !validSwatch(sandColor)) {
      return 'PALETTE[WALL] and PALETTE[SAND] must be [r, g, b, a] arrays.';
    }

    return null;
  }, failures);

  await runCheck(() => {
    const game = window.Game;

    if (!game || !game.renderer || typeof game.renderer.draw !== 'function') {
      return 'Game.renderer.draw is unavailable.';
    }

    const originalWorld = game.simulation?.state?.world || null;
    const tempWorld = createWorld(16, 16);

    try {
      const idx = tempWorld.idx;
      tempWorld.cells[idx(1, 1)] = WALL;
      tempWorld.cells[idx(2, 2)] = SAND;
      tempWorld.cells[idx(3, 3)] = SAND;
      game.renderer.draw(tempWorld);
    } catch (error) {
      return `Renderer dry run failed: ${error?.message || error}`;
    } finally {
      if (originalWorld) {
        game.renderer.resize(originalWorld);
        game.renderer.draw(originalWorld);
      }
    }

    return null;
  }, failures);

  await runCheck(() => {
    const game = window.Game;

    if (!game || !game.renderer || typeof game.renderer.draw !== 'function') {
      return 'Game.renderer.draw is unavailable for integrity testing.';
    }

    const originalWorld = game.simulation?.state?.world || null;
    const tempWorld = createWorld(8, 8);

    try {
      tempWorld.cells.fill(EMPTY);
      tempWorld.flags.fill(0);
      game.renderer.draw(tempWorld);
      const before = game.renderer.readPixels();
      const idx = tempWorld.idx;
      tempWorld.cells[idx(2, 2)] = SAND;
      game.renderer.draw(tempWorld);
      const after = game.renderer.readPixels();

      if (!compareBuffers(before, after)) {
        return 'Painting SAND into the world did not modify the canvas pixels.';
      }
    } catch (error) {
      return `Renderer paint integrity check failed: ${error?.message || error}`;
    } finally {
      if (originalWorld) {
        game.renderer.resize(originalWorld);
        game.renderer.draw(originalWorld);
      }
    }

    return null;
  }, failures);

  const baseOk = failures.length === 0;

  await runCheck(async () => {
    const game = window.Game;

    if (!game || !game.ui || !game.ui.elements || !game.ui.elements.pauseToggle) {
      return 'Pause toggle button is unavailable for UI test.';
    }

    const pauseButton = game.ui.elements.pauseToggle;
    const initialState = Boolean(game.state?.paused);

    pauseButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    if (Boolean(game.state?.paused) === initialState) {
      return 'Pause toggle did not update Game.state.paused.';
    }

    pauseButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    if (Boolean(game.state?.paused) !== initialState) {
      game.togglePause(initialState);
    }

    return null;
  }, phase2Failures);

  await runCheck(async () => {
    const game = window.Game;

    if (!game || !game.ui || !game.ui.elements || !game.ui.elements.brushSize) {
      return 'Brush size control is unavailable for binding check.';
    }

    const slider = game.ui.elements.brushSize;
    const originalValue = slider.value;

    slider.value = '13';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    if (game.state?.brushSize !== 13) {
      slider.value = originalValue;
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      return 'Brush size control did not update Game.state.brushSize to 13.';
    }

    slider.value = originalValue;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    return null;
  }, phase2Failures);

  const phase2Ok = baseOk && phase2Failures.length === 0;

  const result = {
    ok: baseOk,
    failures,
    phase2: {
      ok: phase2Ok,
      failures: phase2Failures,
    },
  };

  console.info(
    '[SelfCheck]',
    baseOk ? 'Phase 0–1 OK' : `Phase 0–1 failures: ${failures.length}`,
    '|',
    phase2Ok ? 'Phase 2 OK' : `Phase 2 issues: ${phase2Failures.length}`,
  );

  return result;
}
