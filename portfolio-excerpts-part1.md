================================================================================
PORTFOLIO EXCERPTS — Andrale Misquitta
================================================================================
Selected architectural samples from five production projects, in one document.
Each project has its own segment: a README, an architecture note, and real
source excerpts (directory banners, markers, comments and elisions preserved
from the shipped files).

Conventions used throughout:
  * Every segment starts with a PROJECT banner, then FILE: banners in the same
    shape as the shipped source.
  * Code is quoted from the deployed generators; lines removed for length are
    marked with a  // …  elision comment or a  […]  marker, and long files are
    excerpted rather than reproduced whole.
  * Content that is not portfolio-appropriate is removed, not rewritten;
    where a line must stay but its payload is private it is marked
    [PORTFOLIO-REDACT]. Infrastructure logic is otherwise unmodified.
  * "LoC" figures are line counts of the shipped files as deployed.

Contents
  1. AI Character Chat ....... local-first AI roleplay app, multi-provider AI
                               routing, vector memory            (~22k + 75 modules)
  2. NOVA .................... client-side personal AI assistant with a
                               Loyalty Kernel + supervision layer (~7,600 lines)
  3. Arena Protocol ......... 3D FPS wave arena, vanilla JS + WebGL, binary
                               co-op relay                         (~2,162 lines)
  4. Indian Tax Flashcards ... FSRS-6 study engine + AI teacher layer
                                                                   (~4,600 lines)
  5. AETHER (Andrale Voxel) .. voxel world with a hand-written WASM kernel
                                                                   (~63,000 lines)

All live systems are linked separately. Platform: Perchance (perchance.org).


================================================================================
PROJECT 1 — AI Character Chat
================================================================================
Local-first AI roleplay chat: multi-character scenes, persistent memory and
vector lore retrieval, in-chat image generation, and a multi-provider AI router
that keeps background work off the reply path. Ships as an inlined monolith
(index.html, ~22k lines) plus extracted src/ modules; the wider reference build
carries ~75 modules. The excerpts below are the architectural samples from that
build.

========================================================================
FILE: README.md
========================================================================
```markdown
AI Character-Chat — Portfolio Excerpt
Selected architectural samples from a production AI character-chat web app
(local-first, multi-provider AI orchestration, ~100k+ lines across ~75 modules).
Full live system linked separately; these files show structure, patterns, and style.
All samples are family-safe: content-specific prompts and assets are excluded;
infrastructure logic is unmodified except where marked [PORTFOLIO-REDACT].
Contents: ai-lanes.js (lane router), prompt-fit.js (token-budget assembly),
lexical-index.js (local search index), job-server.js (remote AI job queue),
perf.js / hw-profile.js (adaptive performance), ui-bootstrap.js (boot + wiring),
share-links.pjs (gzip share links), ARCHITECTURE.md (system design).
```

========================================================================
FILE: ARCHITECTURE.md
========================================================================
```markdown
Layers
1. UI shell (HTML) + boot sequencer (ui-bootstrap.js): vendor bundle first, then
   infrastructure modules in dependency order, then the app core.
2. AI router (ai-lanes.js): providers register as lanes with priority, timeout, and
   circuit-breaker settings. Every submit passes a shared pacing gate; per-lane
   breakers route around outages, and provider block signals park a lane with a
   persisted, auto-expiring hold.
3. Per-call shaping (prompt-fit.js): prompts assembled to a token budget with
   prefix-cache-friendly ordering so repeated calls share cached prefixes.
4. Retrieval (lexical-index.js + embedding-backed memory): history indexed locally;
   each reply assembles summaries, memories, lore entries, and recent messages.
5. Offload (job-server.js): heavy or deferred work goes to a Python job server.
6. Adaptive performance (perf.js + hw-profile.js): device profiling drives quality
   knobs so low-end devices hold frame rate.
7. Persistence: IndexedDB (Dexie) as source of truth; export/import, backups,
   sync codes, compressed share links.
Patterns shown: circuit breakers, pacing gates, failover routing, budget-fit
prompt assembly, local-first storage, adaptive quality, eval harnesses.
```

