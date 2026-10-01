// AETHER portfolio excerpt: chunk/world boundary and halo contract.
// The deployed file contains the complete ChunkStore and streaming scheduler.

const CHUNK_INTERIOR = 16;
const HALO = 1;
const CHUNK_WIDTH = CHUNK_INTERIOR + HALO * 2;

// Keep the mapping shared with the WASM kernel.
const arena = (lx, ly, lz, sliceStride) =>
  lx + ly * CHUNK_WIDTH + lz * sliceStride;

function refreshHalo(chunk, neighbours) {
  // Border cells come from live neighbours at mesh time. This avoids making
  // generation order part of the visible terrain result.
  for (const side of ["north", "south", "east", "west"]) {
    const neighbour = neighbours[side];
    if (!neighbour) continue;
    copyBorder(chunk, neighbour, side);
  }
}
