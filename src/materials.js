// Material registry and metadata definitions

export const MID = Object.freeze({
  // Powders
  SAND: 2,
  WET_SAND: 14,
  GUNPOWDER: 10,
  BAKING_SODA: 11,
  PIXIE_DUST: 12,
  NANITE_POWDER: 13,
  WET_GUNPOWDER: 15,
  RUST: 16,
  ASH: 17,
  // Gases
  OXYGEN: 20,
  HYDROGEN: 21,
  CARBON_DIOXIDE: 22,
  ETHEREAL_MIST: 23,
  ANTIMATTER_VAPOR: 24,
  STEAM: 25,
  PIXIE_SPARK: 26,
  // Liquids
  WATER: 3,
  OIL: 30,
  ACID: 31,
  LUMINA: 32,
  UMBRA: 33,
  ENCHANTED_WATER: 34,
  ECTOPLASM: 35,
  MOLTEN_IRON: 36,
  // Solids
  IRON: 40,
  WOOD: 41,
  DRY_ICE: 42,
  NEUTRONIUM_CORE: 43,
  PHILOSOPHERS_STONE: 44,
  GLASS: 45,
  ICE: 46,
  GOLD: 47,
  // Combustion
  FIRE: 5,
  DUST_CLOUD: 48,
  THERMITE: 49,
  NITRO_SLURRY: 50,
  PLASMA_ARC: 51,
  SODIUM_METAL: 52,
});

export const MCAT = Object.freeze({
  POWDER: 'powder',
  GAS: 'gas',
  LIQUID: 'liquid',
  SOLID: 'solid',
  COMBUSTION: 'combustion',
});

const DEFAULT_FLAGS = Object.freeze({});

const ensureBadge = (value, implemented) => {
  if (typeof value === 'string') {
    return value;
  }
  return implemented ? '' : 'WIP';
};

const style = (base, overrides = {}) => {
  const src = Array.isArray(base) ? base.slice(0, 4) : [0, 0, 0, 255];
  if (src.length < 4) {
    src[3] = 255;
  }
  return {
    base: src,
    jitter: overrides.jitter ?? 10,
    alpha: overrides.alpha ?? (src[3] ?? 255),
    layer: overrides.layer ?? 'powder',
    grain: overrides.grain ?? true,
  };
};

const defaultLayerForCategory = (cat) => {
  switch (cat) {
    case MCAT.GAS:
      return 'gas';
    case MCAT.LIQUID:
      return 'liquid';
    case MCAT.SOLID:
      return 'solid';
    case MCAT.COMBUSTION:
      return 'fx';
    case MCAT.POWDER:
    default:
      return 'powder';
  }
};

const material = (id, name, cat, rgba, opts = {}) => {
  const { style: styleOverrides, ...rest } = opts;
  const implemented = Boolean(rest.implemented);
  const color = Array.isArray(rgba) ? rgba.slice(0, 4) : C(0, 0, 0, 255);
  if (color.length < 4) {
    color[3] = 255;
  }
  const mat = {
    id,
    name,
    cat,
    color,
    implemented,
    state: rest.state ?? cat,
    density: rest.density ?? 1000,
    flags: rest.flags ?? DEFAULT_FLAGS,
    ui: { badge: ensureBadge(rest.badge, implemented) },
  };
  if (rest.props && typeof rest.props === 'object') {
    Object.assign(mat, rest.props);
  }

  const overrides = styleOverrides ? { ...styleOverrides } : {};
  const { base: baseOverride, ...styleRest } = overrides;
  const baseColor = Array.isArray(baseOverride)
    ? baseOverride.slice(0, 4)
    : color.slice(0, 4);
  if (baseColor.length < 4) {
    baseColor[3] = 255;
  }
  mat.style = Object.freeze(
    style(baseColor, {
      ...styleRest,
      layer: styleRest.layer ?? defaultLayerForCategory(cat),
    }),
  );

  return Object.freeze(mat);
};

export const PALETTE = [];
const C = (r, g, b, a = 255) => [r, g, b, a];

