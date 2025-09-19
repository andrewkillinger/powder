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
export const WET_SAND = MID.WET_SAND;
export const GUNPOWDER = MID.GUNPOWDER;
export const WET_GUNPOWDER = MID.WET_GUNPOWDER;
export const WATER = MID.WATER;
export const OIL = MID.OIL;
export const ACID = MID.ACID;
export const STEAM = MID.STEAM;
export const GLASS = MID.GLASS;
export const WOOD = MID.WOOD;
export const DRY_ICE = MID.DRY_ICE;
export const ICE = MID.ICE;

export const ELEMENT_IDS = Object.freeze({
  EMPTY,
  WALL,
  SAND,
  WET_SAND,
  GUNPOWDER,
  WET_GUNPOWDER,
  WATER,
  OIL,
  ACID,
  FIRE,
  STEAM,
  GLASS,
  WOOD,
  DRY_ICE,
  ICE,
});
