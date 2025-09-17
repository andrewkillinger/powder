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