const FIRE_ID = 5;

export const MATERIALS = {
  // Powders
  [MID.SAND]: material(MID.SAND, 'Sand', MCAT.POWDER, C(218, 191, 102, 255), {
    implemented: true,
    density: 1600,
    state: 'powder',
    props: {
      immovable: false,
      viscosity: 4,
      lateralRunMax: 1,
      buoyancy: -1,
    },
    style: style(C(218, 191, 102, 255), { layer: 'powder', jitter: 12, grain: true }),
  }),
  [MID.WET_SAND]: material(MID.WET_SAND, 'Wet Sand', MCAT.POWDER, C(176, 156, 109, 255), {
    implemented: true,
    density: 1800,
    state: 'powder',
    props: {
      immovable: false,
      viscosity: 8,
      lateralRunMax: 1,
      buoyancy: -2,
    },
    style: style(C(176, 156, 109, 255), { layer: 'powder', jitter: 10, grain: true }),
  }),
  [MID.GUNPOWDER]: material(MID.GUNPOWDER, 'Gunpowder', MCAT.POWDER, C(60, 60, 60, 255), {
    implemented: true,
    density: 1700,
    state: 'powder',
    props: {
      immovable: false,
      viscosity: 3,
      lateralRunMax: 1,
      buoyancy: -2,
    },
    style: style(C(60, 60, 60, 255), { layer: 'powder', jitter: 14, grain: true }),
  }),
  [MID.WET_GUNPOWDER]: material(
    MID.WET_GUNPOWDER,
    'Wet Gunpowder',
    MCAT.POWDER,
    C(72, 84, 92, 255),
    {
      implemented: true,
      density: 1750,
      state: 'powder',
      props: {
        immovable: false,
        viscosity: 5,
        lateralRunMax: 1,
        buoyancy: -2,
        inert: true,
      },
      style: style(C(72, 84, 92, 255), { layer: 'powder', jitter: 12, grain: true }),
    },
  ),
  [MID.BAKING_SODA]: material(MID.BAKING_SODA, 'Baking Soda', MCAT.POWDER, C(235, 235, 235, 255), {
    implemented: true,
    density: 950,
    state: 'powder',
    props: {
      immovable: false,
      viscosity: 2,
      lateralRunMax: 2,
      buoyancy: 1,
    },
    style: style(C(235, 235, 235, 255), { layer: 'powder', jitter: 9, grain: true }),
  }),
  [MID.PIXIE_DUST]: material(MID.PIXIE_DUST, 'Pixie Dust', MCAT.POWDER, C(210, 240, 255, 255), {
    implemented: true,
    density: 150,
    state: 'powder',
    props: {
      immovable: false,
      viscosity: 1,
      lateralRunMax: 2,
      buoyancy: 5,
    },
    style: style(C(210, 240, 255, 255), { layer: 'powder', jitter: 16, grain: true }),
  }),
  [MID.NANITE_POWDER]: material(MID.NANITE_POWDER, 'Nanite Powder', MCAT.POWDER, C(170, 175, 180, 255), {
    implemented: true,
    density: 1850,
    state: 'powder',
    props: {
      immovable: false,
      viscosity: 2,
      lateralRunMax: 2,
      buoyancy: -1,
    },
    flags: { nanite: true },
    style: style(C(170, 175, 180, 255), { layer: 'powder', jitter: 10, grain: true }),
  }),
  [MID.RUST]: material(MID.RUST, 'Rust', MCAT.POWDER, C(182, 102, 52, 255), {
    implemented: true,
    density: 1800,
    state: 'powder',
    props: {
      immovable: false,
      viscosity: 3,
      lateralRunMax: 1,
      buoyancy: -2,
    },
    flags: { oxide: true },
    style: style(C(182, 102, 52, 255), { layer: 'powder', jitter: 13, grain: true }),
  }),
  [MID.ASH]: material(MID.ASH, 'Ash', MCAT.POWDER, C(180, 178, 170, 255), {
    implemented: true,
    density: 900,
    state: 'powder',
    props: {
      immovable: false,
      viscosity: 2,
      lateralRunMax: 2,
      buoyancy: 1,
    },
    flags: { residue: true },
    style: style(C(180, 178, 170, 255), { layer: 'powder', jitter: 8, grain: true }),
  }),
  // Gases
  [MID.OXYGEN]: material(MID.OXYGEN, 'Oxygen', MCAT.GAS, C(180, 220, 255, 160), {
    implemented: true,
    density: 0.2,
    state: 'gas',
    props: {
      immovable: false,
      viscosity: 0,
      lateralRunMax: 4,
      buoyancy: 6,
    },
    flags: { oxidizer: true },
    style: style(C(180, 220, 255, 160), { layer: 'gas', alpha: 140, jitter: 8, grain: false }),
  }),
  [MID.HYDROGEN]: material(MID.HYDROGEN, 'Hydrogen', MCAT.GAS, C(200, 255, 200, 150), {
    implemented: true,
    density: 0.05,
    state: 'gas',
    props: {
      immovable: false,
      viscosity: 0,
      lateralRunMax: 6,
      buoyancy: 8,
    },
    style: style(C(200, 255, 200, 150), { layer: 'gas', alpha: 120, jitter: 10, grain: false }),
  }),
  [MID.CARBON_DIOXIDE]: material(
    MID.CARBON_DIOXIDE,
    'Carbon Dioxide',
    MCAT.GAS,
    C(200, 200, 200, 190),
    {
      implemented: true,
      density: 2,
      state: 'gas',
      props: {
        immovable: false,
        viscosity: 0,
        lateralRunMax: 4,
        buoyancy: -2,
      },
      flags: { suppressant: true },
      style: style(C(200, 200, 200, 190), { layer: 'gas', alpha: 130, jitter: 6, grain: false }),
    },
  ),
  [MID.ETHEREAL_MIST]: material(MID.ETHEREAL_MIST, 'Ethereal Mist', MCAT.GAS, C(185, 205, 235, 180), {
    implemented: true,
    density: 0.15,
    state: 'gas',
    props: {
      immovable: false,
      viscosity: 0,
      lateralRunMax: 5,
      buoyancy: 0,
    },
    flags: { ethereal: true },
    style: style(C(185, 205, 235, 180), { layer: 'gas', alpha: 150, jitter: 9, grain: false }),
  }),
  [MID.ANTIMATTER_VAPOR]: material(
    MID.ANTIMATTER_VAPOR,
    'Antimatter Vapor',
    MCAT.GAS,
    C(120, 0, 160, 210),
    {
      implemented: true,
      density: 0.1,
      state: 'gas',
      props: {
        immovable: false,
        viscosity: 0,
        lateralRunMax: 3,
        buoyancy: 0,
      },
      flags: { annihilator: true },
      style: style(C(120, 0, 160, 210), { layer: 'gas', alpha: 150, jitter: 11, grain: false }),
    },
  ),
  [MID.PIXIE_SPARK]: material(MID.PIXIE_SPARK, 'Pixie Spark', MCAT.GAS, C(255, 215, 255, 200), {
    implemented: true,
    density: 0.05,
    state: 'gas',
    props: {
      immovable: false,
      viscosity: 0,
      lateralRunMax: 4,
      buoyancy: 6,
      lifetime: 50,
    },
    style: style(C(255, 215, 255, 200), { layer: 'gas', alpha: 150, jitter: 12, grain: false }),
  }),
  [MID.STEAM]: material(MID.STEAM, 'Steam', MCAT.GAS, C(210, 230, 255, 180), {
    implemented: true,
    density: 0.35,
    state: 'gas',
    props: {
      immovable: false,
      viscosity: 0,
      lateralRunMax: 4,
      buoyancy: 7,
      lifetime: 160,
    },
    style: style(C(210, 230, 255, 180), { layer: 'gas', alpha: 135, jitter: 8, grain: false }),
  }),
  // Liquids
  [MID.WATER]: material(MID.WATER, 'Water', MCAT.LIQUID, C(64, 128, 255, 228), {
    implemented: true,
    density: 1000,
    state: 'liquid',
    props: {
      immovable: false,
      viscosity: 1,
      lateralRunMax: 6,
      buoyancy: 1,
      pressureRange: 5,
      freezeChance: 0.18,
      dryIceFreezeChance: 0.65,
      fireEvaporateChance: 0.75,
      warmEvaporateChance: 0.18,
      acidDilutionChance: 0.35,
    },
    style: style(C(64, 128, 255, 228), { layer: 'liquid', alpha: 230, jitter: 8, grain: false }),
  }),
  [MID.OIL]: material(MID.OIL, 'Oil', MCAT.LIQUID, C(210, 170, 90, 255), {
    implemented: true,
    density: 870,
    state: 'liquid',
    props: {
      immovable: false,
      viscosity: 3,
      lateralRunMax: 3,
      buoyancy: 2,
      flammable: true,
      combustion: {
        product: FIRE_ID,
        igniteProbability: 0.2,
      },
    },
    flags: { oil: true },
    style: style(C(210, 170, 90, 255), { layer: 'liquid', alpha: 240, jitter: 10, grain: true }),
  }),
  [MID.ACID]: material(MID.ACID, 'Acid', MCAT.LIQUID, C(170, 220, 120, 220), {
    implemented: true,
    density: 1200,
    state: 'liquid',
    props: {
      immovable: false,
      viscosity: 2,
      lateralRunMax: 5,
      buoyancy: -1,
    },
    flags: { corrosive: true },
    style: style(C(170, 220, 120, 220), { layer: 'liquid', alpha: 220, jitter: 9, grain: false }),
  }),
  [MID.LUMINA]: material(MID.LUMINA, 'Lumina', MCAT.LIQUID, C(255, 240, 120, 255), {
    implemented: true,
    density: 980,
    state: 'liquid',
    props: {
      immovable: false,
      viscosity: 2,
      lateralRunMax: 4,
      buoyancy: 1,
      luminous: true,
    },
    flags: { radiant: true },
    style: style(C(255, 240, 120, 255), { layer: 'liquid', alpha: 245, jitter: 12, grain: false }),
  }),
  [MID.UMBRA]: material(MID.UMBRA, 'Umbra', MCAT.LIQUID, C(15, 15, 20, 255), {
    implemented: true,
    density: 1015,
    state: 'liquid',
    props: {
      immovable: false,
      viscosity: 2,
      lateralRunMax: 3,
      buoyancy: -1,
      lightAbsorbing: true,
    },
    flags: { shadow: true },
    style: style(C(15, 15, 20, 255), { layer: 'liquid', alpha: 255, jitter: 8, grain: true }),
  }),
  [MID.ENCHANTED_WATER]: material(
    MID.ENCHANTED_WATER,
    'Enchanted Water',
    MCAT.LIQUID,
    C(120, 235, 255, 235),
    {
      implemented: true,
      density: 1000,
      state: 'liquid',
      props: {
        immovable: false,
        viscosity: 1,
        lateralRunMax: 6,
        buoyancy: 1,
        pressureRange: 5,
        freezeChance: 0.12,
        dryIceFreezeChance: 0.55,
        fireEvaporateChance: 0.65,
        warmEvaporateChance: 0.2,
        acidDilutionChance: 0.45,
      },
      flags: { waterLike: true, enchanted: true },
      style: style(C(120, 235, 255, 235), { layer: 'liquid', alpha: 235, jitter: 9, grain: false }),
    },
  ),
  [MID.ECTOPLASM]: material(MID.ECTOPLASM, 'Ectoplasm', MCAT.LIQUID, C(180, 245, 210, 235), {
    implemented: true,
    density: 1040,
    state: 'liquid',
    props: {
      immovable: false,
      viscosity: 4,
      lateralRunMax: 3,
      buoyancy: -1,
    },
    flags: { ectoplasmic: true },
    style: style(C(180, 245, 210, 235), { layer: 'liquid', alpha: 230, jitter: 10, grain: false }),
  }),
  [MID.MOLTEN_IRON]: material(MID.MOLTEN_IRON, 'Molten Iron', MCAT.LIQUID, C(255, 140, 70, 235), {
    implemented: true,
    density: 7000,
    state: 'liquid',
    props: {
      immovable: false,
      viscosity: 3,
      lateralRunMax: 2,
      buoyancy: -4,
    },
    flags: { metal: true, molten: true },
    style: style(C(255, 140, 70, 235), { layer: 'liquid', alpha: 235, jitter: 14, grain: true }),
  }),
  // Solids
  [MID.IRON]: material(MID.IRON, 'Iron', MCAT.SOLID, C(110, 115, 120, 255), {
    implemented: true,
    density: 7850,
    state: 'solid',
    props: {
      immovable: false,
      viscosity: 0,
      lateralRunMax: 0,
      buoyancy: -5,
      conductive: true,
    },
    flags: { metal: true },
    style: style(C(110, 115, 120, 255), { layer: 'solid', jitter: 8, grain: true }),
  }),
  [MID.WOOD]: material(MID.WOOD, 'Wood', MCAT.SOLID, C(145, 110, 65, 255), {
    implemented: true,
    density: 650,
    props: {
      immovable: false,
      buoyancy: 3,
    },
    flags: { flammable: true },
    style: style(C(145, 110, 65, 255), { layer: 'solid', jitter: 12, grain: true }),
  }),
  [MID.DRY_ICE]: material(MID.DRY_ICE, 'Dry Ice', MCAT.SOLID, C(210, 230, 255, 255), {
    implemented: true,
    density: 1560,
    props: {
      immovable: false,
      buoyancy: -3,
    },
    flags: { cryogenic: true },
    style: style(C(210, 230, 255, 255), { layer: 'solid', jitter: 9, grain: true }),
  }),
  [MID.ICE]: material(MID.ICE, 'Ice', MCAT.SOLID, C(180, 220, 255, 235), {
    implemented: true,
    density: 917,
    state: 'solid',
    props: {
      immovable: false,
      viscosity: 0,
      lateralRunMax: 0,
      buoyancy: -1,
      slipperiness: 1,
    },
    style: style(C(180, 220, 255, 235), { layer: 'solid', alpha: 235, jitter: 8, grain: false }),
  }),
  [MID.NEUTRONIUM_CORE]: material(
    MID.NEUTRONIUM_CORE,
    'Neutronium Core',
    MCAT.SOLID,
    C(35, 35, 45, 255),
    {
      implemented: true,
      density: 1000000,
      props: {
        immovable: false,
        buoyancy: -20,
      },
      flags: { singularity: true },
      style: style(C(35, 35, 45, 255), { layer: 'solid', jitter: 10, grain: true }),
    },
  ),
  [MID.PHILOSOPHERS_STONE]: material(
    MID.PHILOSOPHERS_STONE,
    'Philosopher’s Stone',
    MCAT.SOLID,
    C(210, 50, 70, 255),
    {
      implemented: true,
      density: 3500,
      props: {
        immovable: false,
        buoyancy: -6,
      },
      flags: { catalyst: true },
      style: style(C(210, 50, 70, 255), { layer: 'solid', jitter: 14, grain: true }),
    },
  ),
  [MID.GLASS]: material(MID.GLASS, 'Glass', MCAT.SOLID, C(196, 214, 232, 220), {
    implemented: true,
    density: 2500,
    state: 'solid',
    props: {
      immovable: false,
      viscosity: 0,
      lateralRunMax: 0,
      buoyancy: -4,
    },
    style: style(C(196, 214, 232, 220), { layer: 'solid', alpha: 200, jitter: 8, grain: false }),
  }),
  [MID.GOLD]: material(MID.GOLD, 'Gold', MCAT.SOLID, C(255, 208, 64, 255), {
    implemented: true,
    density: 19300,
    props: {
      immovable: false,
      buoyancy: -10,
    },
    flags: { noble: true },
    style: style(C(255, 208, 64, 255), { layer: 'solid', jitter: 11, grain: true }),
  }),
  // Combustion
  [MID.FIRE]: material(MID.FIRE, 'Fire', MCAT.COMBUSTION, C(255, 160, 60, 220), {
    implemented: true,
    state: 'fx',
    style: style(C(255, 160, 60, 220), { layer: 'fx', alpha: 220, jitter: 18, grain: false }),
  }),
  [MID.DUST_CLOUD]: material(
    MID.DUST_CLOUD,
    'Dust Cloud',
    MCAT.COMBUSTION,
    C(220, 210, 180, 120),
    {
      implemented: false,
      state: 'gas',
      style: style(C(220, 210, 180, 120), { layer: 'gas', alpha: 120, jitter: 10, grain: false }),
    },
  ),
  [MID.THERMITE]: material(MID.THERMITE, 'Thermite', MCAT.COMBUSTION, C(140, 120, 110, 255), {
    implemented: false,
    state: 'powder',
    style: style(C(140, 120, 110, 255), { layer: 'powder', jitter: 14, grain: true }),
  }),
  [MID.NITRO_SLURRY]: material(
    MID.NITRO_SLURRY,
    'Nitro Slurry',
    MCAT.COMBUSTION,
    C(235, 250, 245, 255),
    {
      implemented: false,
      state: 'liquid',
      style: style(C(235, 250, 245, 255), { layer: 'liquid', alpha: 230, jitter: 6, grain: false }),
    },
  ),
  [MID.PLASMA_ARC]: material(
    MID.PLASMA_ARC,
    'Plasma Arc',
    MCAT.COMBUSTION,
    C(160, 220, 255, 160),
    {
      implemented: false,
      state: 'gas',
      style: style(C(160, 220, 255, 160), { layer: 'fx', alpha: 160, jitter: 20, grain: false }),
    },
  ),
  [MID.SODIUM_METAL]: material(
    MID.SODIUM_METAL,
    'Sodium Metal',
    MCAT.COMBUSTION,
    C(200, 200, 160, 255),
    {
      implemented: false,
      state: 'solid',
      style: style(C(200, 200, 160, 255), { layer: 'solid', jitter: 10, grain: true }),
    },
  ),
};

