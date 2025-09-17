import { createWorld, beginTick, endTick, step as stepWorld } from './sim.js';
import { ELEMENTS, EMPTY, WALL, SAND, WATER } from './elements.js';

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
    const game = window.Game;
    const startFrame = Number(game?.metrics?.frameCount ?? 0);
    const startTime = performance.now();

    function check() {
      const currentFrame = Number(game?.metrics?.frameCount ?? 0);

      if (currentFrame > startFrame) {
        resolve(null);
        return;
      }

      if (performance.now() - startTime > 300) {
        resolve('Render loop did not advance within 300 ms.');
        return;
      }

      window.requestAnimationFrame(check);
    }

    window.requestAnimationFrame(check);
  });
}

function compareBuffers(before, after) {
  if (!before || !after) {
    return false;
  }

  if (before.length !== after.length) {
    return false;
  }

  for (let i = 0; i < before.length; i += 1) {
    if (before[i] !== after[i]) {
      return true;
    }
  }

  return false;
}

function cloneGameStateForSimulation() {
  const game = window.Game;

  if (game && game.state) {
    return {
      seed: game.state.seed ?? 0,
      frame: game.state.frame ?? 0,
    };
  }

  return { seed: 0, frame: 0 };
}

function runSimulationSteps(world, steps, state) {
  if (!world || steps <= 0) {
    return;
  }

  const stepState = state ?? { seed: 0, frame: 0 };
  const context = { state: stepState };

  for (let i = 0; i < steps; i += 1) {
    beginTick(world);
    stepWorld(world, context);
    endTick(world);
    stepState.frame = (stepState.frame ?? 0) + 1;
  }
}

function findElementPositions(world, elementId) {
  const positions = [];

  if (!world || !world.cells || !world.width) {
    return positions;
  }

  const width = world.width;

  for (let index = 0; index < world.cells.length; index += 1) {
    if (world.cells[index] === elementId) {
      positions.push({
        index,
        x: index % width,
        y: Math.floor(index / width),
      });
    }
  }

  return positions;
}

