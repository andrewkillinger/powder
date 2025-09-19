import {
  EMPTY,
  WALL,
  SAND,
  WATER,
  OIL,
  FIRE,
  getMaterial,
} from './elements.js';
import { createInteractionRouter } from './interactions.js';

const DEFAULT_WORLD_WIDTH = 256;
const DEFAULT_WORLD_HEIGHT = 256;

const EMPTY_META = Object.freeze({
  id: EMPTY,
  name: 'Empty',
  state: 'void',
  density: 0,
  immovable: true,
  viscosity: 0,
  lateralRunMax: 0,
  buoyancy: 0,
});

const WALL_META = Object.freeze({
  id: WALL,
  name: 'Wall',
  state: 'solid',
  density: 10000,
  immovable: true,
  viscosity: 0,
  lateralRunMax: 0,
  buoyancy: 0,
});

const FIRE_META = Object.freeze({
  id: FIRE,
  name: 'Fire',
  state: 'gas',
  density: 1,
  immovable: false,
  viscosity: 0,
  lateralRunMax: 0,
  buoyancy: 6,
  flammable: true,
  fire: {
    lifetimeMin: 20,
    lifetimeMax: 60,
    igniteProbability: 0.2,
    extinguishProbability: 0.5,
    maxSpawnPerTick: 18,
  },
});

const FLAG_MOVED_THIS_TICK = 1 << 0;
const FLAG_SWAP_COOLDOWN = 1 << 1;
const FLAG_SWAP_COOLDOWN_NEXT = 1 << 2;
const CLEAR_MOVED_MASK = 0xff ^ FLAG_MOVED_THIS_TICK;
const CLEAR_COOLDOWN_MASK = 0xff ^ FLAG_SWAP_COOLDOWN;
const CLEAR_COOLDOWN_NEXT_MASK = 0xff ^ FLAG_SWAP_COOLDOWN_NEXT;

const DEFAULT_STEP_SECONDS = 1 / 30;
const WATER_SAND_DISPLACEMENT_PROBABILITY = 0.2;

const rngState = {
  seed: Math.floor(Math.random() * 0xffffffff) >>> 0,
  rng: null,
};

const currentStep = {
  rng: null,
  frameParity: 0,
  stats: null,
  limits: null,
  metrics: null,
  fireSpawnCap: 0,
  fireSpawnedThisTick: 0,
  particleBudget: null,
  router: null,
};

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function getFireSettings() {
  if (typeof FIRE_META.fire === 'object' && FIRE_META.fire !== null) {
    return FIRE_META.fire;
  }
  return {};
}

function sampleFireLifetime() {
  const settings = getFireSettings();
  const minRaw = Math.trunc(Number.isFinite(settings.lifetimeMin) ? settings.lifetimeMin : settings.lifetime);
  const maxRaw = Math.trunc(Number.isFinite(settings.lifetimeMax) ? settings.lifetimeMax : minRaw);
  const fallbackMin = Number.isFinite(minRaw) ? minRaw : 20;
  const min = Math.max(1, fallbackMin);
  const max = Number.isFinite(maxRaw) ? Math.max(min, maxRaw) : min;
  const span = Math.max(0, max - min);
  const rngValue = currentStep.rng ? currentStep.rng() : Math.random();
  const offset = span > 0 ? Math.floor(rngValue * (span + 1)) : 0;
  const lifetime = min + offset;
  if (lifetime > 255) {
    return 255;
  }
  return Math.max(1, lifetime);
}

function setLifetime(world, index, value) {
  if (!world || !world.lifetimes) {
    return;
  }
  const numeric = Number.isFinite(value) ? Math.trunc(value) : 0;
  world.lifetimes[index] = Math.max(0, Math.min(255, numeric));
}

function randomChance(probability) {
  return (currentStep.rng ? currentStep.rng() : Math.random()) < clamp01(probability);
}

function extinguishFire(world, index) {
  if (!world || !world.cells) {
    return;
  }
  world.cells[index] = EMPTY;
  if (world.flags) {
    world.flags[index] = 0;
  }
  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
  setLifetime(world, index, 0);
}

function requestFireSpawn(world, targetWasEmpty = false) {
  const cap = currentStep.fireSpawnCap;
  if (Number.isFinite(cap) && cap >= 0 && currentStep.fireSpawnedThisTick >= cap) {
    return false;
  }

  if (targetWasEmpty) {
    const softCap = currentStep.limits?.softCap;
    if (Number.isFinite(softCap) && softCap > 0) {
      if (currentStep.particleBudget === null) {
        const metricCount = Number.isFinite(currentStep.metrics?.particles)
          ? Math.trunc(currentStep.metrics.particles)
          : getParticleCount(world);
        currentStep.particleBudget = Math.max(0, softCap - metricCount);
      }
      if (currentStep.particleBudget <= 0) {
        return false;
      }
      currentStep.particleBudget -= 1;
    }
  }

  currentStep.fireSpawnedThisTick += 1;
  if (currentStep.stats) {
    currentStep.stats.fireSpawns = (currentStep.stats.fireSpawns ?? 0) + 1;
  }
  return true;
}

