export const EVT = Object.freeze({
  CONTACT: 'contact',
  ADJACENT_TICK: 'adjacent',
  THERMAL: 'thermal',
});

const MAX_EVENTS_PER_FRAME = 4000;

export function createInteractionRouter({ getMat, rng }) {
  let eventsThisFrame = 0;

  function resetFrame() {
    eventsThisFrame = 0;
  }

  function allow() {
    return eventsThisFrame++ < MAX_EVENTS_PER_FRAME;
  }

  const onContactMap = new Map();
  const onAdjacentMap = new Map();
  const onThermalMap = new Map();

  function key(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  function onContact(a, b, fn) {
    if (typeof fn === 'function') {
      onContactMap.set(key(a, b), fn);
    }
  }

  function onAdjacent(a, b, fn) {
    if (typeof fn === 'function') {
      onAdjacentMap.set(key(a, b), fn);
    }
  }

  function onThermal(a, fn) {
    if (typeof fn === 'function') {
      onThermalMap.set(a, fn);
    }
  }

  function contact(world, ax, ay, bx, by, idA, idB) {
    if (!allow()) {
      return;
    }
    const fn = onContactMap.get(key(idA, idB));
    if (fn) {
      fn(world, ax, ay, bx, by, idA, idB, rng, getMat);
    }
  }

  function adjacentTick(world, ax, ay, bx, by, idA, idB) {
    if (!allow()) {
      return;
    }
    const fn = onAdjacentMap.get(key(idA, idB));
    if (fn) {
      fn(world, ax, ay, bx, by, idA, idB, rng, getMat);
    }
  }

  function thermal(world, x, y, id, temp) {
    if (!allow()) {
      return;
    }
    const fn = onThermalMap.get(id);
    if (fn) {
      fn(world, x, y, id, temp, rng, getMat);
    }
  }

  return {
    resetFrame,
    onContact,
    onAdjacent,
    onThermal,
    contact,
    adjacentTick,
    thermal,
    _debug: {
      onContactMap,
      onAdjacentMap,
      onThermalMap,
    },
  };
}