function arraysEqual(a, b) {
  if (!a || !b || a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}
export async function runSelfChecks() {
  const failures = [];
  const phase2Failures = [];
  const phase3Failures = [];

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

    if (!(testWorld.lastMoveDir instanceof Int8Array)) {
      return 'world.lastMoveDir must be an Int8Array.';
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

    const elements = game.elementDefinitions || ELEMENTS;
    const palette = game.PALETTE || {};

    if (!Array.isArray(elements) || elements.length === 0) {
      return 'Element definitions are unavailable.';
    }

    const waterMeta = elements[WATER];
    if (!waterMeta || typeof waterMeta.lateralRunMax !== 'number') {
      return 'Water metadata must define lateralRunMax.';
    }

    const validSwatch = (swatch) =>
      Array.isArray(swatch) &&
      swatch.length === 4 &&
      swatch.every((value) => Number.isInteger(value) && value >= 0 && value <= 255);

    if (!validSwatch(palette[WALL]) || !validSwatch(palette[SAND])) {
      return 'PALETTE entries for WALL and SAND must be [r, g, b, a] arrays.';
    }

    if (typeof EMPTY !== 'number' || typeof WALL !== 'number' || typeof SAND !== 'number') {
      return 'EMPTY, WALL, and SAND constants must be numbers.';
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
      if (tempWorld.lastMoveDir) {
        tempWorld.lastMoveDir.fill(0);
      }
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
  await runCheck(() => {
    const toolbar = document.getElementById('powder-toolbar');
    if (!toolbar) {
      return 'Toolbar element #powder-toolbar is missing.';
    }

    const elementButton = toolbar.querySelector('button.ui-button.elements');
    const pauseButton = toolbar.querySelector('button.ui-button.pause');
    const clearButton = toolbar.querySelector('button.ui-button.clear');
    const eraserButton = toolbar.querySelector('button.ui-button.eraser');
    const brushInput = toolbar.querySelector('input[type="range"]');

    if (!elementButton || !pauseButton || !clearButton || !eraserButton || !brushInput) {
      return 'Toolbar buttons (Elements, Pause, Clear, Eraser, Brush range) must exist.';
    }

    return null;
  }, phase2Failures);

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

  await runCheck(async () => {
    const game = window.Game;
    const toolbar = document.getElementById('powder-toolbar');
    const world = game?.simulation?.state?.world;

    if (!toolbar) {
      return 'Toolbar element is required for interaction safety test.';
    }

    if (!world || !world.cells) {
      return 'World is unavailable for toolbar interaction test.';
    }

    const wasPaused = Boolean(game.state?.paused);
    game.togglePause(true);

    const before = new Uint16Array(world.cells);
    toolbar.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    game.togglePause(wasPaused);

    if (!arraysEqual(before, world.cells)) {
      return 'Toolbar interactions should not trigger canvas painting.';
    }

    return null;
  }, phase2Failures);

  await runCheck(() => {
    const game = window.Game;
    const stepSeconds = Number(game?.simulation?.state?.stepSeconds);

    if (!Number.isFinite(stepSeconds)) {
      return 'Game.simulation.state.stepSeconds must be a finite number.';
    }

    if (stepSeconds < 1 / 60 - 0.002 || stepSeconds > 1 / 20 + 0.005) {
      return 'Simulation stepSeconds must correspond to roughly 20–60 Hz.';
    }

    return null;
  }, phase3Failures);

  await runCheck(() => {
    const world = createWorld(6, 6);
    const idx = world.idx;
    world.cells[idx(2, 1)] = SAND;

    const state = cloneGameStateForSimulation();
    runSimulationSteps(world, 30, state);

    const positions = findElementPositions(world, SAND);
    if (positions.length === 0) {
      return 'SAND disappeared during gravity test.';
    }

    if (!positions.some((pos) => pos.y > 1)) {
      return 'SAND did not fall downward after 30 steps.';
    }

    const wallWorld = createWorld(4, 4);
    const wallIdx = wallWorld.idx;
    wallWorld.cells[wallIdx(1, 3)] = WALL;
    wallWorld.cells[wallIdx(1, 0)] = SAND;

    const wallState = cloneGameStateForSimulation();
    runSimulationSteps(wallWorld, 12, wallState);

    if (wallWorld.cells[wallIdx(1, 3)] !== WALL || wallWorld.cells[wallIdx(1, 2)] !== SAND) {
      return 'SAND passed through WALL during gravity test.';
    }

    return null;
  }, phase3Failures);

  await runCheck(() => {
    const world = createWorld(5, 6);
    const idx = world.idx;
    world.cells[idx(2, 0)] = SAND;

    const state = cloneGameStateForSimulation();
    let previousY = 0;

    for (let step = 0; step < 3; step += 1) {
      runSimulationSteps(world, 1, state);
      const positions = findElementPositions(world, SAND);

      if (positions.length === 0) {
        return 'SAND disappeared during teleport guard test.';
      }

      const currentY = positions[0].y;
      if (Math.abs(currentY - previousY) > 1) {
        return 'SAND moved more than one row in a single tick.';
      }
      previousY = currentY;
    }

    return null;
  }, phase3Failures);

  await runCheck(() => {
    const world = createWorld(4, 4);
    const idx = world.idx;
    world.cells[idx(1, 1)] = SAND;

    const state = cloneGameStateForSimulation();
    beginTick(world);

    for (let i = 0; i < world.flags.length; i += 1) {
      if (world.flags[i] & 1) {
        return 'Moved flag should be clear before a simulation step.';
      }
    }

    runSimulationSteps(world, 1, state);

    let movedSet = false;
    for (let i = 0; i < world.flags.length; i += 1) {
      if (world.flags[i] & 1) {
        movedSet = true;
        break;
      }
    }

    if (!movedSet) {
      return 'Moved flag was not set for an active SAND cell.';
    }

    endTick(world);

    for (let i = 0; i < world.flags.length; i += 1) {
      if (world.flags[i] & 1) {
        return 'Moved flag did not reset after endTick.';
      }
    }

    return null;
  }, phase3Failures);

  const result = {
    ok: failures.length === 0,
    failures,
    phase2: {
      ok: phase2Failures.length === 0,
      failures: phase2Failures,
    },
    phase3: {
      ok: phase3Failures.length === 0,
      failures: phase3Failures,
    },
  };

  return result;
}
export async function runSelfChecksPhase4(baseResult) {
  const base = baseResult || (await runSelfChecks());
  const combinedFailures = [];

  if (base && !base.ok) {
    combinedFailures.push(...base.failures);
  }

  if (base?.phase2 && !base.phase2.ok) {
    combinedFailures.push(...base.phase2.failures);
  }

  if (base?.phase3 && !base.phase3.ok) {
    combinedFailures.push(...base.phase3.failures);
  }

  const phase4Failures = [];

  await runCheck(() => {
    const waterMeta = ELEMENTS[WATER];
    if (!waterMeta || typeof waterMeta.lateralRunMax !== 'number') {
      return 'Water metadata must define lateralRunMax.';
    }

    const world = createWorld(16, 8);
    const idx = world.idx;

    for (let x = 0; x < world.width; x += 1) {
      world.cells[idx(x, world.height - 1)] = WALL;
    }

    for (let x = 0; x < 6; x += 1) {
      world.cells[idx(x, world.height - 2)] = WALL;
    }

    const initialPositions = [];
    for (let x = 2; x <= 4; x += 1) {
      world.cells[idx(x, 0)] = WATER;
      initialPositions.push(x);
    }

    const initialMin = Math.min(...initialPositions);
    const initialMax = Math.max(...initialPositions);

    const state = cloneGameStateForSimulation();
    runSimulationSteps(world, 1, state);

    const positions = findElementPositions(world, WATER);
    if (positions.length === 0) {
      return 'Water vanished during lateral run cap test.';
    }

    const minX = positions.reduce((acc, pos) => Math.min(acc, pos.x), Infinity);
    const maxX = positions.reduce((acc, pos) => Math.max(acc, pos.x), -Infinity);

    if (minX < initialMin - waterMeta.lateralRunMax || maxX > initialMax + waterMeta.lateralRunMax) {
      return 'Water moved laterally beyond its run cap in a single tick.';
    }

    return null;
  }, phase4Failures);

  await runCheck(() => {
    const world = createWorld(4, 6);
    const idx = world.idx;
    const height = world.height;

    for (let y = 0; y < height; y += 1) {
      world.cells[idx(0, y)] = WALL;
      world.cells[idx(world.width - 1, y)] = WALL;
    }

    for (let x = 0; x < world.width; x += 1) {
      world.cells[idx(x, height - 1)] = WALL;
    }

    world.cells[idx(1, height - 2)] = WATER;
    world.cells[idx(2, height - 2)] = WATER;
    world.cells[idx(1, height - 3)] = WATER;
    world.cells[idx(2, height - 3)] = WATER;

    const state = cloneGameStateForSimulation();
    const context = { state };
    const flipCounts = new Uint8Array(world.cells.length);
    const previousDirs = new Int8Array(world.lastMoveDir.length);

    for (let step = 0; step < 60; step += 1) {
      beginTick(world);
      stepWorld(world, context);
      endTick(world);
      state.frame = (state.frame ?? 0) + 1;

      const dirs = world.lastMoveDir;
      for (let i = 0; i < dirs.length; i += 1) {
        if (world.cells[i] !== WATER) {
          previousDirs[i] = 0;
          continue;
        }

        const dir = dirs[i];
        const prev = previousDirs[i];

        if (dir !== 0 && prev !== 0 && dir !== prev) {
          flipCounts[i] += 1;
        }

        previousDirs[i] = dir;
      }
    }

    let maxFlips = 0;
    for (let i = 0; i < flipCounts.length; i += 1) {
      if (flipCounts[i] > maxFlips) {
        maxFlips = flipCounts[i];
      }
    }

    if (maxFlips > 6) {
      return `Water direction flipped ${maxFlips} times in trough test.`;
    }

    return null;
  }, phase4Failures);

  if (phase4Failures.length === 0) {
    console.log('✅ Phase 4 ready');
  } else {
    const lines = ['❌ Phase 4 regressions:'];
    for (const failure of phase4Failures) {
      lines.push(String(failure));
    }
    console.error(lines.join('\n'));
  }

  return {
    ok: combinedFailures.length === 0,
    failures: combinedFailures,
    phase4: {
      ok: phase4Failures.length === 0,
      failures: phase4Failures,
    },
  };
}