function igniteCellAt(world, index, productId = FIRE) {
  if (!world || !world.cells) {
    return false;
  }
  if (index < 0 || index >= world.cells.length) {
    return false;
  }

  const existing = world.cells[index];
  const productMeta =
    productId === EMPTY
      ? EMPTY_META
      : productId === WALL
      ? WALL_META
      : productId === FIRE
      ? FIRE_META
      : getMaterial(productId);
  if (!productMeta) {
    return false;
  }

  if (existing === productId) {
    return false;
  }

  if (isImmovable(existing)) {
    return false;
  }

  const wasEmpty = existing === EMPTY;
  if (!requestFireSpawn(world, wasEmpty)) {
    return false;
  }

  world.cells[index] = productId;
  if (world.flags) {
    world.flags[index] = FLAG_MOVED_THIS_TICK;
  }
  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
  if (productId === FIRE) {
    setLifetime(world, index, sampleFireLifetime());
  } else {
    setLifetime(world, index, 0);
  }
  return true;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeDimension(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  const integer = Math.floor(numeric);
  if (!Number.isFinite(integer) || integer <= 0) {
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

function normalizeSeed(seed) {
  const numeric = Number(seed);
  if (!Number.isFinite(numeric)) {
    return rngState.seed;
  }
  return Math.floor(Math.abs(numeric)) >>> 0;
}

function ensureRng(seed) {
  const normalized = normalizeSeed(seed);
  if (!rngState.rng || rngState.seed !== normalized) {
    rngState.seed = normalized;
    rngState.rng = mulberry32(normalized || 1);
  }
  return rngState.rng;
}

export function setSimulationSeed(seed) {
  const normalized = normalizeSeed(seed);
  rngState.seed = normalized;
  rngState.rng = mulberry32(normalized || 1);
  return normalized;
}

export function initSim(world, rng) {
  if (typeof rng === 'function') {
    rngState.rng = rng;
  }
  const router = createInteractionRouter({ getMat: getMaterial, rng: rngState.rng });
  return { router };
}

function getMeta(id) {
  if (id === EMPTY) {
    return EMPTY_META;
  }
  if (id === WALL) {
    return WALL_META;
  }
  if (id === FIRE) {
    return FIRE_META;
  }
  return getMaterial(id) || EMPTY_META;
}

function densityOf(id) {
  const meta = getMeta(id);
  return Number.isFinite(meta?.density) ? meta.density : 0;
}

export function isEmpty(id) {
  return id === EMPTY;
}

export function isLiquid(id) {
  return getMeta(id)?.state === 'liquid';
}

function isImmovable(id) {
  return Boolean(getMeta(id)?.immovable);
}

function clearCellState(world, index) {
  if (!world || !world.flags) {
    return;
  }
  world.flags[index] = 0;
  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
  if (world.lifetimes) {
    world.lifetimes[index] = 0;
  }
}

export const UPDATERS = [];

UPDATERS[EMPTY] = function noop() {};

UPDATERS[WALL] = function wallUpdater() {};

export function getParticleCount(world) {
  if (!world || !world.cells) {
    return 0;
  }

  const cells = world.cells;
  let count = 0;

  for (let i = 0; i < cells.length; i += 1) {
    const id = cells[i];
    if (id !== EMPTY && !isImmovable(id)) {
      count += 1;
    }
  }

  return count;
}

function trySwapInternal(world, sourceIndex, targetIndex, options) {
  const cells = world.cells;
  const flags = world.flags;
  const width = Number(world.width) || 0;

  const sourceId = cells[sourceIndex];
  const targetId = cells[targetIndex];

  if (sourceId === targetId) {
    return false;
  }

  if (isImmovable(sourceId)) {
    return false;
  }

  if (targetId !== EMPTY && isImmovable(targetId)) {
    return false;
  }

  if ((flags[sourceIndex] & FLAG_MOVED_THIS_TICK) !== 0) {
    return false;
  }

  if ((flags[targetIndex] & FLAG_MOVED_THIS_TICK) !== 0) {
    return false;
  }

  if ((flags[sourceIndex] & FLAG_SWAP_COOLDOWN) !== 0) {
    return false;
  }

  if ((flags[targetIndex] & FLAG_SWAP_COOLDOWN) !== 0) {
    return false;
  }

  const allowDenser = Boolean(options?.allowDenser);
  const allowEqual = Boolean(options?.allowEqualDensity);

  if (targetId !== EMPTY && !allowDenser) {
    const sourceDensity = densityOf(sourceId);
    const targetDensity = densityOf(targetId);

    if (targetDensity > sourceDensity) {
      return false;
    }

    if (!allowEqual && targetDensity === sourceDensity) {
      return false;
    }
  }

  cells[targetIndex] = sourceId;
  cells[sourceIndex] = targetId;

  if (world.lifetimes) {
    const lifetimes = world.lifetimes;
    const tempLifetime = lifetimes[sourceIndex];
    lifetimes[sourceIndex] = lifetimes[targetIndex];
    lifetimes[targetIndex] = tempLifetime;
  }

  flags[targetIndex] |= FLAG_MOVED_THIS_TICK;
  flags[sourceIndex] |= FLAG_MOVED_THIS_TICK;

  if (targetId !== EMPTY && densityOf(targetId) > densityOf(sourceId)) {
    flags[targetIndex] |= FLAG_SWAP_COOLDOWN_NEXT;
    flags[sourceIndex] |= FLAG_SWAP_COOLDOWN_NEXT;
  } else if (options?.cooldown) {
    flags[targetIndex] |= FLAG_SWAP_COOLDOWN_NEXT;
    flags[sourceIndex] |= FLAG_SWAP_COOLDOWN_NEXT;
  }

  if (world.lastMoveDir) {
    world.lastMoveDir[targetIndex] = options?.afterSwapDir ?? 0;
    world.lastMoveDir[sourceIndex] = 0;
  }

  if (
    currentStep.stats &&
    ((sourceId === WATER && targetId === SAND) || (sourceId === SAND && targetId === WATER))
  ) {
    currentStep.stats.swaps = (currentStep.stats.swaps ?? 0) + 1;
  }

  if (currentStep.router && width > 0) {
    const ax = sourceIndex % width;
    const ay = Math.floor(sourceIndex / width);
    const bx = targetIndex % width;
    const by = Math.floor(targetIndex / width);
    const idA = cells[targetIndex];
    const idB = cells[sourceIndex];
    if (idA !== idB && idA !== EMPTY && idB !== EMPTY) {
      currentStep.router.contact(world, ax, ay, bx, by, idA, idB);
    }
  }

  return true;
}

export function trySwap(world, x1, y1, x2, y2, options = {}) {
  if (!world || !world.cells || !world.flags) {
    return false;
  }

  const width = Number(world.width) || 0;
  const height = Number(world.height) || 0;

  const ix1 = Math.trunc(x1);
  const iy1 = Math.trunc(y1);
  const ix2 = Math.trunc(x2);
  const iy2 = Math.trunc(y2);

  if (
    !Number.isFinite(ix1) ||
    !Number.isFinite(iy1) ||
    !Number.isFinite(ix2) ||
    !Number.isFinite(iy2)
  ) {
    return false;
  }

  if (ix1 < 0 || ix1 >= width || iy1 < 0 || iy1 >= height) {
    return false;
  }

  if (ix2 < 0 || ix2 >= width || iy2 < 0 || iy2 >= height) {
    return false;
  }

  if (ix1 === ix2 && iy1 === iy2) {
    return false;
  }

  const sourceIndex = iy1 * width + ix1;
  const targetIndex = iy2 * width + ix2;

  return trySwapInternal(world, sourceIndex, targetIndex, options);
}

function updateSand(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const belowY = y + 1;

  const sandDensity = densityOf(SAND);

  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = world.cells[belowIndex];

    if (isEmpty(belowId)) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0 })) {
        return;
      }
    } else if (!isImmovable(belowId) && densityOf(belowId) < sandDensity) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0, cooldown: true })) {
        return;
      }
    }
  } else if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
    return;
  }

  const parity = currentStep.frameParity;
  const order = parity === 0 ? [-1, 1] : [1, -1];
  const rng = currentStep.rng;
  if (rng && rng() < 0.5) {
    order.reverse();
  }

  for (let i = 0; i < order.length; i += 1) {
    const dir = order[i];
    const nx = x + dir;
    const ny = y + 1;
    if (nx < 0 || nx >= width || ny >= height) {
      continue;
    }

    const targetIndex = ny * width + nx;
    const targetId = world.cells[targetIndex];

    if (isEmpty(targetId)) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    } else if (!isImmovable(targetId) && densityOf(targetId) < sandDensity) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir, cooldown: true })) {
        return;
      }
    }
  }

  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
}