PALETTE[0] = C(7, 9, 15, 255);
PALETTE[1] = C(54, 57, 66, 255);
PALETTE[FIRE_ID] = C(255, 160, 60, 220);

Object.values(MATERIALS).forEach((mat) => {
  PALETTE[mat.id] = mat.color;
});

export const MATERIAL_CATEGORIES = [
  { key: MCAT.POWDER, label: 'Powders' },
  { key: MCAT.GAS, label: 'Gases' },
  { key: MCAT.LIQUID, label: 'Liquids' },
  { key: MCAT.SOLID, label: 'Solids' },
  { key: MCAT.COMBUSTION, label: 'Combustion' },
];

export const getMaterial = (id) => MATERIALS[id];
export const isImplemented = (id) => Boolean(MATERIALS[id]?.implemented);
export const byCategory = (cat) =>
  Object.values(MATERIALS).filter((mat) => mat.cat === cat);
export const MATERIAL_IDS = Object.freeze(Object.values(MID));

export function createPaletteBuffer() {
  const maxId = PALETTE.length;
  const buffer = new Uint8ClampedArray(maxId * 4);
  for (let id = 0; id < maxId; id += 1) {
    const color = PALETTE[id];
    const base = id * 4;
    if (Array.isArray(color) && color.length >= 4) {
      buffer[base] = color[0];
      buffer[base + 1] = color[1];
      buffer[base + 2] = color[2];
      buffer[base + 3] = color[3];
    } else {
      buffer[base + 3] = 255;
    }
  }
  return buffer;
}

export const SPECIAL_IDS = Object.freeze({ FIRE: FIRE_ID });

