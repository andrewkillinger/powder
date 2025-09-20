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
});

export const MCAT = Object.freeze({
  POWDER: 'powder',
  GAS: 'gas',
  LIQUID: 'liquid',
  SOLID: 'solid',
});

const DEFAULT_FLAGS = Object.freeze({});

const ensureBadge = (value, implemented) => {
  if (typeof value === 'string') {
    return value;
  }
  return implemented ? '' : 'WIP';
};

const material = (id, name, cat, rgba, opts = {}) => {
  const implemented = Boolean(opts.implemented);
  const mat = {
    id,
    name,
    cat,
    color: rgba,
    implemented,
    state: opts.state ?? cat,
    density: opts.density ?? 1000,
    flags: opts.flags ?? DEFAULT_FLAGS,
    ui: { badge: ensureBadge(opts.badge, implemented) },
  };
  if (opts.props && typeof opts.props === 'object') {
    Object.assign(mat, opts.props);
  }
  return Object.freeze(mat);
};

export const PALETTE = [];
const C = (r, g, b, a = 255) => [r, g, b, a];

const FIRE_ID = 5;

export const MATERIALS = {
  // Powders
  [MID.SAND]: material(MID.SAND, 'Sand', MCAT.POWDER, C(218, 191, 102), {
    implemented: true,
    density: 1600,
    state: 'powder',
    props: {
      immovable: false,
      viscosity: 4,
      lateralRunMax: 1,
      buoyancy: -1,
    },
  }),
  [MID.WET_SAND]: material(MID.WET_SAND, 'Wet Sand', MCAT.POWDER, C(176, 156, 109), {
    implemented: true,
    density: 1800,
    state: 'powder',
    props: {
      immovable: false,
      viscosity: 8,
      lateralRunMax: 1,
      buoyancy: -2,
    },
  }),
  [MID.GUNPOWDER]: material(MID.GUNPOWDER, 'Gunpowder', MCAT.POWDER, C(60, 60, 60), {
    implemented: true,
    density: 1700,
    state: 'powder',
    props: {
      immovable: false,
      viscosity: 3,
      lateralRunMax: 1,
      buoyancy: -2,
    },
  }),
  [MID.WET_GUNPOWDER]: material(
    MID.WET_GUNPOWDER,
    'Wet Gunpowder',
    MCAT.POWDER,
    C(72, 84, 92),
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
    },
  ),
  [MID.BAKING_SODA]: material(MID.BAKING_SODA, 'Baking Soda', MCAT.POWDER, C(235, 235, 235), {
    implemented: true,
    density: 950,
    state: 'powder',
    props: {
      immovable: false,
      viscosity: 2,
      lateralRunMax: 2,
      buoyancy: 1,
    },
  }),
  [MID.PIXIE_DUST]: material(MID.PIXIE_DUST, 'Pixie Dust', MCAT.POWDER, C(210, 240, 255), {
    implemented: true,
    density: 150,
    state: 'powder',
    props: {
      immovable: false,
      viscosity: 1,
      lateralRunMax: 2,
      buoyancy: 5,
    },
  }),
  [MID.NANITE_POWDER]: material(MID.NANITE_POWDER, 'Nanite Powder', MCAT.POWDER, C(170, 175, 180), {
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
  }),
  [MID.RUST]: material(MID.RUST, 'Rust', MCAT.POWDER, C(182, 102, 52), {
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
  }),
  [MID.ASH]: material(MID.ASH, 'Ash', MCAT.POWDER, C(180, 178, 170), {
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
  }),
  // Gases
  [MID.OXYGEN]: material(MID.OXYGEN, 'Oxygen', MCAT.GAS, C(180, 220, 255), {
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
  }),
  [MID.OIL]: material(MID.OIL, 'Oil', MCAT.LIQUID, C(210, 170, 90), {
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
  }),
  [MID.LUMINA]: material(MID.LUMINA, 'Lumina', MCAT.LIQUID, C(255, 240, 120), {
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
  }),
  [MID.UMBRA]: material(MID.UMBRA, 'Umbra', MCAT.LIQUID, C(15, 15, 20), {
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
  }),
  // Solids
  [MID.IRON]: material(MID.IRON, 'Iron', MCAT.SOLID, C(110, 115, 120), {
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
  }),
  [MID.WOOD]: material(MID.WOOD, 'Wood', MCAT.SOLID, C(145, 110, 65), {
    implemented: true,
    density: 650,
    props: {
      immovable: false,
      buoyancy: 3,
    },
    flags: { flammable: true },
  }),
  [MID.DRY_ICE]: material(MID.DRY_ICE, 'Dry Ice', MCAT.SOLID, C(210, 230, 255), {
    implemented: true,
    density: 1560,
    props: {
      immovable: false,
      buoyancy: -3,
    },
    flags: { cryogenic: true },
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
  }),
  [MID.NEUTRONIUM_CORE]: material(
    MID.NEUTRONIUM_CORE,
    'Neutronium Core',
    MCAT.SOLID,
    C(35, 35, 45),
    {
      implemented: true,
      density: 1000000,
      props: {
        immovable: false,
        buoyancy: -20,
      },
      flags: { singularity: true },
    },
  ),
  [MID.PHILOSOPHERS_STONE]: material(
    MID.PHILOSOPHERS_STONE,
    'Philosopher’s Stone',
    MCAT.SOLID,
    C(210, 50, 70),
    {
      implemented: true,
      density: 3500,
      props: {
        immovable: false,
        buoyancy: -6,
      },
      flags: { catalyst: true },
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
  }),
  [MID.GOLD]: material(MID.GOLD, 'Gold', MCAT.SOLID, C(255, 208, 64), {
    implemented: true,
    density: 19300,
    props: {
      immovable: false,
      buoyancy: -10,
    },
    flags: { noble: true },
  }),
};

PALETTE[0] = C(7, 9, 15, 255);
PALETTE[1] = C(54, 57, 66, 255);
PALETTE[FIRE_ID] = C(252, 110, 28, 255);

Object.values(MATERIALS).forEach((mat) => {
  PALETTE[mat.id] = mat.color;
});

export const MATERIAL_CATEGORIES = [
  { key: MCAT.POWDER, label: 'Powders' },
  { key: MCAT.GAS, label: 'Gases' },
  { key: MCAT.LIQUID, label: 'Liquids' },
  { key: MCAT.SOLID, label: 'Solids' },
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