function chooseLateralOrder(previousDir, parity, rng) {
  const order = [];

  if (previousDir !== 0) {
    order.push(previousDir);
    const shouldFlip = rng ? rng() < 0.25 : false;
    if (shouldFlip) {
      order.unshift(-previousDir);
    } else {
      order.push(-previousDir);
    }
  } else {
    const first = parity === 0 ? -1 : 1;
    order.push(first, -first);
    if (rng && rng() < 0.5) {
      order.reverse();
    }
  }

  return order.filter((value, index) => order.indexOf(value) === index);
}

function canFallThrough(id, waterDensity) {
  if (isEmpty(id)) {
    return true;
  }
  if (isLiquid(id)) {
    return densityOf(id) <= waterDensity;
  }
  return densityOf(id) < waterDensity;
}

function updateWater(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const waterDensity = densityOf(WATER);
  const metadata = getMeta(WATER) || {};
  const lateralRunMax = Math.max(1, Math.trunc(metadata.lateralRunMax ?? 1));

  const rng = currentStep.rng;
  const parity = currentStep.frameParity;
  const previousDir = world.lastMoveDir ? world.lastMoveDir[index] : 0;

  const belowY = y + 1;
  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = world.cells[belowIndex];

    if (isEmpty(belowId) || (isLiquid(belowId) && densityOf(belowId) < waterDensity)) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0 })) {
        return;
      }
    } else if (belowId === SAND) {
      const probability = rng ? rng() : Math.random();
      if (probability < WATER_SAND_DISPLACEMENT_PROBABILITY) {
        if (
          trySwapInternal(world, index, belowIndex, {
            allowDenser: true,
            afterSwapDir: 0,
            cooldown: true,
          })
        ) {
          if (world.lastMoveDir) {
            world.lastMoveDir[belowIndex] = 0;
          }
          return;
        }
      }
    }
  } else {
    if (world.lastMoveDir) {
      world.lastMoveDir[index] = 0;
    }
    return;
  }

  const diagonalOrder = parity === 0 ? [-1, 1] : [1, -1];
  if (rng && rng() < 0.35) {
    diagonalOrder.reverse();
  }

  for (let i = 0; i < diagonalOrder.length; i += 1) {
    const dir = diagonalOrder[i];
    const nx = x + dir;
    const ny = y + 1;
    if (nx < 0 || nx >= width || ny >= height) {
      continue;
    }

    const targetIndex = ny * width + nx;
    const targetId = world.cells[targetIndex];

    if (isEmpty(targetId) || (isLiquid(targetId) && densityOf(targetId) < waterDensity)) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    } else if (targetId === SAND) {
      const probability = rng ? rng() : Math.random();
      if (probability < WATER_SAND_DISPLACEMENT_PROBABILITY) {
        if (
          trySwapInternal(world, index, targetIndex, {
            allowDenser: true,
            afterSwapDir: dir,
            cooldown: true,
          })
        ) {
          if (world.lastMoveDir) {
            world.lastMoveDir[targetIndex] = dir;
          }
          return;
        }
      }
    }
  }

  const lateralOrder = chooseLateralOrder(previousDir, parity, rng);
  let movedLaterally = false;

  for (let i = 0; i < lateralOrder.length; i += 1) {
    const dir = lateralOrder[i];
    if (dir === 0) {
      continue;
    }

    let bestIndex = -1;
    for (let step = 1; step <= lateralRunMax; step += 1) {
      const nx = x + dir * step;
      if (nx < 0 || nx >= width) {
        break;
      }

      const candidateIndex = y * width + nx;
      const candidateId = world.cells[candidateIndex];

      if (!isEmpty(candidateId)) {
        break;
      }

      const supportY = y + 1;
      if (supportY >= height) {
        bestIndex = candidateIndex;
        continue;
      }

      const supportIndex = candidateIndex + width;
      const supportId = world.cells[supportIndex];
      if (canFallThrough(supportId, waterDensity)) {
        bestIndex = candidateIndex;
      } else {
        break;
      }
    }

    if (bestIndex !== -1) {
      if (
        trySwapInternal(world, index, bestIndex, {
          afterSwapDir: dir,
        })
      ) {
        movedLaterally = true;
        break;
      }
    }
  }

  if (world.lastMoveDir && !movedLaterally) {
    world.lastMoveDir[index] = 0;
  }
}

