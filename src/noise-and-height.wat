;; AETHER portfolio excerpt: representative WAT interfaces and deterministic noise.
;; The deployed kernel contains additional terrain, cave, water and meshing code.

(module
  (memory (export "memory") 200 512)
  (global $SEED (mut i32) (i32.const 0))

  (func $hash2 (param $ix i32) (param $iz i32) (param $salt i32) (result i32)
    ;; Seed and lattice coordinates produce a stable cell hash.
    (i32.xor (local.get $ix) (i32.xor (local.get $iz) (local.get $salt))))

  (func (export "setSeed") (param $s i32)
    (global.set $SEED (local.get $s)))
)
