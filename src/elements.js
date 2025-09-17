export const EMPTY = 0;
export const WALL = 1;
export const SAND = 2;
export const WATER = 3;
export const OIL = 4;
export const FIRE = 5;

export const ELEMENTS = [];

ELEMENTS[EMPTY] = Object.freeze({
  id: EMPTY,
  name: 'Empty',
  icon: '⬛',
  state: 'void',
  density: 0,
  immovable: true,
  viscosity: 0,
  lateralRunMax: 0,
  buoyancy: 0,
});

ELEMENTS[WALL] = Object.freeze({
  id: WALL,
  name: 'Wall',
  icon: '🧱',
  state: 'solid',
  density: 10000,
  immovable: true,
  viscosity: 0,
  lateralRunMax: 0,
  buoyancy: 0,
});

ELEMENTS[SAND] = Object.freeze({
  id: SAND,
  name: 'Sand',
  icon: '⏳',
  state: 'solid',
  density: 1700,
  immovable: false,
  viscosity: 4,
  lateralRunMax: 1,
  buoyancy: -1,
});

ELEMENTS[WATER] = Object.freeze({
  id: WATER,
  name: 'Water',
  icon: '💧',
  state: 'liquid',
  density: 1000,
  immovable: false,
  viscosity: 1,
  lateralRunMax: 6,
  buoyancy: 1,
});

ELEMENTS[OIL] = Object.freeze({
  id: OIL,
  name: 'Oil',
  icon: '🛢️',
  state: 'liquid',
  density: 870,
  immovable: false,
  viscosity: 3,
  lateralRunMax: 3,
  buoyancy: 2,
  flammable: true,
  combustion: {
    product: FIRE,
    igniteProbability: 0.2,
  },
});

ELEMENTS[FIRE] = Object.freeze({
  id: FIRE,
  name: 'Fire',
  icon: '🔥',
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

export const ELEMENT_IDS = Object.freeze({
  EMPTY,
  WALL,
  SAND,
  WATER,
  OIL,
  FIRE,
});

export const PALETTE = new Uint8ClampedArray([
  // EMPTY
  7, 9, 15, 255,
  // WALL
  54, 57, 66, 255,
  // SAND
  237, 201, 81, 255,
  // WATER
  64, 128, 255, 255,
  // OIL
  80, 60, 40, 255,
  // FIRE
  252, 110, 28, 255,
]);

export const ELEMENT_LIST = Object.freeze([
  ELEMENTS[EMPTY],
  ELEMENTS[WALL],
  ELEMENTS[SAND],
  ELEMENTS[WATER],
  ELEMENTS[OIL],
  ELEMENTS[FIRE],
]);