function updateOil(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const oilDensity = densityOf(OIL);
  const metadata = getMeta(OIL) || {};
  const lateralRunMax = Math.max(1, Math.trunc(metadata.lateralRunMax ?? 1));
  const viscosity = Math.max(1, Math.trunc(metadata.viscosity ?? 1));
  const rng = currentStep.rng;
  const parity = currentStep.frameParity;
  const previousDir = world.lastMoveDir ? world.lastMoveDir[index] : 0;

  const combustion = metadata.combustion || {};
  const igniteChance = clamp01(
    Number.isFinite(combustion.igniteProbability) ? combustion.igniteProbability : 0,
  );
  const igniteProduct = Number.isFinite(combustion.product) ? combustion.product : FIRE;
  if (igniteChance > 0 && (igniteProduct === FIRE || getMaterial(igniteProduct))) {
    const igniteNeighbors = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: -1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: 1 },
    ];
    for (let i = 0; i < igniteNeighbors.length; i += 1) {
      const nx = x + igniteNeighbors[i].dx;
      const ny = y + igniteNeighbors[i].dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }
      const neighborIndex = ny * width + nx;
      if (world.cells[neighborIndex] === FIRE && randomChance(igniteChance)) {
        if (igniteCellAt(world, index, igniteProduct)) {
          return;
        }
      }
    }
  }

  const belowY = y + 1;
  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = world.cells[belowIndex];
    if (isEmpty(belowId)) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0 })) {
        return;
      }
    } else if (isLiquid(belowId) && densityOf(belowId) < oilDensity) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0 })) {
        return;
      }
    }
  } else {
    if (world.lastMoveDir) {
      world.lastMoveDir[index] = 0;
    }
    return;
  }

  const diagonalOrder = parity === 0 ? [-1, 1] : [1, -1];
  if (rng && rng() < 0.35) {
    diagonalOrder.reverse();
  }

  for (let i = 0; i < diagonalOrder.length; i += 1) {
    const dir = diagonalOrder[i];
    const nx = x + dir;
    const ny = y + 1;
    if (nx < 0 || nx >= width || ny >= height) {
      continue;
    }

    const targetIndex = ny * width + nx;
    const targetId = world.cells[targetIndex];
    if (isEmpty(targetId)) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    } else if (isLiquid(targetId) && densityOf(targetId) < oilDensity) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    }
  }

  if (y > 0) {
    const buoyancy = Number.isFinite(metadata.buoyancy) ? metadata.buoyancy : 0;
    if (buoyancy > 0) {
      const aboveIndex = index - width;
      const aboveId = world.cells[aboveIndex];
      if (
        aboveIndex >= 0 &&
        !isImmovable(aboveId) &&
        isLiquid(aboveId) &&
        densityOf(aboveId) > oilDensity
      ) {
        const chance = clamp01(0.05 + 0.03 * buoyancy);
        if (chance > 0 && randomChance(chance)) {
          if (trySwapInternal(world, index, aboveIndex, { allowDenser: true, cooldown: true })) {
            if (world.lastMoveDir) {
              world.lastMoveDir[aboveIndex] = 0;
            }
            return;
          }
        }
      }
    }
  }

  let attemptLateral = true;
  if (viscosity > 1) {
    const lateralChance = 1 / Math.max(1, viscosity);
    attemptLateral = (rng ? rng() : Math.random()) < lateralChance;
  }

  let movedLaterally = false;
  if (attemptLateral) {
    const lateralOrder = chooseLateralOrder(previousDir, parity, rng);
    for (let i = 0; i < lateralOrder.length; i += 1) {
      const dir = lateralOrder[i];
      if (dir === 0) {
        continue;
      }

      let bestIndex = -1;
      for (let step = 1; step <= lateralRunMax; step += 1) {
        const nx = x + dir * step;
        if (nx < 0 || nx >= width) {
          break;
        }
        const candidateIndex = y * width + nx;
        if (!isEmpty(world.cells[candidateIndex])) {
          break;
        }

        const supportY = y + 1;
        if (supportY >= height) {
          bestIndex = candidateIndex;
          continue;
        }

        const supportIndex = candidateIndex + width;
        const supportId = world.cells[supportIndex];
        if (canFallThrough(supportId, oilDensity)) {
          bestIndex = candidateIndex;
        } else {
          break;
        }
      }

      if (bestIndex !== -1) {
        if (trySwapInternal(world, index, bestIndex, { afterSwapDir: dir })) {
          movedLaterally = true;
          break;
        }
      }
    }
  }

  if (world.lastMoveDir && !movedLaterally) {
    world.lastMoveDir[index] = 0;
  }
}

