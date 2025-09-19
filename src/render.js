import { SAND, WET_SAND } from './elements.js';

const clampColor = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 255) {
    return 255;
  }
  return Math.round(value);
};

export function createRenderer(canvas, world, palette) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new TypeError('createRenderer expects a canvas element.');
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D rendering context unavailable.');
  }

  let currentWorld = world || null;
  let imageData = null;
  let lastHUD = { fps: 0, count: 0 };
  const colorTable = palette instanceof Uint8ClampedArray ? palette : new Uint8ClampedArray(palette || []);
  const offscreen = document.createElement('canvas');
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) {
    throw new Error('Offscreen 2D context unavailable.');
  }

  function ensureImageData(target) {
    if (!target) {
      return;
    }

    if (offscreen.width !== target.width || offscreen.height !== target.height) {
      offscreen.width = target.width;
      offscreen.height = target.height;
    }

    if (!imageData || imageData.width !== target.width || imageData.height !== target.height) {
      imageData = offCtx.createImageData(target.width, target.height);
    }
  }

  function writePixels(target) {
    if (!target || !imageData) {
      return;
    }

    const cells = target.cells;
    const buffer = imageData.data;
    const paletteLength = colorTable.length;

    for (let i = 0; i < cells.length; i += 1) {
      const id = cells[i] >>> 0;
      let offset = id * 4;
      if (offset < 0 || offset + 3 >= paletteLength) {
        offset = 0;
      }

      const pixel = i * 4;
      let r = colorTable[offset] ?? 0;
      let g = colorTable[offset + 1] ?? 0;
      let b = colorTable[offset + 2] ?? 0;
      const a = colorTable[offset + 3] ?? 255;

      if (id === SAND || id === WET_SAND) {
        const hash = Math.imul((i + 1) ^ 0x2c9277b5, 0x85ebca6b) >>> 0;
        const variation = (hash & 0x07) - 3;
        const shade = id === WET_SAND ? -6 : 0;
        const brightness = shade + variation;
        r = clampColor(r + brightness);
        g = clampColor(g + brightness);
        b = clampColor(b + Math.round(brightness * 0.7));
        if (id === SAND && (hash & 0x10) !== 0) {
          r = clampColor(r + 2);
          g = clampColor(g + 1);
        }
      }

      buffer[pixel] = r;
      buffer[pixel + 1] = g;
      buffer[pixel + 2] = b;
      buffer[pixel + 3] = a;
    }
  }

  function draw(targetWorld = currentWorld, info = undefined) {
    if (!targetWorld) {
      return;
    }

    if (currentWorld !== targetWorld) {
      currentWorld = targetWorld;
    }

    ensureImageData(currentWorld);
    writePixels(currentWorld);
    if (imageData) {
      offCtx.putImageData(imageData, 0, 0);
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.width / dpr;
      const displayHeight = canvas.height / dpr;
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      ctx.imageSmoothingEnabled = false;
      const viewport = info && typeof info === 'object' ? info.viewport ?? null : null;

      if (viewport) {
        const minScale = Number.isFinite(viewport.minScale) ? Math.max(1, viewport.minScale) : 1;
        const maxScale = Number.isFinite(viewport.maxScale)
          ? Math.max(minScale, viewport.maxScale)
          : Math.max(minScale, Number(viewport.scale) || minScale);
        let scale = Number(viewport.scale);
        if (!Number.isFinite(scale) || scale <= 0) {
          scale = 1;
        }
        scale = Math.max(minScale, Math.min(maxScale, scale));
        let viewWidth = offscreen.width / scale;
        let viewHeight = offscreen.height / scale;
        if (!Number.isFinite(viewWidth) || viewWidth <= 0) {
          viewWidth = offscreen.width;
        }
        if (!Number.isFinite(viewHeight) || viewHeight <= 0) {
          viewHeight = offscreen.height;
        }

        const maxOffsetX = Math.max(0, offscreen.width - viewWidth);
        const maxOffsetY = Math.max(0, offscreen.height - viewHeight);
        const offsetX = Number.isFinite(viewport.offsetX) ? viewport.offsetX : 0;
        const offsetY = Number.isFinite(viewport.offsetY) ? viewport.offsetY : 0;
        const clampedOffsetX = Math.max(0, Math.min(maxOffsetX, offsetX));
        const clampedOffsetY = Math.max(0, Math.min(maxOffsetY, offsetY));

        ctx.drawImage(
          offscreen,
          clampedOffsetX,
          clampedOffsetY,
          viewWidth,
          viewHeight,
          0,
          0,
          displayWidth,
          displayHeight,
        );
      } else {
        ctx.drawImage(
          offscreen,
          0,
          0,
          offscreen.width,
          offscreen.height,
          0,
          0,
          displayWidth,
          displayHeight,
        );
      }
    }
  }

  function drawHUD(info = {}) {
    if (info && typeof info === 'object') {
      lastHUD = { ...lastHUD, ...info };
    }
    return lastHUD;
  }

  function resize(targetWorld = currentWorld) {
    if (!targetWorld) {
      return;
    }

    ensureImageData(targetWorld);
  }

  resize(currentWorld);

  return {
    draw,
    drawHUD,
    resize,
    get context() {
      return ctx;
    },
  };
}
