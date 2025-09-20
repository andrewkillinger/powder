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
export const BAKING_SODA = MID.BAKING_SODA;
export const PIXIE_DUST = MID.PIXIE_DUST;
export const NANITE_POWDER = MID.NANITE_POWDER;
export const RUST = MID.RUST;
export const ASH = MID.ASH;
export const WATER = MID.WATER;
export const OIL = MID.OIL;
export const ACID = MID.ACID;
export const LUMINA = MID.LUMINA;
export const UMBRA = MID.UMBRA;
export const ENCHANTED_WATER = MID.ENCHANTED_WATER;
export const ECTOPLASM = MID.ECTOPLASM;
export const MOLTEN_IRON = MID.MOLTEN_IRON;
export const STEAM = MID.STEAM;
export const OXYGEN = MID.OXYGEN;
export const HYDROGEN = MID.HYDROGEN;
export const ETHEREAL_MIST = MID.ETHEREAL_MIST;
export const ANTIMATTER_VAPOR = MID.ANTIMATTER_VAPOR;
export const GLASS = MID.GLASS;
export const IRON = MID.IRON;
export const WOOD = MID.WOOD;
export const DRY_ICE = MID.DRY_ICE;
export const NEUTRONIUM_CORE = MID.NEUTRONIUM_CORE;
export const ICE = MID.ICE;
export const CARBON_DIOXIDE = MID.CARBON_DIOXIDE;
export const PIXIE_SPARK = MID.PIXIE_SPARK;
export const PHILOSOPHERS_STONE = MID.PHILOSOPHERS_STONE;
export const GOLD = MID.GOLD;

export const ELEMENT_IDS = Object.freeze({
  EMPTY,
  WALL,
  SAND,
  WET_SAND,
  GUNPOWDER,
  WET_GUNPOWDER,
  BAKING_SODA,
  PIXIE_DUST,
  NANITE_POWDER,
  RUST,
  ASH,
  WATER,
  OIL,
  ACID,
  LUMINA,
  UMBRA,
  ENCHANTED_WATER,
  ECTOPLASM,
  MOLTEN_IRON,
  FIRE,
  STEAM,
  OXYGEN,
  HYDROGEN,
  ETHEREAL_MIST,
  ANTIMATTER_VAPOR,
  GLASS,
  IRON,
  WOOD,
  DRY_ICE,
  NEUTRONIUM_CORE,
  ICE,
  CARBON_DIOXIDE,
  PIXIE_SPARK,
  PHILOSOPHERS_STONE,
  GOLD,
});
