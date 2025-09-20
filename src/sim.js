import {
  EMPTY,
  WALL,
  SAND,
  WET_SAND,
  GUNPOWDER,
  WET_GUNPOWDER,
  BAKING_SODA,
  PIXIE_DUST,
  NANITE_POWDER,
  RUST,
  ASH,
  WATER,
  OXYGEN,
  HYDROGEN,
  ETHEREAL_MIST,
  ANTIMATTER_VAPOR,
  OIL,
  ACID,
  LUMINA,
  UMBRA,
  FIRE,
  STEAM,
  GLASS,
  IRON,
  WOOD,
  DRY_ICE,
  ICE,
  CARBON_DIOXIDE,
  PIXIE_SPARK,
  ENCHANTED_WATER,
  MOLTEN_IRON,
  NEUTRONIUM_CORE,
  PHILOSOPHERS_STONE,
  GOLD,
  ECTOPLASM,
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
const SAND_HEAT_ACCUMULATION = 45;
const SAND_HEAT_COOL_RATE = 5;
const SAND_GLASS_HEAT_THRESHOLD = 200;
const WET_SAND_MAX_MOISTURE = 220;
const WET_SAND_DRY_RATE = 2;
const WET_SAND_EXTRA_DRY_RATE = 6;
const WET_SAND_SLIDE_PROBABILITY = 0.35;
const WET_SAND_DIAGONAL_PROBABILITY = 0.25;
const IRON_HEAT_ACCUMULATION = 30;
const IRON_COOL_RATE = 6;
const IRON_MELT_THRESHOLD = 220;
const IRON_RUST_CHANCE = 0.035;
const IRON_RUST_OXYGEN_MULTIPLIER = 2.5;
const IRON_RUST_WATER_REQUIRED = true;
const MOLTEN_IRON_INITIAL_LIFETIME = 200;
const MOLTEN_IRON_COOL_RATE = 2;
const MOLTEN_IRON_SOLIDIFY_CHANCE = 0.01;
const MOLTEN_IRON_WATER_SOLIDIFY_CHANCE = 0.6;
const WOOD_MAX_MOISTURE = 200;
const WOOD_MOISTURE_GAIN = 60;
const WOOD_DRY_RATE = 2;
const WOOD_IGNITE_BASE_CHANCE = 0.25;
const WOOD_IGNITE_MOISTURE_THRESHOLD = 80;
const WOOD_OIL_IGNITE_MULTIPLIER = 1.7;
const WOOD_BURN_DURATION = 160;
const WOOD_FIRE_SPAWN_CHANCE = 0.35;
const WOOD_ASH_DROP_CHANCE = 0.25;
const DRY_ICE_BASE_LIFETIME = 200;
const DRY_ICE_SUBLIMATION_CHANCE = 0.35;
const DRY_ICE_GAS_EMIT = 2;
const DRY_ICE_WATER_FREEZE_CHANCE = 0.6;
const DRY_ICE_FIRE_EXTINGUISH_CHANCE = 0.8;
const NEUTRONIUM_PULL_RADIUS = 8;
const NEUTRONIUM_PULL_STRENGTH = 3;
const NEUTRONIUM_SWALLOW_CHANCE = 0.6;
const PHILOSOPHER_TRANSMUTE_COOLDOWN = 3;
const WATER_LATERAL_RUN_CAP = 14;
const WATER_PRESSURE_MAX_DEPTH = 6;
const WATER_FREEZE_BONUS = 0.35;
const WATER_PROPAGATE_FREEZE = 0.12;
const WATER_HEAT_VAPOR_CHANCE = 0.18;
const WATER_COLD_CONVERSION_CHANCE = 0.5;
const STEAM_DEFAULT_LIFETIME = 160;
const STEAM_CONDENSE_ON_WATER = 0.08;
const STEAM_CONDENSE_ON_COLD = 0.65;
const STEAM_SIDEWAYS_CHANCE = 0.35;
const ICE_HEAT_MELT_CHANCE = 0.65;
const ICE_AMBIENT_MELT_CHANCE = 0.003;
const CARDINAL_OFFSETS = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
];
const GUNPOWDER_CLUSTER_LIMIT = 4096;
const GUNPOWDER_FIRE_LIFETIME = 80;
const GUNPOWDER_PUSH_DISTANCE = 2;
const GUNPOWDER_SMOKE_CHANCE = 0.45;
const GUNPOWDER_CONFINE_THRESHOLD = 0.6;
const WET_GUNPOWDER_MAX_MOISTURE = 200;
const WET_GUNPOWDER_DRY_RATE = 3;
const WET_GUNPOWDER_FIRE_DRY_RATE = 12;
const NANITE_ATTRACTION_RADIUS = 4;
const NANITE_EAT_CHANCE = 0.28;
const NANITE_SIDEWAY_CHANCE = 0.32;
const NANITE_HORIZONTAL_STEP_CHANCE = 0.2;
const OXYGEN_IGNITE_BOOST_PER_NEIGHBOR = 0.25;
const OXYGEN_IGNITE_MAX_NEIGHBORS = 4;
const OXYGEN_LIFETIME_BOOST = 6;
const CO2_IGNITE_PENALTY_PER_NEIGHBOR = 0.3;
const CO2_LIFETIME_PENALTY = 4;
const CO2_SMOTHER_THRESHOLD = 3;
const CO2_SMOTHER_PROBABILITY = 0.6;
const CO2_FIRE_EXTINGUISH_CHANCE = 0.75;
const CO2_LATERAL_DIFFUSE_CHANCE = 0.45;
const HYDROGEN_CLUSTER_LIMIT = 8192;
const HYDROGEN_EXPLOSION_FIRE_LIFETIME = 90;
const HYDROGEN_EXPLOSION_PUSH_DISTANCE = 3;
const HYDROGEN_STEAM_SPAWN_CHANCE = 0.4;
const ETHEREAL_MIST_BASE_LIFETIME = 260;
const ETHEREAL_MIST_FADE_VARIANCE = 140;
const ETHEREAL_MIST_PHASE_ATTEMPTS = 2;
const ETHEREAL_MIST_DISSIPATE_CHANCE = 0.01;
const ETHEREAL_MIST_LUMINA_LIFETIME_BONUS = 14;
const ETHEREAL_MIST_LUMINA_SPARK_CHANCE = 0.45;
const ETHEREAL_MIST_UMBRA_DRAIN = 12;
const ETHEREAL_MIST_UMBRA_DRAIN_CHANCE = 0.35;
const ANTIMATTER_CLUSTER_LIMIT = 4096;
const ANTIMATTER_BASE_RADIUS = 3;
const ANTIMATTER_MAX_RADIUS = 7;
const ANTIMATTER_FIRE_LIFETIME = 150;
const ANTIMATTER_PUSH_DISTANCE = 4;
const ANTIMATTER_SPARK_ATTEMPTS = 6;
const ACID_METAL_CORROSION_CHANCE = 0.6;
const ACID_WOOD_CORROSION_CHANCE = 0.25;
const ACID_HYDROGEN_ATTEMPTS = 3;
const ACID_HYDROGEN_LIFETIME = 140;
const ACID_DILUTION_CHANCE = 0.25;
const ACID_LATERAL_DIFFUSE_CHANCE = 0.5;
const LUMINA_SPARK_CHANCE = 0.08;
const LUMINA_EVAPORATE_CHANCE = 0.002;
const LUMINA_PURIFY_ACID_CHANCE = 0.4;
const LUMINA_LATERAL_DIFFUSE_CHANCE = 0.6;
const LUMINA_PURIFY_OIL_CHANCE = 0.35;
const UMBRA_EXTINGUISH_CHANCE = 0.9;
const UMBRA_FREEZE_CHANCE = 0.55;
const UMBRA_EVAPORATE_CHANCE = 0.0035;
const UMBRA_LATERAL_DIFFUSE_CHANCE = 0.35;
const ECTOPLASM_EVAPORATE_CHANCE = 0.008;
const ECTOPLASM_REFORM_LIFETIME = 200;

const SURROUNDING_OFFSETS = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

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

function isGas(id) {
  return getMeta(id)?.state === 'gas';
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

function transformCell(world, index, id, lifetime = 0) {
  if (!world || !world.cells) {
    return;
  }
  if (index < 0 || index >= world.cells.length) {
    return;
  }
  world.cells[index] = id;
  clearCellState(world, index);
  if (Number.isFinite(lifetime)) {
    setLifetime(world, index, lifetime);
  }
}

function isSandLike(id) {
  return id === SAND || id === WET_SAND;
}

function isWaterLike(id) {
  return id === WATER || id === ENCHANTED_WATER;
}

function isSmotheredBySand(world, fireIndex) {
  if (!world || !world.cells) {
    return false;
  }
  const width = world.width;
  const height = world.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }
  const x = fireIndex % width;
  const y = Math.floor(fireIndex / width);
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return false;
  }

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      return false;
    }
    const neighborId = world.cells[ny * width + nx];
    if (!isSandLike(neighborId)) {
      return false;
    }
  }

  return true;
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
  const cells = world.cells;
  const lifetimes = world.lifetimes;
  const rng = currentStep.rng;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      triggerAntimatterAnnihilation(world, index);
      return;
    }
    const neighborIndex = ny * width + nx;
    if (cells[neighborIndex] === WATER) {
      transformCell(world, neighborIndex, WET_SAND, WET_SAND_MAX_MOISTURE);
      transformCell(world, index, WET_SAND, WET_SAND_MAX_MOISTURE);
      return;
    }
    if (cells[neighborIndex] === FIRE && isSmotheredBySand(world, neighborIndex)) {
      extinguishFire(world, neighborIndex);
    }
  }

  let heat = lifetimes ? lifetimes[index] : 0;
  let touchingExtremeHeat = false;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    if (cells[ny * width + nx] === FIRE) {
      touchingExtremeHeat = true;
      break;
    }
  }

  if (touchingExtremeHeat) {
    heat = Math.min(255, heat + SAND_HEAT_ACCUMULATION);
  } else if (heat > 0) {
    heat = Math.max(0, heat - SAND_HEAT_COOL_RATE);
  }

  if (lifetimes) {
    lifetimes[index] = heat;
  }

  if (touchingExtremeHeat && heat >= SAND_GLASS_HEAT_THRESHOLD) {
    transformCell(world, index, GLASS);
    return;
  }

  const sandDensity = densityOf(SAND);
  const belowY = y + 1;

  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = cells[belowIndex];

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
    const targetId = cells[targetIndex];

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

