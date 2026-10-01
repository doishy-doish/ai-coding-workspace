# AETHER Memory and Data Layout Notes

The exact layout is configured by the JavaScript world constructor and passed into the WASM exports so the kernel and host share the same geometry.

## Main regions

- **Generation tables:** GEO parameters, province/column tables and spline data.
- **Block arena:** chunk voxels with an x/z halo. At world height 126, the documented arena is 18×128×18 = 41,472 bytes.
- **Heights:** 16×16 interior height values used by the mesher and JavaScript passes.
- **Mesh scratch:** output counters, corner scratch and greedy-mask storage.
- **Vertex/index buffers:** packed vertex words and indexed geometry with explicit maximum capacities.
- **Water arena:** fixed-size simulation slots, edge records and materialisation events.

## Packed vertex format

The mesher packs local coordinates, material code, normal and light/AO data into a compact integer. The y field uses seven bits for `y + 1`, which is why the documented maximum world height is 126.

## Important invariants

- WASM and JavaScript use the same live chunk geometry.
- Halo data is refreshed from live neighbours before mesh generation.
- Mesh overflow is detected through output counters.
- The water arena is sized for the streamer's bounded resident-chunk set.
- Legacy world-generation versions are not silently modified.

These notes are a concise portfolio companion to the full deployed engine documentation.
