import {
  MATERIALS,
  PALETTE,
  MID,
  MCAT,
  MATERIAL_CATEGORIES,
  getMaterial,
  isImplemented,
  byCategory,
  MATERIAL_IDS,
  createPaletteBuffer,
  SPECIAL_IDS,
} from './materials.js';

export {
  MATERIALS as ELEMENTS,
  PALETTE,
  MID as ID,
  MCAT,
  MATERIAL_CATEGORIES,
  getMaterial,
  isImplemented,
  byCategory,
  MATERIAL_IDS,
  createPaletteBuffer,
  SPECIAL_IDS,
};

export const EMPTY = 0;
export const WALL = 1;
export const FIRE = SPECIAL_IDS.FIRE;

export const SAND = MID.SAND;
export const WATER = MID.WATER;
export const OIL = MID.OIL;

export const ELEMENT_IDS = Object.freeze({
  EMPTY,
  WALL,
  SAND,
  WATER,
  OIL,
  FIRE,
});