function updateWetSand(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;
  const rng = currentStep.rng;
  const previousDir = world.lastMoveDir ? world.lastMoveDir[index] : 0;

  let moisture = lifetimes ? lifetimes[index] : WET_SAND_MAX_MOISTURE;
  let nearWater = false;
  let nearFire = false;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];

    if (isWaterLike(neighborId)) {
      nearWater = true;
      transformCell(world, neighborIndex, WET_SAND, WET_SAND_MAX_MOISTURE);
    } else if (neighborId === FIRE) {
      nearFire = true;
    }
  }

  if (nearWater) {
    moisture = WET_SAND_MAX_MOISTURE;
  } else if (moisture > 0) {
    const dryRate = nearFire ? WET_SAND_EXTRA_DRY_RATE : WET_SAND_DRY_RATE;
    moisture = moisture > dryRate ? moisture - dryRate : 0;
  }

  if (lifetimes) {
    lifetimes[index] = Math.max(0, Math.min(255, moisture));
  }

  if (!nearWater && moisture <= 0) {
    transformCell(world, index, SAND);
    return;
  }

  const wetSandDensity = densityOf(WET_SAND);
  const belowY = y + 1;

  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = cells[belowIndex];

    if (isEmpty(belowId)) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0 })) {
        return;
      }
    } else if (!isImmovable(belowId) && densityOf(belowId) < wetSandDensity) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0, cooldown: true })) {
        return;
      }
    }
  } else {
    if (world.lastMoveDir) {
      world.lastMoveDir[index] = 0;
    }
    return;
  }

  const parity = currentStep.frameParity;
  const diagonalOrder = parity === 0 ? [-1, 1] : [1, -1];
  if (rng && rng() < 0.35) {
    diagonalOrder.reverse();
  }

  for (let i = 0; i < diagonalOrder.length; i += 1) {
    if (rng && rng() > WET_SAND_DIAGONAL_PROBABILITY) {
      continue;
    }
    const dir = diagonalOrder[i];
    const nx = x + dir;
    const ny = y + 1;
    if (nx < 0 || nx >= width || ny >= height) {
      continue;
    }
    const targetIndex = ny * width + nx;
    const targetId = cells[targetIndex];

    if (isEmpty(targetId)) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir, cooldown: true })) {
        return;
      }
    } else if (!isImmovable(targetId) && densityOf(targetId) < wetSandDensity) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir, cooldown: true })) {
        return;
      }
    }
  }

  let movedLaterally = false;
  const slideRoll = rng ? rng() : Math.random();
  if (slideRoll < WET_SAND_SLIDE_PROBABILITY) {
    const lateralOrder = chooseLateralOrder(previousDir, parity, rng);
    for (let i = 0; i < lateralOrder.length; i += 1) {
      const dir = lateralOrder[i];
      if (dir === 0) {
        continue;
      }
      const nx = x + dir;
      if (nx < 0 || nx >= width) {
        continue;
      }
      const candidateIndex = y * width + nx;
      if (!isEmpty(cells[candidateIndex])) {
        continue;
      }

      const supportY = y + 1;
      if (supportY >= height) {
        if (trySwapInternal(world, index, candidateIndex, { afterSwapDir: dir, cooldown: true })) {
          movedLaterally = true;
        }
        break;
      }

      const supportIndex = candidateIndex + width;
      const supportId = cells[supportIndex];
      if (isEmpty(supportId)) {
        continue;
      }
      if (isImmovable(supportId) || densityOf(supportId) >= wetSandDensity) {
        continue;
      }
      if (trySwapInternal(world, index, candidateIndex, { afterSwapDir: dir, cooldown: true })) {
        movedLaterally = true;
        break;
      }
    }
  }

  if (world.lastMoveDir && !movedLaterally) {
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

function updateGlass(world, x, y) {
  updateFallingSolid(world, x, y, GLASS);
}

function updateAsh(world, x, y) {
  updateFallingSolid(world, x, y, ASH);
}

function updateRust(world, x, y) {
  updateFallingSolid(world, x, y, RUST);
}

function updateIron(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;

  let heat = lifetimes ? lifetimes[index] : 0;
  let touchedFire = false;
  let waterNearby = false;
  let oxygenNearby = false;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];

    if (neighborId === FIRE || neighborId === MOLTEN_IRON) {
      touchedFire = true;
      continue;
    }

    if (isWaterLike(neighborId)) {
      waterNearby = true;
      continue;
    }

    if (neighborId === OXYGEN) {
      oxygenNearby = true;
      continue;
    }

    if (neighborId === ACID) {
      transformCell(world, index, EMPTY);
      emitGasAround(world, neighborIndex, HYDROGEN, 2, ACID_HYDROGEN_LIFETIME);
      return;
    }
  }

  if (touchedFire) {
    heat = Math.min(255, heat + IRON_HEAT_ACCUMULATION);
  } else if (heat > 0) {
    heat = Math.max(0, heat - IRON_COOL_RATE);
  }

  if (lifetimes) {
    lifetimes[index] = heat;
  }

  if (heat >= IRON_MELT_THRESHOLD) {
    transformCell(world, index, MOLTEN_IRON, MOLTEN_IRON_INITIAL_LIFETIME);
    return;
  }

  let rustChance = IRON_RUST_CHANCE;
  if (IRON_RUST_WATER_REQUIRED && !waterNearby) {
    rustChance = 0;
  }
  if (oxygenNearby) {
    rustChance *= IRON_RUST_OXYGEN_MULTIPLIER;
  }

  if (rustChance > 0 && randomChance(rustChance)) {
    transformCell(world, index, RUST);
    return;
  }

  updateFallingSolid(world, x, y, IRON);
}

function updateMoltenIron(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;
  const moltenDensity = densityOf(MOLTEN_IRON);
  const metadata = getMeta(MOLTEN_IRON) || {};
  const viscosity = Math.max(1, Math.trunc(metadata.viscosity ?? 1));
  const lateralRunMax = Math.max(1, Math.trunc(metadata.lateralRunMax ?? 1));
  const rng = currentStep.rng;
  const parity = currentStep.frameParity;

  let lifetime = lifetimes ? lifetimes[index] : 0;
  if (lifetimes) {
    if (lifetime <= 0) {
      lifetime = MOLTEN_IRON_INITIAL_LIFETIME;
    } else {
      lifetime = Math.max(0, lifetime - MOLTEN_IRON_COOL_RATE);
    }
  }

  let shouldSolidify = false;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];

    if (isWaterLike(neighborId)) {
      transformCell(world, neighborIndex, STEAM, 120);
      shouldSolidify = true;
      continue;
    }

    if (neighborId === ICE) {
      transformCell(world, neighborIndex, WATER);
      shouldSolidify = true;
      continue;
    }

    if (neighborId === RUST) {
      transformCell(world, neighborIndex, MOLTEN_IRON, MOLTEN_IRON_INITIAL_LIFETIME);
      continue;
    }
  }

  if (lifetimes) {
    if (shouldSolidify) {
      lifetime = Math.max(0, lifetime - 20);
    }
    lifetimes[index] = lifetime;
    if (lifetime <= 0) {
      transformCell(world, index, IRON);
      return;
    }
  }

  if (!shouldSolidify && randomChance(MOLTEN_IRON_SOLIDIFY_CHANCE)) {
    transformCell(world, index, IRON);
    return;
  }

  if (shouldSolidify && randomChance(MOLTEN_IRON_WATER_SOLIDIFY_CHANCE)) {
    transformCell(world, index, IRON);
    return;
  }

  const belowY = y + 1;
  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = cells[belowIndex];
    if (isEmpty(belowId)) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0 })) {
        return;
      }
    } else if (!isImmovable(belowId) && densityOf(belowId) < moltenDensity) {
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
  if (rng && rng() < 0.25) {
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
    const targetId = cells[targetIndex];
    if (isEmpty(targetId)) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    } else if (!isImmovable(targetId) && densityOf(targetId) < moltenDensity) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    }
  }

  let movedLaterally = false;
  if (viscosity > 1) {
    const order = chooseLateralOrder(world.lastMoveDir ? world.lastMoveDir[index] : 0, parity, rng);
    for (let i = 0; i < order.length; i += 1) {
      const dir = order[i];
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
        if (!isEmpty(cells[candidateIndex])) {
          break;
        }

        const supportY = y + 1;
        if (supportY >= height) {
          bestIndex = candidateIndex;
          continue;
        }

        const supportIndex = candidateIndex + width;
        const supportId = cells[supportIndex];
        if (canFallThrough(supportId, moltenDensity)) {
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

function updateWood(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;

  let moisture = 0;
  let burning = false;
  let burnProgress = 0;

  if (lifetimes) {
    const stored = lifetimes[index];
    if (stored >= 128) {
      burning = true;
      burnProgress = Math.max(0, stored - 128);
    } else {
      moisture = stored;
    }
  }

  let waterContact = false;
  let fireContact = false;
  let oilContact = false;
  let oxygenNearby = false;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];

    if (isWaterLike(neighborId)) {
      waterContact = true;
      continue;
    }

    if (neighborId === FIRE) {
      fireContact = true;
      continue;
    }

    if (neighborId === OIL) {
      oilContact = true;
      continue;
    }

    if (neighborId === OXYGEN) {
      oxygenNearby = true;
    }
  }

  if (burning) {
    if (waterContact) {
      burning = false;
      burnProgress = 0;
      moisture = Math.min(WOOD_MAX_MOISTURE, moisture + WOOD_MOISTURE_GAIN);
    } else {
      if (burnProgress <= 0) {
        transformCell(world, index, ASH);
        return;
      }

      const spawnChance = oxygenNearby ? WOOD_FIRE_SPAWN_CHANCE * 1.2 : WOOD_FIRE_SPAWN_CHANCE;
      if (randomChance(spawnChance)) {
        for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
          const [dx, dy] = SURROUNDING_OFFSETS[i];
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
            continue;
          }
          if (randomChance(0.35)) {
            igniteCellAt(world, ny * width + nx, FIRE);
          }
        }
      }

      if (randomChance(WOOD_ASH_DROP_CHANCE)) {
        const belowY = y + 1;
        if (belowY < height) {
          const belowIndex = index + width;
          if (isEmpty(cells[belowIndex])) {
            transformCell(world, belowIndex, ASH);
          }
        }
      }

      burnProgress = Math.max(0, burnProgress - 1);
    }
  } else {
    if (waterContact) {
      moisture = Math.min(WOOD_MAX_MOISTURE, moisture + WOOD_MOISTURE_GAIN);
    } else if (moisture > 0) {
      moisture = Math.max(0, moisture - WOOD_DRY_RATE);
    }

    if (fireContact && moisture <= WOOD_IGNITE_MOISTURE_THRESHOLD) {
      let igniteChance = WOOD_IGNITE_BASE_CHANCE;
      if (oilContact) {
        igniteChance *= WOOD_OIL_IGNITE_MULTIPLIER;
      }
      if (oxygenNearby) {
        igniteChance *= 1.2;
      }
      if (randomChance(igniteChance)) {
        burning = true;
        burnProgress = WOOD_BURN_DURATION;
        moisture = 0;
      }
    }
  }

  if (burning && burnProgress <= 0) {
    transformCell(world, index, ASH);
    return;
  }

  if (lifetimes) {
    if (burning) {
      lifetimes[index] = Math.min(255, 128 + burnProgress);
    } else {
      lifetimes[index] = Math.min(127, moisture);
    }
  }

  updateFallingSolid(world, x, y, WOOD);
}

function updateDryIce(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;

  let lifetime = lifetimes ? lifetimes[index] : 0;
  if (lifetimes) {
    if (lifetime <= 0) {
      lifetime = DRY_ICE_BASE_LIFETIME;
    } else {
      lifetime = Math.max(0, lifetime - 1);
    }
  }

  let extraSublimation = 0;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];

    if (isWaterLike(neighborId)) {
      if (randomChance(DRY_ICE_WATER_FREEZE_CHANCE)) {
        transformCell(world, neighborIndex, ICE);
      }
      extraSublimation += 3;
      continue;
    }

    if (neighborId === FIRE) {
      if (randomChance(DRY_ICE_FIRE_EXTINGUISH_CHANCE)) {
        extinguishFire(world, neighborIndex);
      }
      extraSublimation += 4;
      continue;
    }

    if (neighborId === STEAM) {
      transformCell(world, neighborIndex, WATER);
      extraSublimation += 2;
    }
  }

  if (randomChance(DRY_ICE_SUBLIMATION_CHANCE) || extraSublimation > 0) {
    lifetime = Math.max(0, lifetime - (1 + extraSublimation));
    emitGasAround(world, index, CARBON_DIOXIDE, DRY_ICE_GAS_EMIT, 150);
  }

  if (lifetimes) {
    lifetimes[index] = lifetime;
    if (lifetime <= 0) {
      transformCell(world, index, EMPTY);
      return;
    }
  } else if (randomChance(DRY_ICE_SUBLIMATION_CHANCE * 0.5)) {
    transformCell(world, index, EMPTY);
    emitGasAround(world, index, CARBON_DIOXIDE, DRY_ICE_GAS_EMIT, 150);
    return;
  }

  updateFallingSolid(world, x, y, DRY_ICE);
}

function updateNeutroniumCore(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;

  for (let dy = -NEUTRONIUM_PULL_RADIUS; dy <= NEUTRONIUM_PULL_RADIUS; dy += 1) {
    const ny = y + dy;
    if (ny < 0 || ny >= height) {
      continue;
    }
    for (let dx = -NEUTRONIUM_PULL_RADIUS; dx <= NEUTRONIUM_PULL_RADIUS; dx += 1) {
      const nx = x + dx;
      if (nx < 0 || nx >= width) {
        continue;
      }
      if (dx === 0 && dy === 0) {
        continue;
      }
      const neighborIndex = ny * width + nx;
      const neighborId = cells[neighborIndex];
      if (neighborId === EMPTY || neighborId === NEUTRONIUM_CORE) {
        continue;
      }

      const stepX = dx > 0 ? -1 : dx < 0 ? 1 : 0;
      const stepY = dy > 0 ? -1 : dy < 0 ? 1 : 0;
      const targetX = nx + stepX;
      const targetY = ny + stepY;
      if (targetX < 0 || targetX >= width || targetY < 0 || targetY >= height) {
        continue;
      }
      const targetIndex = targetY * width + targetX;

      if (targetIndex === index) {
        if (!isImmovable(neighborId) || randomChance(NEUTRONIUM_SWALLOW_CHANCE)) {
          transformCell(world, neighborIndex, EMPTY);
        }
        continue;
      }

      if (isImmovable(neighborId)) {
        if (randomChance(NEUTRONIUM_SWALLOW_CHANCE)) {
          transformCell(world, neighborIndex, EMPTY);
        }
        continue;
      }

      const attempts = Math.max(1, NEUTRONIUM_PULL_STRENGTH - Math.max(Math.abs(dx), Math.abs(dy)));
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (cells[neighborIndex] === EMPTY) {
          break;
        }
        if (trySwapInternal(world, neighborIndex, targetIndex, { allowDenser: true, cooldown: true })) {
          break;
        }
      }
    }
  }

  const belowY = y + 1;
  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = cells[belowIndex];
    if (belowId !== EMPTY) {
      transformCell(world, belowIndex, EMPTY);
    }
    if (trySwapInternal(world, index, belowIndex, { allowDenser: true, cooldown: true })) {
      return;
    }
  }

  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
}

