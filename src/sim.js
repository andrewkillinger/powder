const DEFAULT_WORLD_WIDTH = 256;
const DEFAULT_WORLD_HEIGHT = 256;

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
  };

  function update(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds)) {
      return;
    }

    state.elapsed += deltaSeconds;
  }

  return { state, update };
}