========================================================================
FILE: ai-lanes.js
========================================================================
```javascript
// PORTFOLIO EXCERPT — redacted sample from a larger production codebase.
// Logic is unmodified except where marked [PORTFOLIO-REDACT].
// AI LANES — flexible multi-provider routing for OFF-PATH AI work (character labeling,
// realism inference, enrichment). Loaded as a classic <script> AFTER src/config.js (reads
// window.__aiKeys for the optional keyed lanes). Exposes window.__ai with:
//   call({instruction, maxTokens, purpose, prefer, cacheKey, cacheTtlMs}) -> {text, lane, ms}
//   enqueue(task)        — same options, run through the serial background queue (deduped)
//   status()             — per-lane health (keyed?, usable, ok/fail counts, cooldown)
//   hash(str), parseJson(text)
// Design: callers' deterministic/regex tiers answer first; they call __ai only for what's
// left, cache the result, and never block the reply path. Lanes are tried by ascending
// priority; a lane that fails twice inside 3 minutes gets a cooldown and is skipped.

// LANE REGISTRY — verified by live probes 2026-09-07 (v2). Truth per provider:
//   perchance: strongest keyless model; token-metered daily pool (shared with chat), no call cap.
//   pollinations: keyless mid model (openai-fast = GPT-OSS 20B), but the legacy anonymous text
//     API now 402s + serves a deprecation notice (migrate-to-enter.pollinations.ai — unreachable
//     from here as of today). Keep as opportunistic fast lane; self-spaces at 15 s/request.
//   horde: anonymous apikey "0000000000" IS accepted for text (202 -> ~10-30 s job -> done,
//     verified twice; serves koboldcpp 1B-11B workers, open-weight merges [PORTFOLIO-REDACT]). No account.
//   REJECTED after probing: api.airforce (401 Invalid API key — needs a real key; the "missing-key"
//     public tier is gone), DuckDuckGo duckchat (unreachable + needs proxy), llm7.io (keyed),
//     enter.pollinations.ai (unreachable), Puter (aligned commercial models only).
//   gemini + openrouter stay as OPTIONAL keyed lanes (empty key = lane disabled).
// Priority = no-prefer fallback order (quality first); callers may pass prefer (or an ARRAY of
// lane ids, tried in order) to route cheap/structured tasks away from perchance's token pool.
// LANE REGISTRY (cont. 124j, 2026-09-22). The KEYED lanes are BUILT from window.__aiProviderSpecs
// (src/ai-keys.js) - one owner for "endpoint + default model + free-tier signup + per-lane concurrency" -
// so adding a provider is one row there. A provider may hold SEVERAL keys: def.keys() returns the ready
// list and attemptLane rotates to the next key when one is rate-limited/unauthorised, so N keys behave
// like N lanes until all are cooling. Keyless structure lanes (perchance/pollinations/airforce/horde)
// are built from the same table too. This SUPERSEDES the old hand-written gemini/openrouter lanes.
function __buildSpecLanes() {
  const specs = window.__aiProviderSpecs || [];
  // cont. 130ak-fix-2c (AI-CAPACITY §13.4(b)): a provider marked `retired` cannot succeed (verified dead),
  // so it is never built as a lane - a lane that cannot succeed must never be attempted. It stays in the
  // spec table (visible in the key modal) and is one flag away from revival. Currently: api.airforce.
  return specs.filter(function(s) { return !s.retired; }).map(function(s) {
    const keyless = !!s.keyless;
    return {
      id: s.id, kind: s.kind, priority: s.pri, keyless: keyless,
      timeoutMs: s.kind === "gemini" ? 60000 : (s.id === "pollinations" ? 45000 : 90000),
      minIntervalMs: s.minIntervalMs || 0,
      // A spec may carry its own breaker settings (s.circuit) — e.g. a quota-limited free lane should never be
      // locked out for the global 10-minute cap after a couple of 429s. Falls back to the global defaults.
      circuit: s.circuit,
      key: keyless ? undefined : function() {
        return window.__aiKeyPool ? window.__aiKeyPool.preferred(s.id) : ((window.__aiKeys || {})[s.id] || "");
      },
      keys: function() {
        if(keyless) return [""];
        if(window.__aiKeyPool) return window.__aiKeyPool.ready(s.id);
        const k = (window.__aiKeys || {})[s.id];
        return k ? [k] : [];
      },
      base: s.base,
      model: function() { return window.__aiKeyPool ? window.__aiKeyPool.modelFor(s.id) : s.model; },
      auth: s.auth !== undefined ? s.auth : "bearer",
      noKeyedGroup: !!s.noKeyedGroup,
      spec: s,
    };
  });
}
window.__aiLanes = [
  // PERCHANCE EDIT (cont. perchance-call-timeout, creator-approved 2026-09-25 — "send small tasks into the hf portal …
  // we can do calls there and then bring them here"). The HF Space's CPU-ONLY `/jobs` queue as a LANE: the page hands
  // the ask over (`src/job-server.js`), the SPACE performs the provider call from ITS OWN IP, and the page collects the
  // text. Three things that buys:
  //   * it spends NOTHING of the perchance pool the reply streams through (the pool whose rate-limits/timeouts this
  //     whole module is built to work around);
  //   * it spends NO ZeroGPU minutes — only `@spaces.GPU` functions cost those, and `/jobs` is pure CPU;
  //   * pollinations answers from the Space's IP, a DIFFERENT rate-limit bucket than this browser's (its limiter is
  //     per-IP: "1 requests already queued (max: 1)").
  // It sits FIRST in this array as well as first by priority, because `__ai.route()` (bulk) hands out work in ARRAY
  // order — a lane placed last would simply never be given a job. It never touches the reply path (that streams
  // through `root.aiTextPlugin` directly) — this is off-path work only.
  { id: "hfjob", kind: "hfjob", priority: 1, timeoutMs: 120000, maxWaitMs: 90000, pollMs: 1500,
    circuit: {threshold: 3, baseMs: 5000, capMs: 90000},
    spec: {conc: 6, free: true, keyless: true, label: "HF Space job queue (the call is made server-side)"} },
  ...__buildSpecLanes(),
  // PERCHANCE EDIT (cont. 130ak-fix-2, creator-approved — item 44(a) / RESEARCH §CK lever E3): the perchance lane's
  // concurrency was 6. The server QUEUES beyond its thread count and every extra in-flight request adds pressure that
  // trips the limiter (AI-CAPACITY.md §11.3(5): "1-2 with spacing is strictly better than 6 in parallel here"), and a
  // 429 is far more expensive than a little less parallelism - one refused job costs its whole retry tail (~45-100 s of
  // an occupied slot) plus it extends the shared pause. So: 6 -> 2. Output-neutral (nothing the model sees changes);
  // runtime kill switch `window.__perchanceLaneConc = 6` (see laneConcurrency below).
  // PERCHANCE EDIT (cont. 130ak-fix-2b, creator-approved — item 53 / RESEARCH §CK lever E3(c), CJ-7a): the lane
  // timeout IS a slot lease (frontier Law 3: slot-seconds are the scarce resource). It was 150 s, and the adaptive
  // layer never raises it at this lane's speeds (T3: 9 recorded successes topped out at 58.6 s; `want` = 81.6 s
  // sits below the 150 s floor, so the enforced lease was a FLAT 150 s). A 100 s ceiling returns ~50 s of every
  // held slot and cuts a hung request's occupancy by 33%, while cutting 0 of 9 recorded successes. Output-neutral
  // (only how long a stuck call may occupy a slot changes). Runtime kill switch: `window.__perchanceLaneTimeout`.
  { id: "perchance", kind: "perchance", priority: 2, timeoutMs: 100000, spec: {conc: 2, free: true, keyless: true, label: "Perchance text pool"} },
  // PERCHANCE EDIT (cont. 130ak-fix, creator-approved — item 49): Horde gets its OWN breaker settings. It is a
  // FREE, unlimited, shared grid - the thing the breaker exists to protect (a scarce, paid lane that must not be
  // hammered) does not apply, so a long lockout only throws away free capacity. Previously the global settings
  // tripped after 2 strikes and doubled the hold to 512 s (8.5 min) by strike 8, during which the whole realism
  // pass was pushed onto the perchance lane. Now: 4 strikes, backoff capped at 60 s.
  { id: "horde", kind: "horde", priority: 4, timeoutMs: 20000, maxWaitMs: 240000,
    circuit: {threshold: 4, baseMs: 3000, capMs: 60000},
    key: () => (window.__aiKeys && window.__aiKeys.horde) || "0000000000",
    base: "https://aihorde.net/api/v2", model: "",
    spec: {conc: 12, free: true, label: "AI-Horde (anonymous unless a key is set)"} },
];

(function() {
  // Shared horde submission gate: the anonymous apikey allows ~2 submits per rolling
  // second (429 "2 per 1 second"). EVERY horde submit (lane AND fanOut) waits here, so
  // batch/idle work never trips the cap even while the reply pipeline is submitting too.
  let hordeSubmits = []; // recent submit timestamps
  async function hordeSubmitGate() {
    while(true) {
      let now = Date.now();
      hordeSubmits = hordeSubmits.filter(t => now - t < 1900);
      if(hordeSubmits.length < 2) break;
      await new Promise(r => setTimeout(r, 350));
    }
    hordeSubmits.push(Date.now());
  }
  // HORDE CONTEXT SIZING (cont. 61, T3). Realism/card prompts run 2.1-2.8k tokens, but the client
  // never sent `max_context_length`, so horde applied its 2048 default and SILENTLY DROPPED THE HEAD
  // of every longer prompt (verified: a marker word at the top of a 2777-token prompt was absent from
  // the reply at default ctx, present with max_context_length:4096). Approximate the needed window
  // (~4 chars/token), add the requested output, bucket UP to the live worker context histogram
  // (2048/4096/8192/16384), and never go below horde's own 2048 default. Callers may still override
  // by passing params.max_context_length explicitly.
  function ctxForHorde(instruction, maxLength) {
    let promptTok = Math.ceil(String(instruction || "").length / 4);
    let need = promptTok + Math.max(96, maxLength || 300) + 128;
    let ctx = 2048;
    while(ctx < need && ctx < 16384) ctx *= 2;
    return ctx;
  }
  // ── CHAT-PROTECT PACING (cont. 130r) ────────────────────────────────────────────────────────────
  // The reply streams through `root.aiTextPlugin` DIRECTLY - it never comes through this router - so
  // every off-path call that reaches the PERCHANCE lane is drawing on the very same token pool the
  // conversation is streaming through, and that pool serialises once ~2 requests are in flight. The
  // app's own idiom for this is to wait out `window.botIsCurrentlyReplying` before starting background
  // work, but the LANE ROUTER had no such yield, so a scheduled warm / label / bond read could land on
  // the pool in the middle of a reply and push the next token behind it.
  //
  // This gate makes an off-path PERCHANCE call wait for the reply to finish before it submits (bounded:
  // a reply cannot hold off-path work forever). It changes only WHEN off-path work runs - never what it
  // produces - and only delays the perchance lane; horde, keyed providers, pollinations etc. are never
  // held. Switch it off with `window.__perchChatProtect.enabled = false`. Counters: .stats
  window.__perchChatProtect = window.__perchChatProtect || {enabled: true, maxWaitMs: 120000, pollMs: 400,
    stats: {waits: 0, waitedMs: 0, capped: 0, lastWaitMs: 0, lastAt: 0}};
  window.__perchAwaitSlot = async function(label) {
    let cfg = window.__perchChatProtect;
    if(!cfg || !cfg.enabled) return true;
    if(!window.botIsCurrentlyReplying) return true;
    let t0 = Date.now();
    let cap = cfg.maxWaitMs || 120000;
    while(window.botIsCurrentlyReplying && (Date.now() - t0) < cap) {
      await new Promise(r => setTimeout(r, cfg.pollMs || 400));
    }
    let waited = Date.now() - t0;
    let st = cfg.stats = cfg.stats || {};
    st.waits = (st.waits || 0) + 1; st.waitedMs = (st.waitedMs || 0) + waited;
    st.lastWaitMs = waited; st.lastAt = Date.now();
    if(window.botIsCurrentlyReplying) {
      // The cap elapsed and the reply is STILL streaming. Proceed anyway (never wedge off-path work),
      // but say so loudly: a reply that then stalls would point here.
      st.capped = (st.capped || 0) + 1;
      console.warn("[chat-protect] " + (label || "off-path") + " waited " + (waited / 1000).toFixed(1) + "s and the reply is still streaming - proceeding (cap reached)");
    } else if(waited > 1500) {
      console.debug("[chat-protect] " + (label || "off-path") + " stayed off the perchance pool for " + (waited / 1000).toFixed(1) + "s while the reply streamed");
    }
    return !window.botIsCurrentlyReplying;
  };

  // ── SUPERSEDED-WORK CANCELLATION (cont. 130ak-fix-2b, creator-approved — item 53 / RESEARCH §CK lever E3(b)) ──
  // The frontier "δ" bound (FairInference 2609.18112 / Bouncer 2312.15123): background work ALREADY IN FLIGHT must
  // not keep the scarce perchance pool busy while the reply the user is waiting on needs it. `__perchChatProtect`
  // above stops background work from *starting* during a reply; this closes the other half — a background call that
  // started while the tab was idle and is still generating when the user hits send. The verified `.stop()`
  // primitive (AI-CAPACITY.md §11.5a) aborts the server-side request and frees the slot in ~a frame. A stop is a
  // DEFERRAL, not a failure: the realism pass re-derives the piece from the saved sheet on its next run, so nothing
  // is lost. Opt-in per call via `window.__perchTrack(handle)`; kill switch `window.__perchStopOnReply.enabled=false`.
  // Counters: `window.__perchStopOnReply` ({enabled, stopped, replyStarts, lastAt}).
  window.__perchStopOnReply = window.__perchStopOnReply || {enabled: true, stopped: 0, replyStarts: 0, lastAt: 0};
  let __perchBgInflight = new Set();
  window.__perchTrack = function(handle, meta) {
    if(!window.__perchStopOnReply.enabled || !handle || typeof handle.stop !== "function") return null;
    let entry = {handle: handle, at: Date.now(), meta: meta || null, stopped: false};
    __perchBgInflight.add(entry);
    return entry;
  };
  window.__perchUntrack = function(entry) { if(entry) __perchBgInflight.delete(entry); };
  window.__perchInflightCount = function() { return __perchBgInflight.size; };
  window.__perchStopSuperseded = function(reason) {
    if(!window.__perchStopOnReply.enabled) return 0;
    let n = 0;
    for(let entry of __perchBgInflight) {
      if(entry.stopped) continue;
      entry.stopped = true;
      try { entry.handle.stop(); n++; } catch(e) {}
    }
    if(n) { window.__perchStopOnReply.stopped += n; window.__perchStopOnReply.lastAt = Date.now(); }
    if(n) console.debug("[perch-stop] stopped " + n + " superseded background call(s)" + (reason ? " (" + reason + ")" : ""));
    return n;
  };
  // Watch the reply flag and cancel in-flight background work the moment a reply begins. The app writes
  // `botIsCurrentlyReplying` through several paths (including a direct closure assignment that bypasses the window
  // setter), so a cheap poll is more robust than hooking any single setter.
  (function() {
    let was = false;
    setInterval(function() {
      let now = !!window.botIsCurrentlyReplying;
      if(now && !was) { window.__perchStopOnReply.replyStarts++; try { window.__perchStopSuperseded("reply-start"); } catch(e) {} }
      was = now;
    }, 300);
  })();

  let health = {}; // id -> {ok, fail, trips, state, openUntil, probe, lastMs, lastTryAt}
  let memCache = new Map(); // cacheKey -> {text, lane, at}
  const CACHE_STORE = "aiLanesCacheV1"; // persistent memoization (survives reloads)
  const CACHE_MAX = 150, CACHE_MAX_TEXT = 4000, CACHE_MEM_MAX = 300;
  try {
    let saved = JSON.parse(localStorage.getItem(CACHE_STORE) || "[]");
    if(Array.isArray(saved)) for(let e of saved)
      if(e && e.k && typeof e.text === "string" && e.lane && typeof e.at === "number")
        memCache.set(e.k, {text: e.text, lane: e.lane, at: e.at});
  } catch(e) {}
  let persistTimer = null;
  function persistCache() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        let arr = [...memCache.entries()]
          .filter(([, v]) => v.text.length <= CACHE_MAX_TEXT)
          .sort((a, b) => (a[1].at || 0) - (b[1].at || 0)).slice(-CACHE_MAX)
          .map(([k, v]) => ({k, text: v.text, lane: v.lane, at: v.at}));
        localStorage.setItem(CACHE_STORE, JSON.stringify(arr));
      } catch(e) {}
    }, 600);
  }
  let inFlight = new Map(); // cacheKey -> promise (dedupe identical concurrent calls)
  let inflightCount = 0;
  const MAX_CONCURRENT = 2;

  // Circuit breaker per lane (the Release It / resilience4j pattern): CLOSED -> OPEN -> HALF-OPEN.
  // Replaces the old fixed 120 s cooldown, which never grew with repeated failures and had no jitter
  // (so lanes that failed together all stamped back at once). Now: open after `threshold` consecutive
  // failures; hold for an exponentially growing, JITTERED cooldown (±25%); let ONE probe through when
  // it elapses; a successful probe closes the circuit, a failed probe re-opens with a longer hold.
  // Tunable live via window.__aiCircuit (used by the test harness with tiny timings).
  window.__aiCircuit = window.__aiCircuit || {threshold: 2, baseMs: 4000, capMs: 600000, jitter: 0.25};
  function circuitCfg() { return window.__aiCircuit || {threshold: 2, baseMs: 4000, capMs: 600000, jitter: 0.25}; }
  // Adaptive per-lane timeouts (hedged-request-lite): instead of a fixed timeout, a lane that is routinely
  // slow gets its timeout raised toward its own observed finish times, so a healthy-but-slow lane stops
  // being killed by a limit tuned for the fast case. Only SUCCESS durations feed the stats (a timeout
  // failure lasts ~= the timeout itself and would ratchet the limit up forever), and the limit can fall
  // back to the fixed base as newer, faster samples age the window. Tunable live via window.__aiAdaptive.
  window.__aiAdaptive = window.__aiAdaptive || {enabled: true, minSamples: 4, window: 8, factor: 1.35, padMs: 2500, capFactor: 2.5};
  function adaptiveCfg() { return window.__aiAdaptive || {enabled: true, minSamples: 4, window: 8, factor: 1.35, padMs: 2500, capFactor: 2.5}; }
  // PER-LANE BACKOFF OVERRIDE (cont. 130ak-fix, creator-approved — item 49): a lane may cap its own backoff via
  // def.circuit. The free anonymous Horde lane has nothing to protect and unlimited supply, so the global
  // 10-minute ceiling is pure loss there: after 8 strikes it locked Horde out for ~8.5 minutes, and every job it
  // could not take was pushed onto the scarce perchance lane (measured: ZERO Horde requests in 90 s while its
  // breaker sat open, with the perchance lane paused 17 minutes). See window.__aiLanes' horde entry.
  function backoffMs(trips, def) {
    let c = circuitCfg();
    let o = (def && def.circuit) || {};
    let baseMs = (o.baseMs != null) ? o.baseMs : c.baseMs;
    let capMs = (o.capMs != null) ? o.capMs : c.capMs;
    let raw = Math.min(capMs, baseMs * Math.pow(2, Math.max(0, trips - 1)));
    let j = 1 + (Math.random() * 2 - 1) * c.jitter;
    return Math.max(1, Math.round(raw * j));
  }
  // The number of consecutive strikes a lane trips its breaker at (its own override, else the global one).
  function tripThreshold(def) {
    let o = (def && def.circuit) || {};
    return (o.threshold != null) ? o.threshold : circuitCfg().threshold;
  }
  var BLOCK_KEY = "laneBlockV1";
  var BLOCK_RE = /429|too[_ -]?many|rate.?limit|quota|daily|forbidden|blocked|abuse|suspend|over[_ -]?limit|exceed|402|paywall|payment|premium|upgrade|subscri|billing|require[_ -]?(a[_ -]?|an[_ -]?|paid[_ -]?|pro[_ -]?)?key|need[_ -]?(a[_ -]?)?key/i;
  var BLOCK_NOT = /kudos|upfront|afford/i;
  var BLOCK_BASE_MS = 30 * 60 * 1000;
  var BLOCK_CAP_MS = 6 * 60 * 60 * 1000;
  var blockMem = {};
  function blockOff() {
    try { if(window.__laneBlockOff === true) return true; } catch(e) {}
    try { return window.__sc ? window.__sc("laneBlockPersist", true) === false : false; } catch(e) { return false; }
  }
  function blockDb() { try { return (window.db && window.db.misc) ? window.db.misc : null; } catch(e) { return null; } }
  function blockSave() {
    try {
      let t = blockDb();
      if(!t) return;
      Promise.resolve(t.put({key: BLOCK_KEY, value: {lanes: blockMem, at: Date.now()}})).catch(function(){});
    } catch(e) {}
  }
  function blockHydrate() {
    let t = blockDb();
    if(!t) { setTimeout(blockHydrate, 2000); return; }
    Promise.resolve(t.get(BLOCK_KEY)).then(function(row) {
      try {
        let v = row && (row.value !== undefined ? row.value : row);
        let lanes = v && v.lanes ? v.lanes : {};
        let now = Date.now(), changed = false;
        for(let id in lanes) {
          if(lanes[id] && lanes[id].until > now) blockMem[id] = lanes[id];
          else changed = true;
        }
        if(changed) blockSave();
      } catch(e) {}
    }).catch(function(){ setTimeout(blockHydrate, 5000); });
  }
  try { blockHydrate(); } catch(e) {}
  function blockErrText(e) {
    try {
      let parts = [e && e.message, e && e.status, e && e.error, e && e.reason];
      if(e && e.status != null) parts.push("http " + e.status);
      return parts.map(function(x) { return String(x == null ? "" : x); }).join(" ");
    } catch(err) { return ""; }
  }
  function blockActive(id) {
    if(blockOff()) return false;
    let b = blockMem[id];
    if(!b) return false;
    if(Date.now() >= b.until) { delete blockMem[id]; blockSave(); return false; }
    return true;
  }
  function blockRemember(id, reason) {
    if(blockOff() || !id) return;
    let now = Date.now();
    let prev = blockMem[id] || {streak: 0};
    let streak = (prev.until > now ? (prev.streak || 0) : 0) + 1;
    let span = Math.min(BLOCK_CAP_MS, BLOCK_BASE_MS * Math.pow(2, Math.max(0, streak - 1)));
    span = Math.round(span * (0.8 + Math.random() * 0.4));
    blockMem[id] = {until: now + span, reason: String(reason || "").slice(0, 140), streak: streak, at: now};
    blockSave();
    try { console.warn("[pc] lane " + id + " parked " + Math.round(span / 60000) + "m (provider block signal: " + String(reason || "").slice(0, 80) + ")"); } catch(e) {}
  }
  function blockClear(id) {
    if(!id || !blockMem[id]) return;
    delete blockMem[id];
    blockSave();
  }
  function blockMs(id) {
    let b = blockMem[id];
    return b ? Math.max(0, b.until - Date.now()) : 0;
  }
  function laneState(def) {
    if(!health[def.id]) health[def.id] = {ok:0, fail:0, trips:0, state:"closed", openUntil:0, probe:false, lastMs:0, lastTryAt:0, lat:[], ewmaMs:0};
    return health[def.id];
  }
  function laneKeyed(def) { return !!def.key && !!def.key(); }
  function laneAvailable(def) { // non-mutating read for status()
    if(def.key && !def.key()) return false;
    if(blockActive(def.id)) return false;
    let h = laneState(def);
    return h.state !== "open" || Date.now() >= h.openUntil;
  }
  function laneUsable(def) { // routing read: a lane whose cooldown elapsed becomes HALF-OPEN (one probe)
    if(def.key && !def.key()) return false;
    if(blockActive(def.id)) return false;
    let h = laneState(def);
    if(h.state === "open") {
      if(Date.now() < h.openUntil) return false;
      h.state = "half-open"; h.probe = true;
    }
    return true;
  }
  function record(def, ok, ms, opts) {
    let h = laneState(def);
    h.lastMs = ms;
    // PERCHANCE EDIT (cont. 130ak-fix, creator-approved — item 49): a "soft" failure means the LANE answered fine
    // but the answer was a dud - e.g. a single anonymous Horde worker returning an empty generation. That is a
    // per-WORKER hiccup, not a lane outage, so it must score no strike. Letting it did trip the breaker and lock
    // the whole free lane out for minutes because a couple of small workers produced nothing.
    if(!ok && opts && opts.soft) return;
    if(ok) {
      h.ok++; h.fail = 0; h.trips = 0; h.state = "closed"; h.openUntil = 0; h.probe = false;
      blockClear(def.id);
      let a = adaptiveCfg();
      if(ms > 0) { // only successful durations shape the adaptive limit
        h.lat = (h.lat || []); h.lat.push(ms);
        if(h.lat.length > a.window) h.lat.splice(0, h.lat.length - a.window);
        h.ewmaMs = h.ewmaMs ? Math.round(h.ewmaMs * 0.7 + ms * 0.3) : ms;
      }
      return;
    }
    h.fail++; h.trips++;
    if(h.state === "half-open") { // failed probe -> re-open immediately (no need to burn more failures)
      h.state = "open"; h.openUntil = Date.now() + backoffMs(h.trips, def); h.probe = false;
    } else if(h.fail >= tripThreshold(def)) {
      h.state = "open"; h.openUntil = Date.now() + backoffMs(h.trips, def); h.probe = false;
    }
  }
  // the timeout a lane is actually raced against: its fixed base, raised toward its recent p95 (with margin)
  // once there are enough successful samples, capped at capFactor x base. Never below the fixed base.
  function effectiveTimeout(def) {
    let a = adaptiveCfg();
    let base = def.timeoutMs;
    // E3(c) runtime kill switch: set `window.__perchanceLaneTimeout = 150000` to restore the old 150 s lease.
    if(def.id === "perchance") { let o = Number(window.__perchanceLaneTimeout); if(o > 0) base = o; }
    if(!a.enabled) return base;
    let h = laneState(def);
    let lat = h.lat || [];
    if(lat.length < a.minSamples) return base;
    let sorted = lat.slice().sort((x, y) => x - y);
    let idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(0.95 * sorted.length) - 1));
    // p95 of the rolling window (for a small window this is the recent worst case). Windowed, NOT an unbounded
    // EWMA: a single slow sample raises the limit immediately but ages out of the window, so the limit recovers
    // to the fixed base once the lane is fast again (an EWMA would keep it elevated for many samples).
    let estimate = sorted[idx];
    let want = Math.round(estimate * a.factor + a.padMs);
    let cap = Math.round(base * a.capFactor);
    return Math.max(base, Math.min(cap, want));
  }

  // ── HF JOB-QUEUE LANE ELIGIBILITY (cont. perchance-call-timeout) ────────────────────────────────────────────
  // The Space's queue serves `pollinations`/`horde` generically, so it is only a drop-in for asks whose output does
  // not depend on WHICH model answers. A caller that PINNED models (via `taskType` → pickModels, or explicitly) is
  // therefore left alone, and a big ask is left alone too (the Space's pollinations lane is single-concurrency, so a
  // big ask would only queue there while holding a router slot). `o.hfJob === true` overrides both. Both knobs are
  // live-tunable: `aiHfJobLane` (kill switch) and `aiHfJobAskTokens` (the size ceiling).
  function hfJobOk(o) {
    try {
      if(!window.__sc || window.__sc("aiHfJobLane", true) === false) return false;
      if(o && o.hfJob === false) return false;
      if(o && o.hfJob === true) return true;
      if(!window.__jobServer || typeof window.__jobServer.submit !== "function" || !window.__jobServer.available()) return false;
      if(o && o.image) return false;
      if(o && o.models && o.models.length) return false;   // pinned models: the queue cannot honour them
      let cap = (window.__sc ? Number(window.__sc("aiHfJobAskTokens", 700)) : 700) || 0;
      if(!cap) return false;
      return ((o && o.maxTokens || 300) <= cap);
    } catch(e) { return false; }
  }
  function laneFitsCall(def, o) { return def.id !== "hfjob" || hfJobOk(o); }

  // ── MEASURED OUTPUT CEILINGS (cont. 130ak-route) ────────────────────────────────────────────────────
  // How many output tokens a lane can actually DELIVER. This exists so the direct-route shim
  // (src/ai-throttle.js) can *know before it calls* whether a lane is big enough for an ask — a lane that
  // cannot finish a long ask either truncates it (a silent loss, R13) or burns a whole attempt for nothing.
  // Each number is MEASURED with its date, because providers move their limits:
  //   horde        — 512. Measured 2026-09-18 with this account's own key (25 kudos): `max_length: 512`
  //                  → HTTP 202 (accepted); `max_length: 700` and `1024` → HTTP 403 KudosUpfront, "This
  //                  request requires 20 kudos to fulfil". The worker map advertises far more (one live
  //                  worker reports 262,144), but the ACCOUNT wall is what a caller actually hits, so 512
  //                  is the honest ceiling. (Override live: `window.__aiHordeMaxOut`.)
  //   hfjob        — the `aiHfJobAskTokens` knob (700 default). The ask is performed by our Space, so this is
  //                  our own ceiling; the Space already refuses >512-token jobs on horde (`LANE_HORDE_MAX`) and
  //                  waits for its pollinations lane instead, which is why it may exceed horde's 512.
  //   pollinations — 1,200. Keyless, 1-concurrent, 15 s spacing, 45 s lease; measured 2026-09-18 it answers
  //                  HTTP 429 "Queue full for IP ... 1 requests already queued" whenever the app already has one out.
  //   hfspace      — 512, the Space's own `/v1/chat/completions` default (`max_tokens or 512`). Bigger values are
  //                  accepted by the endpoint but UNMEASURED here, and a long generation on that lane spends the
  //                  Space's ZeroGPU budget, so it is deliberately under-promised: it is not offered long asks.
  //   perchance    — effectively unbounded: the plugin takes NO max_tokens at all (its inputs are instruction/
  //                  startWith/stopSequences/...), so the server decides the length and no client bound can cut it.
  //   keyed        — 4,096, the usual ceiling of the free OpenAI-compatible tiers this app's specs target.
  function hordeOutputCeiling() {
    try { let n = Number(window.__aiHordeMaxOut); return isFinite(n) && n > 0 ? n : 512; } catch (e) { return 512; }
  }
  function laneMaxOut(def) {
    try {
      if(!def) return 0;
      if(def.id === "hfjob") { let c = window.__sc ? Number(window.__sc("aiHfJobAskTokens", 700)) : 700; return isFinite(c) ? c : 700; }
      if(def.id === "horde") return hordeOutputCeiling();
      if(def.id === "hfspace") return 512;
      if(def.id === "pollinations") return 1200;
      if(def.kind === "perchance") return 100000;
      return 4096;
    } catch (e) { return 4096; }
  }
  // The largest output ANY OFF-POOL lane could deliver right now. "Off-pool" excludes the shared perchance
  // lane deliberately: that is the lane the direct-route shim exists to keep clear, so counting it as capacity
  // would make the shim answer "yes, something can carry this" — and route a long ask straight back at the pool.
  // `maxOut: 0` means "no off-pool lane is usable at all" (the shim must read that as "unknown", never as "nothing fits").
  function offPoolCapacity() {
    let best = 0, who = null, perLane = {}, ceilings = [];
    try {
      for(let l of (window.__aiLanes || [])) {
        if(!l || l.kind === "perchance") continue;
        let cap = laneMaxOut(l), usable = laneUsable(l);
        perLane[l.id] = {maxOut: cap, usable: usable};
        if(usable) { ceilings.push(cap); if(cap > best) { best = cap; who = l.id; } }
      }
    } catch (e) {}
    // `coveredMaxOut` = the largest ceiling that MORE THAN ONE usable lane can deliver. It exists because a bound only
    // a single lane can serve is a thin bet: measured 2026-09-18, the one lane above the 700 mark (pollinations) was
    // answering 429 "Queue full for IP" whenever the app already had a request out, while the lanes at 700/512
    // (the HF job queue, horde) were answering. So an UNBOUNDED ask — whose bound the shim is guessing anyway — is
    // trimmed to this number rather than to a guess that only the flakiest lane could carry.
    // (Sorted descending, the SECOND-largest ceiling is by definition one that at least two lanes can deliver.)
    ceilings.sort(function(a, b) { return b - a; });
    let coveredMaxOut = ceilings.length >= 2 ? ceilings[1] : 0;
    return {maxOut: best, coveredMaxOut: coveredMaxOut, lane: who, perLane: perLane};
  }

  function orderedLanes(prefer, o) {
    let usable = window.__aiLanes.filter(l => laneUsable(l) && laneFitsCall(l, o)).sort((a, b) => a.priority - b.priority);
    if(prefer) {
      let ids = Array.isArray(prefer) ? prefer : [prefer];
      let wanted = [], seen = new Set();
      for(const id of ids) {
        // "keyed" is a PSEUDO-LANE: "use whichever free provider keys are configured, best first".
        // It is how a caller says "spend the spare provider keys before the shared perchance pool
        // (which chat also needs) or the anonymous horde queue (145k jobs deep)".
        if(id === "keyed") {
          // `noKeyedGroup` opts a lane OUT of this pool: a lane that is the only usable keyed one (our own
          // GPU Space, before cont. 130ak-kiss-lock) would otherwise win every `prefer:["keyed",…]` call —
          // which is how an 8B model ended up labelling scene reads.
          for(const l of usable) if(laneKeyed(l) && !l.noKeyedGroup && !seen.has(l.id)) { wanted.push(l); seen.add(l.id); }
          continue;
        }
        let l = usable.find(x => x.id === id);
        if(l && !seen.has(l.id)) { wanted.push(l); seen.add(l.id); }
      }
      if(wanted.length) return [...wanted, ...usable.filter(l => !seen.has(l.id))];
    }
    return usable;
  }

  function withTimeout(ms) {
    return new Promise((_, rej) => setTimeout(() => rej(new Error("lane timeout " + ms + "ms")), ms));
  }
  // Same race, but the timer is cleared when the work settles (with ~20 lanes now, leaked timers add up).
  function timeLimited(promise, ms) {
    let id;
    const timeout = new Promise((_, rej) => { id = setTimeout(() => rej(new Error("lane timeout " + ms + "ms")), ms); });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(id));
  }

  // ── HTTP completion lane (openai | gemini) with multi-key rotation + CORS-proxy fallback ───────
  //    The proxy fallback is for KEYLESS requests only — a request carrying an API key is never proxied.
  function httpErr(lane, res, body) {
    let e = new Error(lane + " http " + res.status + " " + String(body || "").slice(0, 140));
    e.status = res.status;
    return e;
  }
  async function raceFetch(url, opts, ms, def, hasSecret) {
    try { return await timeLimited(fetch(url, opts), ms); }
    catch(e) {
      const msg = String(e && e.message || e);
      const isNet = (e && e.name === "TypeError") || /failed to fetch|networkerror|load failed|cors/i.test(msg);
      if(isNet && !hasSecret && def.proxy !== false && typeof root !== "undefined" && root.superFetch) {
        // The provider's API has no CORS headers (most OpenAI-compatible APIs don't, since they expect
        // server-side use). Retry the identical request through the perchance fetch proxy - but NEVER a
        // request that carries an API key, because the key must not leave this browser.
        console.warn("ai lane " + def.id + ": direct fetch failed (" + msg.slice(0, 80) + "), retrying via the perchance CORS proxy");
        return await timeLimited(root.superFetch(url, opts), ms);
      }
      throw e;
    }
  }
  // Compact MD5 (hex) — only used to mint DeepAI's disposable "tryit" keys (see the deepai branch below).
  // Verified: keys minted with this exact function answer 200 with real content (probed live 2026-09-29).
  function __md5hex(s) {
    function l(x, y) { return (x << y) | (x >>> (32 - y)); }
    function m(a, b, c, d, x, s, t) { a = a + ((b & c) | (~b & d)) + x + t; return l(a, s) + b; }
    function n(a, b, c, d, x, s, t) { a = a + ((b & d) | (c & ~d)) + x + t; return l(a, s) + b; }
    function o(a, b, c, d, x, s, t) { a = a + (b ^ c ^ d) + x + t; return l(a, s) + b; }
    function p(a, b, c, d, x, s, t) { a = a + (c ^ (b | ~d)) + x + t; return l(a, s) + b; }
    let x = unescape(encodeURIComponent(s)).split("").map(c => c.charCodeAt(0));
    let bl = x.length * 8; x.push(128); while(x.length % 64 !== 56) x.push(0);
    for(let i = 0; i < 8; i++) x.push((bl >>> (i * 8)) & 255);
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for(let i = 0; i < x.length; i += 64) {
      let w = []; for(let j = 0; j < 16; j++) w[j] = x[i+j*4] | (x[i+j*4+1] << 8) | (x[i+j*4+2] << 16) | (x[i+j*4+3] << 24);
      let A = a, B = b, C = c, D = d;
      a=m(a,b,c,d,w[0],7,-680876936);d=m(d,a,b,c,w[1],12,-389564586);c=m(c,d,a,b,w[2],17,606105819);b=m(b,c,d,a,w[3],22,-1044525330);
      a=m(a,b,c,d,w[4],7,-176418897);d=m(d,a,b,c,w[5],12,1200080426);c=m(c,d,a,b,w[6],17,-1473231341);b=m(b,c,d,a,w[7],22,-45705983);
      a=m(a,b,c,d,w[8],7,1770035416);d=m(d,a,b,c,w[9],12,-1958414417);c=m(c,d,a,b,w[10],17,-42063);b=m(b,c,d,a,w[11],22,-1990404162);
      a=m(a,b,c,d,w[12],7,1804603682);d=m(d,a,b,c,w[13],12,-40341101);c=m(c,d,a,b,w[14],17,-1502002290);b=m(b,c,d,a,w[15],22,1236535329);
      a=n(a,b,c,d,w[1],5,-165796487);d=n(d,a,b,c,w[6],9,-1069501632);c=n(c,d,a,b,w[11],14,643717713);b=n(b,c,d,a,w[0],20,-373897302);
      a=n(a,b,c,d,w[5],5,-701558691);d=n(d,a,b,c,w[10],9,38016083);c=n(c,d,a,b,w[15],14,-660478335);b=n(b,c,d,a,w[4],20,-405537848);
      a=n(a,b,c,d,w[9],5,568446438);d=n(d,a,b,c,w[14],9,-1019803690);c=n(c,d,a,b,w[3],14,-187363961);b=n(b,c,d,a,w[8],20,1163531501);
      a=n(a,b,c,d,w[13],5,-1444681467);d=n(d,a,b,c,w[2],9,-51403784);c=o(c,d,a,b,w[7],14,1735328473);b=o(b,c,d,a,w[12],20,-1926607734);
      a=o(a,b,c,d,w[5],4,-378558);d=o(d,a,b,c,w[8],11,-2022574463);c=o(c,d,a,b,w[11],16,1839030562);b=o(b,c,d,a,w[14],23,-35309556);
      a=o(a,b,c,d,w[1],4,-1530992060);d=o(d,a,b,c,w[4],11,1272893353);c=o(c,d,a,b,w[7],16,-155497632);b=o(b,c,d,a,w[10],23,-1094730640);
      a=o(a,b,c,d,w[13],4,681279174);d=o(d,a,b,c,w[0],11,-358537222);c=o(c,d,a,b,w[3],16,-722521979);b=o(b,c,d,a,w[6],23,76029189);
      a=o(a,b,c,d,w[9],4,-640364487);d=o(d,a,b,c,w[12],11,-421815835);c=o(c,d,a,b,w[15],16,530742520);b=o(b,c,d,a,w[2],23,-995338651);
      a=p(a,b,c,d,w[0],6,-198630844);d=p(d,a,b,c,w[7],10,1126891415);c=p(c,d,a,b,w[14],15,-1416354905);b=p(b,c,d,a,w[5],21,-57434055);
      a=p(a,b,c,d,w[12],6,1700485571);d=p(d,a,b,c,w[3],10,-1894986606);c=p(c,d,a,b,w[10],15,-1051523);b=p(b,c,d,a,w[1],21,-2054922799);
      a=p(a,b,c,d,w[8],6,1873313351);d=p(d,a,b,c,w[15],10,-30611744);c=p(c,d,a,b,w[6],15,-1560198380);b=p(b,c,d,a,w[13],21,1309151649);
      a=p(a,b,c,d,w[4],6,-145523070);d=p(d,a,b,c,w[11],10,-1120210379);c=p(c,d,a,b,w[2],15,718787259);b=p(b,c,d,a,w[9],21,-343485551);
      a = (a + A) >>> 0; b = (b + B) >>> 0; c = (c + C) >>> 0; d = (d + D) >>> 0;
    }
    return [a, b, c, d].map(v => ("00000000" + (v >>> 0).toString(16)).slice(-8)).join("");
  }
  async function httpLane(def, o, key) {
    const model = (typeof def.model === "function") ? def.model() : def.model;
    const temp = (o.temperature !== undefined) ? o.temperature : 0.7;
    if(def.kind === "deepai") {
      // DeepAI keyless (cont. ddg-brave-gemini): the "tryit" key is a pure client-side hash — no signup, no
      // round-trip, worthless after the call, so it rides the CORS proxy like any keyless lane (hasSecret=false).
      // Request/response shapes reverse-engineered from g4f's DeepAI provider and verified live 2026-09-29.
      const rev = h => String(h).split("").reverse().join("");
      const ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";
      const rnd = String(Math.round(Math.random() * 100000000000));
      const h1 = rev(__md5hex(ua + rnd + "hackers_become_a_little_stinkier_every_time_they_hack"));
      const h3 = rev(__md5hex(ua + rev(__md5hex(ua + h1))));
      const uuid = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
      const fd = new FormData();
      fd.append("chat_style", "chat");
      fd.append("chatHistory", JSON.stringify([{role: "user", content: o.instruction}]));
      fd.append("model", model || "standard");
      fd.append("session_uuid", uuid);
      fd.append("sensitivity_request_id", uuid);
      fd.append("hacker_is_stinky", "very_stinky");
      fd.append("enabled_tools", JSON.stringify(["image_generator", "image_editor"]));
      const res = await raceFetch(def.base, {method: "POST", headers: {"api-key": "tryit-" + rnd + "-" + h3}, body: fd}, effectiveTimeout(def), def, false);
      if(!res.ok) throw httpErr(def.id, res, await res.text().catch(() => ""));
      let t = await res.text();
      const cut = t.indexOf("\x1c");
      if(cut >= 0) t = t.slice(0, cut);
      if(!t.trim()) throw new Error("empty deepai completion");
      return {text: t};
    }
    if(def.kind === "gemini") {
      const url = String(def.base).replace("{model}", model) + (key ? "?key=" + encodeURIComponent(key) : "");
      const res = await raceFetch(url, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({
        contents: [{role: "user", parts: [{text: o.instruction}]}],
        generationConfig: {maxOutputTokens: o.maxTokens || 300, temperature: temp},
      })}, effectiveTimeout(def), def, !!key);
      if(!res.ok) throw httpErr(def.id, res, await res.text().catch(() => ""));
      let j = await res.json();
      let parts = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
      if(!parts || !parts.length) throw new Error("empty gemini completion");
      return {text: parts.map(p => p.text || "").join(""), finishReason: String(j && j.candidates && j.candidates[0] && j.candidates[0].finishReason || "")};
    }
    // OpenAI-compatible /chat/completions
    const headers = {"Content-Type": "application/json"};
    if(def.auth === "bearer" && key) headers["Authorization"] = "Bearer " + key;
    const res = await raceFetch(def.base, {method: "POST", headers, body: JSON.stringify({
      model: model,
      messages: [{role: "user", content: o.instruction}],
      max_tokens: o.maxTokens || 300,
      temperature: temp,
    })}, effectiveTimeout(def), def, !!(def.auth === "bearer" && key));
    if(!res.ok) throw httpErr(def.id, res, await res.text().catch(() => ""));
    let j = await res.json();
    let text = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if(!text) throw new Error("empty completion");
    return {text: String(text), finishReason: String(j && j.choices && j.choices[0] && j.choices[0].finish_reason || "")};
  }

  async function attemptLane(def, o) {
    let t0 = Date.now();
    laneState(def).lastTryAt = Date.now();
    try {
      let text = null;
      // The lane's own "I hit my output ceiling" signal, where the lane reports one. `undefined` = the lane
      // cannot tell us (see the truncation block at the return below).
      let truncSig;
      if(def.kind === "perchance") {
        if(typeof root === "undefined" || !root.aiTextPlugin) throw new Error("perchance plugin unavailable");
        // `__aiNoCount`: this call is already counted by __ai.call (as lane "perchance", with the job's
        // purpose); the direct-path counter in src/ai-throttle.js must not count it a second time.
        let res = await timeLimited(
          root.aiTextPlugin({instruction: o.instruction, max_tokens: o.maxTokens || 300, __aiNoCount: true}),
          effectiveTimeout(def)
        );
        text = String(res && res.text ? res.text : "");
        truncSig = res && res.stopReason;
      } else if(def.kind === "horde") {
        let headers = {"Content-Type": "application/json", apikey: def.key()};
        let body = {prompt: o.instruction, params: {max_length: Math.max(96, o.maxTokens || 300), temperature: o.temperature !== undefined ? o.temperature : 0.7}};
        if(o.params) for(let k in o.params) body.params[k] = o.params[k];
        body.params.max_context_length = body.params.max_context_length || ctxForHorde(o.instruction, body.params.max_length);
        let modelList = (o.models && o.models.length) ? o.models : (def.model ? [def.model] : null);
        if(modelList) body.models = modelList;
        if(o.trustedWorkers) body.trusted_workers = true;
        await hordeSubmitGate();
        let res = null, hordeRateTries = 0;
        while(true) {
          res = await timeLimited(
            fetch(def.base + "/generate/text/async", {method: "POST", headers, body: JSON.stringify(body)}),
            effectiveTimeout(def)
          );
          if(res.ok || res.status !== 429 || hordeRateTries >= 3) break;
          hordeRateTries++;
          await new Promise(r => setTimeout(r, 1200 + Math.random() * 700));
          await hordeSubmitGate();
        }
        if(!res.ok) throw new Error("http " + res.status + " " + (await res.text().catch(() => "")).slice(0, 100));
        let j = await res.json();
        if(!j || !j.id) throw new Error("horde no job id");
        let deadline = Date.now() + (def.maxWaitMs || 240000);
        let blankWorker = false; // the worker ANSWERED, but with nothing: a dud worker, not a lane outage
        while(Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 6000));
          let s = await fetch(def.base + "/generate/text/status/" + j.id).then(r => r.json()).catch(() => null);
          if(s && s.finished && s.generations && s.generations.length) { blankWorker = true; text = String(s.generations[0].text); truncSig = s.generations[0].finish_reason; break; }
          if(s && s.faulted) throw new Error("horde job faulted");
        }
        if(!text) { let e = new Error("horde empty result or wait timeout"); if(blankWorker) e.empty = true; throw e; }
      } else if(def.kind === "hfjob") {
        // HF JOB-QUEUE LANE (cont. perchance-call-timeout): the page SUBMITS the ask and the SPACE performs the call.
        // Nothing here touches the perchance pool, and `/jobs` costs no ZeroGPU minutes. The key is unique per call
        // (not content-addressed) so a key that failed once server-side can never poison later asks.
        if(!window.__jobServer || typeof window.__jobServer.submit !== "function") throw new Error("job server client missing");
        if(!window.__jobServer.available()) throw new Error("job server unavailable (no HF token in the key pool)");
        let hfKey = "lane|" + Date.now().toString(36) + "|" + Math.random().toString(36).slice(2, 8);
        let hfLanes = (o.hfLanes && o.hfLanes.length) ? o.hfLanes : ["pollinations", "horde"];
        let job = (o.hfJobData && o.hfJobData.url)
          ? Object.assign({key: hfKey}, o.hfJobData)                                  // proxy job: the Space makes the exact call
          : {key: hfKey, instruction: o.instruction, maxTokens: o.maxTokens || 300, temperature: o.temperature, lanes: hfLanes};
        await timeLimited(window.__jobServer.submit([job], {}), 25000);
        let deadline = Date.now() + (def.maxWaitMs || 90000);
        while(true) {
          let st = await timeLimited(window.__jobServer.status([hfKey]), 20000).catch(() => null);
          let hit = st && Array.isArray(st.results) ? st.results.find(r => r && r.key === hfKey) : null;
          if(hit) {
            if(hit.status === "done" && hit.text) { text = String(hit.text); break; }
            let e = new Error("hfjob " + String(hit.error || hit.status || "failed").slice(0, 120));
            if(/tim(e|ed)[ _-]?out|busy|429|queue full|too many|rate.?limit|empty/i.test(String(hit.error || ""))) e.empty = true;
            throw e;
          }
          if(Date.now() >= deadline) throw new Error("hfjob wait timeout");
          await new Promise(r => setTimeout(r, def.pollMs || 1500));
        }
      } else {
        // Keyed/keyless HTTP lane. Walk the ready keys: a 429/401/402/403/5xx cools that one key and we
        // move to the next, so several keys on one provider act as several lanes. A 400/404/422 is a
        // provider/model problem, not a key problem - it fails the lane immediately and never burns keys.
        let keys = def.keyless ? [""] : ((typeof def.keys === "function") ? def.keys() : [def.key()]);
        if(!def.keyless && !keys.length) throw new Error("no usable key");
        let lastErr = null;
        for(let ki = 0; ki < keys.length; ki++) {
          try {
            let hr = await httpLane(def, o, keys[ki]);
            text = hr && hr.text; truncSig = hr && hr.finishReason; lastErr = null; break;
          }
          catch(e) {
            lastErr = e;
            const st = e && e.status;
            if(def.keyless || st === 400 || st === 404 || st === 422) throw e;
            try { window.__aiKeyPool && window.__aiKeyPool.report(def.id, keys[ki], false, st); } catch(_) {}
            if(ki + 1 < keys.length) console.warn("ai lane " + def.id + ": key " + (ki + 1) + "/" + keys.length + " failed (" + String(e && e.message || e).slice(0, 70) + "), rotating");
          }
        }
        if(lastErr) throw lastErr;
      }
      if(!text) throw new Error("no text from lane");
      // TEMPLATE-NON-ANSWER FALLBACK [PORTFOLIO-REDACT — comment neutralized]: some providers
      // answer with a templated non-answer ("I can't help with that…") that spent the call but
      // delivered no content. Treating that text as content would poison downstream parses;
      // instead decline it like an empty result (soft: no breaker trip) so the router tries
      // the next lane in the SAME call. Patterns match templated openers only.
      let __refHead = String(text).slice(0, 600);
      if(/as an ai\b|content (policy|guidelines|moderation)|against my (programming|guidelines|policy|safety)|i (can['’]t|cannot|am unable|won['’]t|will not) help with (that|this|these|those)|i (do not|don['’]t) (create|generate|write|provide|produce)/i.test(__refHead)) {
        let __de = new Error("lane returned a templated non-answer") // [PORTFOLIO-REDACT — string neutralized];
        __de.empty = true;
        throw __de;
      }
      record(def, true, Date.now() - t0);
      // TRUNCATION SIGNAL ...
      let truncated = (truncSig === undefined || truncSig === null || truncSig === "") ? undefined
        : /length|max|token|truncat/i.test(String(truncSig));
      let out = {text: text.trim(), lane: def.id, ms: Date.now() - t0};
      if(truncated !== undefined) out.truncated = truncated;
      return out;
    } catch(e) {
      record(def, false, Date.now() - t0, {soft: !!(e && e.empty)});
      try {
        let bt = blockErrText(e);
        let hordeRateBlip = def.id === "horde" && /429|2 per 1 second/i.test(bt) && !/403|demand|fault|faulted|5\d\d/i.test(bt);
        if(BLOCK_RE.test(bt) && !BLOCK_NOT.test(bt) && !hordeRateBlip) blockRemember(def.id, bt);
      } catch(err) {}
      throw e;
    }
  }
