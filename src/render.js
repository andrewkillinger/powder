import { PALETTE } from './elements.js';

function getViewportSize(canvas) {
  const viewport = window.visualViewport;

  if (viewport) {
    return {
      width: Math.max(Math.round(viewport.width), 1),
      height: Math.max(Math.round(viewport.height), 1),
    };
  }

  const root = document.documentElement;
  const width =
    root.clientWidth || window.innerWidth || canvas.clientWidth || canvas.width || 1;
  const height =
    root.clientHeight || window.innerHeight || canvas.clientHeight || canvas.height || 1;

  return {
    width: Math.max(Math.round(width), 1),
    height: Math.max(Math.round(height), 1),
  };
}

export function createRenderer(canvas, context) {
  let imageData = null;
  let currentWorld = null;
  let displayScale = 1;

  function ensureImageData(world) {
    if (!world) {
      return;
    }

    if (!imageData || imageData.width !== world.width || imageData.height !== world.height) {
      imageData = new ImageData(world.width, world.height);
    }
  }

  function resize(world = currentWorld) {
    if (world) {
      currentWorld = world;
      ensureImageData(world);

      if (canvas.width !== world.width) {
        canvas.width = world.width;
      }

      if (canvas.height !== world.height) {
        canvas.height = world.height;
      }
    }

    const { width: viewportWidth, height: viewportHeight } = getViewportSize(canvas);

    if (currentWorld) {
      const scaleX = viewportWidth / currentWorld.width;
      const scaleY = viewportHeight / currentWorld.height;
      const nextScale = Math.min(scaleX, scaleY);

      displayScale = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;
      const cssWidth = Math.max(Math.round(currentWorld.width * displayScale), 1);
      const cssHeight = Math.max(Math.round(currentWorld.height * displayScale), 1);

      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
    } else {
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
      displayScale = 1;
    }

    canvas.style.imageRendering = 'pixelated';
    context.imageSmoothingEnabled = false;
  }

  function render(state) {
    const world = state.world;

    if (!world) {
      return;
    }

    if (currentWorld !== world) {
      currentWorld = world;
      ensureImageData(world);

      if (canvas.width !== world.width || canvas.height !== world.height) {
        canvas.width = world.width;
        canvas.height = world.height;
      }

      canvas.style.imageRendering = 'pixelated';
      context.imageSmoothingEnabled = false;
    }

    ensureImageData(world);

    if (!imageData) {
      return;
    }

    const cells = world.cells;
    const pixelBuffer = imageData.data;
    const palette = PALETTE;
    const paletteLength = palette.length;
    const defaultIndex = 0;

    for (let i = 0; i < cells.length; i += 1) {
      const elementId = cells[i];
      let paletteIndex = elementId * 4;

      if (paletteIndex < 0 || paletteIndex + 3 >= paletteLength) {
        paletteIndex = defaultIndex;
      }

      const pixelIndex = i * 4;
      pixelBuffer[pixelIndex] = palette[paletteIndex];
      pixelBuffer[pixelIndex + 1] = palette[paletteIndex + 1];
      pixelBuffer[pixelIndex + 2] = palette[paletteIndex + 2];
      pixelBuffer[pixelIndex + 3] = palette[paletteIndex + 3];
    }

    context.putImageData(imageData, 0, 0);
  }

  return {
    resize,
    render,
    get pixelRatio() {
      return displayScale;
    },
  };
}
