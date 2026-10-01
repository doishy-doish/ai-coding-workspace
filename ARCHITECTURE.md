# AETHER Architecture

## Two engines, one world

AETHER separates responsibilities between a WebAssembly kernel and a JavaScript game layer.

1. **WASM terrain kernel** — seeded terrain generation, density evaluation, height fields and greedy mesh emission.
2. **JavaScript world layer** — chunk storage, edits, halo synchronisation, streaming, renderer integration and gameplay.
3. **Rendering layer** — packed vertex decoding, persistent buffers, water batching and bounded mesh rebuild work.
4. **Simulation layer** — water cellular automata, entities, player movement, audio and UI.
5. **Network layer** — presence and shared-world relay; clients remain responsible for local rendering and simulation.

## Boot and chunk flow

1. The WASM module is instantiated and its linear memory is exposed.
2. A `World` configures geometry constants for the selected world-generation version.
3. A chunk is generated from its seed and world coordinates.
4. JavaScript applies its chunk-level passes, including decorations and version-specific deposits.
5. Neighbour halos are refreshed from currently loaded chunks.
6. The WASM mesher emits packed vertices and indices into output buffers.
7. The renderer uploads or reuses the buffers within a per-tick rebuild budget.

## Version gates

The generator is versioned because terrain is regenerated from a seed when a save loads. Changing the generator without a gate would reshape existing worlds. Legacy versions therefore route to frozen behaviour, while later versions opt into new geology, relief, cave or deposit systems.

## Deterministic boundaries

Feature anchors, ore deposits, pipes and terrain functions are pure functions of seed and world coordinates. A feature crossing a chunk boundary therefore produces the same result in both chunks without storing feature state or exchanging generation messages.

## Meshing

The greedy mesher constructs masks for each axis/sign pair, merges equal material/light cells, samples corner occlusion and emits one quad as four packed vertices plus six indices. The output counters live in WASM memory and are checked against explicit capacities.

## Networking

The relay provides presence, a shared seed and compact state fan-out. Player state uses a fixed binary frame; join, leave and kill events use JSON. The relay does not simulate the world, so a disconnected client can continue in offline mode and reconnect with backoff.

## Measurement policy

The project treats memory, latency and saturation notes as part of the engineering record. Optimisations are accepted when they preserve output or are explicitly assigned a new world-generation version.
