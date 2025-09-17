import { EMPTY, SAND } from './elements.js';

const DEFAULT_WORLD_WIDTH = 256;
const DEFAULT_WORLD_HEIGHT = 256;
const FLAG_MOVED_THIS_TICK = 1 << 1;
const CLEAR_MOVED_MASK = 0xff ^ FLAG_MOVED_THIS_TICK;
const DEFAULT_STEP_SECONDS = 1 / 30;

function normalizeDimension(value, fallback) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  const integer = Math.floor(numeric);

  if (integer <= 0) {
    return fallback;
  }

  return integer;
}

function normalizeCoordinate(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return NaN;
  }

  return Math.trunc(numeric);
}

export function createWorld(width, height) {
  const normalizedWidth = normalizeDimension(width, DEFAULT_WORLD_WIDTH);
  const normalizedHeight = normalizeDimension(height, DEFAULT_WORLD_HEIGHT);
  const cellCount = normalizedWidth * normalizedHeight;

  const cells = new Uint16Array(cellCount);
  const flags = new Uint8Array(cellCount);

  function inBounds(x, y) {
    const ix = normalizeCoordinate(x);
    const iy = normalizeCoordinate(y);

    return (
      Number.isFinite(ix) &&
      Number.isFinite(iy) &&
      ix >= 0 &&
      ix < normalizedWidth &&
      iy >= 0 &&
      iy < normalizedHeight
    );
  }

  function idx(x, y) {
    const ix = normalizeCoordinate(x);
    const iy = normalizeCoordinate(y);

    if (!Number.isFinite(ix) || !Number.isFinite(iy)) {
      throw new RangeError('Cell coordinates must be finite numbers.');
    }

    if (ix < 0 || ix >= normalizedWidth || iy < 0 || iy >= normalizedHeight) {
      throw new RangeError(`Cell coordinates out of bounds: (${x}, ${y})`);
    }

    return iy * normalizedWidth + ix;
  }

  return {
    width: normalizedWidth,
    height: normalizedHeight,
    cells,
    flags,
    idx,
    inBounds,
  };
}

function clearMovedFlags(world) {
  if (!world || !world.flags) {
    return;
  }

  const flags = world.flags;
  const length = flags.length;

  for (let i = 0; i < length; i += 1) {
    flags[i] &= CLEAR_MOVED_MASK;
  }
}

function moveCell(cells, flags, fromIndex, toIndex) {
  cells[toIndex] = cells[fromIndex];
  cells[fromIndex] = EMPTY;
  flags[toIndex] = (flags[toIndex] & CLEAR_MOVED_MASK) | FLAG_MOVED_THIS_TICK;
  flags[fromIndex] &= CLEAR_MOVED_MASK;
}

export function beginTick(world) {
  clearMovedFlags(world);
}

export function endTick(world) {
  clearMovedFlags(world);
}

export function step(world) {
  if (!world || !world.cells || !world.flags) {
    return;
  }

  const width = Math.trunc(Number(world.width) || 0);
  const height = Math.trunc(Number(world.height) || 0);

  if (width <= 0 || height <= 0) {
    return;
  }

  const cells = world.cells;
  const flags = world.flags;

  for (let y = height - 1; y >= 0; y -= 1) {
    const rowOffset = y * width;

    for (let x = 0; x < width; x += 1) {
      const index = rowOffset + x;

      if (cells[index] !== SAND) {
        continue;
      }

      if ((flags[index] & FLAG_MOVED_THIS_TICK) !== 0) {
        continue;
      }

      const belowY = y + 1;

      if (belowY >= height) {
        continue;
      }

      const belowIndex = index + width;

      if (cells[belowIndex] === EMPTY) {
        moveCell(cells, flags, index, belowIndex);
        continue;
      }

      const canMoveLeft = x > 0 && cells[belowIndex - 1] === EMPTY;
      const canMoveRight = x + 1 < width && cells[belowIndex + 1] === EMPTY;

      if (canMoveLeft && canMoveRight) {
        if (Math.random() < 0.5) {
          moveCell(cells, flags, index, belowIndex - 1);
        } else {
          moveCell(cells, flags, index, belowIndex + 1);
        }
        continue;
      }

      if (canMoveLeft) {
        moveCell(cells, flags, index, belowIndex - 1);
        continue;
      }

      if (canMoveRight) {
        moveCell(cells, flags, index, belowIndex + 1);
      }
    }
  }
}

export function paintCircle(world, x, y, radius, elementId) {
  if (!world || !world.cells || !world.flags) {
    return 0;
  }

  const width = Number(world.width) || 0;
  const height = Number(world.height) || 0;

  if (width <= 0 || height <= 0) {
    return 0;
  }

  const cells = world.cells;
  const centerX = Math.trunc(Number.isFinite(x) ? x : NaN);
  const centerY = Math.trunc(Number.isFinite(y) ? y : NaN);

  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
    return 0;
  }

  let effectiveRadius = Math.trunc(Number.isFinite(radius) ? radius : 0);

  if (effectiveRadius < 0) {
    effectiveRadius = 0;
  }

  const squaredRadius = effectiveRadius * effectiveRadius;
  let changed = 0;

  if (effectiveRadius === 0) {
    if (centerX >= 0 && centerX < width && centerY >= 0 && centerY < height) {
      const index = centerY * width + centerX;
      if (cells[index] !== elementId) {
        cells[index] = elementId;
        changed += 1;
      }
    }
    return changed;
  }

  for (let offsetY = -effectiveRadius; offsetY <= effectiveRadius; offsetY += 1) {
    const sampleY = centerY + offsetY;

    if (sampleY < 0 || sampleY >= height) {
      continue;
    }

    const ySquared = offsetY * offsetY;
    const maxOffsetX = Math.floor(Math.sqrt(Math.max(squaredRadius - ySquared, 0)));
    let startX = centerX - maxOffsetX;
    let endX = centerX + maxOffsetX;

    if (startX < 0) {
      startX = 0;
    }

    if (endX >= width) {
      endX = width - 1;
    }

    for (let sampleX = startX; sampleX <= endX; sampleX += 1) {
      const index = sampleY * width + sampleX;
      if (cells[index] !== elementId) {
        cells[index] = elementId;
        changed += 1;
      }
    }
  }

  return changed;
}

export function createSimulation(options = {}) {
  const width = normalizeDimension(options.width, DEFAULT_WORLD_WIDTH);
  const height = normalizeDimension(options.height, DEFAULT_WORLD_HEIGHT);
  const world = createWorld(width, height);

  const state = {
    world,
    elapsed: 0,
    stepSeconds: DEFAULT_STEP_SECONDS,
  };

  function update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds)) {
      return;
    }

    state.elapsed += deltaSeconds;
  }

  return { state, update };
}
