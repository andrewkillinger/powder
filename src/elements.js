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
