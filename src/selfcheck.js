const MENU_ID = 'powder-element-menu';
const TOOLBAR_SELECTOR = '[data-ui-toolbar="true"], #powder-toolbar';

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
      if (!api.materials || typeof api.materials !== 'object') {
        return 'Material registry (api.materials) missing.';
      }
      if (!Game.materials || typeof Game.materials !== 'object') {
        return 'Game.materials must be populated.';
      }
      if (!Array.isArray(api.palette)) {
        return 'Palette should be an array of colors.';
      }
      if (!(api.paletteBuffer instanceof Uint8ClampedArray)) {
        return 'paletteBuffer must be a Uint8ClampedArray.';
      }
      const sampleIds = Object.values(Game.materials || {})
        .map((m) => m?.id)
        .filter((id) => Number.isInteger(id));
      for (const id of sampleIds.slice(0, 20)) {
        const color = api.palette[id];
        if (!Array.isArray(color) || color.length !== 4) {
          return `Palette entry for material ${id} must contain 4 channels.`;
        }
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
      const renderer = rendererFactory(canvas, world, api.paletteBuffer);
      renderer.draw(world);
      const ctx = canvas.getContext('2d');
      const before = ctx.getImageData(0, 0, 4, 4).data.slice();
      world.cells[0] = Game.state.currentElementId ?? 1;
      renderer.draw(world);
      const after = ctx.getImageData(0, 0, 4, 4).data;
      if (!compareCellArrays(before, after)) {
        return 'Renderer draw should change pixels when world updates.';
      }
      return null;
    },
  ]);

  await runPhase('Phase 2', [
    () => {
      const categories = Array.isArray(api.categories) ? api.categories : [];
      const categoryKeys = categories.map((c) => c.key);
      if (categoryKeys.length !== 4) {
        return 'Expected four material categories (powder/gas/liquid/solid).';
      }
      const materials = Object.values(Game.materials || api.materials || {})
        .filter((m) => m && categoryKeys.includes(m.cat));
      if (materials.length !== 20) {
        return `Expected 20 reserved materials, found ${materials.length}.`;
      }
      const idSet = new Set();
      for (const material of materials) {
        if (!Number.isInteger(material.id)) {
          return `Material ${material.name} must have an integer id.`;
        }
        if (material.id === api.EMPTY || material.id === api.WALL) {
          return `Material id ${material.id} collides with EMPTY/WALL.`;
        }
        if (idSet.has(material.id)) {
          return `Duplicate material id detected: ${material.id}.`;
        }
        idSet.add(material.id);
        const color = api.palette[material.id];
        if (!Array.isArray(color) || color.length !== 4) {
          return `Palette entry missing for material ${material.name} (${material.id}).`;
        }
      }
      for (const category of categories) {
        const count = materials.filter((m) => m.cat === category.key).length;
        if (count < 5) {
          return `${category.label} must contain at least five reserved materials.`;
        }
      }
      const implemented = materials.filter((m) => m.implemented);
      if (implemented.length < 2) {
        return 'At least two implemented materials are required (Sand and Water).';
      }
      const implementedIds = new Set(implemented.map((m) => m.id));
      if (!implementedIds.has(api.SAND) || !implementedIds.has(api.WATER)) {
        return 'Sand and Water must be marked as implemented.';
      }
      return null;
    },
  ]);

  await runPhase('Phase 3', [
    async () => {
      const toolbar = document.querySelector(TOOLBAR_SELECTOR);
      if (!toolbar) {
        return 'Toolbar not found.';
      }
      const elementButton = toolbar.querySelector('.element-pill');
      const pauseButton = Array.from(toolbar.querySelectorAll('button')).find((btn) => /pause/i.test(btn.textContent || ''));
      const clearButton = Array.from(toolbar.querySelectorAll('button')).find((btn) => /clear/i.test(btn.textContent || ''));
      const eraserButton = Array.from(toolbar.querySelectorAll('button')).find((btn) => /eraser/i.test(btn.textContent || ''));
      const brushInput = toolbar.querySelector('input[type="range"]');
      if (!elementButton || !pauseButton || !clearButton || !eraserButton || !brushInput) {
        return 'Toolbar must expose Element, Pause, Clear, Brush, and Eraser controls.';
      }
      const before = Game.state.paused;
      pauseButton.click();
      await waitForAnimationFrame(50);
      if (Game.state.paused === before) {
        return 'Pause button did not toggle Game.state.paused.';
      }
      pauseButton.click();
      await waitForAnimationFrame(50);
      const targetBrush = 11;
      brushInput.value = String(targetBrush);
      brushInput.dispatchEvent(new Event('input', { bubbles: true }));
      await waitForAnimationFrame(50);
      if (Game.state.brushSize !== targetBrush) {
        return 'Brush input should update Game.state.brushSize.';
      }
      return null;
    },
    async () => {
      const materials = Object.values(Game.materials || api.materials || {});
      const wipMaterial = materials.find((m) => !m.implemented);
      if (!wipMaterial) {
        return 'No WIP material available for gating test.';
      }
      const toolbar = document.querySelector(TOOLBAR_SELECTOR);
      if (!toolbar) {
        return 'Toolbar not found for gating test.';
      }
      const elementButton = toolbar.querySelector('.element-pill');
      if (!elementButton) {
        return 'Element button missing from toolbar.';
      }
      const previousId = Game.state.currentElementId;
      elementButton.click();
      await waitForAnimationFrame(60);
      const modal = document.getElementById(MENU_ID);
      if (!modal || modal.dataset.open !== 'true') {
        return 'Element picker did not open.';
      }
      const wipButton = modal.querySelector(`[data-material-id="${wipMaterial.id}"]`);
      if (!wipButton) {
        return `WIP material button (${wipMaterial.name}) not found.`;
      }
      wipButton.click();
      await waitForAnimationFrame(60);
      const tooltipVisible = wipButton.dataset.tooltipVisible === 'true';
      if (Game.state.currentElementId !== previousId) {
        return 'Selecting a WIP material should not change the current element.';
      }
      if (!tooltipVisible) {
        return 'WIP material selection should surface a tooltip.';
      }
      const closeButton = modal.querySelector('.close-button');
      closeButton?.click();
      await waitForAnimationFrame(60);
      return null;
    },
  ]);

  await runPhase('Phase 4', [
    () => {
      const testWorld = api.createWorld(4, 4);
      const sim = api.initSim(testWorld, api.mulberry32 ? api.mulberry32(1234) : (() => () => Math.random()));
      if (!sim || typeof sim.router !== 'object') {
        return 'initSim must return an object containing a router.';
      }
      const required = ['resetFrame', 'contact', 'adjacentTick', 'onContact', 'onAdjacent', 'onThermal'];
      for (const method of required) {
        if (typeof sim.router[method] !== 'function') {
          return `Router missing ${method} handler.`;
        }
      }
      return null;
    },
    () => {
      const testWorld = api.createWorld(4, 4);
      const sim = api.initSim(testWorld, api.mulberry32 ? api.mulberry32(5678) : (() => () => Math.random()));
      const router = sim.router;
      let resetCalls = 0;
      const originalReset = router.resetFrame;
      router.resetFrame = (...args) => {
        resetCalls += 1;
        return originalReset.apply(router, args);
      };
      api.beginTick(testWorld);
      api.step(testWorld, { state: { seed: Game.state.seed ?? 0, frame: 0 }, router });
      api.endTick(testWorld);
      router.resetFrame = originalReset;
      if (resetCalls !== 1) {
        return 'router.resetFrame must be called exactly once per physics step.';
      }
      return null;
    },
    () => {
      const testWorld = api.createWorld(3, 3);
      const sim = api.initSim(testWorld, api.mulberry32 ? api.mulberry32(91011) : (() => () => Math.random()));
      const router = sim.router;
      testWorld.cells.fill(api.EMPTY);
      testWorld.cells[api.idx(testWorld, 0, 0)] = api.SAND;
      testWorld.cells[api.idx(testWorld, 1, 0)] = api.WATER;
      let adjacentCalls = 0;
      const originalAdjacent = router.adjacentTick;
      router.adjacentTick = (...args) => {
        adjacentCalls += 1;
        return originalAdjacent.apply(router, args);
      };
      api.beginTick(testWorld);
      api.step(testWorld, { state: { seed: Game.state.seed ?? 0, frame: 1 }, router });
      api.endTick(testWorld);
      router.adjacentTick = originalAdjacent;
      if (adjacentCalls === 0) {
        return 'router.adjacentTick should fire for neighboring materials.';
      }
      return null;
    },
  ]);

  await runPhase('Phase 5', [
    () => {
      const world = api.createWorld(6, 6);
      world.cells.fill(api.EMPTY);
      const writes = api.fillRect(world, api.SAND, 0, 0, 2, 2);
      if (writes !== 9) {
        return 'fillRect should paint a 3x3 block (9 cells).';
      }
      return null;
    },
    () => {
      const world = api.createWorld(4, 4);
      world.cells.fill(api.EMPTY);
      const sandIndex = api.idx(world, 1, 0);
      world.cells[sandIndex] = api.SAND;
      api.beginTick(world);
      api.step(world, { state: { seed: Game.state.seed ?? 0, frame: 0 } });
      api.endTick(world);
      const positions = findElementPositions(world, api.SAND);
      if (positions.length === 0) {
        return 'Sand particle vanished after step.';
      }
      const maxY = Math.max(...positions.map((index) => Math.floor(index / world.width)));
      if (maxY > 1) {
        return 'Sand should not fall more than one row in a single tick.';
      }
      return null;
    },
    () => {
      const world = api.createWorld(6, 6);
      world.cells.fill(api.EMPTY);
      for (let x = 0; x < world.width; x += 1) {
        world.cells[api.idx(world, x, world.height - 1)] = api.WALL;
      }
      world.cells[api.idx(world, 1, 4)] = api.WALL;
      world.cells[api.idx(world, world.width - 2, 4)] = api.WALL;
      world.cells[api.idx(world, 2, 0)] = api.WATER;
      world.cells[api.idx(world, 3, 0)] = api.WATER;
      for (let frame = 0; frame < 30; frame += 1) {
        api.beginTick(world);
        api.step(world, { state: { seed: Game.state.seed ?? 0, frame } });
        api.endTick(world);
        const positions = findElementPositions(world, api.WATER);
        if (positions.length === 0) {
          return 'Water disappeared during trough simulation.';
        }
        const xs = positions.map((index) => index % world.width);
        if (xs.some((x) => x < 1 || x > world.width - 2)) {
          return 'Water escaped the trough boundaries.';
        }
      }
      return null;
    },
  ]);

  if (failures.length === 0) {
    console.info('✅ Material framework ready (20 placeholders, interactions wired)');
    return { ok: true, failures };
  }

  return { ok: false, failures };
}