function updateFire(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;
  const settings = getFireSettings();
  const extinguishProbability = clamp01(settings.extinguishProbability ?? 0.5);
  const defaultIgnite = clamp01(settings.igniteProbability ?? 0.2);

  if (lifetimes) {
    let lifetime = lifetimes[index];
    if (lifetime <= 0) {
      lifetime = sampleFireLifetime();
    }
    lifetime -= 1;
    if (lifetime <= 0) {
      extinguishFire(world, index);
      return;
    }
    lifetimes[index] = lifetime;
  }

  // Water contact extinguish
  const neighbors = [
    { dx: 0, dy: -1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: -1 },
    { dx: 1, dy: -1 },
    { dx: -1, dy: 1 },
    { dx: 1, dy: 1 },
  ];
  for (let i = 0; i < neighbors.length; i += 1) {
    const nx = x + neighbors[i].dx;
    const ny = y + neighbors[i].dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    if (cells[neighborIndex] === WATER && randomChance(extinguishProbability)) {
      extinguishFire(world, index);
      return;
    }
  }

  const cap = currentStep.fireSpawnCap;
  const capActive = Number.isFinite(cap) && cap >= 0;

  outer: for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }
      if (capActive && currentStep.fireSpawnedThisTick >= cap) {
        break outer;
      }

      const neighborIndex = ny * width + nx;
      const neighborId = cells[neighborIndex];
      if (neighborId === EMPTY || neighborId === FIRE) {
        continue;
      }
      const meta = getMeta(neighborId);
      if (!meta || !meta.flammable) {
        continue;
      }
      const combustion = meta.combustion || {};
      const igniteProbability = clamp01(
        Number.isFinite(combustion.igniteProbability) ? combustion.igniteProbability : defaultIgnite,
      );
      if (igniteProbability <= 0) {
        continue;
      }

      const productId = Number.isFinite(combustion.product) ? combustion.product : FIRE;
      if (!Number.isFinite(productId)) {
        continue;
      }
      if (!randomChance(igniteProbability)) {
        continue;
      }
      if (igniteCellAt(world, neighborIndex, productId)) {
        if (capActive && currentStep.fireSpawnedThisTick >= cap) {
          break outer;
        }
      }
    }
  }

  const candidates = [
    { dx: 0, dy: -1, dir: 0 },
    { dx: -1, dy: -1, dir: -1 },
    { dx: 1, dy: -1, dir: 1 },
  ];

  for (let i = 0; i < candidates.length; i += 1) {
    const nx = x + candidates[i].dx;
    const ny = y + candidates[i].dy;
    if (nx < 0 || nx >= width || ny < 0) {
      continue;
    }
    const targetIndex = ny * width + nx;
    if (!isEmpty(cells[targetIndex])) {
      continue;
    }
    if (
      trySwapInternal(world, index, targetIndex, {
        afterSwapDir: candidates[i].dir,
        allowDenser: true,
      })
    ) {
      return;
    }
  }
}