function updateGold(world, x, y) {
  updateFallingSolid(world, x, y, GOLD);
}

function updatePhilosophersStone(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;

  let cooldown = lifetimes ? lifetimes[index] : 0;
  if (cooldown > 0) {
    if (lifetimes) {
      lifetimes[index] = Math.max(0, cooldown - 1);
    }
  } else {
    let converted = false;
    for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
      const [dx, dy] = SURROUNDING_OFFSETS[i];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }
      const neighborIndex = ny * width + nx;
      const neighborId = cells[neighborIndex];

      if (neighborId === IRON || neighborId === RUST || neighborId === MOLTEN_IRON) {
        transformCell(world, neighborIndex, GOLD);
        converted = true;
        continue;
      }

      if (neighborId === ACID) {
        transformCell(world, neighborIndex, WATER);
        converted = true;
        continue;
      }

      if (neighborId === OIL) {
        transformCell(world, neighborIndex, ENCHANTED_WATER);
        converted = true;
        continue;
      }

      if (neighborId === SAND) {
        transformCell(world, neighborIndex, GLASS);
        converted = true;
      }
    }

    if (converted && lifetimes) {
      lifetimes[index] = PHILOSOPHER_TRANSMUTE_COOLDOWN;
    }
  }

  updateFallingSolid(world, x, y, PHILOSOPHERS_STONE);
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

function computeWaterPressureDepth(world, x, y, maxDepth, referenceDensity) {
  if (!world || !world.cells || maxDepth <= 0) {
    return 0;
  }
  const width = world.width;
  const cells = world.cells;
  let depth = 0;
  for (let i = 1; i <= maxDepth; i += 1) {
    const ny = y - i;
    if (ny < 0) {
      break;
    }
    const neighborId = cells[ny * width + x];
    if (!isLiquid(neighborId)) {
      break;
    }
    if (densityOf(neighborId) >= referenceDensity) {
      depth += 1;
    } else {
      break;
    }
  }
  return depth;
}

function spawnSteam(world, index, lifetime = STEAM_DEFAULT_LIFETIME) {
  if (!world) {
    return;
  }
  transformCell(world, index, STEAM, lifetime);
}

function spawnGas(world, index, id, lifetime = 0) {
  if (!world) {
    return;
  }
  transformCell(world, index, id);
  if (Number.isFinite(lifetime) && lifetime > 0) {
    setLifetime(world, index, lifetime);
  }
}

function collectGunpowderCluster(world, startIndex) {
  const result = [];
  if (!world || !world.cells) {
    return result;
  }
  const width = world.width;
  const height = world.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return result;
  }
  const cells = world.cells;
  const stack = [startIndex];
  const visited = new Set();

  while (stack.length > 0 && result.length < GUNPOWDER_CLUSTER_LIMIT) {
    const index = stack.pop();
    if (visited.has(index)) {
      continue;
    }
    visited.add(index);

    if (index < 0 || index >= cells.length) {
      continue;
    }
    if (cells[index] !== GUNPOWDER) {
      continue;
    }

    result.push(index);

    const x = index % width;
    const y = Math.floor(index / width);

    for (let i = 0; i < CARDINAL_OFFSETS.length; i += 1) {
      const [dx, dy] = CARDINAL_OFFSETS[i];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }
      const neighborIndex = ny * width + nx;
      if (!visited.has(neighborIndex) && cells[neighborIndex] === GUNPOWDER) {
        stack.push(neighborIndex);
      }
    }
  }

  return result;
}

function collectGasCluster(world, startIndex, gasId, limit = HYDROGEN_CLUSTER_LIMIT) {
  const result = [];
  if (!world || !world.cells) {
    return result;
  }
  const width = world.width;
  const height = world.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return result;
  }

  const cells = world.cells;
  const visited = new Set();
  const stack = [startIndex];

  while (stack.length > 0 && result.length < limit) {
    const index = stack.pop();
    if (visited.has(index)) {
      continue;
    }
    visited.add(index);

    if (index < 0 || index >= cells.length) {
      continue;
    }
    if (cells[index] !== gasId) {
      continue;
    }

    result.push(index);

    const x = index % width;
    const y = Math.floor(index / width);

    for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
      const [dx, dy] = SURROUNDING_OFFSETS[i];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }
      const neighborIndex = ny * width + nx;
      if (!visited.has(neighborIndex)) {
        stack.push(neighborIndex);
      }
    }
  }

  return result;
}

function pushParticleOutward(world, sourceIndex, dirX, dirY, maxSteps) {
  if (!world || !world.cells || !world.flags) {
    return false;
  }
  const width = world.width;
  const height = world.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }

  let currentIndex = sourceIndex;
  let moved = false;

  for (let step = 0; step < maxSteps; step += 1) {
    const cx = currentIndex % width;
    const cy = Math.floor(currentIndex / width);
    const nx = cx + dirX;
    const ny = cy + dirY;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      break;
    }
    const targetIndex = ny * width + nx;
    if (
      trySwapInternal(world, currentIndex, targetIndex, {
        allowDenser: true,
        allowEqualDensity: true,
        cooldown: true,
      })
    ) {
      currentIndex = targetIndex;
      moved = true;
    } else {
      break;
    }
  }

  return moved;
}

function triggerGunpowderExplosion(world, originIndex) {
  if (!world || !world.cells) {
    return;
  }

  const cluster = collectGunpowderCluster(world, originIndex);
  if (cluster.length === 0) {
    transformCell(world, originIndex, FIRE, GUNPOWDER_FIRE_LIFETIME);
    return;
  }

  const width = world.width;
  const cells = world.cells;

  let boundarySamples = 0;
  let confinedSamples = 0;

  for (let i = 0; i < cluster.length; i += 1) {
    const index = cluster[i];
    const x = index % width;
    const y = Math.floor(index / width);
    for (let j = 0; j < CARDINAL_OFFSETS.length; j += 1) {
      const [dx, dy] = CARDINAL_OFFSETS[j];
      const nx = x + dx;
      const ny = y + dy;
      boundarySamples += 1;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        confinedSamples += 1;
        continue;
      }
      const neighborId = cells[ny * width + nx];
      if (neighborId === WALL || isImmovable(neighborId)) {
        confinedSamples += 1;
      }
    }
  }

  const confinementRatio =
    boundarySamples > 0 ? confinedSamples / Math.max(1, boundarySamples) : 0;
  const confined = confinementRatio >= GUNPOWDER_CONFINE_THRESHOLD;
  const fireLifetime = confined
    ? Math.min(180, Math.trunc(GUNPOWDER_FIRE_LIFETIME * 1.6))
    : GUNPOWDER_FIRE_LIFETIME;
  const pushDistance = confined ? Math.max(2, GUNPOWDER_PUSH_DISTANCE) : 1;
  const smokeChance = confined
    ? Math.min(1, GUNPOWDER_SMOKE_CHANCE + 0.35)
    : GUNPOWDER_SMOKE_CHANCE;
  const smokeLifetime = confined ? 220 : 160;

  for (let i = 0; i < cluster.length; i += 1) {
    const index = cluster[i];
    transformCell(world, index, FIRE);
    setLifetime(world, index, fireLifetime);
  }

  for (let i = 0; i < cluster.length; i += 1) {
    const index = cluster[i];
    const x = index % width;
    const y = Math.floor(index / width);

    for (let j = 0; j < SURROUNDING_OFFSETS.length; j += 1) {
      const [dx, dy] = SURROUNDING_OFFSETS[j];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }
      const neighborIndex = ny * width + nx;
      const neighborId = cells[neighborIndex];

      if (neighborId === EMPTY) {
        if (randomChance(smokeChance)) {
          spawnGas(world, neighborIndex, CARBON_DIOXIDE, smokeLifetime);
        }
        continue;
      }

      if (neighborId === FIRE || neighborId === GUNPOWDER) {
        continue;
      }

      if (isImmovable(neighborId)) {
        continue;
      }

      const stepX = Math.sign(dx);
      const stepY = Math.sign(dy);
      if (stepX === 0 && stepY === 0) {
        continue;
      }

      const moved = pushParticleOutward(world, neighborIndex, stepX, stepY, pushDistance);
      if (!moved && randomChance(0.35)) {
        transformCell(world, neighborIndex, FIRE, Math.max(40, fireLifetime - 20));
      } else if (moved && randomChance(smokeChance * 0.5)) {
        spawnGas(world, neighborIndex, CARBON_DIOXIDE, smokeLifetime);
      }
    }
  }
}

function triggerHydrogenExplosion(world, originIndex) {
  if (!world || !world.cells) {
    return;
  }

  const cluster = collectGasCluster(world, originIndex, HYDROGEN, HYDROGEN_CLUSTER_LIMIT);
  if (cluster.length === 0) {
    transformCell(world, originIndex, FIRE, HYDROGEN_EXPLOSION_FIRE_LIFETIME);
    emitGasAround(world, originIndex, STEAM, 2, Math.max(80, Math.trunc(STEAM_DEFAULT_LIFETIME * 0.75)));
    return;
  }

  const width = world.width;
  const height = world.height;
  const cells = world.cells;

  let oxygenContacts = 0;

  for (let i = 0; i < cluster.length; i += 1) {
    const index = cluster[i];
    const x = index % width;
    const y = Math.floor(index / width);
    for (let j = 0; j < SURROUNDING_OFFSETS.length; j += 1) {
      const [dx, dy] = SURROUNDING_OFFSETS[j];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }
      const neighborId = cells[ny * width + nx];
      if (neighborId === OXYGEN) {
        oxygenContacts += 1;
      }
    }
  }

  const normalizedContacts = Math.min(oxygenContacts, cluster.length * 4);
  const intensity = 1 + normalizedContacts * 0.08;
  const fireLifetime = Math.min(
    200,
    Math.max(60, Math.trunc(HYDROGEN_EXPLOSION_FIRE_LIFETIME * intensity)),
  );
  const pushDistance = Math.max(2, Math.trunc(HYDROGEN_EXPLOSION_PUSH_DISTANCE * intensity));
  const steamAttempts = Math.max(1, Math.min(6, Math.trunc(intensity * 2)));
  const steamLifetime = Math.max(80, Math.trunc(STEAM_DEFAULT_LIFETIME * 0.8));

  for (let i = 0; i < cluster.length; i += 1) {
    const index = cluster[i];
    transformCell(world, index, FIRE, fireLifetime);
    if (randomChance(clamp01(HYDROGEN_STEAM_SPAWN_CHANCE * intensity))) {
      emitGasAround(world, index, STEAM, steamAttempts, steamLifetime);
    }

    const x = index % width;
    const y = Math.floor(index / width);

    for (let j = 0; j < SURROUNDING_OFFSETS.length; j += 1) {
      const [dx, dy] = SURROUNDING_OFFSETS[j];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
        continue;
      }
      const neighborIndex = ny * width + nx;
      const neighborId = cells[neighborIndex];

      if (neighborId === OXYGEN) {
        transformCell(world, neighborIndex, STEAM, steamLifetime);
        continue;
      }

      if (neighborId === HYDROGEN || neighborId === FIRE) {
        continue;
      }

      if (isImmovable(neighborId)) {
        continue;
      }

      const stepX = Math.sign(dx);
      const stepY = Math.sign(dy);
      if (stepX === 0 && stepY === 0) {
        continue;
      }

      pushParticleOutward(world, neighborIndex, stepX, stepY, pushDistance);
    }
  }
}

