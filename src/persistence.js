import { createWorld } from './sim.js';

const CURRENT_VERSION = 1;

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric;
}

function encodeSequence(source) {
  if (!source || typeof source.length !== 'number') {
    return { encoding: 'raw', data: [] };
  }

  const length = source.length >>> 0;
  if (length === 0) {
    return { encoding: 'raw', data: [] };
  }

  let runValue = source[0] ?? 0;
  let runLength = 1;
  let runCount = 0;
  const rle = [];

  for (let i = 1; i < length; i += 1) {
    const value = source[i] ?? 0;
    if (value === runValue && runLength < 0xffffffff) {
      runLength += 1;
    } else {
      rle.push(runValue, runLength);
      runCount += 1;
      runValue = value;
      runLength = 1;
    }
  }

  rle.push(runValue, runLength);
  runCount += 1;

  if (runCount * 2 >= length) {
    const raw = Array.from(source);
    return { encoding: 'raw', data: raw };
  }

  return { encoding: 'rle', data: rle };
}

function fillFromRaw(target, values) {
  if (!target || typeof target.length !== 'number') {
    return target;
  }
  if (!Array.isArray(values)) {
    return target;
  }
  const length = target.length >>> 0;
  const count = values.length >>> 0;
  const limit = Math.min(length, count);
  for (let i = 0; i < limit; i += 1) {
    target[i] = Number(values[i]) || 0;
  }
  if (limit < length) {
    target.fill(0, limit);
  }
  return target;
}

function fillFromRLE(target, sequence) {
  if (!target || typeof target.length !== 'number') {
    return target;
  }
  if (!Array.isArray(sequence)) {
    return target;
  }
  const length = target.length >>> 0;
  let writeIndex = 0;
  for (let i = 0; i < sequence.length && writeIndex < length; i += 2) {
    const value = Number(sequence[i]) || 0;
    const countRaw = Number(sequence[i + 1]);
    const runLength = Number.isFinite(countRaw) && countRaw > 0 ? Math.trunc(countRaw) : 0;
    for (let j = 0; j < runLength && writeIndex < length; j += 1) {
      target[writeIndex] = value;
      writeIndex += 1;
    }
  }
  if (writeIndex < length) {
    target.fill(0, writeIndex);
  }
  return target;
}

function decodeSequence(spec, target) {
  if (!target || typeof target.length !== 'number') {
    return target;
  }
  if (!spec) {
    target.fill(0);
    return target;
  }
  const encoding = typeof spec.encoding === 'string' ? spec.encoding : null;
  const data = Array.isArray(spec.data) ? spec.data : Array.isArray(spec) ? spec : null;

  if (!data) {
    target.fill(0);
    return target;
  }

  if (encoding === 'rle') {
    return fillFromRLE(target, data);
  }
  if (encoding === 'raw') {
    return fillFromRaw(target, data);
  }

  // Fallback: attempt to interpret as raw array.
  return fillFromRaw(target, data);
}

export function serialize(world) {
  if (!world || typeof world !== 'object') {
    throw new TypeError('serialize(world) requires a world object.');
  }

  const width = normalizeNumber(world.width, 0);
  const height = normalizeNumber(world.height, 0);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError('World dimensions must be positive numbers.');
  }

  const cellCount = width * height;
  if (!world.cells || world.cells.length !== cellCount) {
    throw new Error('World cells array is missing or has incorrect length.');
  }

  const payload = {
    version: CURRENT_VERSION,
    width,
    height,
    cells: encodeSequence(world.cells),
  };

  if (world.flags && world.flags.length === cellCount) {
    payload.flags = encodeSequence(world.flags);
  }

  if (world.lastMoveDir && world.lastMoveDir.length === cellCount) {
    payload.lastMoveDir = encodeSequence(world.lastMoveDir);
  }

  if (world.lifetimes && world.lifetimes.length === cellCount) {
    payload.lifetimes = encodeSequence(world.lifetimes);
  }

  return payload;
}

function decodeV1(data) {
  const widthRaw = normalizeNumber(data?.width, 0);
  const heightRaw = normalizeNumber(data?.height, 0);
  const width = Math.max(0, Math.trunc(widthRaw));
  const height = Math.max(0, Math.trunc(heightRaw));
  if (width <= 0 || height <= 0) {
    return null;
  }

  const world = createWorld(width, height);
  const cellCount = width * height;

  decodeSequence(data?.cells, world.cells);

  if (world.flags && world.flags.length === cellCount) {
    decodeSequence(data?.flags, world.flags);
  }

  if (world.lastMoveDir && world.lastMoveDir.length === cellCount) {
    decodeSequence(data?.lastMoveDir, world.lastMoveDir);
  }

  if (world.lifetimes && world.lifetimes.length === cellCount) {
    decodeSequence(data?.lifetimes, world.lifetimes);
  }

  return world;
}

export function deserialize(json) {
  if (!json) {
    return null;
  }

  let data = json;
  if (typeof json === 'string') {
    try {
      data = JSON.parse(json);
    } catch (error) {
      console.warn('Failed to parse save JSON:', error);
      return null;
    }
  }

  if (!data || typeof data !== 'object') {
    return null;
  }

  const version = Number.isFinite(data.version) ? Math.trunc(data.version) : null;

  if (version === null) {
    // Legacy format: treat object as version 1 without explicit version.
    return decodeV1(data);
  }

  switch (version) {
    case 1:
      return decodeV1(data);
    default:
      console.warn('Unsupported save version:', version);
      return null;
  }
}

export const SAVE_FILE_VERSION = CURRENT_VERSION;