UPDATERS[SAND] = updateSand;
UPDATERS[WATER] = updateWater;
UPDATERS[OIL] = updateOil;
UPDATERS[FIRE] = updateFire;

export function createWorld(width, height) {
  const normalizedWidth = normalizeDimension(width, DEFAULT_WORLD_WIDTH);
  const normalizedHeight = normalizeDimension(height, DEFAULT_WORLD_HEIGHT);
  const cellCount = normalizedWidth * normalizedHeight;

  const cells = new Uint16Array(cellCount);
  const flags = new Uint8Array(cellCount);
  const lastMoveDir = new Int8Array(cellCount);
  const lifetimes = new Uint8Array(cellCount);

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
    lastMoveDir,
    lifetimes,
    idx,
    inBounds,
  };
}

export function idx(world, x, y) {
  if (!world || typeof world.idx !== 'function') {
    throw new TypeError('idx(world, x, y) requires a world with an idx method.');
  }
  return world.idx(x, y);
}

export function inBounds(world, x, y) {
  if (!world || typeof world.inBounds !== 'function') {
    return false;
  }
  return Boolean(world.inBounds(x, y));
}

export function beginTick(world) {
  if (!world || !world.flags) {
    return;
  }

  const flags = world.flags;
  for (let i = 0; i < flags.length; i += 1) {
    const hasNextCooldown = (flags[i] & FLAG_SWAP_COOLDOWN_NEXT) !== 0;
    let nextFlags = flags[i] & CLEAR_MOVED_MASK;
    nextFlags &= CLEAR_COOLDOWN_MASK;
    nextFlags &= CLEAR_COOLDOWN_NEXT_MASK;
    if (hasNextCooldown) {
      nextFlags |= FLAG_SWAP_COOLDOWN;
    }
    flags[i] = nextFlags;
  }
}

export function endTick(world) {
  if (!world || !world.flags) {
    return;
  }

  const flags = world.flags;
  for (let i = 0; i < flags.length; i += 1) {
    flags[i] &= CLEAR_MOVED_MASK;
  }
}

