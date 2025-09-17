function normalizeViewportContent(content) {
  return String(content || '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function hasHiddenOverflow(style) {
  const values = [style.overflow, style.overflowX, style.overflowY];
  return values.every((value) => value === 'hidden' || value === 'clip');
}

async function waitForAnimationFrame(timeoutMs = 300) {
  return new Promise((resolve) => {
    let settled = false;
    function finish(message) {
      if (!settled) {
        settled = true;
        resolve(message || null);
      }
    }
    requestAnimationFrame(() => finish(null));
    setTimeout(() => finish(`requestAnimationFrame did not fire within ${timeoutMs} ms.`), timeoutMs + 10);
  });
}

function cloneCells(cells) {
  return cells ? new Uint16Array(cells) : null;
}

function compareCellArrays(before, after) {
  if (!before || !after || before.length !== after.length) {
    return false;
  }
  for (let i = 0; i < before.length; i += 1) {
    if (before[i] !== after[i]) {
      return true;
    }
  }
  return false;
}

function findElementPositions(world, elementId) {
  const positions = [];
  if (!world || !world.cells) {
    return positions;
  }
  for (let index = 0; index < world.cells.length; index += 1) {
    if (world.cells[index] === elementId) {
      positions.push(index);
    }
  }
  return positions;
}

export async function runSelfChecksAll(Game, api) {
  const failures = [];

  async function runPhase(name, checks) {
    for (const check of checks) {
      try {
        const result = await check();
        if (typeof result === 'string' && result.length > 0) {
          failures.push(`${name}: ${result}`);
        }
      } catch (error) {
        const message = error?.message || String(error);
        failures.push(`${name}: ${message}`);
      }
    }
  }

  await runPhase('Phase 0', [
    () => {
      if (!window.Game || typeof window.Game !== 'object') {
        return 'window.Game must be an object.';
      }
      return null;
    },
    () => {
      const meta = document.querySelector('meta[name="viewport"]');
      if (!meta) {
        return 'Viewport meta tag is missing.';
      }
      const content = normalizeViewportContent(meta.getAttribute('content'));
      if (!content.includes('user-scalable=no')) {
        return 'Viewport meta must include user-scalable=no.';
      }
      return null;
    },
    () => {
      const canvas = document.getElementById('game');
      if (!(canvas instanceof HTMLCanvasElement)) {
        return '#game canvas was not found.';
      }
      if (canvas.width <= 0 || canvas.height <= 0) {
        return 'Canvas must have a positive width and height.';
      }
      const rootStyle = getComputedStyle(document.documentElement);
      const bodyStyle = getComputedStyle(document.body);
      if (!hasHiddenOverflow(rootStyle) || !hasHiddenOverflow(bodyStyle)) {
        return 'Document overflow must be hidden to prevent scrolling.';
      }
      return null;
    },
    () => waitForAnimationFrame(300),
  ]);

  await runPhase('Phase 1', [
    () => {
      if (typeof api?.createWorld !== 'function') {
        return 'createWorld function is missing.';
      }
      if (typeof api?.idx !== 'function') {
        return 'idx helper is missing.';
      }
      if (typeof api?.inBounds !== 'function') {
        return 'inBounds helper is missing.';
      }
      return null;
    },
    () => {
      const testWorld = api.createWorld(16, 16);
      if (!(testWorld.cells instanceof Uint16Array)) {
        return 'World cells should be a Uint16Array.';
      }
      if (!(testWorld.flags instanceof Uint8Array)) {
        return 'World flags should be a Uint8Array.';
      }
      if (typeof api.idx(testWorld, 1, 0) !== 'number') {
        return 'idx helper must return a numeric index.';
      }
      if (api.idx(testWorld, 1, 0) !== 1) {
        return 'idx(world, 1, 0) should equal 1.';
      }
      if (api.inBounds(testWorld, 0, 0) !== true) {
        return 'inBounds(world, 0, 0) should be true.';
      }
      if (api.inBounds(testWorld, -1, 0) !== false) {
        return 'Negative coordinates must be out of bounds.';
      }
      if (api.inBounds(testWorld, 16, 0) !== false) {
        return 'Coordinates past width must be out of bounds.';
      }
      return null;
    },
    () => {
      if (!api.ELEMENTS || typeof api.ELEMENTS !== 'object') {
        return 'ELEMENTS table missing.';
      }
      if (!(api.PALETTE instanceof Uint8ClampedArray)) {
        return 'PALETTE must be a Uint8ClampedArray.';
      }
      if (!Number.isInteger(api.EMPTY) || !Number.isInteger(api.WALL) || !Number.isInteger(api.SAND)) {
        return 'Element constants missing.';
      }
      const wallOffset = api.WALL * 4;
      const sandOffset = api.SAND * 4;
      if (wallOffset + 3 >= api.PALETTE.length || sandOffset + 3 >= api.PALETTE.length) {
        return 'Palette entries for WALL and SAND must exist.';
      }
      return null;
    },
    () => {
      const canvas = document.createElement('canvas');
      canvas.width = 4;
      canvas.height = 4;
      const rendererFactory = api.Renderer?.createRenderer;
      if (typeof rendererFactory !== 'function') {
        return 'Renderer.createRenderer must be a function.';
      }
      const world = api.createWorld(4, 4);
      const renderer = rendererFactory(canvas, world, api.PALETTE);
      renderer.draw(world);
      const ctx = canvas.getContext('2d');
      const before = ctx.getImageData(0, 0, 4, 4).data.slice();
      world.cells[0] = api.SAND;
      renderer.draw(world);
      const after = ctx.getImageData(0, 0, 4, 4).data;
      if (!compareCellArrays(before, after)) {
        return 'Renderer draw should change pixels when world updates.';
      }
      return null;
    },
  ]);

  await runPhase('Phase 2', [
    async () => {
      const toolbar = document.querySelector('[data-ui-toolbar="true"], #powder-toolbar');
      if (!toolbar) {
        return 'Toolbar not found.';
      }
      const elementButton = Array.from(toolbar.querySelectorAll('button')).find((btn) => /element/i.test(btn.textContent || ''));
      const pauseButton = Array.from(toolbar.querySelectorAll('button')).find((btn) => /pause/i.test(btn.textContent || ''));
      const clearButton = Array.from(toolbar.querySelectorAll('button')).find((btn) => /clear/i.test(btn.textContent || ''));
      const eraserButton = Array.from(toolbar.querySelectorAll('button')).find((btn) => /eraser/i.test(btn.textContent || ''));
      const brushInput = toolbar.querySelector('input[type="range"]');
      if (!elementButton || !pauseButton || !clearButton || !eraserButton || !brushInput) {
        return 'Toolbar must expose Element, Pause, Clear, Brush, and Eraser controls.';
      }
      const initialPause = Game.state.paused;
      pauseButton.click();
      await waitForAnimationFrame(50);
      if (Game.state.paused === initialPause) {
        return 'Pause button did not toggle Game.state.paused.';
      }
      pauseButton.click();
      await waitForAnimationFrame(50);
      const targetValue = 13;
      brushInput.value = String(targetValue);
      brushInput.dispatchEvent(new Event('input', { bubbles: true }));
      await waitForAnimationFrame(50);
      if (Game.state.brushSize !== targetValue) {
        return 'Brush input should update Game.state.brushSize.';
      }
      const beforeCells = Game.world ? cloneCells(Game.world.cells) : null;
      elementButton.click();
      await waitForAnimationFrame(50);
      const afterCells = Game.world ? cloneCells(Game.world.cells) : null;
      if (beforeCells && afterCells && compareCellArrays(beforeCells, afterCells)) {
        return 'Clicking toolbar should not paint into the world.';
      }
      return null;
    },
  ]);

  await runPhase('Phase 3', [
    () => {
      const world = api.createWorld(4, 4);
      world.cells.fill(api.EMPTY);
      const startIndex = api.idx(world, 1, 0);
      world.cells[startIndex] = api.SAND;
      api.beginTick(world);
      api.step(world, { state: { seed: Game.state.seed ?? 0, frame: 0 } });
      api.endTick(world);
      const positions = findElementPositions(world, api.SAND);
      if (positions.length === 0) {
        return 'Sand particle vanished after step.';
      }
      const ys = positions.map((index) => Math.floor(index / world.width));
      if (Math.max(...ys) > 1) {
        return 'Sand should fall at most one row per tick.';
      }
      return null;
    },
    () => {
      const world = api.createWorld(3, 3);
      world.cells.fill(api.EMPTY);
      const sandIndex = api.idx(world, 1, 0);
      const wallIndex = api.idx(world, 1, 1);
      world.cells[sandIndex] = api.SAND;
      world.cells[wallIndex] = api.WALL;
      for (let frame = 0; frame < 3; frame += 1) {
        api.beginTick(world);
        api.step(world, { state: { seed: Game.state.seed ?? 0, frame } });
        api.endTick(world);
        if ((world.flags[sandIndex] & 1) !== 0) {
          return 'Moved flag should reset after endTick.';
        }
      }
      if (world.cells[wallIndex] !== api.WALL) {
        return 'Sand must not replace wall tiles.';
      }
      return null;
    },
  ]);

  await runPhase('Phase 4', [
    () => {
      if (!api.ELEMENTS?.[api.WATER]) {
        return 'Water element metadata missing.';
      }
      const offset = api.WATER * 4;
      if (offset + 3 >= api.PALETTE.length) {
        return 'Water palette entry missing.';
      }
      return null;
    },
    () => {
      const world = api.createWorld(6, 6);
      world.cells.fill(api.EMPTY);
      for (let x = 0; x < world.width; x += 1) {
        world.cells[api.idx(world, x, world.height - 1)] = api.WALL;
      }
      for (let y = world.height - 2; y >= world.height - 4; y -= 1) {
        world.cells[api.idx(world, 1, y)] = api.WALL;
        world.cells[api.idx(world, world.width - 2, y)] = api.WALL;
      }
      world.cells[api.idx(world, 2, 0)] = api.WATER;
      world.cells[api.idx(world, 3, 0)] = api.WATER;
      const history = [];
      for (let frame = 0; frame < 40; frame += 1) {
        api.beginTick(world);
        api.step(world, { state: { seed: Game.state.seed ?? 0, frame } });
        api.endTick(world);
        const waterPositions = findElementPositions(world, api.WATER);
        if (waterPositions.length === 0) {
          return 'Water disappeared during trough test.';
        }
        const xs = waterPositions.map((index) => index % world.width);
        if (xs.some((x) => x < 1 || x > world.width - 2)) {
          return 'Water escaped lateral bounds of trough.';
        }
        history.push(waterPositions.join(','));
      }
      if (history.length >= 4) {
        const a = history[history.length - 1];
        const b = history[history.length - 2];
        const c = history[history.length - 3];
        const d = history[history.length - 4];
        if (a === c && b === d && a !== b) {
          return 'Water oscillated in a two-frame loop.';
        }
      }
      return null;
    },
  ]);

  await runPhase('Phase 5', [
    () => {
      const world = api.createWorld(8, 8);
      const writes = api.fillRect(world, api.SAND, 0, 0, 2, 2);
      if (!Number.isFinite(writes) || writes <= 0) {
        return 'fillRect should modify the world.';
      }
      for (let y = 0; y <= 2; y += 1) {
        for (let x = 0; x <= 2; x += 1) {
          if (world.cells[api.idx(world, x, y)] !== api.SAND) {
            return 'fillRect should fill the requested area.';
          }
        }
      }
      return null;
    },
    () => {
      const overlay = document.getElementById('powder-overlay');
      if (!overlay || !/FPS:/i.test(overlay.textContent || '') || !/Particles:/i.test(overlay.textContent || '')) {
        return 'HUD overlay must show FPS and particle count.';
      }
      return null;
    },
    () => {
      const canvas = document.getElementById('game');
      if (!(canvas instanceof HTMLCanvasElement) || !Game.world) {
        return null;
      }
      const world = Game.world;
      const backup = new Uint16Array(world.cells);
      const limit = Math.min(world.cells.length, Game.limits?.softCap ?? 0);
      for (let i = 0; i < world.cells.length; i += 1) {
        world.cells[i] = i < limit ? api.SAND : api.EMPTY;
      }
      const before = api.getParticleCount(world);
      if (typeof Game.hud?.update === 'function') {
        Game.hud.update({ fps: Game.metrics.fps, count: limit });
      }
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      canvas.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerId: 99,
          bubbles: true,
          button: 0,
          clientX: centerX,
          clientY: centerY,
        }),
      );
      canvas.dispatchEvent(
        new PointerEvent('pointerup', {
          pointerId: 99,
          bubbles: true,
          button: 0,
          clientX: centerX,
          clientY: centerY,
        }),
      );
      const after = api.getParticleCount(world);
      world.cells.set(backup);
      Game.metrics.particles = api.getParticleCount(world);
      if (typeof Game.hud?.update === 'function') {
        Game.hud.update({ fps: Game.metrics.fps, count: api.getParticleCount(world) });
      }
      if (after > before && limit >= (Game.limits?.softCap ?? 0)) {
        return 'Soft cap should prevent spawning additional particles.';
      }
      return null;
    },
  ]);

  await runPhase('Phase 6', [
    () => {
      if (!Number.isInteger(api.OIL) || !Number.isInteger(api.FIRE)) {
        return 'OIL and FIRE constants must exist.';
      }
      if (!api.ELEMENTS?.[api.OIL] || !api.ELEMENTS?.[api.FIRE]) {
        return 'ELEMENTS table must include OIL and FIRE metadata.';
      }
      const oilOffset = api.OIL * 4;
      const fireOffset = api.FIRE * 4;
      if (oilOffset + 3 >= api.PALETTE.length) {
        return 'Palette entry for OIL is missing.';
      }
      if (fireOffset + 3 >= api.PALETTE.length) {
        return 'Palette entry for FIRE is missing.';
      }
      return null;
    },
    () => {
      const attempts = 3;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const world = api.createWorld(6, 6);
        world.cells.fill(api.EMPTY);
        world.flags.fill(0);
        if (world.lastMoveDir) {
          world.lastMoveDir.fill(0);
        }
        if (world.lifetimes) {
          world.lifetimes.fill(0);
        }
        const fireIndex = api.idx(world, 2, 2);
        world.cells[fireIndex] = api.FIRE;
        const oilNeighbors = [
          api.idx(world, 1, 3),
          api.idx(world, 2, 3),
          api.idx(world, 3, 3),
          api.idx(world, 2, 4),
        ];
        oilNeighbors.forEach((index) => {
          world.cells[index] = api.OIL;
        });
        let ignited = false;
        for (let frame = 0; frame < 140; frame += 1) {
          api.beginTick(world);
          api.step(world, {
            state: { seed: (Game.state.seed ?? 0) + attempt, frame },
            limits: Game.limits,
            metrics: Game.metrics,
          });
          api.endTick(world);
          if (oilNeighbors.some((index) => world.cells[index] === api.FIRE)) {
            ignited = true;
            break;
          }
        }
        if (ignited) {
          return null;
        }
      }
      return 'Oil placed near fire did not ignite after multiple attempts.';
    },
    () => {
      const world = api.createWorld(4, 4);
      world.cells.fill(api.EMPTY);
      world.flags.fill(0);
      if (world.lastMoveDir) {
        world.lastMoveDir.fill(0);
      }
      if (world.lifetimes) {
        world.lifetimes.fill(0);
      }
      const fireIndex = api.idx(world, 1, 0);
      const waterIndex = api.idx(world, 1, 1);
      world.cells[fireIndex] = api.FIRE;
      world.cells[waterIndex] = api.WATER;
      let extinguished = false;
      for (let frame = 0; frame < 80; frame += 1) {
        api.beginTick(world);
        api.step(world, {
          state: { seed: Game.state.seed ?? 0, frame },
          limits: Game.limits,
          metrics: Game.metrics,
        });
        api.endTick(world);
        if (world.cells[fireIndex] !== api.FIRE) {
          extinguished = true;
          break;
        }
      }
      if (!extinguished) {
        return 'Fire in contact with water should extinguish quickly.';
      }
      return null;
    },
    () => {
      const fireMeta = api.ELEMENTS?.[api.FIRE];
      const spawnCap = Math.trunc(fireMeta?.fire?.maxSpawnPerTick ?? 0);
      if (!Number.isFinite(spawnCap) || spawnCap <= 0) {
        return 'Fire spawn cap metadata missing or invalid.';
      }
      const world = api.createWorld(12, 6);
      world.cells.fill(api.OIL);
      world.flags.fill(0);
      if (world.lastMoveDir) {
        world.lastMoveDir.fill(0);
      }
      if (world.lifetimes) {
        world.lifetimes.fill(0);
      }
      const origin = api.idx(world, Math.floor(world.width / 2), Math.floor(world.height / 2));
      world.cells[origin] = api.FIRE;
      let previous = findElementPositions(world, api.FIRE).length;
      for (let frame = 0; frame < 8; frame += 1) {
        api.beginTick(world);
        api.step(world, {
          state: { seed: Game.state.seed ?? 0, frame },
          limits: Game.limits,
          metrics: Game.metrics,
        });
        api.endTick(world);
        const count = findElementPositions(world, api.FIRE).length;
        const delta = count - previous;
        if (delta > spawnCap) {
          return `Fire spawn delta ${delta} exceeded cap ${spawnCap}.`;
        }
        previous = count;
      }
      return null;
    },
  ]);

  return {
    ok: failures.length === 0,
    failures,
  };
}
