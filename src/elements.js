export const ELEMENTS = Object.freeze({
  EMPTY: 0,
  WALL: 1,
  SAND: 2,
});

export const PALETTE = new Uint8ClampedArray([
  // EMPTY
  7, 9, 15, 255,
  // WALL
  54, 57, 66, 255,
  // SAND
  237, 201, 81, 255,
]);

export const EMPTY = ELEMENTS.EMPTY;
export const WALL = ELEMENTS.WALL;
export const SAND = ELEMENTS.SAND;

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