export function step(world, context = {}) {
  if (!world || !world.cells || !world.flags) {
    return;
  }

  const width = Number(world.width) || 0;
  const height = Number(world.height) || 0;

  if (width <= 0 || height <= 0) {
    return;
  }

  const cells = world.cells;
  const flags = world.flags;

  const state = context.state ?? context ?? {};
  const parity = (Number(state.frame) || 0) & 1;
  const router = context.router ?? null;

  currentStep.frameParity = parity;
  currentStep.rng = ensureRng(state.seed);
  currentStep.stats = context.stats ?? null;
  currentStep.limits = context.limits ?? null;
  currentStep.metrics = context.metrics ?? null;
  currentStep.router = router;

  if (router && typeof router.resetFrame === 'function') {
    router.resetFrame();
  }
  const fireSettings = getFireSettings();
  const rawCap = Number.isFinite(fireSettings.maxSpawnPerTick)
    ? Math.trunc(fireSettings.maxSpawnPerTick)
    : NaN;
  currentStep.fireSpawnCap = Number.isFinite(rawCap) && rawCap >= 0 ? rawCap : Number.POSITIVE_INFINITY;
  currentStep.fireSpawnedThisTick = 0;
  currentStep.particleBudget = null;

  for (let y = height - 1; y >= 0; y -= 1) {
    const rowOffset = y * width;

    for (let x = 0; x < width; x += 1) {
      const index = rowOffset + x;
      const elementId = cells[index];

      if (elementId === EMPTY || elementId === WALL) {
        continue;
      }

      if ((flags[index] & FLAG_MOVED_THIS_TICK) !== 0) {
        continue;
      }

      const updater = UPDATERS[elementId];

      if (typeof updater === 'function') {
        updater(world, x, y);
      }
    }
  }

  if (router && typeof router.adjacentTick === 'function') {
    for (let y = 0; y < height; y += 1) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x += 1) {
        const index = rowOffset + x;
        const id = cells[index];
        if (x + 1 < width) {
          const neighborIndex = index + 1;
          const neighborId = cells[neighborIndex];
          if (
            (id !== EMPTY || neighborId !== EMPTY) &&
            (id !== WALL || neighborId !== WALL)
          ) {
            router.adjacentTick(world, x, y, x + 1, y, id, neighborId);
          }
        }
        if (y + 1 < height) {
          const neighborIndex = index + width;
          const neighborId = cells[neighborIndex];
          if (
            (id !== EMPTY || neighborId !== EMPTY) &&
            (id !== WALL || neighborId !== WALL)
          ) {
            router.adjacentTick(world, x, y, x, y + 1, id, neighborId);
          }
        }
      }
    }
  }

  currentStep.rng = null;
  currentStep.stats = null;
  currentStep.limits = null;
  currentStep.metrics = null;
  currentStep.fireSpawnCap = 0;
  currentStep.fireSpawnedThisTick = 0;
  currentStep.particleBudget = null;
  currentStep.router = null;
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
  const flags = world.flags;
  const lastMoveDir = world.lastMoveDir;
  const lifetimes = world.lifetimes;

  const centerX = Math.trunc(Number.isFinite(x) ? x : NaN);
  const centerY = Math.trunc(Number.isFinite(y) ? y : NaN);

  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
    return 0;
  }

  let effectiveRadius = Math.trunc(Number.isFinite(radius) ? radius : 0);
  if (effectiveRadius < 0) {
    effectiveRadius = 0;
  }

  let changed = 0;

  if (effectiveRadius === 0) {
    if (centerX >= 0 && centerX < width && centerY >= 0 && centerY < height) {
      const index = centerY * width + centerX;
      if (cells[index] !== elementId) {
        cells[index] = elementId;
        flags[index] = 0;
        if (lastMoveDir) {
          lastMoveDir[index] = 0;
        }
        if (lifetimes) {
          lifetimes[index] = 0;
        }
        changed += 1;
      }
    }
    return changed;
  }

  const squaredRadius = effectiveRadius * effectiveRadius;

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
          flags[index] = 0;
          if (lastMoveDir) {
            lastMoveDir[index] = 0;
          }
          if (lifetimes) {
            lifetimes[index] = 0;
          }
          changed += 1;
        }
    }
  }

  return changed;
}