function triggerAntimatterAnnihilation(world, originIndex) {
  if (!world || !world.cells) {
    return;
  }

  const cluster = collectGasCluster(world, originIndex, ANTIMATTER_VAPOR, ANTIMATTER_CLUSTER_LIMIT);
  const width = world.width;
  const height = world.height;
  const cells = world.cells;

  const effectiveCluster = cluster.length > 0 ? cluster : [originIndex];
  const clusterSet = new Set(effectiveCluster);
  const origin = effectiveCluster[0];
  const originX = origin % width;
  const originY = Math.floor(origin / width);
  const intensity = 1 + effectiveCluster.length / 6;
  const radius = Math.min(
    ANTIMATTER_MAX_RADIUS,
    ANTIMATTER_BASE_RADIUS + Math.floor(Math.sqrt(effectiveCluster.length)),
  );
  const fireLifetime = Math.min(255, Math.trunc(ANTIMATTER_FIRE_LIFETIME * intensity));
  const pushDistance = Math.min(
    6,
    Math.max(ANTIMATTER_PUSH_DISTANCE, Math.trunc(ANTIMATTER_PUSH_DISTANCE * intensity))
  );

  for (let i = 0; i < effectiveCluster.length; i += 1) {
    const idx = effectiveCluster[i];
    transformCell(world, idx, FIRE, fireLifetime);
  }

  for (let dy = -radius; dy <= radius; dy += 1) {
    const ny = originY + dy;
    if (ny < 0 || ny >= height) {
      continue;
    }
    for (let dx = -radius; dx <= radius; dx += 1) {
      const nx = originX + dx;
      if (nx < 0 || nx >= width) {
        continue;
      }
      if (dx * dx + dy * dy > radius * radius + 1) {
        continue;
      }
      const targetIndex = ny * width + nx;
      if (clusterSet.has(targetIndex)) {
        continue;
      }
      const targetId = cells[targetIndex];
      if (targetId === EMPTY) {
        if (randomChance(0.5)) {
          transformCell(world, targetIndex, FIRE, fireLifetime);
        }
        continue;
      }

      if (!isImmovable(targetId)) {
        const stepX = Math.sign(dx);
        const stepY = Math.sign(dy);
        if (stepX !== 0 || stepY !== 0) {
          pushParticleOutward(world, targetIndex, stepX, stepY, pushDistance);
        }
      }

      transformCell(world, targetIndex, FIRE, fireLifetime);
    }
  }

  emitGasAround(world, origin, PIXIE_SPARK, ANTIMATTER_SPARK_ATTEMPTS, 40);
}

function neutralizeLuminaUmbra(world, luminaIndex, umbraIndex) {
  if (!world || !world.cells) {
    return;
  }
  emitGasAround(world, luminaIndex, PIXIE_SPARK, 6, 50);
  transformCell(world, luminaIndex, EMPTY);
  if (Number.isFinite(umbraIndex) && umbraIndex !== luminaIndex) {
    transformCell(world, umbraIndex, EMPTY);
  }
}

function emitGasAround(world, centerIndex, gasId, attempts = 1, lifetime = 0) {
  if (!world || !world.cells) {
    return 0;
  }
  const width = world.width;
  const height = world.height;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 0;
  }
  const x = centerIndex % width;
  const y = Math.floor(centerIndex / width);
  const offsets = [
    [0, -1],
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [0, 0],
    [-1, 1],
    [1, 1],
    [0, 1],
  ];

  let spawned = 0;

  for (let i = 0; i < offsets.length && spawned < attempts; i += 1) {
    const [dx, dy] = offsets[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const targetIndex = ny * width + nx;
    const targetId = world.cells[targetIndex];
    if (isEmpty(targetId) || isGas(targetId) || isWaterLike(targetId) || targetId === ACID) {
      spawnGas(world, targetIndex, gasId, lifetime);
      spawned += 1;
    }
  }

  return spawned;
}

function neutralizeAcidWithBakingSoda(world, sodaIndex, acidIndex) {
  if (!world || !world.cells) {
    return;
  }
  emitGasAround(world, acidIndex, CARBON_DIOXIDE, 3, 200);
  emitGasAround(world, sodaIndex, CARBON_DIOXIDE, 2, 180);
  transformCell(world, acidIndex, WATER);
  transformCell(world, sodaIndex, WATER);
}

function findNaniteTarget(world, x, y, radius) {
  if (!world || !world.cells) {
    return null;
  }
  const width = world.width;
  const height = world.height;
  const cells = world.cells;
  const maxRadius = Math.max(1, Math.trunc(radius));
  let best = null;
  let bestDistance = Infinity;

  for (let dy = -maxRadius; dy <= maxRadius; dy += 1) {
    const ny = y + dy;
    if (ny < 0 || ny >= height) {
      continue;
    }
    for (let dx = -maxRadius; dx <= maxRadius; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }
      const nx = x + dx;
      if (nx < 0 || nx >= width) {
        continue;
      }
      const distSq = dx * dx + dy * dy;
      if (distSq > maxRadius * maxRadius) {
        continue;
      }
      const index = ny * width + nx;
      const id = cells[index];
      if (id === IRON) {
        if (distSq < bestDistance) {
          bestDistance = distSq;
          best = { index, dx, dy };
        }
      }
    }
  }

  return best;
}

function updateFallingSolid(world, x, y, id) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const density = densityOf(id);
  const rng = currentStep.rng;
  const parity = currentStep.frameParity;

  const belowY = y + 1;
  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = cells[belowIndex];
    if (isEmpty(belowId)) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0 })) {
        return true;
      }
    } else if (!isImmovable(belowId) && densityOf(belowId) < density) {
      if (
        trySwapInternal(world, index, belowIndex, {
          afterSwapDir: 0,
          cooldown: true,
        })
      ) {
        return true;
      }
    }
  } else if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
    return false;
  }

  const order = parity === 0 ? [-1, 1] : [1, -1];
  if (rng && rng() < 0.25) {
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
    const targetId = cells[targetIndex];
    if (isEmpty(targetId)) {
      if (
        trySwapInternal(world, index, targetIndex, {
          afterSwapDir: dir,
          cooldown: true,
        })
      ) {
        return true;
      }
    } else if (!isImmovable(targetId) && densityOf(targetId) < density) {
      if (
        trySwapInternal(world, index, targetIndex, {
          afterSwapDir: dir,
          cooldown: true,
        })
      ) {
        return true;
      }
    }
  }

  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
  return false;
}

function updateFallingPowder(world, x, y, id) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const density = densityOf(id);
  const parity = currentStep.frameParity;
  const rng = currentStep.rng;

  const belowY = y + 1;
  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = cells[belowIndex];
    if (isEmpty(belowId)) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0 })) {
        return;
      }
    } else if (!isImmovable(belowId) && densityOf(belowId) < density) {
      if (
        trySwapInternal(world, index, belowIndex, {
          afterSwapDir: 0,
          cooldown: true,
        })
      ) {
        return;
      }
    }
  } else if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
    return;
  }

  const order = parity === 0 ? [-1, 1] : [1, -1];
  if (rng && rng() < 0.35) {
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
    const targetId = cells[targetIndex];
    if (isEmpty(targetId)) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    } else if (!isImmovable(targetId) && densityOf(targetId) < density) {
      if (
        trySwapInternal(world, index, targetIndex, {
          afterSwapDir: dir,
          cooldown: true,
        })
      ) {
        return;
      }
    }
  }

  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
}

function updateGunpowder(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborId = cells[ny * width + nx];
    if (neighborId === FIRE) {
      triggerGunpowderExplosion(world, index);
      return;
    }
  }

  updateFallingPowder(world, x, y, GUNPOWDER);
}

function updateWetGunpowder(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;

  let moisture = lifetimes ? lifetimes[index] : WET_GUNPOWDER_MAX_MOISTURE;
  let nearWater = false;
  let nearHeat = false;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];
    if (isWaterLike(neighborId)) {
      nearWater = true;
    } else if (neighborId === FIRE) {
      nearHeat = true;
    }
  }

  if (nearWater) {
    moisture = WET_GUNPOWDER_MAX_MOISTURE;
  } else if (moisture > 0) {
    const dryRate = nearHeat ? WET_GUNPOWDER_FIRE_DRY_RATE : WET_GUNPOWDER_DRY_RATE;
    moisture = moisture > dryRate ? moisture - dryRate : 0;
  }

  if (lifetimes) {
    lifetimes[index] = Math.max(0, Math.min(255, moisture));
  }

  if (moisture <= 0) {
    transformCell(world, index, GUNPOWDER);
    if (nearHeat) {
      triggerGunpowderExplosion(world, index);
    }
    return;
  }

  updateFallingPowder(world, x, y, WET_GUNPOWDER);
}

function updateBakingSoda(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;

  let touchedWater = false;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];
    if (neighborId === ACID) {
      neutralizeAcidWithBakingSoda(world, index, neighborIndex);
      return;
    }
    if (neighborId === FIRE) {
      emitGasAround(world, index, CARBON_DIOXIDE, 2, 160);
      extinguishFire(world, neighborIndex);
      transformCell(world, index, EMPTY);
      return;
    }
    if (isWaterLike(neighborId)) {
      touchedWater = true;
    }
  }

  if (touchedWater && randomChance(0.04)) {
    transformCell(world, index, WATER);
    return;
  }

  updateFallingPowder(world, x, y, BAKING_SODA);
}

function updatePixieDust(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const rng = currentStep.rng;
  const pixieDensity = densityOf(PIXIE_DUST);

  let touchedLiquid = false;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];
    if (isWaterLike(neighborId)) {
      transformCell(world, neighborIndex, ENCHANTED_WATER);
      transformCell(world, index, ENCHANTED_WATER);
      return;
    }
    if (neighborId === FIRE) {
      transformCell(world, index, PIXIE_SPARK, 45);
      return;
    }
    const neighborState = getMeta(neighborId)?.state;
    if (neighborState === 'liquid') {
      touchedLiquid = true;
    }
  }

  if (touchedLiquid) {
    transformCell(world, index, EMPTY);
    return;
  }

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];
    if (neighborId === PIXIE_DUST || neighborId === PIXIE_SPARK) {
      continue;
    }
    if (isImmovable(neighborId)) {
      continue;
    }
    const neighborState = getMeta(neighborId)?.state;
    if (neighborState === 'powder' || neighborState === 'solid') {
      if (ny > 0) {
        const aboveNeighbor = neighborIndex - width;
        const aboveId = cells[aboveNeighbor];
        if (isEmpty(aboveId) || (isGas(aboveId) && densityOf(aboveId) >= densityOf(neighborId))) {
          if (randomChance(0.2)) {
            trySwapInternal(world, neighborIndex, aboveNeighbor, {
              allowDenser: true,
              allowEqualDensity: true,
              cooldown: true,
            });
          }
        }
      }
    }
  }

  if (y > 0) {
    const aboveIndex = index - width;
    const aboveId = cells[aboveIndex];
    if (isEmpty(aboveId) || (isGas(aboveId) && densityOf(aboveId) >= pixieDensity)) {
      const upwardChance = 0.55;
      if (randomChance(upwardChance)) {
        if (
          trySwapInternal(world, index, aboveIndex, {
            allowDenser: true,
            allowEqualDensity: true,
          })
        ) {
          return;
        }
      }
    }
  }

  const lateralDirs = currentStep.frameParity === 0 ? [-1, 1] : [1, -1];
  if (rng && rng() < 0.5) {
    lateralDirs.reverse();
  }

  if (randomChance(0.35)) {
    for (let i = 0; i < lateralDirs.length; i += 1) {
      const dir = lateralDirs[i];
      const nx = x + dir;
      if (nx < 0 || nx >= width) {
        continue;
      }
      const targetIndex = y * width + nx;
      const targetId = cells[targetIndex];
      if (isEmpty(targetId) || (isGas(targetId) && densityOf(targetId) >= pixieDensity)) {
        if (
          trySwapInternal(world, index, targetIndex, {
            afterSwapDir: dir,
            allowDenser: true,
            allowEqualDensity: true,
          })
        ) {
          return;
        }
      }
    }
  }

  if (randomChance(0.45)) {
    updateFallingPowder(world, x, y, PIXIE_DUST);
    return;
  }

  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
}

