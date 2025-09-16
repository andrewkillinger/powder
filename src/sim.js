export function createSimulation() {
  const state = {
    message: 'Hello world',
    elapsed: 0,
  };

  function update(deltaSeconds) {
    state.elapsed += deltaSeconds;
  }

  return { state, update };
}
