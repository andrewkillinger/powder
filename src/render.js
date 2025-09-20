function clampChannel(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 255) {
    return 255;
  }
  return value | 0;
}

function clampAlpha(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 255) {
    return 255;
  }
  return value | 0;
}

function hash2(x, y, seed = 0) {
  let h = (x * 374761393 + y * 668265263 + seed * 362437) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

function jitterColor(base, jitterAmount, x, y, seed = 0) {
  if (!Number.isFinite(jitterAmount) || jitterAmount <= 0) {
    return [base[0] ?? 0, base[1] ?? 0, base[2] ?? 0, base[3] ?? 255];
  }
  const jitter = Math.max(0, jitterAmount | 0);
  const hash = hash2(x, y, seed);
  const delta = ((hash & 0xff) / 255) * jitter * 2 - jitter;
  const r = clampChannel((base[0] ?? 0) + delta);
  const g = clampChannel((base[1] ?? 0) + delta);
  const b = clampChannel((base[2] ?? 0) + delta);
  const a = clampAlpha(base[3] ?? 255);
  return [r, g, b, a];
}

function grain1(value, x, y, seed = 0) {
  const hash = hash2(x, y, seed + 17);
  const sign = ((hash >> 8) & 1) ? 1 : -1;
  return clampChannel((value ?? 0) + sign);
}

function resolveStyle(material) {
  const fallback = {
    base: [0, 0, 0, 255],
    jitter: 0,
    alpha: 255,
    layer: 'powder',
    grain: false,
  };
  if (!material || typeof material !== 'object') {
    return fallback;
  }
  const style = material.style || {};
  const base = Array.isArray(style.base)
    ? style.base.slice(0, 4)
    : Array.isArray(material.color)
    ? material.color.slice(0, 4)
    : [0, 0, 0, 255];
  if (base.length < 4) {
    base[3] = 255;
  }
  return {
    base,
    jitter: Number.isFinite(style.jitter) ? style.jitter : 0,
    alpha: Number.isFinite(style.alpha) ? style.alpha : base[3] ?? 255,
    layer: typeof style.layer === 'string' ? style.layer : 'powder',
    grain: Boolean(style.grain),
  };
}

function computeViewportRegion(viewport, width, height) {
  if (!viewport || width <= 0 || height <= 0) {
    return { sx: 0, sy: 0, sw: width, sh: height };
  }

  const minScale = Number.isFinite(viewport.minScale) ? Math.max(1, viewport.minScale) : 1;
  const maxScale = Number.isFinite(viewport.maxScale)
    ? Math.max(minScale, viewport.maxScale)
    : Math.max(minScale, Number(viewport.scale) || minScale);
  let scale = Number(viewport.scale);
  if (!Number.isFinite(scale) || scale <= 0) {
    scale = 1;
  }
  scale = Math.max(minScale, Math.min(maxScale, scale));

  let viewWidth = width / scale;
  let viewHeight = height / scale;
  if (!Number.isFinite(viewWidth) || viewWidth <= 0) {
    viewWidth = width;
  }
  if (!Number.isFinite(viewHeight) || viewHeight <= 0) {
    viewHeight = height;
  }

  const maxOffsetX = Math.max(0, width - viewWidth);
  const maxOffsetY = Math.max(0, height - viewHeight);
  const offsetX = Number.isFinite(viewport.offsetX) ? viewport.offsetX : 0;
  const offsetY = Number.isFinite(viewport.offsetY) ? viewport.offsetY : 0;
  const sx = Math.max(0, Math.min(maxOffsetX, offsetX));
  const sy = Math.max(0, Math.min(maxOffsetY, offsetY));

  return {
    sx,
    sy,
    sw: viewWidth,
    sh: viewHeight,
  };
}

export function createRenderer(canvas, world, materials) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new TypeError('createRenderer expects a canvas element.');
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    throw new Error('2D rendering context unavailable.');
  }

  const offscreen = document.createElement('canvas');
  const offCtx = offscreen.getContext('2d');
  if (!offCtx) {
    throw new Error('Offscreen 2D context unavailable.');
  }

  const gasCanvas = document.createElement('canvas');
  const gasCtx = gasCanvas.getContext('2d');
  if (!gasCtx) {
    throw new Error('Gas overlay 2D context unavailable.');
  }

  let baseImage = null;
  let gasImage = null;
  let currentWorld = world || null;
  let lastHUD = { fps: 0, count: 0 };
  const materialTable = materials || {};

  function ensureImageData(target) {
    if (!target) {
      return;
    }

    if (offscreen.width !== target.width || offscreen.height !== target.height) {
      offscreen.width = target.width;
      offscreen.height = target.height;
    }
    if (gasCanvas.width !== target.width || gasCanvas.height !== target.height) {
      gasCanvas.width = target.width;
      gasCanvas.height = target.height;
    }

    if (!baseImage || baseImage.width !== target.width || baseImage.height !== target.height) {
      baseImage = offCtx.createImageData(target.width, target.height);
    }

    if (!gasImage || gasImage.width !== target.width || gasImage.height !== target.height) {
      gasImage = gasCtx.createImageData(target.width, target.height);
    }
  }

  function writeLayered(target, options = {}) {
    if (!target || !baseImage || !gasImage) {
      return;
    }

    const { width, height, cells } = target;
    const bufA = baseImage.data;
    const bufB = gasImage.data;
    bufA.fill(0);
    bufB.fill(0);

    const frameSeed = Number.isFinite(options.frameSeed) ? options.frameSeed : 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const id = cells[index];
        const material = materialTable[id];
        if (!material) {
          continue;
        }

        const style = resolveStyle(material);
        const base = style.base.slice(0, 4);
        base[3] = style.alpha;

        const [r0, g0, b0, a0] = jitterColor(base, style.jitter, x, y, frameSeed);
        let r = r0;
        let g = g0;
        let b = b0;
        const a = clampAlpha(a0);

        if (style.grain) {
          r = grain1(r, x, y, frameSeed);
          g = grain1(g, x, y, frameSeed + 23);
          b = grain1(b, x, y, frameSeed + 47);
        }

        const offset = index * 4;
        const layer = style.layer;
        if (layer === 'gas' || layer === 'fx') {
          bufB[offset] = r;
          bufB[offset + 1] = g;
          bufB[offset + 2] = b;
          bufB[offset + 3] = a;
        } else {
          bufA[offset] = r;
          bufA[offset + 1] = g;
          bufA[offset + 2] = b;
          bufA[offset + 3] = clampAlpha(a > 0 ? a : 255);
        }
      }
    }
  }

  function draw(targetWorld = currentWorld, info = {}) {
    if (!targetWorld) {
      return;
    }

    if (currentWorld !== targetWorld) {
      currentWorld = targetWorld;
    }

    ensureImageData(currentWorld);
    writeLayered(currentWorld, { frameSeed: info.frameSeed });
    if (!baseImage || !gasImage) {
      return;
    }

    offCtx.putImageData(baseImage, 0, 0);
    gasCtx.putImageData(gasImage, 0, 0);

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.width / dpr;
    const displayHeight = canvas.height / dpr;
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.imageSmoothingEnabled = false;

    const viewport = info && typeof info === 'object' ? info.viewport ?? null : null;
    const region = computeViewportRegion(viewport, offscreen.width, offscreen.height);

    ctx.drawImage(
      offscreen,
      region.sx,
      region.sy,
      region.sw,
      region.sh,
      0,
      0,
      displayWidth,
      displayHeight,
    );
    ctx.drawImage(
      gasCanvas,
      region.sx,
      region.sy,
      region.sw,
      region.sh,
      0,
      0,
      displayWidth,
      displayHeight,
    );
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
