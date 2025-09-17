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
      buffer[pixel] = colorTable[offset] ?? 0;
      buffer[pixel + 1] = colorTable[offset + 1] ?? 0;
      buffer[pixel + 2] = colorTable[offset + 2] ?? 0;
      buffer[pixel + 3] = colorTable[offset + 3] ?? 255;
    }
  }

  function draw(targetWorld = currentWorld, _info = undefined) {
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
