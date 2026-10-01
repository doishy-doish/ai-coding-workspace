# AETHER — Andrale Voxel

AETHER is a browser-based voxel engine and co-op world built around a hand-written WebAssembly terrain and meshing kernel. The live generator is a single self-contained Perchance application of roughly 63,000 lines, with JavaScript owning the game layer and WAT/WASM owning terrain generation and mesh production.

## Live Demo

[Try AETHER / Andrale Voxel](https://perchance.org/andrale-voxel)

## What this project demonstrates

- Hand-written WebAssembly Text (WAT) compiled with wabt
- Deterministic, seed-driven world generation
- FBM/value noise, spline height fields, moisture, caves and aquifers
- Geology-inspired rock provinces and host-rock ore generation
- Greedy meshing with baked ambient occlusion
- Packed 32-bit vertex data and zero-copy WASM-to-GPU transfer
- Streaming chunks with live neighbour halos
- Time-sliced water cellular automata
- WebGL rendering, co-op relay networking and offline fallback
- Measured memory, latency and saturation budgets

## Architecture

### WASM kernel

The kernel owns terrain generation and mesh production. It exposes the generator and mesher through linear memory, allowing JavaScript to provide chunk buffers and upload packed output to the renderer without converting every vertex into an object-heavy JavaScript representation.

The kernel includes:

- Seeded noise and height-field functions
- Versioned world-generation dispatch
- Three-dimensional density terrain and cave functions
- Greedy quad emission
- Ambient-occlusion sampling
- Packed vertex encoding

### JavaScript game layer

JavaScript owns the `ChunkStore`, edits, streaming, renderer, player, entities, audio, UI and network client. Chunk data remains accessible to the game layer, while the WASM kernel handles the hot terrain and meshing paths.

### Determinism and compatibility

World generation is derived from `(seed, cell)` wherever possible. A world-generation version gate keeps old saves stable: legacy versions remain byte-identical instead of being silently reshaped by later generator improvements.

## Selected engineering details

### Chunk streaming

Chunks use 18×66×18 storage at the original world height, including a one-block x/z halo. Halo cells are refreshed from live neighbours when meshing, so edits remain consistent regardless of chunk load order.

### Packed vertices

A vertex is represented by one packed integer containing local position, material code, normal and light/AO information. This keeps the mesh representation compact and reduces transfer and allocation overhead.

### Greedy meshing

The mesher builds face masks for each axis and direction, merges equal cells into quads, samples corner occlusion and emits indexed geometry. Vertex and index buffers have explicit capacity checks; overflow causes a controlled retry rather than corrupting memory.

### Geology and deposits

Later world-generation versions add province-aware rock columns, kimberlite pipes, host-rock restrictions and deterministic deposit objects. Ore bodies are generated from coarse lattice anchors and evaluated at chunk boundaries without requiring cross-chunk state.

### Water simulation

Water uses a time-sliced cellular automaton with per-chunk slots and cross-chunk edge records. The simulation arena is dimensioned from the streamer’s measured maximum resident chunk set rather than allocated without a bound.

## Repository contents

This repository is a portfolio excerpt, not a duplicate of the deployed monolith. It contains representative documentation and source excerpts:

```text
README.md
ARCHITECTURE.md
MEMORY.md
src/
  world.wat
  noise-and-height.wat
  greedy-mesher.wat
  world.js
```

The excerpts focus on the engine’s architecture and algorithms. The complete live application remains available through the public demo above.

## Performance and memory discipline

The project is built around measurement rather than assumed budgets. The accompanying notes describe:

- Linear-memory regions for terrain, mesh buffers and water simulation
- Packed vertex and index capacities
- Chunk mesh timings and stream counts
- Water-slot sizing and resident-chunk limits
- Version-gated changes that preserve legacy output

## About

Built by [Andrale Misquitta](https://github.com/doishy-doish) as an exploration of browser game engines, procedural generation, WebAssembly, rendering and deterministic simulation.