function updateNanitePowder(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const rng = currentStep.rng;
  const naniteDensity = densityOf(NANITE_POWDER);

  let nearWater = false;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];
    if (neighborId === IRON) {
      if (randomChance(NANITE_EAT_CHANCE)) {
        transformCell(world, neighborIndex, NANITE_POWDER);
      }
    } else if (isWaterLike(neighborId)) {
      nearWater = true;
    }
  }

  const canOccupy = (targetId) => {
    if (isEmpty(targetId)) {
      return true;
    }
    if (isGas(targetId)) {
      return densityOf(targetId) >= naniteDensity;
    }
    if (isImmovable(targetId)) {
      return false;
    }
    return densityOf(targetId) <= naniteDensity;
  };

  const tryMove = (dx, dy) => {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      return false;
    }
    const targetIndex = ny * width + nx;
    const targetId = cells[targetIndex];
    if (!canOccupy(targetId)) {
      return false;
    }
    return trySwapInternal(world, index, targetIndex, {
      afterSwapDir: dx,
      allowDenser: true,
      allowEqualDensity: true,
      cooldown: true,
    });
  };

  if (!nearWater) {
    const target = findNaniteTarget(world, x, y, NANITE_ATTRACTION_RADIUS);
    if (target) {
      const stepX = Math.sign(target.dx);
      const stepY = Math.sign(target.dy);
      const attemptOrder = [];
      if (stepY !== 0) {
        attemptOrder.push([0, stepY]);
      }
      if (stepX !== 0 && stepY !== 0) {
        attemptOrder.push([stepX, stepY]);
      }
      if (stepX !== 0) {
        attemptOrder.push([stepX, 0]);
      }
      for (let i = 0; i < attemptOrder.length; i += 1) {
        const [dx, dy] = attemptOrder[i];
        if (tryMove(dx, dy)) {
          return;
        }
      }
    }
  }

  if (!nearWater && randomChance(NANITE_SIDEWAY_CHANCE)) {
    const dirs = currentStep.frameParity === 0 ? [-1, 1] : [1, -1];
    if (rng && rng() < 0.5) {
      dirs.reverse();
    }
    for (let i = 0; i < dirs.length; i += 1) {
      const dir = dirs[i];
      if (tryMove(dir, 0)) {
        return;
      }
    }
  }

  if (!nearWater && randomChance(NANITE_HORIZONTAL_STEP_CHANCE)) {
    if (randomChance(0.5) && tryMove(0, -1)) {
      return;
    }
  }

  updateFallingPowder(world, x, y, NANITE_POWDER);
}

function updateIce(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;

  let touchingHeat = false;
  let strongHeat = false;
  let touchingCold = false;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];

    if (neighborId === FIRE) {
      touchingHeat = true;
      strongHeat = true;
      extinguishFire(world, neighborIndex);
      spawnSteam(world, neighborIndex, Math.max(40, Math.trunc(STEAM_DEFAULT_LIFETIME / 2)));
    } else if (neighborId === STEAM || isWaterLike(neighborId)) {
      touchingHeat = true;
    } else if (neighborId === DRY_ICE || neighborId === ICE) {
      touchingCold = true;
    }
  }

  const meltChance = strongHeat ? ICE_HEAT_MELT_CHANCE : ICE_HEAT_MELT_CHANCE * 0.5;
  if (touchingHeat && randomChance(meltChance)) {
    spawnSteam(world, index, Math.max(50, Math.trunc(STEAM_DEFAULT_LIFETIME / 3)));
    transformCell(world, index, WATER);
    return;
  }

  if (!touchingCold && randomChance(ICE_AMBIENT_MELT_CHANCE)) {
    transformCell(world, index, WATER);
    return;
  }

  updateFallingSolid(world, x, y, ICE);
}

function updateSteam(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;
  const steamDensity = densityOf(STEAM);
  const parity = currentStep.frameParity;
  const rng = currentStep.rng;

  let lifetime = STEAM_DEFAULT_LIFETIME;
  if (lifetimes) {
    const stored = lifetimes[index];
    lifetime = stored > 0 ? stored : STEAM_DEFAULT_LIFETIME;
    lifetime = Math.max(0, lifetime - 1);
  }

  let nearCold = false;
  let nearWater = false;
  let nearEnchanted = false;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborId = cells[ny * width + nx];
    if (isWaterLike(neighborId)) {
      nearWater = true;
      if (neighborId === ENCHANTED_WATER) {
        nearEnchanted = true;
      }
    } else if (neighborId === ICE || neighborId === DRY_ICE) {
      nearCold = true;
    }
  }

  if (nearCold && randomChance(STEAM_CONDENSE_ON_COLD)) {
    transformCell(world, index, nearEnchanted ? ENCHANTED_WATER : WATER);
    return;
  }
  if (nearWater && randomChance(STEAM_CONDENSE_ON_WATER)) {
    transformCell(world, index, nearEnchanted ? ENCHANTED_WATER : WATER);
    return;
  }

  if (nearCold) {
    lifetime = Math.max(0, lifetime - 1);
  }

  const assignLifetime = (targetIndex) => {
    if (lifetimes) {
      lifetimes[targetIndex] = Math.max(0, Math.min(255, lifetime));
    }
  };

  const aboveY = y - 1;
  if (aboveY >= 0) {
    const aboveIndex = index - width;
    const aboveId = cells[aboveIndex];
    if (isEmpty(aboveId)) {
      if (
        trySwapInternal(world, index, aboveIndex, {
          afterSwapDir: 0,
          allowDenser: true,
          allowEqualDensity: true,
        })
      ) {
        assignLifetime(aboveIndex);
        return;
      }
    } else if (isGas(aboveId) && densityOf(aboveId) > steamDensity) {
      if (
        trySwapInternal(world, index, aboveIndex, {
          afterSwapDir: 0,
          allowDenser: true,
          allowEqualDensity: true,
        })
      ) {
        assignLifetime(aboveIndex);
        return;
      }
    }
  } else {
    transformCell(world, index, WATER);
    return;
  }

  const diagonalOrder = parity === 0 ? [-1, 1] : [1, -1];
  if (rng && rng() < 0.4) {
    diagonalOrder.reverse();
  }

  for (let i = 0; i < diagonalOrder.length; i += 1) {
    const dir = diagonalOrder[i];
    const nx = x + dir;
    const ny = y - 1;
    if (nx < 0 || nx >= width || ny < 0) {
      continue;
    }
    const targetIndex = ny * width + nx;
    const targetId = cells[targetIndex];
    if (isEmpty(targetId)) {
      if (
        trySwapInternal(world, index, targetIndex, {
          afterSwapDir: dir,
          allowDenser: true,
          allowEqualDensity: true,
        })
      ) {
        assignLifetime(targetIndex);
        return;
      }
    } else if (isGas(targetId) && densityOf(targetId) > steamDensity) {
      if (
        trySwapInternal(world, index, targetIndex, {
          afterSwapDir: dir,
          allowDenser: true,
          allowEqualDensity: true,
        })
      ) {
        assignLifetime(targetIndex);
        return;
      }
    }
  }

  if (randomChance(STEAM_SIDEWAYS_CHANCE)) {
    const lateralOrder = parity === 0 ? [1, -1] : [-1, 1];
    if (rng && rng() < 0.5) {
      lateralOrder.reverse();
    }
    for (let i = 0; i < lateralOrder.length; i += 1) {
      const dir = lateralOrder[i];
      const nx = x + dir;
      if (nx < 0 || nx >= width) {
        continue;
      }
      const targetIndex = y * width + nx;
      const targetId = cells[targetIndex];
      if (isEmpty(targetId)) {
        if (
          trySwapInternal(world, index, targetIndex, {
            afterSwapDir: dir,
            allowDenser: true,
            allowEqualDensity: true,
          })
        ) {
          assignLifetime(targetIndex);
          return;
        }
      } else if (isGas(targetId) && densityOf(targetId) > steamDensity) {
        if (
          trySwapInternal(world, index, targetIndex, {
            afterSwapDir: dir,
            allowDenser: true,
            allowEqualDensity: true,
          })
        ) {
          assignLifetime(targetIndex);
          return;
        }
      }
    }
  }

  if (lifetime <= 0) {
    transformCell(world, index, WATER);
    return;
  }

  assignLifetime(index);
  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
}

function updatePixieSpark(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;
  const sparkDensity = densityOf(PIXIE_SPARK);
  const rng = currentStep.rng;
  let lifetime = lifetimes ? lifetimes[index] : 40;
  lifetime = lifetime > 0 ? lifetime - 1 : 0;

  if (lifetime <= 0) {
    transformCell(world, index, EMPTY);
    return;
  }

  const assignLifetime = (targetIndex) => {
    if (lifetimes) {
      lifetimes[targetIndex] = Math.max(0, Math.min(255, lifetime));
    }
  };

  if (lifetimes) {
    lifetimes[index] = Math.max(0, Math.min(255, lifetime));
  }

  const aboveY = y - 1;
  if (aboveY >= 0) {
    const aboveIndex = index - width;
    const aboveId = cells[aboveIndex];
    if (isEmpty(aboveId) || (isGas(aboveId) && densityOf(aboveId) >= sparkDensity)) {
      if (
        trySwapInternal(world, index, aboveIndex, {
          afterSwapDir: 0,
          allowDenser: true,
          allowEqualDensity: true,
        })
      ) {
        assignLifetime(aboveIndex);
        return;
      }
    }
  }

  const diagonalOrder = currentStep.frameParity === 0 ? [-1, 1] : [1, -1];
  if (rng && rng() < 0.5) {
    diagonalOrder.reverse();
  }

  for (let i = 0; i < diagonalOrder.length; i += 1) {
    const dir = diagonalOrder[i];
    const nx = x + dir;
    const ny = y - 1;
    if (nx < 0 || nx >= width || ny < 0) {
      continue;
    }
    const targetIndex = ny * width + nx;
    const targetId = cells[targetIndex];
    if (isEmpty(targetId) || (isGas(targetId) && densityOf(targetId) >= sparkDensity)) {
      if (
        trySwapInternal(world, index, targetIndex, {
          afterSwapDir: dir,
          allowDenser: true,
          allowEqualDensity: true,
        })
      ) {
        assignLifetime(targetIndex);
        return;
      }
    }
  }

  if (randomChance(0.25)) {
    const lateralOrder = currentStep.frameParity === 0 ? [1, -1] : [-1, 1];
    if (rng && rng() < 0.5) {
      lateralOrder.reverse();
    }
    for (let i = 0; i < lateralOrder.length; i += 1) {
      const dir = lateralOrder[i];
      const nx = x + dir;
      if (nx < 0 || nx >= width) {
        continue;
      }
      const targetIndex = y * width + nx;
      const targetId = cells[targetIndex];
      if (isEmpty(targetId) || (isGas(targetId) && densityOf(targetId) >= sparkDensity)) {
        if (
          trySwapInternal(world, index, targetIndex, {
            afterSwapDir: dir,
            allowDenser: true,
            allowEqualDensity: true,
          })
        ) {
          assignLifetime(targetIndex);
          return;
        }
      }
    }
  }

  if (lifetime <= 1) {
    transformCell(world, index, EMPTY);
    return;
  }

  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
}

