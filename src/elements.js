export const EMPTY = 0;
export const WALL = 1;
export const SAND = 2;
export const WATER = 3;
export const OIL = 4;
export const FIRE = 5;

export const CATEGORY_ORDER = Object.freeze([
  'Powders',
  'Liquids',
  'Gases',
  'Solids',
  'Specials',
]);

export const ELEMENTS = [];

ELEMENTS[EMPTY] = Object.freeze({
  id: EMPTY,
  name: 'Empty',
  icon: '⬛',
  state: 'void',
  category: 'Specials',
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
  category: 'Solids',
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
  category: 'Powders',
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
  category: 'Liquids',
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
  category: 'Liquids',
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
  category: 'Gases',
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

const CATEGORY_INDEX = CATEGORY_ORDER.reduce((acc, name, index) => {
  acc[name] = index;
  return acc;
}, Object.create(null));

const orderedElements = ELEMENTS.filter((element) => {
  return element && element.id !== EMPTY && element.id !== WALL;
});

orderedElements.sort((a, b) => {
  const aIndex = CATEGORY_INDEX[a.category] ?? Number.MAX_SAFE_INTEGER;
  const bIndex = CATEGORY_INDEX[b.category] ?? Number.MAX_SAFE_INTEGER;
  if (aIndex !== bIndex) {
    return aIndex - bIndex;
  }
  return a.id - b.id;
});

const elementList = [
  ELEMENTS[EMPTY],
  ELEMENTS[WALL],
  ...orderedElements,
];

export const ELEMENT_LIST = Object.freeze(elementList);

export const ELEMENT_CATEGORIES = Object.freeze(
  CATEGORY_ORDER.map((name) =>
    Object.freeze({
      name,
      elements: Object.freeze(
        elementList.filter((element) => element?.category === name)
      ),
    })
  )
);
