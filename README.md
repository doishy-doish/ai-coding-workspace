# Andrale Misquitta — Production Portfolio

A curated collection of architectural samples from five production systems: **~100k+ lines of code** across **5 major projects**, emphasizing patterns, infrastructure, measured performance, and design decisions.

**All systems are live.** Follow the links below to explore each project.

---

## Projects

### 1. **AI Character Chat** — Multi-provider AI orchestration
*Local-first AI roleplay with vector memory, image generation, and intelligent provider routing*

- **Live:** [Perchance AI Character Chat](https://perchance.org/andrale-ai-character-chat)
- **Scale:** ~22,000 LoC + 75 modules
- **Platform:** Perchance
- **Key patterns:** Multi-provider router with circuit breakers, token-budget-aware prompt assembly, adaptive performance tuning, local-first IndexedDB storage
- **Stack:** JavaScript (no framework), three.js, IndexedDB, Dexie, Web Audio API

**What it shows:**
- Failover routing with per-lane circuit breakers and exponential backoff
- Token budgeting and prefix-cache-friendly prompt assembly
- Adaptive timeouts (hedged request pattern)
- Chat-protect pacing (off-path work waits for reply to finish)
- Superseded-work cancellation (stop in-flight calls when user types)
- Local search indexing + semantic vector memory
- Device profiling and adaptive quality tuning
- Multi-provider key rotation

**Repository:** [nova-ai-assistant](https://github.com/doishy-doish/nova-ai-assistant)

---

### 2. **NOVA** — Personal AI Assistant
*Client-side assistant with immutable Loyalty Kernel, supervision layer, and self-audit*

- **Live:** [Perchance NOVA](https://perchance.org/andrale-agentic-chat)
- **Scale:** ~7,600 LoC
- **Platform:** Perchance
- **Key patterns:** Immutable directive injection, action supervision, self-audit, cross-device sync, long-term memory with semantic recall
- **Stack:** JavaScript, Web Audio API, IndexedDB, WebSocket relay

**What it shows:**
- Loyalty Kernel: unalterable core directives that guide every action
- Supervision layer: risky actions flagged for user approval
- Reflection pass: audit trail checked against kernel (self-audit)
- Long-term memory: facts, episodic notes, moods, patterns
- Tool grammar: plain-text action grammar for model addressability
- Cross-device sync: WebSocket relay with encrypted backups
- Procedural audio synthesis (weather, news, stingers)

**Repository:** [nova-ai-assistant](https://github.com/doishy-doish/nova-ai-assistant)

---

### 3. **Arena Protocol** — 3D FPS Wave Arena
*Vanilla JavaScript voxel arena with binary co-op relay and procedural audio*

- **Live:** [Perchance Arena Protocol](https://perchance.org/andrale-arena-protocol)
- **Scale:** ~2,162 LoC (single file)
- **Platform:** Perchance
- **Key patterns:** Seeded procedural generation, binary protocol (35-byte frames), responsive netcode (relay-only, never simulates), zero-allocation hot paths
- **Stack:** three.js 0.177.0, vanilla ES module, Canvas 2D HUD, Web Audio API, Perchance relay

**What it shows:**
- Seeded terrain (mulberry32 PRNG ensures all clients generate identical maze)
- Three enemy types (Grunt, Runner, Tank) with line-of-sight AI
- Hitscan combat, recoil, screen shake, tracers, impact feedback
- Procedural audio: all sounds synthesized at runtime (zero assets)
- Binary netcode: 35 bytes per position update
- Responsive relay: server reflects state, never simulates
- Offline graceful: solo play if relay unavailable, exponential-backoff reconnect
- Canvas 2D HUD: crosshair, hitmarkers, floating damage numbers, minimap

**Repository:** (Perchance-only; no separate GitHub repo)

---

### 4. **Indian Tax Flashcards** — FSRS-6 Study Engine + AI Teacher
*Spaced repetition study app grounded in official Union Budget documents*

- **Live:** [Perchance Indian Tax Flashcards](https://perchance.org/andrale-tax-flashcards)
- **Scale:** ~4,600 LoC
- **Platform:** Perchance
- **Key patterns:** Pure tutor core (testable), async adapter layer, bounded storage (14–40 KB unbounded), cache-friendly prompts, concept-based diagnosis
- **Stack:** JavaScript, FSRS-6 scheduler (Anki default), Perchance ai-text-plugin, kv-plugin

**What it shows:**
- FSRS-6.0 scheduler (Free Spaced Repetition Scheduler) with published default parameters
- ~9 categories: slabs, IT Act 2025, deductions, TDS, capital gains, filing, Finance Act 2026, GST, fiscal
- AI teacher layer: diagnoses weak concepts, builds mnemonics, Socratic follow-ups
- Concept graph: keyword extraction, law-family links, recency-weighted EMA
- Deterministic drill selection from weak categories
- Bounded state: old events folded into accumulators (no unbounded growth)
- Cache-friendly prompts: single prefix-cache-friendly shape shared across calls
- Practical corner: real-world gotchas verified against official sources
- New & pending laws tracker with status badges

**Repository:** (Perchance-only; no separate GitHub repo)

---

### 5. **AETHER** — Voxel Engine with Hand-Written WASM Kernel
*Browser-based voxel world with deterministic terrain generation and co-op multiplayer*

- **Live:** [Perchance AETHER](https://perchance.org/andrale-voxel)
- **Scale:** ~63,000 LoC (integrated monolith)
- **Platform:** Perchance
- **Key patterns:** Pure-function terrain (seed + coords), frozen v1 generator, greedy meshing with baked AO, streaming chunks with halos, measured memory budgets
- **Stack:** WebAssembly (WAT), JavaScript, three.js, Web Audio API, Perchance relay

**What it shows:**
- **WASM kernel (WAT):** Terrain generation, meshing, water simulation all in WebAssembly
- **Deterministic generation:** Seeded pure functions of (seed, global_pos) ensure chunk boundaries align
- **Version gates:** Frozen v1 output (byte-identical forever) with upgradeable later versions
- **Geology system:** Rock provinces, 3D density terrain, caves, aquifers, kimberlite pipes
- **Ore genesis:** 17 deposit types with host-rock rules (coal in sediment, diamonds in metamorphic)
- **Greedy mesher:** Face masks per axis/direction, quad merging, corner AO sampling
- **Packed vertices:** 4-byte i32 encoding (pos, code, normal, light/AO)
- **Streaming chunks:** 18×66×18 interior + 1-block halo, neighbor sync at mesh time
- **Water CA:** Time-sliced cellular automaton, 384 parallel slots
- **Binary relay:** 35-byte position frames, server reflects (never simulates)
- **Procedural audio:** All synthesis at runtime
- **Performance:** ~2.0 ms/chunk average (gen + mesh + render setup)

**Repository:** [ai-coding-workspace](https://github.com/doishy-doish/ai-coding-workspace) ← you are here

---

## Cross-Cutting Patterns

Across all five projects:

1. **Measured, not guessed** — Every optimization includes its measured impact
2. **Deterministic where it matters** — Procedural generation frozen by version gates
3. **Local-first** — All data lives client-side unless sync is explicit
4. **Bounded state** — No unbounded growth of storage or frame time
5. **No magic numbers** — Constants computed from first principles or empirically
6. **Audit trails** — Every consequential action is logged and inspectable
7. **Graceful degradation** — Work offline, reconnect smoothly, never wedge
8. **Cache-aware design** — Prompts, storage, network shaped for prefix caches
9. **Production-grade error handling** — Circuit breakers, exponential backoff, soft failures
10. **Testability** — Core logic is pure; infrastructure is thin

---

## Technical Highlights

| Project | Language | Scale | Key Innovation |
| --- | --- | --- | --- |
| AI Character Chat | JS + ES modules | 22k + 75 modules | Multi-provider router with circuit breakers |
| NOVA | JS + web APIs | 7.6k | Immutable Loyalty Kernel + supervision |
| Arena Protocol | JS + three.js | 2.2k | Seeded co-op FPS, binary relay |
| Tax Flashcards | JS + FSRS-6 | 4.6k | Concept-based diagnosis + bounded storage |
| AETHER | WAT + JS | 63k | Hand-written WASM kernel, deterministic terrain |

---

## How to Explore

1. **Start with the live demos** — All systems are running at the Perchance links above
2. **Read the architecture notes** — Each project includes ARCHITECTURE.md in this repo
3. **Study the source excerpts** — Real code (unmodified except where marked [PORTFOLIO-REDACT])
4. **Check the patterns** — Each project demonstrates distinct design approaches

---

## About the Author

**Andrale Misquitta** — Full-stack engineer specializing in:

- Production AI systems (multi-provider routing, adaptive quality, local-first storage)
- Game engines & rendering (voxel terrain, netcode, procedural synthesis)
- Algorithm design (spaced repetition, prompt fitting, circuit breakers)
- WebAssembly & performance optimization
- Client-side architecture at scale

**GitHub:** [@doishy-doish](https://github.com/doishy-doish)  
**Repositories:**
- [nova-ai-assistant](https://github.com/doishy-doish/nova-ai-assistant)
- [ai-character-chat](https://github.com/doishy-doish/ai-character-chat)
- [ai-coding-workspace](https://github.com/doishy-doish/ai-coding-workspace) ← portfolio hub

---

## File Structure in This Repo

```
ai-coding-workspace/
├── README.md                         ← you are here
├── portfolio-excerpts-part1.md       Projects 1 (AI Character Chat) + 2 (NOVA)
├── portfolio-excerpts-part2.md       Projects 3–5 (Arena, Tax, AETHER)
└── docs/
    ├── PATTERNS.md                   Cross-cutting design patterns
    ├── MEASURED.md                   Performance & memory budgets
    └── PHILOSOPHY.md                 Why each decision was made
```

---

**Last Updated:** 2026-10-01  
**License:** MIT (for excerpts; live systems are proprietary Perchance generators)
