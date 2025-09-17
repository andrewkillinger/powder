import { PALETTE } from './elements.js';

function getViewportSize(canvas, toolbarHeight = 0) {
  const viewport = window.visualViewport;

  if (viewport) {
    return {
      width: Math.max(Math.round(viewport.width), 1),
      height: Math.max(Math.round(viewport.height - toolbarHeight), 1),
    };
  }

  const root = document.documentElement;
  const width =
    root.clientWidth || window.innerWidth || canvas.clientWidth || canvas.width || 1;
  const height =
    root.clientHeight || window.innerHeight || canvas.clientHeight || canvas.height || 1;

  return {
    width: Math.max(Math.round(width), 1),
    height: Math.max(Math.round(height - toolbarHeight), 1),
  };
}

export function createRenderer(canvas, context, options = {}) {
  const palette = options.palette ?? PALETTE;
  const getToolbarHeight = typeof options.getToolbarHeight === 'function'
    ? options.getToolbarHeight
    : () => 0;

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

    const toolbarHeight = Math.max(Number(getToolbarHeight()) || 0, 0);
    const { width: viewportWidth, height: viewportHeight } = getViewportSize(
      canvas,
      toolbarHeight,
    );

    if (currentWorld) {
      const scaleX = viewportWidth / currentWorld.width;
      const scaleY = viewportHeight / currentWorld.height;
      const nextScale = Math.min(scaleX, scaleY);

      displayScale = Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1;
      const cssWidth = Math.max(Math.round(currentWorld.width * displayScale), 1);
      const cssHeight = Math.max(Math.round(currentWorld.height * displayScale), 1);

      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.style.maxWidth = '100%';
      canvas.style.maxHeight = `${viewportHeight}px`;
      canvas.style.margin = '0 auto';
    } else {
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
      displayScale = 1;
    }

    canvas.style.imageRendering = 'pixelated';
    context.imageSmoothingEnabled = false;
  }

  function draw(world = currentWorld) {
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
    }

    ensureImageData(world);

    if (!imageData) {
      return;
    }

    const cells = world.cells;
    const pixelBuffer = imageData.data;
    const paletteLength = palette.length;
    const defaultIndex = 0;

    for (let i = 0; i < cells.length; i += 1) {
      const elementId = cells[i] >>> 0;
      let paletteIndex = elementId * 4;

      if (paletteIndex < 0 || paletteIndex + 3 >= paletteLength) {
        paletteIndex = defaultIndex;
      }

      const pixelIndex = i * 4;
      pixelBuffer[pixelIndex] = palette[paletteIndex] ?? 0;
      pixelBuffer[pixelIndex + 1] = palette[paletteIndex + 1] ?? 0;
      pixelBuffer[pixelIndex + 2] = palette[paletteIndex + 2] ?? 0;
      pixelBuffer[pixelIndex + 3] = palette[paletteIndex + 3] ?? 255;
    }

    context.putImageData(imageData, 0, 0);
  }

  return {
    resize,
    draw,
    readPixels() {
      try {
        const snapshot = context.getImageData(0, 0, canvas.width, canvas.height);
        return new Uint8ClampedArray(snapshot.data);
      } catch (error) {
        console.warn('Renderer.readPixels failed:', error);
        return null;
      }
    },
    getCanvasSize() {
      return {
        width: canvas.width,
        height: canvas.height,
      };
    },
    get pixelRatio() {
      return displayScale;
    },
    get canvas() {
      return canvas;
    },
    get currentWorld() {
      return currentWorld;
    },
  };
}
