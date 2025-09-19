// Material registry and metadata definitions

export const MID = Object.freeze({
  // Powders
  SAND: 2,
  WET_SAND: 14,
  GUNPOWDER: 10,
  BAKING_SODA: 11,
  PIXIE_DUST: 12,
  NANITE_POWDER: 13,
  // Gases
  OXYGEN: 20,
  HYDROGEN: 21,
  CARBON_DIOXIDE: 22,
  ETHEREAL_MIST: 23,
  ANTIMATTER_VAPOR: 24,
  // Liquids
  WATER: 3,
  OIL: 30,
  ACID: 31,
  LUMINA: 32,
  UMBRA: 33,
  // Solids
  IRON: 40,
  WOOD: 41,
  DRY_ICE: 42,
  NEUTRONIUM_CORE: 43,
  PHILOSOPHERS_STONE: 44,
  GLASS: 45,
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
  [MID.GUNPOWDER]: material(MID.GUNPOWDER, 'Gunpowder', MCAT.POWDER, C(60, 60, 60)),
  [MID.BAKING_SODA]: material(MID.BAKING_SODA, 'Baking Soda', MCAT.POWDER, C(235, 235, 235)),
  [MID.PIXIE_DUST]: material(MID.PIXIE_DUST, 'Pixie Dust', MCAT.POWDER, C(210, 240, 255)),
  [MID.NANITE_POWDER]: material(MID.NANITE_POWDER, 'Nanite Powder', MCAT.POWDER, C(170, 175, 180)),
  // Gases
  [MID.OXYGEN]: material(MID.OXYGEN, 'Oxygen', MCAT.GAS, C(180, 220, 255)),
  [MID.HYDROGEN]: material(MID.HYDROGEN, 'Hydrogen', MCAT.GAS, C(200, 255, 200)),
  [MID.CARBON_DIOXIDE]: material(
    MID.CARBON_DIOXIDE,
    'Carbon Dioxide',
    MCAT.GAS,
    C(200, 200, 200),
  ),
  [MID.ETHEREAL_MIST]: material(MID.ETHEREAL_MIST, 'Ethereal Mist', MCAT.GAS, C(185, 205, 235)),
  [MID.ANTIMATTER_VAPOR]: material(
    MID.ANTIMATTER_VAPOR,
    'Antimatter Vapor',
    MCAT.GAS,
    C(120, 0, 160),
  ),
  // Liquids
  [MID.WATER]: material(MID.WATER, 'Water', MCAT.LIQUID, C(64, 128, 255), {
    implemented: true,
    density: 1000,
    state: 'liquid',
    props: {
      immovable: false,
      viscosity: 1,
      lateralRunMax: 6,
      buoyancy: 1,
    },
  }),
  [MID.OIL]: material(MID.OIL, 'Oil', MCAT.LIQUID, C(210, 170, 90), {
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
  }),
  [MID.ACID]: material(MID.ACID, 'Acid', MCAT.LIQUID, C(170, 220, 120)),
  [MID.LUMINA]: material(MID.LUMINA, 'Lumina', MCAT.LIQUID, C(255, 240, 120)),
  [MID.UMBRA]: material(MID.UMBRA, 'Umbra', MCAT.LIQUID, C(15, 15, 20)),
  // Solids
  [MID.IRON]: material(MID.IRON, 'Iron', MCAT.SOLID, C(110, 115, 120)),
  [MID.WOOD]: material(MID.WOOD, 'Wood', MCAT.SOLID, C(145, 110, 65)),
  [MID.DRY_ICE]: material(MID.DRY_ICE, 'Dry Ice', MCAT.SOLID, C(210, 230, 255)),
  [MID.NEUTRONIUM_CORE]: material(
    MID.NEUTRONIUM_CORE,
    'Neutronium Core',
    MCAT.SOLID,
    C(35, 35, 45),
  ),
  [MID.PHILOSOPHERS_STONE]: material(
    MID.PHILOSOPHERS_STONE,
    'Philosopher’s Stone',
    MCAT.SOLID,
    C(210, 50, 70),
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