function updateOxygen(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;
  const oxygenDensity = densityOf(OXYGEN);
  const rng = currentStep.rng;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];
    if (neighborId === FIRE) {
      if (lifetimes) {
        lifetimes[neighborIndex] = Math.min(255, lifetimes[neighborIndex] + 40);
      }
      if (randomChance(0.45)) {
        igniteCellAt(world, neighborIndex);
      }
      transformCell(world, index, CARBON_DIOXIDE);
      return;
    }
  }

  const parity = currentStep.frameParity;

  const aboveY = y - 1;
  if (aboveY >= 0) {
    const aboveIndex = index - width;
    const aboveId = cells[aboveIndex];
    if (isEmpty(aboveId) || (isGas(aboveId) && densityOf(aboveId) > oxygenDensity)) {
      if (
        trySwapInternal(world, index, aboveIndex, {
          afterSwapDir: 0,
          allowDenser: true,
          allowEqualDensity: true,
        })
      ) {
        if (world.lastMoveDir) {
          world.lastMoveDir[aboveIndex] = 0;
        }
        return;
      }
    }
  }

  const diagonalOrder = parity === 0 ? [-1, 1] : [1, -1];
  if (rng && rng() < 0.45) {
    diagonalOrder.reverse();
  }

  for (let i = 0; i < diagonalOrder.length; i += 1) {
    const dir = diagonalOrder[i];
    const nx = x + dir;
    const ny = y - 1;
    if (nx < 0 || nx >= width || ny < 0) {
      continue;
    }
    const targetIndex = ny * width + nx;
    const targetId = cells[targetIndex];
    if (isEmpty(targetId) || (isGas(targetId) && densityOf(targetId) > oxygenDensity)) {
      if (
        trySwapInternal(world, index, targetIndex, {
          afterSwapDir: dir,
          allowDenser: true,
          allowEqualDensity: true,
        })
      ) {
        if (world.lastMoveDir) {
          world.lastMoveDir[targetIndex] = dir;
        }
        return;
      }
    }
  }

  if (randomChance(0.35)) {
    const lateralOrder = parity === 0 ? [1, -1] : [-1, 1];
    if (rng && rng() < 0.5) {
      lateralOrder.reverse();
    }
    for (let i = 0; i < lateralOrder.length; i += 1) {
      const dir = lateralOrder[i];
      const nx = x + dir;
      if (nx < 0 || nx >= width) {
        continue;
      }
      const targetIndex = y * width + nx;
      const targetId = cells[targetIndex];
      if (isEmpty(targetId) || (isGas(targetId) && densityOf(targetId) > oxygenDensity)) {
        if (
          trySwapInternal(world, index, targetIndex, {
            afterSwapDir: dir,
            allowDenser: true,
            allowEqualDensity: true,
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

  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
}

function updateHydrogen(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const hydrogenDensity = densityOf(HYDROGEN);
  const rng = currentStep.rng;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborId = cells[ny * width + nx];
    if (neighborId === FIRE || neighborId === PIXIE_SPARK) {
      triggerHydrogenExplosion(world, index);
      return;
    }
  }

  const parity = currentStep.frameParity;

  const attemptMove = (targetIndex, dir) => {
    if (
      trySwapInternal(world, index, targetIndex, {
        afterSwapDir: dir,
        allowDenser: true,
        allowEqualDensity: true,
      })
    ) {
      if (world.lastMoveDir) {
        world.lastMoveDir[targetIndex] = dir;
      }
      return true;
    }
    return false;
  };

  const aboveY = y - 1;
  if (aboveY >= 0) {
    const aboveIndex = index - width;
    const aboveId = cells[aboveIndex];
    if (isEmpty(aboveId) || (isGas(aboveId) && densityOf(aboveId) > hydrogenDensity)) {
      if (attemptMove(aboveIndex, 0)) {
        return;
      }
    }
  }

  const diagonalOrder = parity === 0 ? [-1, 1] : [1, -1];
  if (rng && rng() < 0.35) {
    diagonalOrder.reverse();
  }
  for (let i = 0; i < diagonalOrder.length; i += 1) {
    const dir = diagonalOrder[i];
    const nx = x + dir;
    const ny = y - 1;
    if (nx < 0 || nx >= width || ny < 0) {
      continue;
    }
    const targetIndex = ny * width + nx;
    const targetId = cells[targetIndex];
    if (
      isEmpty(targetId) ||
      (isGas(targetId) && densityOf(targetId) > hydrogenDensity) ||
      isWaterLike(targetId)
    ) {
      if (attemptMove(targetIndex, dir)) {
        return;
      }
    }
  }

  if (randomChance(0.6)) {
    const lateralOrder = parity === 0 ? [1, -1] : [-1, 1];
    if (rng && rng() < 0.5) {
      lateralOrder.reverse();
    }
    for (let i = 0; i < lateralOrder.length; i += 1) {
      const dir = lateralOrder[i];
      const nx = x + dir;
      if (nx < 0 || nx >= width) {
        continue;
      }
      const targetIndex = y * width + nx;
      const targetId = cells[targetIndex];
      if (isEmpty(targetId) || (isGas(targetId) && densityOf(targetId) > hydrogenDensity)) {
        if (attemptMove(targetIndex, dir)) {
          return;
        }
      }
    }
  }

  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
}

function updateCarbonDioxide(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;
  const co2Density = densityOf(CARBON_DIOXIDE);
  const rng = currentStep.rng;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];
    if (neighborId === FIRE) {
      if (randomChance(CO2_FIRE_EXTINGUISH_CHANCE)) {
        extinguishFire(world, neighborIndex);
      } else if (lifetimes) {
        lifetimes[neighborIndex] = Math.max(0, lifetimes[neighborIndex] - 12);
      }
    }
  }

  const parity = currentStep.frameParity;

  const attemptMove = (targetIndex, dir) => {
    if (
      trySwapInternal(world, index, targetIndex, {
        afterSwapDir: dir,
        allowEqualDensity: true,
      })
    ) {
      if (world.lastMoveDir) {
        world.lastMoveDir[targetIndex] = dir;
      }
      return true;
    }
    return false;
  };

  const belowY = y + 1;
  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = cells[belowIndex];
    if (isEmpty(belowId) || (isGas(belowId) && densityOf(belowId) < co2Density)) {
      if (attemptMove(belowIndex, 0)) {
        return;
      }
    }
  }

  const diagonalOrder = parity === 0 ? [1, -1] : [-1, 1];
  for (let i = 0; i < diagonalOrder.length; i += 1) {
    const dir = diagonalOrder[i];
    const nx = x + dir;
    const ny = y + 1;
    if (nx < 0 || nx >= width || ny >= height) {
      continue;
    }
    const targetIndex = ny * width + nx;
    const targetId = cells[targetIndex];
    if (isEmpty(targetId) || (isGas(targetId) && densityOf(targetId) < co2Density)) {
      if (attemptMove(targetIndex, dir)) {
        return;
      }
    }
  }

  if (randomChance(CO2_LATERAL_DIFFUSE_CHANCE)) {
    const lateralOrder = parity === 0 ? [1, -1] : [-1, 1];
    if (rng && rng() < 0.5) {
      lateralOrder.reverse();
    }
    for (let i = 0; i < lateralOrder.length; i += 1) {
      const dir = lateralOrder[i];
      const nx = x + dir;
      if (nx < 0 || nx >= width) {
        continue;
      }
      const targetIndex = y * width + nx;
      const targetId = cells[targetIndex];
      if (isEmpty(targetId) || (isGas(targetId) && densityOf(targetId) < co2Density)) {
        if (attemptMove(targetIndex, dir)) {
          return;
        }
      }
    }
  }

  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
}

function updateEtherealMist(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;
  const rng = currentStep.rng;
  const mistDensity = densityOf(ETHEREAL_MIST);

  let lifetime = lifetimes ? lifetimes[index] : 0;
  if (lifetimes) {
    if (lifetime <= 0) {
      const variance = ETHEREAL_MIST_FADE_VARIANCE;
      const base = ETHEREAL_MIST_BASE_LIFETIME;
      const randomExtra = rng ? Math.floor(rng() * (variance + 1)) : Math.floor(Math.random() * (variance + 1));
      lifetime = Math.max(60, base + randomExtra);
    } else {
      lifetime = Math.max(0, lifetime - 1);
    }

    if (randomChance(ETHEREAL_MIST_DISSIPATE_CHANCE)) {
      lifetime = Math.max(0, lifetime - 8);
    }
  }

  let luminaNeighbor = false;
  let umbraNeighbor = false;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];
    if (neighborId === DRY_ICE || neighborId === ICE) {
      const ectoLifetime = lifetimes
        ? Math.min(255, Math.max(100, lifetime))
        : ECTOPLASM_REFORM_LIFETIME;
      transformCell(world, index, ECTOPLASM, ectoLifetime);
      return;
    }
    if (neighborId === LUMINA || neighborId === ENCHANTED_WATER) {
      luminaNeighbor = true;
      continue;
    }
    if (neighborId === UMBRA) {
      umbraNeighbor = true;
      continue;
    }
  }

  if (lifetimes) {
    if (luminaNeighbor) {
      lifetime = Math.min(255, lifetime + ETHEREAL_MIST_LUMINA_LIFETIME_BONUS);
    }
    if (umbraNeighbor && randomChance(ETHEREAL_MIST_UMBRA_DRAIN_CHANCE)) {
      lifetime = Math.max(0, lifetime - ETHEREAL_MIST_UMBRA_DRAIN);
    }
    lifetimes[index] = lifetime;
    if (lifetime <= 0) {
      transformCell(world, index, EMPTY);
      return;
    }
  }

  if (luminaNeighbor && randomChance(ETHEREAL_MIST_LUMINA_SPARK_CHANCE)) {
    emitGasAround(world, index, PIXIE_SPARK, 1, 35);
  }

  const attemptPhase = (dirX, dirY) => {
    if (dirX === 0 && dirY === 0) {
      return false;
    }
    const nx = x + dirX;
    const ny = y + dirY;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      if (randomChance(0.1)) {
        transformCell(world, index, EMPTY);
      }
      return false;
    }
    const targetIndex = ny * width + nx;
    const targetId = cells[targetIndex];

    if (isEmpty(targetId) || (isGas(targetId) && densityOf(targetId) >= mistDensity)) {
      if (
        trySwapInternal(world, index, targetIndex, {
          afterSwapDir: Math.sign(dirX),
          allowDenser: true,
          allowEqualDensity: true,
        })
      ) {
        return true;
      }
    }

    const targetMeta = getMeta(targetId);
    const solidBarrier = targetMeta?.state === 'solid' || isImmovable(targetId);
    if (!solidBarrier) {
      return false;
    }

    const bx = nx + dirX;
    const by = ny + dirY;
    if (bx < 0 || bx >= width || by < 0 || by >= height) {
      return false;
    }
    const beyondIndex = by * width + bx;
    const beyondId = cells[beyondIndex];
    if (isEmpty(beyondId) || isGas(beyondId)) {
      transformCell(world, beyondIndex, ETHEREAL_MIST, lifetime);
      transformCell(world, index, EMPTY);
      if (world.lastMoveDir) {
        world.lastMoveDir[beyondIndex] = Math.sign(dirX);
      }
      return true;
    }

    return false;
  };

  const driftDirections = [
    [0, -1],
    [1, 0],
    [-1, 0],
    [0, 1],
    [1, -1],
    [-1, -1],
    [1, 1],
    [-1, 1],
  ];

  for (let attempt = 0; attempt < ETHEREAL_MIST_PHASE_ATTEMPTS; attempt += 1) {
    const pick = rng ? Math.floor(rng() * driftDirections.length) : Math.floor(Math.random() * driftDirections.length);
    const [dx, dy] = driftDirections[pick];
    if (attemptPhase(dx, dy)) {
      return;
    }
  }

  if (randomChance(0.25) && attemptPhase(0, 1)) {
    return;
  }

  if (randomChance(0.25) && attemptPhase(0, -1)) {
    return;
  }

  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
}

function updateAntimatterVapor(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const rng = currentStep.rng;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborId = cells[ny * width + nx];
    if (neighborId !== EMPTY && neighborId !== ANTIMATTER_VAPOR) {
      triggerAntimatterAnnihilation(world, index);
      return;
    }
  }

  let repelX = 0;
  let repelY = 0;
  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    if (cells[ny * width + nx] === ANTIMATTER_VAPOR) {
      repelX += dx;
      repelY += dy;
    }
  }

  const attemptMove = (dirX, dirY) => {
    if (dirX === 0 && dirY === 0) {
      return false;
    }
    const nx = x + dirX;
    const ny = y + dirY;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      return false;
    }
    const targetIndex = ny * width + nx;
    if (cells[targetIndex] !== EMPTY) {
      return false;
    }
    if (
      trySwapInternal(world, index, targetIndex, {
        afterSwapDir: Math.sign(dirX),
        allowDenser: true,
        allowEqualDensity: true,
      })
    ) {
      return true;
    }
    return false;
  };

  if ((repelX !== 0 || repelY !== 0) && attemptMove(-Math.sign(repelX), -Math.sign(repelY))) {
    return;
  }

  const driftDirections = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, -1],
    [-1, -1],
    [1, 1],
    [-1, 1],
  ];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const pick = rng ? Math.floor(rng() * driftDirections.length) : Math.floor(Math.random() * driftDirections.length);
    const [dx, dy] = driftDirections[pick];
    if (attemptMove(dx, dy)) {
      return;
    }
  }

  if (world.lastMoveDir) {
    world.lastMoveDir[index] = 0;
  }
}