export function fillRect(world, elementId, x0, y0, x1, y1) {
  if (!world || !world.cells || !world.flags) {
    return 0;
  }

  const width = Number(world.width) || 0;
  const height = Number(world.height) || 0;

  if (width <= 0 || height <= 0) {
    return 0;
  }

  const normalizedId = Number.isFinite(elementId) ? Math.trunc(elementId) : EMPTY;

  const startX = Math.trunc(Number(x0));
  const startY = Math.trunc(Number(y0));
  const endX = Math.trunc(Number(x1));
  const endY = Math.trunc(Number(y1));

  if (
    !Number.isFinite(startX) ||
    !Number.isFinite(startY) ||
    !Number.isFinite(endX) ||
    !Number.isFinite(endY)
  ) {
    return 0;
  }

  const minX = Math.max(0, Math.min(startX, endX));
  const maxX = Math.min(width - 1, Math.max(startX, endX));
  const minY = Math.max(0, Math.min(startY, endY));
  const maxY = Math.min(height - 1, Math.max(startY, endY));

  if (minX > maxX || minY > maxY) {
    return 0;
  }

  const cells = world.cells;
  const flags = world.flags;
  const lastMoveDir = world.lastMoveDir;
  const lifetimes = world.lifetimes;
  let writes = 0;

  for (let y = minY; y <= maxY; y += 1) {
    const rowOffset = y * width;
    for (let x = minX; x <= maxX; x += 1) {
      const index = rowOffset + x;
      if (cells[index] === normalizedId) {
        continue;
      }

      cells[index] = normalizedId;
      flags[index] = 0;
      if (lastMoveDir) {
        lastMoveDir[index] = 0;
      }
      if (lifetimes) {
        lifetimes[index] = 0;
      }
      writes += 1;
    }
  }

  return writes;
}

export { mulberry32 };

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

function paintRectangle(world, startX, startY, sizeX, sizeY, elementId) {
  const width = world.width;
  const height = world.height;
  const x0 = Math.max(0, Math.trunc(startX));
  const y0 = Math.max(0, Math.trunc(startY));
  const x1 = Math.min(width, x0 + Math.max(0, Math.trunc(sizeX)));
  const y1 = Math.min(height, y0 + Math.max(0, Math.trunc(sizeY)));
  const lifetimes = world.lifetimes;

  for (let y = y0; y < y1; y += 1) {
    const rowOffset = y * width;
    for (let x = x0; x < x1; x += 1) {
      const index = rowOffset + x;
      world.cells[index] = elementId;
      world.flags[index] = 0;
      if (world.lastMoveDir) {
        world.lastMoveDir[index] = 0;
      }
      if (lifetimes) {
        lifetimes[index] = 0;
      }
    }
  }
}

export function runWaterOverSandTest(world, options = {}) {
  if (!world || !world.cells || !world.flags) {
    throw new Error('A valid world is required for the stress test.');
  }

  const frames = Math.max(1, Math.trunc(options.frames ?? 120));
  world.cells.fill(EMPTY);
  world.flags.fill(0);
  if (world.lastMoveDir) {
    world.lastMoveDir.fill(0);
  }
  if (world.lifetimes) {
    world.lifetimes.fill(0);
  }

  const width = world.width;
  const height = world.height;

  const bedWidth = Math.min(16, width);
  const bedHeight = Math.min(10, height);
  const bedStartX = Math.floor((width - bedWidth) / 2);
  const bedStartY = height - bedHeight;

  paintRectangle(world, bedStartX, bedStartY, bedWidth, bedHeight, SAND);

  const waterWidth = Math.min(10, width);
  const waterHeight = Math.min(6, Math.max(0, bedStartY));
  const waterStartX = Math.floor((width - waterWidth) / 2);
  const waterStartY = Math.max(0, bedStartY - waterHeight);

  paintRectangle(world, waterStartX, waterStartY, waterWidth, waterHeight, WATER);

  const stats = options.stats ?? { swaps: 0 };
  stats.swaps = 0;

  const stepState = {
    seed: options.seed ?? rngState.seed,
    frame: Number.isFinite(options.frame) ? Math.trunc(options.frame) : 0,
  };

  for (let i = 0; i < frames; i += 1) {
    beginTick(world);
    step(world, { state: stepState, stats });
    endTick(world);
    stepState.frame += 1;
  }

  let settled = 0;
  let minX = width;
  let maxX = -1;

  for (let index = 0; index < world.cells.length; index += 1) {
    if (world.cells[index] !== WATER) {
      continue;
    }

    const y = Math.floor(index / width);
    const x = index % width;

    if (y + 1 >= height || !isEmpty(world.cells[index + width])) {
      settled += 1;
    }

    if (x < minX) {
      minX = x;
    }
    if (x > maxX) {
      maxX = x;
    }
  }

  const lateralSpread = maxX >= minX ? maxX - minX + 1 : 0;

  return {
    settled,
    lateralSpread,
    swaps: stats.swaps ?? 0,
  };
}
