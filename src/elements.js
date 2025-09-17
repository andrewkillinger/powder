export const EMPTY = 0;
export const WALL = 1;
export const SAND = 2;
export const WATER = 3;

export const ELEMENT_IDS = Object.freeze({
  EMPTY,
  WALL,
  SAND,
  WATER,
});

export const ELEMENTS = [];

ELEMENTS[EMPTY] = Object.freeze({
  id: EMPTY,
  name: 'Empty',
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
  state: 'liquid',
  density: 1000,
  immovable: false,
  viscosity: 1,
  lateralRunMax: 2,
  buoyancy: 1,
});

ELEMENTS.EMPTY = EMPTY;
ELEMENTS.WALL = WALL;
ELEMENTS.SAND = SAND;
ELEMENTS.WATER = WATER;

export const PALETTE = new Uint8ClampedArray([
  // EMPTY
  7, 9, 15, 255,
  // WALL
  54, 57, 66, 255,
  // SAND
  237, 201, 81, 255,
  // WATER
  64, 128, 255, 255,
]);

export function createGameElements() {
  const canvas = document.getElementById('game-canvas');

  if (!canvas) {
    throw new Error('Expected #game-canvas element to exist.');
  }

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('2D rendering context is unavailable.');
  }

  return { canvas, context };
}