function updateWater(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;
  const id = cells[index];
  const waterId = id === ENCHANTED_WATER ? ENCHANTED_WATER : WATER;
  const waterDensity = densityOf(waterId);
  const metadata = getMeta(waterId) || {};

  const baseLateralRun = Math.max(1, Math.trunc(metadata.lateralRunMax ?? 1));
  const pressureDepth = Math.max(
    0,
    Math.trunc(
      Number.isFinite(metadata.pressureRange) ? metadata.pressureRange : WATER_PRESSURE_MAX_DEPTH,
    ),
  );
  const freezeChance = clamp01(metadata.freezeChance ?? WATER_PROPAGATE_FREEZE);
  const dryIceFreezeChance = clamp01(
    metadata.dryIceFreezeChance ?? WATER_COLD_CONVERSION_CHANCE + WATER_FREEZE_BONUS,
  );
  const warmEvapChance = clamp01(metadata.warmEvaporateChance ?? WATER_HEAT_VAPOR_CHANCE);
  const fallbackFireChance = Math.min(1, Math.max(warmEvapChance + 0.4, 0.65));
  const fireEvapChance = clamp01(metadata.fireEvaporateChance ?? fallbackFireChance);
  const acidDilutionChance = clamp01(metadata.acidDilutionChance ?? 0.3);

  const rng = currentStep.rng;
  const parity = currentStep.frameParity;
  const previousDir = world.lastMoveDir ? world.lastMoveDir[index] : 0;

  let touchingDryIce = false;
  let touchingIce = false;
  let touchingHeat = false;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];

    if (neighborId === SAND) {
      transformCell(world, neighborIndex, WET_SAND, WET_SAND_MAX_MOISTURE);
      transformCell(world, index, WET_SAND, WET_SAND_MAX_MOISTURE);
      return;
    }
    if (neighborId === WET_SAND) {
      if (lifetimes) {
        const refreshed = Math.min(255, WET_SAND_MAX_MOISTURE);
        lifetimes[neighborIndex] = Math.max(lifetimes[neighborIndex], refreshed);
      }
      transformCell(world, index, WET_SAND, WET_SAND_MAX_MOISTURE);
      return;
    }
    if (neighborId === FIRE) {
      touchingHeat = true;
      extinguishFire(world, neighborIndex);
      spawnSteam(world, neighborIndex, Math.max(40, Math.trunc(STEAM_DEFAULT_LIFETIME / 2)));
      if (randomChance(fireEvapChance)) {
        spawnSteam(world, index, STEAM_DEFAULT_LIFETIME);
        return;
      }
      continue;
    }
    if (neighborId === ACID) {
      if (randomChance(acidDilutionChance)) {
        transformCell(world, neighborIndex, WATER);
      }
      continue;
    }
    if (neighborId === GUNPOWDER) {
      transformCell(world, neighborIndex, WET_GUNPOWDER, WET_GUNPOWDER_MAX_MOISTURE);
      continue;
    }
    if (neighborId === WET_GUNPOWDER) {
      if (lifetimes) {
        const refreshed = Math.min(255, WET_GUNPOWDER_MAX_MOISTURE);
        lifetimes[neighborIndex] = Math.max(lifetimes[neighborIndex], refreshed);
      }
      continue;
    }
    if (neighborId === DRY_ICE) {
      touchingDryIce = true;
      continue;
    }
    if (neighborId === ICE) {
      touchingIce = true;
      continue;
    }
    if (neighborId === STEAM) {
      touchingHeat = true;
    }
  }

  const effectiveDryFreezeChance =
    dryIceFreezeChance > 0 ? dryIceFreezeChance : WATER_COLD_CONVERSION_CHANCE;
  if (touchingDryIce && randomChance(effectiveDryFreezeChance)) {
    transformCell(world, index, ICE);
    return;
  }
  if (!touchingDryIce && touchingIce && randomChance(Math.max(freezeChance, WATER_PROPAGATE_FREEZE))) {
    transformCell(world, index, ICE);
    return;
  }
  if (!touchingDryIce && touchingHeat && randomChance(Math.max(warmEvapChance, WATER_HEAT_VAPOR_CHANCE))) {
    spawnSteam(world, index, STEAM_DEFAULT_LIFETIME);
    return;
  }

  const pressureBonus =
    pressureDepth > 0
      ? Math.min(
          WATER_PRESSURE_MAX_DEPTH,
          computeWaterPressureDepth(world, x, y, pressureDepth, waterDensity),
        )
      : 0;
  const lateralRunMax = Math.max(1, Math.min(WATER_LATERAL_RUN_CAP, baseLateralRun + pressureBonus));

  const belowY = y + 1;
  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = cells[belowIndex];

    if (isEmpty(belowId) || (isLiquid(belowId) && densityOf(belowId) < waterDensity)) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0 })) {
        return;
      }
    } else if (belowId === WOOD) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0, allowDenser: true })) {
        return;
      }
    } else if (belowId === SAND) {
      if (
        randomChance(WATER_SAND_DISPLACEMENT_PROBABILITY) &&
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
    } else if (belowId === WET_SAND) {
      if (lifetimes) {
        const refreshed = Math.min(255, WET_SAND_MAX_MOISTURE);
        lifetimes[belowIndex] = Math.max(lifetimes[belowIndex], refreshed);
      }
    } else if (belowId === GUNPOWDER) {
      transformCell(world, belowIndex, WET_GUNPOWDER, WET_GUNPOWDER_MAX_MOISTURE);
    } else if (belowId === WET_GUNPOWDER) {
      if (lifetimes) {
        const refreshed = Math.min(255, WET_GUNPOWDER_MAX_MOISTURE);
        lifetimes[belowIndex] = Math.max(lifetimes[belowIndex], refreshed);
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
    const targetId = cells[targetIndex];

    if (isEmpty(targetId) || (isLiquid(targetId) && densityOf(targetId) < waterDensity)) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    } else if (targetId === WOOD) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir, allowDenser: true })) {
        return;
      }
    } else if (targetId === SAND) {
      if (
        randomChance(WATER_SAND_DISPLACEMENT_PROBABILITY) &&
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
    } else if (targetId === WET_SAND) {
      if (lifetimes) {
        const refreshed = Math.min(255, WET_SAND_MAX_MOISTURE);
        lifetimes[targetIndex] = Math.max(lifetimes[targetIndex], refreshed);
      }
    } else if (targetId === GUNPOWDER) {
      transformCell(world, targetIndex, WET_GUNPOWDER, WET_GUNPOWDER_MAX_MOISTURE);
    } else if (targetId === WET_GUNPOWDER) {
      if (lifetimes) {
        const refreshed = Math.min(255, WET_GUNPOWDER_MAX_MOISTURE);
        lifetimes[targetIndex] = Math.max(lifetimes[targetIndex], refreshed);
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
      if (trySwapInternal(world, index, bestIndex, { afterSwapDir: dir })) {
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

function updateAcid(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;
  const acidDensity = densityOf(ACID);
  const metadata = getMeta(ACID) || {};
  const viscosity = Math.max(1, Math.trunc(metadata.viscosity ?? 1));
  const lateralRunMax = Math.max(1, Math.trunc(metadata.lateralRunMax ?? 1));
  const rng = currentStep.rng;
  const parity = currentStep.frameParity;

  let reacted = false;

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];

    if (neighborId === BAKING_SODA) {
      neutralizeAcidWithBakingSoda(world, neighborIndex, index);
      return;
    }

    if (neighborId === IRON) {
      if (randomChance(ACID_METAL_CORROSION_CHANCE)) {
        transformCell(world, neighborIndex, EMPTY);
        emitGasAround(world, neighborIndex, HYDROGEN, ACID_HYDROGEN_ATTEMPTS, ACID_HYDROGEN_LIFETIME);
        reacted = true;
      }
      continue;
    }

    if (neighborId === WOOD) {
      if (randomChance(ACID_WOOD_CORROSION_CHANCE)) {
        transformCell(world, neighborIndex, EMPTY);
        emitGasAround(world, neighborIndex, CARBON_DIOXIDE, 1, 160);
        reacted = true;
      }
      continue;
    }

    if (neighborId === GUNPOWDER) {
      transformCell(world, neighborIndex, WET_GUNPOWDER, WET_GUNPOWDER_MAX_MOISTURE);
      continue;
    }

    if (neighborId === WET_GUNPOWDER) {
      if (lifetimes) {
        const refreshed = Math.min(255, WET_GUNPOWDER_MAX_MOISTURE);
        lifetimes[neighborIndex] = Math.max(lifetimes[neighborIndex], refreshed);
      }
      continue;
    }

    if (isWaterLike(neighborId)) {
      if (randomChance(ACID_DILUTION_CHANCE)) {
        transformCell(world, index, WATER);
        return;
      }
      continue;
    }
  }

  if (reacted && randomChance(0.15)) {
    transformCell(world, index, WATER);
    return;
  }

  const belowY = y + 1;
  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = cells[belowIndex];
    if (isEmpty(belowId)) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0 })) {
        return;
      }
    } else if (!isImmovable(belowId) && densityOf(belowId) < acidDensity) {
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
    const targetId = cells[targetIndex];
    if (isEmpty(targetId)) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    } else if (!isImmovable(targetId) && densityOf(targetId) < acidDensity) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    }
  }

  let movedLaterally = false;
  let attemptLateral = true;

  if (viscosity > 1) {
    const lateralChance = 1 / Math.max(1, viscosity);
    attemptLateral = randomChance(lateralChance);
  }

  if (attemptLateral && randomChance(ACID_LATERAL_DIFFUSE_CHANCE)) {
    const order = parity === 0 ? [1, -1] : [-1, 1];
    if (rng && rng() < 0.3) {
      order.reverse();
    }
    for (let i = 0; i < order.length; i += 1) {
      const dir = order[i];
      let bestIndex = -1;
      for (let step = 1; step <= lateralRunMax; step += 1) {
        const nx = x + dir * step;
        if (nx < 0 || nx >= width) {
          break;
        }
        const candidateIndex = y * width + nx;
        if (!isEmpty(cells[candidateIndex])) {
          break;
        }

        const supportY = y + 1;
        if (supportY >= height) {
          bestIndex = candidateIndex;
          continue;
        }

        const supportIndex = candidateIndex + width;
        const supportId = cells[supportIndex];
        if (canFallThrough(supportId, acidDensity)) {
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

function updateEctoplasm(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const lifetimes = world.lifetimes;
  const ectoplasmDensity = densityOf(ECTOPLASM);
  const metadata = getMeta(ECTOPLASM) || {};
  const viscosity = Math.max(1, Math.trunc(metadata.viscosity ?? 1));
  const lateralRunMax = Math.max(1, Math.trunc(metadata.lateralRunMax ?? 1));
  const rng = currentStep.rng;
  const parity = currentStep.frameParity;

  if (lifetimes) {
    let lifetime = lifetimes[index];
    if (lifetime <= 0) {
      const variance = 60;
      const bonus = rng ? Math.floor(rng() * (variance + 1)) : Math.floor(Math.random() * (variance + 1));
      lifetime = Math.max(80, ECTOPLASM_REFORM_LIFETIME + bonus);
    } else {
      lifetime = Math.max(0, lifetime - 1);
    }

    if (randomChance(ECTOPLASM_EVAPORATE_CHANCE)) {
      lifetime = Math.max(0, lifetime - 10);
    }

    lifetimes[index] = lifetime;
    if (lifetime <= 0) {
      transformCell(world, index, ETHEREAL_MIST, ECTOPLASM_REFORM_LIFETIME);
      emitGasAround(world, index, ETHEREAL_MIST, 1, ECTOPLASM_REFORM_LIFETIME);
      return;
    }
  }

  if (randomChance(ECTOPLASM_EVAPORATE_CHANCE * 0.35)) {
    emitGasAround(world, index, ETHEREAL_MIST, 1, ECTOPLASM_REFORM_LIFETIME);
  }

  const belowY = y + 1;
  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = cells[belowIndex];
    if (isEmpty(belowId)) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0 })) {
        return;
      }
    } else if (!isImmovable(belowId) && densityOf(belowId) < ectoplasmDensity) {
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
  if (rng && rng() < 0.3) {
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
    const targetId = cells[targetIndex];
    if (isEmpty(targetId)) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    } else if (!isImmovable(targetId) && densityOf(targetId) < ectoplasmDensity) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    }
  }

  let movedLaterally = false;
  let attemptLateral = true;

  if (viscosity > 1) {
    const lateralChance = 1 / Math.max(1, viscosity);
    attemptLateral = randomChance(lateralChance);
  }

  if (attemptLateral) {
    const order = chooseLateralOrder(world.lastMoveDir ? world.lastMoveDir[index] : 0, parity, rng);
    for (let i = 0; i < order.length; i += 1) {
      const dir = order[i];
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
        if (!isEmpty(cells[candidateIndex])) {
          break;
        }

        const supportY = y + 1;
        if (supportY >= height) {
          bestIndex = candidateIndex;
          continue;
        }

        const supportIndex = candidateIndex + width;
        const supportId = cells[supportIndex];
        if (canFallThrough(supportId, ectoplasmDensity)) {
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

function updateLumina(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const luminaDensity = densityOf(LUMINA);
  const metadata = getMeta(LUMINA) || {};
  const viscosity = Math.max(1, Math.trunc(metadata.viscosity ?? 1));
  const lateralRunMax = Math.max(1, Math.trunc(metadata.lateralRunMax ?? 1));
  const rng = currentStep.rng;
  const parity = currentStep.frameParity;
  const lifetimes = world.lifetimes;

  if (randomChance(LUMINA_EVAPORATE_CHANCE)) {
    emitGasAround(world, index, PIXIE_SPARK, 1, 40);
    transformCell(world, index, EMPTY);
    return;
  }

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];

    if (neighborId === UMBRA) {
      neutralizeLuminaUmbra(world, index, neighborIndex);
      return;
    }

    if (neighborId === ETHEREAL_MIST) {
      if (lifetimes) {
        const current = lifetimes[neighborIndex];
        const refreshed = Math.min(255, Math.max(current, ETHEREAL_MIST_BASE_LIFETIME));
        lifetimes[neighborIndex] = refreshed;
      }
      if (randomChance(ETHEREAL_MIST_LUMINA_SPARK_CHANCE * 0.5)) {
        emitGasAround(world, neighborIndex, PIXIE_SPARK, 1, 35);
      }
      continue;
    }

    if (neighborId === WATER) {
      transformCell(world, neighborIndex, ENCHANTED_WATER);
      continue;
    }

    if (neighborId === ENCHANTED_WATER) {
      continue;
    }

    if (neighborId === OIL) {
      if (randomChance(LUMINA_PURIFY_OIL_CHANCE)) {
        transformCell(world, neighborIndex, ENCHANTED_WATER);
        if (randomChance(0.4)) {
          transformCell(world, index, ENCHANTED_WATER);
        }
        emitGasAround(world, neighborIndex, PIXIE_SPARK, 1, 35);
        return;
      }
      continue;
    }

    if (neighborId === ACID) {
      if (randomChance(LUMINA_PURIFY_ACID_CHANCE)) {
        transformCell(world, neighborIndex, WATER);
        transformCell(world, index, ENCHANTED_WATER);
        return;
      }
      continue;
    }
  }

  if (randomChance(LUMINA_SPARK_CHANCE)) {
    emitGasAround(world, index, PIXIE_SPARK, 1, 45);
  }

  const belowY = y + 1;
  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = cells[belowIndex];
    if (isEmpty(belowId)) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0 })) {
        return;
      }
    } else if (!isImmovable(belowId) && densityOf(belowId) < luminaDensity) {
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
    const targetId = cells[targetIndex];
    if (isEmpty(targetId)) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    } else if (!isImmovable(targetId) && densityOf(targetId) < luminaDensity) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    }
  }

  let movedLaterally = false;
  let attemptLateral = true;

  if (viscosity > 1) {
    const lateralChance = 1 / Math.max(1, viscosity);
    attemptLateral = randomChance(lateralChance);
  }

  if (attemptLateral && randomChance(LUMINA_LATERAL_DIFFUSE_CHANCE)) {
    const order = parity === 0 ? [1, -1] : [-1, 1];
    if (rng && rng() < 0.35) {
      order.reverse();
    }
    for (let i = 0; i < order.length; i += 1) {
      const dir = order[i];
      let bestIndex = -1;
      for (let step = 1; step <= lateralRunMax; step += 1) {
        const nx = x + dir * step;
        if (nx < 0 || nx >= width) {
          break;
        }
        const candidateIndex = y * width + nx;
        if (!isEmpty(cells[candidateIndex])) {
          break;
        }

        const supportY = y + 1;
        if (supportY >= height) {
          bestIndex = candidateIndex;
          continue;
        }

        const supportIndex = candidateIndex + width;
        const supportId = cells[supportIndex];
        if (canFallThrough(supportId, luminaDensity)) {
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

function updateUmbra(world, x, y) {
  const width = world.width;
  const height = world.height;
  const index = y * width + x;
  const cells = world.cells;
  const umbraDensity = densityOf(UMBRA);
  const metadata = getMeta(UMBRA) || {};
  const viscosity = Math.max(1, Math.trunc(metadata.viscosity ?? 1));
  const lateralRunMax = Math.max(1, Math.trunc(metadata.lateralRunMax ?? 1));
  const rng = currentStep.rng;
  const parity = currentStep.frameParity;
  const lifetimes = world.lifetimes;

  if (randomChance(UMBRA_EVAPORATE_CHANCE)) {
    emitGasAround(world, index, CARBON_DIOXIDE, 1, 140);
    transformCell(world, index, EMPTY);
    return;
  }

  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];

    if (neighborId === LUMINA) {
      neutralizeLuminaUmbra(world, neighborIndex, index);
      return;
    }

    if (neighborId === FIRE) {
      if (randomChance(UMBRA_EXTINGUISH_CHANCE)) {
        extinguishFire(world, neighborIndex);
        emitGasAround(world, neighborIndex, CARBON_DIOXIDE, 1, 140);
      }
      continue;
    }

    if (isWaterLike(neighborId)) {
      if (randomChance(UMBRA_FREEZE_CHANCE)) {
        transformCell(world, neighborIndex, ICE);
      }
      continue;
    }

    if (neighborId === STEAM) {
      transformCell(world, neighborIndex, WATER);
      continue;
    }

    if (neighborId === ETHEREAL_MIST) {
      if (lifetimes) {
        const drained = Math.max(0, lifetimes[neighborIndex] - ETHEREAL_MIST_UMBRA_DRAIN);
        lifetimes[neighborIndex] = drained;
        if (drained <= 0 && randomChance(0.6)) {
          transformCell(world, neighborIndex, EMPTY);
        }
      } else if (randomChance(0.5)) {
        transformCell(world, neighborIndex, EMPTY);
      }
      continue;
    }
  }

  const belowY = y + 1;
  if (belowY < height) {
    const belowIndex = index + width;
    const belowId = cells[belowIndex];
    if (isEmpty(belowId)) {
      if (trySwapInternal(world, index, belowIndex, { afterSwapDir: 0 })) {
        return;
      }
    } else if (!isImmovable(belowId) && densityOf(belowId) < umbraDensity) {
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
    const targetId = cells[targetIndex];
    if (isEmpty(targetId)) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    } else if (!isImmovable(targetId) && densityOf(targetId) < umbraDensity) {
      if (trySwapInternal(world, index, targetIndex, { afterSwapDir: dir })) {
        return;
      }
    }
  }

  let movedLaterally = false;
  let attemptLateral = true;

  if (viscosity > 1) {
    const lateralChance = 1 / Math.max(1, viscosity);
    attemptLateral = randomChance(lateralChance);
  }

  if (attemptLateral && randomChance(UMBRA_LATERAL_DIFFUSE_CHANCE)) {
    const order = parity === 0 ? [1, -1] : [-1, 1];
    if (rng && rng() < 0.3) {
      order.reverse();
    }
    for (let i = 0; i < order.length; i += 1) {
      const dir = order[i];
      let bestIndex = -1;
      for (let step = 1; step <= lateralRunMax; step += 1) {
        const nx = x + dir * step;
        if (nx < 0 || nx >= width) {
          break;
        }
        const candidateIndex = y * width + nx;
        if (!isEmpty(cells[candidateIndex])) {
          break;
        }

        const supportY = y + 1;
        if (supportY >= height) {
          bestIndex = candidateIndex;
          continue;
        }

        const supportIndex = candidateIndex + width;
        const supportId = cells[supportIndex];
        if (canFallThrough(supportId, umbraDensity)) {
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
  let oxygenNeighborCount = 0;
  let carbonNeighborCount = 0;
  for (let i = 0; i < neighbors.length; i += 1) {
    const nx = x + neighbors[i].dx;
    const ny = y + neighbors[i].dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      continue;
    }
    const neighborIndex = ny * width + nx;
    const neighborId = cells[neighborIndex];
    if (isWaterLike(neighborId)) {
      let adjustedExtinguish = extinguishProbability;
      if (y + 1 < height) {
        const fuelId = cells[index + width];
        if (fuelId === OIL) {
          adjustedExtinguish *= 0.2;
        }
      }
      if (randomChance(adjustedExtinguish)) {
        extinguishFire(world, index);
        return;
      }
    }
    if (neighborId === OXYGEN) {
      oxygenNeighborCount += 1;
      continue;
    }
    if (neighborId === CARBON_DIOXIDE) {
      carbonNeighborCount += 1;
    }
  }

  if (lifetimes) {
    let currentLifetime = lifetimes[index];
    if (oxygenNeighborCount > 0) {
      currentLifetime = Math.min(
        255,
        currentLifetime + oxygenNeighborCount * OXYGEN_LIFETIME_BOOST,
      );
    }
    if (carbonNeighborCount > 0) {
      currentLifetime = Math.max(
        0,
        currentLifetime - carbonNeighborCount * CO2_LIFETIME_PENALTY,
      );
    }
    lifetimes[index] = currentLifetime;
    if (currentLifetime <= 0) {
      extinguishFire(world, index);
      return;
    }
  }

  if (
    carbonNeighborCount >= CO2_SMOTHER_THRESHOLD &&
    oxygenNeighborCount === 0 &&
    randomChance(CO2_SMOTHER_PROBABILITY)
  ) {
    extinguishFire(world, index);
    return;
  }

  const oxygenBoostNeighbors = Math.min(oxygenNeighborCount, OXYGEN_IGNITE_MAX_NEIGHBORS);
  const carbonPenaltyNeighbors = Math.min(carbonNeighborCount, OXYGEN_IGNITE_MAX_NEIGHBORS);
  const oxygenMultiplier = 1 + oxygenBoostNeighbors * OXYGEN_IGNITE_BOOST_PER_NEIGHBOR;
  const co2Penalty =
    carbonPenaltyNeighbors > 0
      ? Math.max(0, 1 - carbonPenaltyNeighbors * CO2_IGNITE_PENALTY_PER_NEIGHBOR)
      : 1;
  const combustionModifier = clamp01(oxygenMultiplier * co2Penalty);

  let surroundedBySand = true;
  for (let i = 0; i < SURROUNDING_OFFSETS.length; i += 1) {
    const [dx, dy] = SURROUNDING_OFFSETS[i];
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
      surroundedBySand = false;
      break;
    }
    const neighborIndex = ny * width + nx;
    if (!isSandLike(cells[neighborIndex])) {
      surroundedBySand = false;
      break;
    }
  }

  if (surroundedBySand) {
    extinguishFire(world, index);
    return;
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
      const adjustedIgnite = clamp01(igniteProbability * combustionModifier);
      if (adjustedIgnite <= 0) {
        continue;
      }
      if (!randomChance(adjustedIgnite)) {
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
UPDATERS[WET_SAND] = updateWetSand;
UPDATERS[WATER] = updateWater;
UPDATERS[ENCHANTED_WATER] = updateWater;
UPDATERS[ECTOPLASM] = updateEctoplasm;
UPDATERS[OIL] = updateOil;
UPDATERS[ACID] = updateAcid;
UPDATERS[FIRE] = updateFire;
UPDATERS[GLASS] = updateGlass;
UPDATERS[GUNPOWDER] = updateGunpowder;
UPDATERS[WET_GUNPOWDER] = updateWetGunpowder;
UPDATERS[BAKING_SODA] = updateBakingSoda;
UPDATERS[PIXIE_DUST] = updatePixieDust;
UPDATERS[NANITE_POWDER] = updateNanitePowder;
UPDATERS[ASH] = updateAsh;
UPDATERS[RUST] = updateRust;
UPDATERS[ICE] = updateIce;
UPDATERS[STEAM] = updateSteam;
UPDATERS[OXYGEN] = updateOxygen;
UPDATERS[HYDROGEN] = updateHydrogen;
UPDATERS[CARBON_DIOXIDE] = updateCarbonDioxide;
UPDATERS[ETHEREAL_MIST] = updateEtherealMist;
UPDATERS[ANTIMATTER_VAPOR] = updateAntimatterVapor;
UPDATERS[PIXIE_SPARK] = updatePixieSpark;
UPDATERS[IRON] = updateIron;
UPDATERS[MOLTEN_IRON] = updateMoltenIron;
UPDATERS[WOOD] = updateWood;
UPDATERS[DRY_ICE] = updateDryIce;
UPDATERS[NEUTRONIUM_CORE] = updateNeutroniumCore;
UPDATERS[GOLD] = updateGold;
UPDATERS[PHILOSOPHERS_STONE] = updatePhilosophersStone;

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
