# 10 — Implementation Log

Local implementation of the CyfroSec 3D City, 2026-10-11. **Nothing is committed, pushed, merged or deployed.** Work is on a local branch `redesign/3d-city` created from `complete-redesign` @ `6f7df0e` (no commits on it); the original homepage scene is untouched and remains the default.

## Where things are

| Path | What |
|---|---|
| `app/components/landing/sections/cyfro-city/registry/` | The ONE authoritative registry: `types.ts`, `chunks.ts` (19 platforms + districts + shared mystery copy), `flows.ts` (connections with evidence refs), `story.ts` (illustrative walkthrough + guided workflows), `grid.ts` (grid ↔ world, ports, street routing), `validate.ts`, `index.ts`. Data files have type-only imports so `node --test` loads them directly. |
| `cyfro-city/chunks/` | One builder per visual: `cyfroAiEngine.ts` (preserved Engine), `customer.ts`, `control.ts`, `operations.ts`, `edge.ts`, `index.ts` (builder map) |
| `cyfro-city/kit/` | `parts.ts` (cached geometry kit), `machines.ts` (deck, rack, desk, monitor, cabinet, approval barrier, beacon — original forms), `materials.ts` (original palette + city surfaces) |
| `cyfro-city/screens/cityScreens.ts` | Story-driven canvas screens for the new chunks (original screens are reused unchanged for agent, insights, assistant, code, compliance, topology, engine) |
| `cyfro-city/engine/` | `createCity.ts` (renderer, scene, plates/wall/gate, chunk placement, merging, routes/cables/packets, picking, labels, camera, intro, story, detail levels, adaptive DPR), `orbit.ts`, `EngineCheck.tsx` (preservation harness) |
| `cyfro-city/CityCinematic.tsx`, `CityScene.tsx`, `CityList.tsx`, `City.module.css` | Section shell (workflow buttons, panel, HUD, directory), lazy scene mount + DOM overlays, HTML list view / WebGL fallback |
| `app/prototype/city/page.tsx`, `app/prototype/city/engine-check/` | Unlinked, noindex review routes |
| `app/components/landing/sections/PlatformArchitectureDetail.tsx` | Build-time switch: `NEXT_PUBLIC_ARCH_SCENE=city` → city; otherwise the original scene (default) |
| `tests/city-registry.test.cjs`, `tests/city-layout.test.cjs` | Registry, story, approval, privacy and layout tests |
| `scripts/check-city-leaks.mjs` | Pre-release bundle scan against an out-of-repo deny-list |
| `docs/design/3d-city/validation/` | `baseline.json`, `performance.json`, `engine/` (preservation evidence), `screenshots/` |

## Phase log

| Phase | Status | Evidence / notes |
|---|---|---|
| 1 Baseline | Done | `validation/baseline.json` — 263 draw calls, 26k triangles, rAF CPU p50 2.2 ms (1×) / 5.7 ms (6×), one 63 ms construction task; Engine reference captures (scratchpad) |
| 2 Registry + foundation | Done | Registry + validator + 16 tests (plus layout tests); one renderer/one scene engine |
| 3 Camera + interaction | Done | Overview framing from plate corners, chunk focus (offset beside the panel), connection framing, 360° orbit, Ctrl/⌘-wheel + pinch + buttons + keys zoom, Esc/Overview return, keyboard orbit on the focusable stage, camera clip guard |
| 4 Full-city blockout | Done (folded into 6) | All 19 platforms placed from the registry on the 6 × 5 grid; density/framing reviewed on desktop, tablet, phone |
| 5 Verified flows + story | Done | 23 connections (22 drawn, F20 hidden) with evidence refs; illustrative story with two independent tracks; approval checkpoints pause and alternate approve/reject |
| 6 Detailed chunks | Done | Feature-specific machinery for all 13 features + 4 pads; Engine preserved (see `engine-preservation.md`) |
| 7 Mystery platforms | Done | Black deck, lit edges, floating "?", restrained idle; validator + bundle scan show no feature details ship |
| 8 Performance | Done | `validation/performance.json` — 380 draw calls / 52.8k triangles at overview, 131 when the Engine is focused, 60 fps; construction sliced (no long task at 1×) |
| 9 Accessibility + devices | Done in Chromium | Keyboard, reduced motion, WebGL fallback, light theme, 390 px / 768 px / 1440 px viewports verified in headless Chromium; real devices not tested |
| 10 Integration | Done (local) | Build-time switch verified both ways; default homepage ships and downloads no city code |

## Problems found and fixed during implementation

| Problem | Fix |
|---|---|
| `registry/layout.ts` under `app/` was treated by Next.js as a route **layout** | Renamed to `grid.ts` |
| Existing repo policy test rejected non-documentation IP addresses in sample screens | Sample data uses 192.0.2.0/24 |
| City labels overlapped / cascaded at overview | Priority placement (hovered → features → reserved → environment), one nudge up or down, otherwise wait; edge clamping on phones |
| Overview framed the empty corners of the bounding box | Framing fits each plate's own corners; portrait screens view the city lengthwise |
| **The approved Engine close-up was partly blocked by the Insights wall** | Insights wall turned to face west (toward Data Ingestion) |
| Shipped bundle exposed `lifecycle: "planned"` for reserved platforms (would also expose `in_development`) | Validator now requires reserved platforms to ship as `planned`; the real status lives with the out-of-repo mapping |
| City code was bundled into the default homepage chunk | City is a lazily loaded chunk; verified 0 homepage chunks contain it |
| "Intro already seen" was read before hydration (intro could replay) | Engine reads the flag when it is created (lazily, after hydration) |
| Construction blocked the main thread (155 ms task at 4× CPU) | Construction sliced into ≤12 ms tasks + `compileAsync`; 68 ms at 4×, none at 1× |
| `PCFSoftShadowMap` is removed in three 0.186 (falls back with a console warning per frame — the original scene does the same) | City requests `PCFShadowMap` directly (identical result, no warning spam) |

## Deviations from the Phase 0 plan

- **Districts:** a separate *Code security* district was added (the brief asked to distinguish code security clearly); CyfroCode keeps grid (2, 2).
- **Insights wall orientation** (above), so the Engine's approved camera angle works in the city.
- **Copy lives in the registry** (English) rather than `src/i18n/locales/en.ts`; moving it into i18n is a follow-up (the site has one locale today).
- **Playwright/axe were not installed** (open question Q-T3); browser verification used the existing `agent-browser` CLI with recorded results.

## Not done / remaining

See `09-open-questions.md` and the final report: real-device testing, Safari/Firefox, screen-reader testing with a real AT, i18n of city copy, removal of prototype/engine-check routes before a release, owner decisions on branch, naming and the reserved-platform mapping.

## Layout correction & label cleanup (2026-10-11, second pass)

**Root cause of the empty platform.** Grid cell (1, 2) — world (−9, 6), left of CyfroCode and below CyfroAgent — was never assigned a chunk (Phase 0 called it "open ground / future slot"), but `createCity.ts` drew the customer ground plate and wall as the **bounding rectangle** of the customer chunks (`rectOf`), so the plate covered 2 × 3 cells for 5 chunks and exposed one bare cell. Not a failed model, not a reserved feature: an unused cell made visible by a layout configuration choice.

**Original code-hosting placement.** `git-hosting` was at (2, 3) — a detached external pad south of CyfroCode, below the front edge of the CyfroSec platform, joined by a narrow bridge — so from the default camera it read as cut off from the city.

**Changes**

| Item | Before | After |
|---|---|---|
| `git-hosting` grid | (2, 3), world (−3, 12), port `n` | **(1, 2)**, world (−9, 6), port `e` (offset 0.25) — directly west of CyfroCode, on its own neutral pad outside both the customer wall and the CyfroSec platform |
| `cyfro-code` repository/PR port | `git` on the south side | `git` on the **west** side (offset 0.25); repo shelf, approval barrier and outbound lane re-arranged to face it |
| Customer plate + wall | bounding rectangle (2 × 3 cells) | **L-shaped outline of the 5 real cells** (`cellOutline` / `insetPolygon` in `registry/grid.ts`, extruded plate); wall follows it, the single gate is unchanged |
| City bounds | 6 × 5 (z −1…3) | **6 × 4** (z −1…2), no empty cells (enforced by a new layout test) |
| F16 / F17 (clone / approved PR) | 3.4-unit route around the platform edge | one straight 0.6-unit link across the street; direction, kind and approval gate unchanged |
| F23b (agent runs Asset Discovery) | agent `s` → Asset Discovery `e` | agent `w` → Asset Discovery `n` (keeps the cable on the customer plate after the L-shape) |
| Bridges | north/south pads only | generic for any side (the code-hosting bridge is east–west) |

All other chunk coordinates are unchanged (CyfroAI Engine stays at (3, 0)). The verified flow graph is unchanged apart from port names; the boundary rules (only CyfroAgent crosses the customer wall; external flows touch external pads; CyfroCode never touches the agent) are still enforced by `validate.ts`.

**Labels**
- Compact pills (11.5 px, lighter border); long names use a `short` display name in the overview (Data Ingestion, Fingerprinting, Reporting, AI provider, Code hosting, Your infra). Full names stay in the panel, the tooltip, the directory and the label's `title`.
- **Camera-aware anchoring:** feature/reserved labels sit on the deck edge that faces the camera (so they stay in front of their platform from any rotation, not over machinery); environment pads are labelled above their own centre (so the AI-provider label no longer lands on the CyfroAI Engine's reactor).
- Collision handling unchanged in spirit (priority: hovered → features → reserved → environment; one nudge up/down, otherwise wait), now with centre-anchored boxes.
- **Focus mode:** other platforms' labels stay visible but secondary (dimmed); the focused platform's machine labels and the panel carry the full name and description.
- **Mobile:** labels start **off** with a visible "Labels" toggle (the city stays visible; tapping a platform or the directory names it); when on, they are compact and clamped inside the viewport; in focus, secondary labels hide.

**Verification:** 35/35 tests (3 new: no empty cells inside district plates, code hosting adjacent to CyfroCode and outside the wall with a single short link, outline maths); tsc clean; lint 0 errors; build OK; leak check 0 matches in city files; Engine harness numbers identical to the previous run (100 % on front/wide/still cases; close-up residuals are the same old non-Engine packets); overview still 380 draw calls / 60 fps. Before/after screenshots: `validation/layout-2026-10-11/`.

**Remaining visual issues:** the code-hosting label floats above its pad and can sit near the "Your infra" label from the default angle; some machines are still sparse (planned next pass); the AI-provider pad remains detached north of the Engine (unchanged, by design); real-device checks still outstanding.

## "Your team" detail pass (2026-10-11, third pass)

The `access-plaza` chunk (public label **Your team**, grid (5, 1), port `w`, no connections) is now a miniature security-operations & human-approval room, built in `chunks/team.ts` (the old builder was removed from `chunks/edge.ts`; the registry `builder` key is unchanged).

| Area | What it is | Why it is there (verified) |
|---|---|---|
| Sign-in gate + badge reader (west entrance) | arch with a breathing lintel light | users sign in; every action is permission-checked |
| Analyst desk | 3 monitors (centre = live "Triage · findings"), keyboards, desk phone, mini rack, status strip, 2 seated analysts | findings are reviewed — most need no approval |
| Wall dashboard (north) | live "Security review" screen: findings marked *Review* vs *Approval needed*, plus the approval queue | only protected actions need a person's approval |
| Approval console (centre-south) | live console screen + Pending / Approved / Rejected lamps for **CyfroAssistant** (top row) and **CyfroCode** (bottom row), approve/reject keys, reviewer figure, floor ring | mirrors the two verified checkpoints (`cyfro-assistant:approval`, `cyfro-code:approval`) through `ChunkSignal.approvals`, derived from the story — no new flow, nothing decided automatically |

People are low-poly figures (legs, torso, neck, head with a visor that shows gaze, arms on shoulder pivots); no skeletal animation. Animation only at detail level 1: analysts' heads look between monitors and occasionally at the wall; the standing analyst points at the dashboard; the reviewer watches the console, hovers while a request is pending and presses the key that matches the decision. A **rejected** request never shows as completed: the green lamp stays off, the approve key stays dim, the console reads "Rejected — the action did not run" / "draft discarded, nothing pushed".

Registry copy and hotspots for Your team were rewritten to match (sign-in, finding review, security dashboard, approval console). Supporting changes: `ChunkSignal.approvals` (chunks/types.ts, engine), three new illustrative screens in `screens/cityScreens.ts`, reserved-platform labels now sit beside their "?" (they previously landed on the Your-team dashboard from the default angle).

**Measurements** (headless Chromium, Apple M5, same probe as `validation/`): overview **380 → 399 draw calls** (budget 400; first draft was 421 — reduced with an instanced lamp bank, a shared merged glow material, static operator arms, no hands, no duplicate kiosk screen), triangles 54.2k → 59.6k, rAF CPU p50 2.5 → 3.5 ms (1×) / 5.1 ms (6×), 60 fps; Your team focused **118 → 138 draw calls**, 12.0k → 17.6k triangles, rAF CPU p50 2.7 → 3.3 ms (1×) / 3.9 ms (6×), 60 fps. **The 400-call overview budget is now essentially used up** — further detail passes need offsetting savings (e.g. instancing repeated parts in other chunks). Evidence: `validation/your-team-2026-10-11/`.

## Draw-call recovery + detail pass on six platforms (2026-10-11, fourth pass)

**Budget recovery first.** A new `kit/ledBank.ts` draws many indicator lights / markers as ONE instanced mesh (per-instance colour = brightness, per-instance scale/size for markers and bars). Per-LED materials (one draw call each) were replaced in Your infrastructure, CyfroAgent, Network Discovery, Asset Discovery, Service Fingerprinting, CyfroCode, CyfroAI Insights, CyfroCompliance, CyfroTopology and the AI-provider pad; the mystery rim bars now merge (material-only animation). Overview **399 → 338 draw calls** with no visual element removed. The CyfroAI Engine was not touched.

**Detail pass** (each element has a functional purpose, copy/hotspots updated to match):

| Platform | Added | Behaviour tied to the verified story |
|---|---|---|
| Your code hosting (external, neutral) | 2 repository servers, branch-and-commit sculpture, PR inbox with cards, clone dock | commits light toward the dock during the clone; a PR card appears **only** in the approved beat — never for a rejected draft (verified close-up) |
| External AI model provider (external, neutral) | 3 model-server racks with blade lights, cooling unit with fan, overhead cable trays, request desk with in/out trays | busy only while an AI request is in the story; in-tray then out-tray light |
| Reporting & Dashboard | bar-chart sculpture (instanced), KPI ring totem, export archive by report tab, printer output tray, mailbox for critical-event email | beacon flashes for the in-app "scan completed"; the mailbox is static (email is only for critical events, not shown as sent) |
| Network Discovery | probe range rings, scanner unit with status row, "services found" card rack | cards slide in as the scan progresses |
| CyfroAI Insights | board of up to 15 ranked risks, evidence cabinet | tiles light in rank order while insights are generated (order comes from the fixed ranking rules) |
| CyfroTopology | filter console (agent/subnet/risk-only/date), export station (PNG/JPG/JSON), floor projection lines | filters engage and an export tray lights when someone opens the map |

**Measurements** (headless Chromium, Apple M5): overview **352 draw calls** (was 399 before this pass; budget 400), 69.6k triangles (target ≤150k), rAF CPU p50 3.2 ms (1×) / 5.5 ms (6×), 60 fps. Engine harness numbers identical to every previous run. Evidence: `validation/detail-pass-2026-10-11/` (before/after per platform, state close-ups, Engine in-city).

## City-wide merge + detail pass on the remaining eight platforms (2026-10-11, fifth pass)

**City-wide static merge.** After each chunk merges its own static parts, a final build step merges static geometry **across the whole city** by material (never the CyfroAI Engine, never cables, never animated parts or screens). Overview **352 → 239 draw calls**; the trade-off is that static geometry is no longer frustum-culled per chunk (focused views draw more triangles: e.g. Your team focus 17.6k → 44.6k), which the GPU absorbs easily at 60 fps.

**Shared pieces:** `kit/people.ts` (the low-poly person and chair, moved from team.ts), shared `skin`/`visor` materials so every figure merges, and `ChunkSignal.beats` (ids of the active story beats) so a chunk can show which step it is in.

| Platform | Added | Tied to the verified story |
|---|---|---|
| Scan Control | due-scan queue in front of the tower, single-use registration-token dispenser, operator at Scan Setup | queue slots fill each (compressed) 30 s scheduler tick and flash when a scan is due |
| Data Ingestion & Correlation | duplicate chute at the intake, ranking-rule plaque, encrypted-storage vault; records and snapshot blocks moved to an LED bank | duplicate light flickers while uploads arrive; snapshot blocks appear as correlation completes |
| CyfroCompliance | framework colour tabs, passing / partial / failing scorecards per framework, a check runner travelling over the folders | the runner sweeps and scorecards settle while the evaluation runs (illustrative outcomes) |
| CyfroAssistant | rack of read tools (findings/reports, topology, compliance, insights, code), document library, the person asking | the **topology** cartridge lights during the "ask" beat — the read tool the story uses (F14a) |
| CyfroAgent | three scan modules (network discovery, asset discovery, fingerprinting), heartbeat light on the uplink | the module for the running scan lights (beats i-network / i-assets / i-fingerprint); heartbeat cadence illustrative |
| Asset Discovery | relationship links between device markers, DHCP / L2-neighbour listener | listener blinks during the sweep |
| Service Fingerprinting | container-image rack, read-only lock on the host drives | (static: shows what can be read and that the mount is read-only) |
| Your infrastructure | core switch, firewall, laptop | switch ports blink, faster while being probed |

**Measurements** (headless Chromium, Apple M5): overview **244 draw calls**, 76.8k triangles, rAF CPU p50 3.0 ms (1×) / 4.5 ms (6×), 60 fps. Engine harness numbers identical to every previous run; Engine source untouched; tests 35/35, tsc clean, lint 0 errors, leak check clean for city files. Evidence: `validation/detail-pass-2-2026-10-11/`.

## Asset Discovery detail pass (2026-10-11, sixth pass)

The chunk now reads as one pipeline: **detect → identify → classify → add to inventory**. Footprint, grid cell (0,2), ports (n, e), flows and the label are unchanged. The old device table and relationship links were removed to make room.

| Area | What it is | What it shows |
|---|---|---|
| NW: radar unit | housing with vents and a status strip, turntable, mast, the rotating dish | **scan**: two pulse rings spread across the deck |
| Centre/east: subnet field | gridded floor plate with 10 device pucks (6 new, 4 already known) | **detect**: puck lights answer as the pulse passes, and the new device keeps glowing. A packet arcs from it to the intake |
| NW corner: neighbour listener | DHCP / L2-neighbour listener, cabled to the radar | blinks during the sweep |
| West: identify console | console with four step lights and a side screen (`assetSteps`), plus an ID arch over the intake pad | **identify**: a card appears on the intake pad while a read-line sweeps it. The screen shows Scanning → Identifying → Classifying → Inventory updated |
| Front: sorter | 5 m belt with moving marks, and a diverter carriage on a rail with a pusher paddle | **classify**: the card takes its type colour, rides the belt to its bin and is pushed in |
| Front edge: six inventory bins | server, workstation, router, printer, IoT/camera, virtual. Each has a device icon, a colour stripe and a card stack | **inventory**: the stack grows by one and the bin stripe flashes |
| NE: inventory board and catalog drawers | main screen (`assetInventory`) above six drawers | per-type counts, total, a "New asset detected" card (name, address, then its role), and a map with one square per asset, grouped by type. The drawer for the updated type flashes |

- **One loop drives everything.** `chunks/assetLoop.ts` defines a deterministic 6 s loop that the 3D chunk and both screens share, so they cannot drift. Device types cycle; counts are derived from the clock.
- **When the loop runs.** The full loop runs only when the chunk is focused or near (L1), or during the story's `i-assets` beat. At other times the chunk, and the screens under reduced motion or pause, show a fixed "just added" frame. Its counts are static, the dish turns slowly, and there are no pulses.
- **Accuracy.** Device roles are the ones CyfroTopology's classifier uses (no "container" role). Both the copy and the board say that **CyfroSec** assigns roles. The agent detects and records devices and how they relate. All names and addresses are illustrative documentation addresses (192.0.2.x).
- **Shared fix (all city screens).** The 30/s repaint throttle skipped every repaint while the clock was frozen. With **Pause motion** active, a theme switch therefore left screens in the old palette. Screens now always repaint when the signal is still or the theme changes.

**Measurements** (headless Chromium, Apple M5, same probe):

| View | Before | After |
|---|---|---|
| Overview draw calls | 247 | 249 |
| Overview triangles | 77.9k | 84.0k |
| Overview rAF CPU p50 | 3.7 ms | 2.5 ms |
| Asset Discovery focused, draw calls | 64 | 62 |
| Asset Discovery focused, triangles | 49.9k | 55.3k |
| Asset Discovery focused, rAF CPU p50 | 3.3 ms | 1.9 ms |

Both views run at 60 fps with 0 long tasks. All lights, the card, the read-line and the stacks are drawn by two instanced banks. The bins, icons, console and cabinet all merge statically.

**Checks.**
- Engine: the harness numbers are identical to every previous run, and `cyfroAiEngine.ts` has not been modified since 17:50.
- Code: tests pass 35/35, tsc is clean, and lint reports 0 errors.
- Build and leak check: the build succeeds, and the leak check finds 0 matches in city files.

**Evidence:** `validation/asset-discovery-2026-10-11/`:
- before/after: six angles each
- `stages/`: one shot per loop stage
- `compare/`: Network Discovery and Fingerprinting next to Asset Discovery, plus light theme and reduced motion
- engine harness results
- raw perf probe output

## Living city: animation & activity upgrade (2026-10-12, seventh pass)

Goal: every feature chunk visibly does its job, and data visibly moves between related chunks, in step with the verified workflow. The CyfroAI Engine is unchanged.

### Coordinator architecture (no new animation loops)

There is still one `requestAnimationFrame` loop, in `engine/createCity.ts`. Each frame runs these steps in order:

1. **Story** (`registry/story.ts`, pure and deterministic). It produces the beats, per-chunk phases (`idle / receiving / emitting / working / waiting_approval / approved / rejected`), the approval decisions and the carrier list.
2. **Transport manager** (`engine/transport.ts`, new). It places every carrier and dock light, and returns per-chunk `arrive / depart / hold` pulses.
3. **Chunks.** Each chunk's `update(t, signal)` receives `phase, progress, level, beats, approvals, arrive, depart, hold, low`.
4. **Screens.** Repainted at most 30 times a second when focused, about every 0.3 s in overview (1 s in low-power), and immediately when the theme changes or the scene is paused.

Each chunk shows its process in one of three ways (shared helper in `chunks/process.ts`):

| Mode | When | Behaviour |
|---|---|---|
| story | the walkthrough is running this chunk's step | the sequence follows the beat, so a carrier arriving makes the receiving machine react on the same frame |
| loop | the chunk is focused or near, and the story is elsewhere | a local rehearsal of the chunk's own process (8–10 s). Loops never show transport and never show an approval outcome |
| rest | overview, or reduced motion | a light idle state, or a fixed representative frame |

### City activity modes

| Mode | Behaviour |
|---|---|
| Overview | All chunks run their story-driven activity. Carriers grow with camera distance and carry a floating marker, so traffic reads from the whole-city view. The agent's heartbeats provide background traffic. |
| Focus | The focused chunk runs at full detail with its local loop. Other chunks keep their lighter story activity. |
| Guided (existing "Follow the workflow") | Steps through the verified beats with camera focus. Background traffic is switched off so only the step's own carriers move. |
| Low-power | Forced with `?cityLowPower`, chosen automatically on small 4-core devices, or switched on when frames stay slow at the lowest pixel ratio. Convoys shrink to their lead carrier; trails and markers are hidden; overview screens repaint every 1 s; overview chunks (never the Engine) animate at half rate. |
| Reduced motion | Unchanged: a still frame and no carriers. |

### Transport (Batch 1)

All carriers and docks are drawn by 5 instanced meshes in total (bodies, glowing cargo, trails, overview markers, docks). There is no per-carrier object or loop.

**Carrier life:**
1. It loads at the source dock: the dock lights and the source receives a `depart` pulse.
2. It travels the verified route, with a gentle start and stop.
3. It unloads at the destination dock, which raises an `arrive` pulse that the destination machine reacts to.

**Styles by flow kind:**
- data (blue)
- control and jobs (pale blue)
- events (green)
- AI (a glowing orb with no vehicle, because these are in-process library calls)
- approval (orange)
- external (grey body, white cargo)

There are light and dark palettes.

**Convoys** (`FlowRun.count`, at most 6):
- the 3-part upload (results are uploaded in chunks, as documented)
- 3 probes for each discovery sweep (2 for fingerprinting)
- the 3-part repository clone
- 2 report reads

**Held carriers at approval checkpoints:**
- `hold: 'wait'` at the CyfroAssistant action port and the CyfroCode git port: the carrier is loaded, pulses orange with a marker, and **never moves**.
- `hold: 'discard'` after a rejection: the carrier is withdrawn in place.

**Background traffic** (`AMBIENT`): only F01, the agent's own outbound connection carrying heartbeats, every 5 s at an illustrative cadence. The validator only allows background traffic on animated, ungated, internal flows that ride their own route.

### What each chunk now does

| Chunk | Sequence |
|---|---|
| Scan Control | a scan type is selected (3 keys) → the target strip lights → a job card goes to the queue → it moves to the dispatch tray by the agent port → it is collected by the carrier on the agent's own connection (i-assign). An approved CyfroAssistant action enters the queue from the east (green card). The beacon flashes when heartbeats arrive. |
| CyfroAgent | scan modules light per beat → evidence intakes (north: network and fingerprinting; west: assets) flash as results return → a packaging press packs one crate per scan → the three crates leave in step with the 3-carrier upload. |
| Network Discovery | sweep → hosts appear on a network-map table → links between them light → "results ready" light toward the agent. The ports board, services rack and screen follow the same progress. |
| Asset Discovery | (sixth pass) pulse → detect → identify → classify → inventory. The radar now also answers the agent's request. |
| Service Fingerprinting | gantry read → technology tiles light as packages are identified (the screen lists illustrative package names) → finding tags sorted into trays → results crate packed, then emptied as the carrier leaves. |
| Data Ingestion & Correlation | one record per arriving crate, in the same three colours as the crates → each record turns one uniform colour past the normaliser → it disappears into the correlator, which builds the snapshot → routing lamps light toward Insights, Compliance and the readers. "Ranked by fixed rules — no AI" stays on the screen. |
| CyfroAI Engine | **unchanged.** AI requests are visible as AI orbs and the dock lights at its ports. |
| CyfroAI Insights | the top-ranked risks are taken **in rank order** (deterministic; no AI) → an AI-request lamp lights while the request is out → "explained" marks appear risk by risk → an analyst reviews the wall. |
| CyfroTopology | nodes appear → relationships light → the graph slows and settles → one asset is selected and shows a detail card. The filters follow the same progress. |
| CyfroCompliance | evidence intake light → check runner, framework lamps and score dial → a summary sheet slides out. |
| CyfroCode | clone convoy lights the repository shelf → scanners run → findings pop out of each scanner → AI lamp lit while explaining and drafting → patch printed → validation lamp: blue while checking, green for "applies cleanly" (never a test suite) → waits at the barrier (held carrier) → approved: the PR leaves; rejected: shredder, nothing published. |
| CyfroAssistant | the question travels to the assistant → the read-tool cartridge lights (topology in the story) → a reasoning ring → the answer goes to the desk screen. A proposed changing action waits as an orange card at the barrier: approved, it is handed to the carrier; rejected, it greys out and is withdrawn. Its local loop shows only ask → read → answer. |
| Your team | seated analysts now have hands and type (transform-only, no extra draw calls); one turns to the approval console when a review request arrives; the triage screen shows "Review requested → approval console"; the reviewer reaches, presses the matching key and nods. Lamps never show a rejected request as approved. |
| Reporting & Dashboard | report sections on the archive shelf light as findings are organised → bar chart rebuilds → report printed → export ready. The bell flashes on the "scan completed" arrival. |
| Code hosting / AI provider | The PR card now appears when the carrier unloads, not when its step starts. The provider's in/out trays follow the real arrival and departure. |
| Mystery platforms | unchanged: black, never animated, and no flows. |

Other changes: `kit/ledBank.ts` items take a full rotation; animated arms in `kit/people.ts` get a hand; `ChunkSignal` gains `arrive / depart / hold / low`.

### Measurements

Headless Chromium on Apple M5, same probe, 6 s per view.

| View | Draw calls | Triangles | fps | frame p99 | rAF CPU p50 / p99 | Long tasks |
|---|---|---|---|---|---|---|
| Overview | 276 (249 before) | 90.6k | 60 | 16.8 ms | 2.2 / 6.4 ms | 0 |
| Overview, 6× CPU throttle | 247 | – | 60 | 16.8 ms | 5.4 / 15.7 ms | 0 |
| Focus: Data Ingestion | 156 | 73.1k | 60 | 16.8 ms | 2.0 / 5.2 ms | 0 |
| Focus: Data Ingestion, 6× | – | – | 60 | 16.8 ms | 5.2 / 17.3 ms | 0 |
| Focus: Asset Discovery | 71 | 60.1k | 60 | 16.8 ms | 1.5 / 5.4 ms | 0 |
| Focus: Your team | 156 | 67.4k | 60 | 16.8 ms | 1.6 / 4.9 ms | 0 |
| Focus: CyfroAI Engine | 148 | 78.0k | 60 | 16.8 ms | 1.7 / 4.4 ms | 0 |
| Focus: CyfroAgent | 91 | 61.4k | 60 | 16.8 ms | 1.7 / 4.1 ms | 0 |
| Mobile 390×844 (DPR 3) overview | 276 | 90.5k | 60 | 16.8 ms | 1.7 / 6.0 ms | 0 |
| Mobile, focus CyfroCode | 113 | 63.4k | 60 | 16.8 ms | 1.4 / 4.0 ms | 0 |
| Low-power overview / focus Agent | 277 / 91 | – | 60 | 16.8 ms | 2.2 / 4.7, 1.9 / 4.2 ms | 0 |

- **Draw-call variation.** Draw calls vary by a few between runs depending on the story moment. The 6× overview probe ran at a moment with fewer carriers than the unthrottled one. The low-power numbers were measured before trails and markers were hidden.
- **Throttled frames.** Under 6× CPU throttling, the worst 1% of frames take up to 17 ms of script time, right at the 16.7 ms budget. This is worth watching on real low-end phones.
- **Not measured.** GPU memory is not exposed in headless Chromium.
- **Heap.** The JS heap was 32–56 MB across runs.

### Checks

- **Engine:** the isolated harness gives the same numbers as every previous run (front, wide and still views 100%; close views 99.875–99.958%, with the residual pixels being the original scene's non-Engine packets). `cyfroAiEngine.ts` has not been modified since 2026-10-11 17:50, and the original scene's files (`platform-architecture-3d/`) are unchanged. In low-power mode the Engine is never moved to half-rate updates.
- **Tests:** 37/37. New tests:
  - held carriers wait only while a decision is pending
  - a withdrawn carrier only appears after a rejection
  - the PR carrier only travels after an approval
  - background traffic is restricted to safe flows
  - convoys stay in order
- **Code:** tsc is clean and lint reports 0 errors.
- **Build:** the static build succeeds.
- **Leak check:** 0 matches in city files.

**Evidence:** `validation/living-city-2026-10-12/`:
- before/after sheets of all 17 chunks plus the overview
- `states/`: per-batch sheets of the stages
- `recordings/`: 7 animated WebP files from deterministic frame captures (overview upload → correlate, Asset Discovery loop, agent collect → upload, CyfroCode approved, CyfroCode rejected, assistant approval, team review)
- raw perf probe output
- engine harness results

There is no screen-video tool on this machine (no ffmpeg), so the recordings are frame sequences at fixed clock steps.

## Calm city: activity rebalancing (2026-10-12, eighth pass)

Goal: less simultaneous motion and more meaningful activity. No geometry, layout, flow or Engine change. The owner's screen recording was not available to this session, so the baseline below is a browser capture of the previous build.

### Root causes found

1. **Two workflows ran in parallel all the time.** The infrastructure story (36 s) and the code story (24 s) were evaluated on one clock, so both ran together 83 % of the time.
2. **Traffic was never quiet.** Heartbeats every 5 s, plus convoys on probes and report reads, meant a carrier was moving 97.6 % of the time. Peaks reached 6 carriers on 5 routes, with 7 chunks working at once.
3. **Every chunk near the camera ran its full working loop forever.** "Near" (detail level 1) started the local loop, so in any close view 3–6 neighbouring chunks all performed at once, whether or not anything had triggered them.
4. **Constant idle motion everywhere:**
   - LED banks blinked every 0.7–2.3 s at a 55 % duty cycle.
   - The antenna, dish, holo table and fans swept continuously.
   - The queue cycled every 4 s.
   - Report bars wobbled.
   - Lights breathed and status lights swept.
5. **Screens repainted too often.** Every L1 chunk repainted at 30/s, overview screens every 0.3 s, and several screens animated on their own: a header scan bar on the team dashboard, triage selection every 1.6 s, and pulsing heartbeat dots.
6. **Pause snapped instead of freezing.** It stopped the clock but replaced everything with representative still frames and hid the carriers.

### Activity director (`registry/director.ts`, new)

One pure function of the clock, called once per frame. There are no per-chunk timers. Priorities:

| Priority | What runs | Rules |
|---|---|---|
| 1 · selected chunk | its own programme: its verified story steps (only carriers on routes that touch it) → one working pass (8–12 s; `LOOP_SECONDS`) → 3 s rest. Both approval outcomes alternate. Your team plays the decision steps of both checkpoints. | Other chunks stay idle, except the far end of a route that is currently delivering, which reacts on arrival. |
| 2 · guided step | the step plays once, holds its result for 2.5 s, then replays | Only the step's own carriers and chunks; a parallel beat at the same moment stays quiet. Steps still advance only when the visitor presses Next. |
| 3 · background demo (overview) | infrastructure workflow (36 s) → 8 s pause → code workflow (24 s) → 8 s pause (76 s cycle) | Never two workflows at once. Both approval and rejection still alternate between cycles. |
| 4 · ambient | during pauses: one heartbeat carrier on F01, plus each chunk's calm idle state | — |

Selection only plays a chunk's working sequence when the director schedules it (`ChunkSignal.loop`). Being near the camera no longer triggers anything. Convoys remain only for the chunked upload (3) and the repository clone (3). Probes and report reads are now single carriers.

### Calm idle and screens

**Idle machinery:**
- Status LEDs are steady, with a short flash every 2.6–6 s, never in sync (faster only while the machine is working).
- Agent heartbeat lamp: every 6 s.
- Idle sweeps slowed to 0.05–0.1 rad/s: antenna, dish, holo table, assistant ring, fans, scheduler hand.
- The ingestion drum spins up while correlating, then coasts. Paddles rest when idle.
- Queue, bars, breathing lights and beacons are static when idle.
- The Insights status sweep is 3× slower.

**Screens:**
- Only the selected chunk repaints live (≤30/s). Other chunks near the camera repaint every 0.5 s; the overview every 1 s (2 s in low-power).
- The team dashboard's scan bar only runs while a review is pending.
- The triage and findings highlights change every 6 s instead of 1.6–2.2 s.
- Registry heartbeat dots are steady.

**Engine:** it reads only the clock and reduced-motion, which the director never changes. It is also exempt from the repaint and half-rate rules, so its animation and screens update exactly as before.

### Pause and reduced motion

- **Pause now freezes everything in place:** carriers, machines and screens. Every visual state comes from the stopped clock, so nothing advances while paused. Verified in the browser: 0.0000 % of pixels changed over 1.5 s while paused, and the clock stayed at 16.45 s.
- **The Engine** keeps its original paused frame.
- **Reduced motion** is unchanged: representative still frames and no carriers.

### Results (headless Chromium, Apple M5)

**Traffic** (sampled every 0.05 s over two full cycles; the "after" figures are also enforced by `tests/city-director.test.cjs`):

| Measure | Before | After |
|---|---|---|
| Both workflows active at once | 83.3 % | **0 %** |
| Time with no moving carrier | 2.4 % | **32.3 %** |
| Average carriers | 2.51 | **0.85** |
| Peak carriers | 6 | **3** |
| Peak routes active at once | 5 | **3** |
| Peak chunks working | 7 | **4** |

**Real-time playback, 60 s of overview** (live clock, `activity()` sampled every second): peak 3 carriers, 3 routes, 1 workflow, 4 working chunks; 16 of 61 samples had no carrier.

**Motion score:** the percentage of screen pixels changing within 0.1 s, sampled across the cycle. It measures visual restlessness.

| View | Before (mean / p90) | After (mean / p90) | Quiet samples before → after |
|---|---|---|---|
| Overview | 0.155 / 0.263 % | **0.083 / 0.132 %** | 0 → **24 %** |
| Asset Discovery | 0.593 / 0.694 % | 0.453 / 0.635 % (selected; working pass) | 0 → 17 % |
| CyfroCode | 0.163 / 0.316 % | **0.086 / 0.213 %** (selected) | 0 → 50 % |
| Your team | 0.096 / 0.128 % | 0.142 / 0.255 % (selected: it now plays its approval programme) | 0 → 17 % |
| CyfroAI Engine | 0.724 / 1.192 % | 0.640 / 1.180 % (mostly the Engine's own, unchanged animation) | 0 → 0 % |

**Screen repaints:**
- Overview: about 17/s for the whole city (under 1/s per screen). The previous rule repainted every screen in view about 3 times a second, roughly 70/s; that figure is derived from the old code, because the old build no longer exists.
- Selected Asset Discovery: about 47/s, mostly its own two screens.

**Frame time** (6 s probes; draw calls unchanged because no geometry was removed):

| View | Draw calls | fps | rAF CPU p50 / p99 |
|---|---|---|---|
| Overview | 276 | 60 | 2.2 / 5.3 ms (was 2.2 / 6.4) |
| Overview, 6× CPU throttle | 275 | 60 | 5.6 / **9.0** ms (was 5.4 / 15.7) |
| Selected Asset Discovery | 68 | 60 | 2.2 / 4.1 ms |
| Selected CyfroCode | 148 | 60 | 3.6 / 6.2 ms |
| Selected Engine | 149 | 60 | 1.0 / 3.8 ms |

Frame p99 is 16.8 ms and there are 0 long tasks in every view.

### Scenario checks (actual browser playback / capture)

| Scenario | Result |
|---|---|
| A · overview ≥ 60 s | one workflow at a time, ≤ 3 routes, pauses with only a heartbeat |
| B · focus | selected Asset Discovery: its sweep step, then its full working pass, then the inventory result; neighbours idle. CyfroCode and Your team checked the same way. |
| C · guided | the assign, upload and fan-out steps show only their own carriers leaving, travelling and arriving, then hold the result |
| D · approval | waiting: orange lamp, barrier down, loaded carrier held. Rejected: grey lamp, draft shredded, nothing leaves. The PR travels only after an approval (tests cover every mode). |
| E · Engine | isolated harness identical to every previous run; `cyfroAiEngine.ts` unmodified since 2026-10-11 17:50; `platform-architecture-3d/` untouched |
| F · performance | see above |

**Tests:** 42/42. tsc and lint are clean, the build succeeds, and the leak check finds 0 matches in city files.

**Evidence:** `validation/calm-city-2026-10-12/`:
- `recordings/`: before overview, plus after overview, after pause, and selected Asset Discovery, Your team and CyfroCode (deterministic frame captures)
- `motion/`: per-sample motion scores, before and after
- guided-step sheet
- selected-chunk sheet
- perf probes before and after
- engine harness results

### Known trade-offs

- **Intro:** during its "Code security" shot the code chunks are now quiet, because the infrastructure workflow is the one running. The intro is a camera tour; the two workflows alternate afterwards.
- **Engine view:** the Engine's own motion dominates its close-up and was deliberately left as it is.

## Data packets instead of car-like carriers (2026-10-12, ninth pass)

A targeted visual correction in `engine/transport.ts` only. Routes, directions, triggers, the activity director, approvals, docks, screens, chunks and the Engine are unchanged.

| | Before (carrier) | After (packet) |
|---|---|---|
| Shape | rounded "vehicle" body 0.50 × 0.12 × 0.34 (white), cargo block 0.30 × 0.13 × 0.26 on top, total height ≈ 0.27 | one glowing block 0.24 × 0.06 × 0.14 (≈ 2× a cable's width), floating 0.075 above its cable |
| Glow | unlit cargo colour | unlit core in the #039be0 family, plus a soft translucent halo 0.32 × 0.10 × 0.20 (opacity 0.22 dark / 0.30 light) |
| Trail | 0.80 long, 0.12 wide | 0.24 long, 0.06 wide (no longer than the packet), opacity 0.35 / 0.50 |
| Growth with camera distance | up to 3.0× (overview: ≈ 1.5 long) | up to 2.2× (overview: ≈ 0.53 long) |
| Overview marker | spinning gem above every moving carrier | removed; only a packet held at an approval checkpoint keeps a small marker (0.08) |
| Colours | white body; blue / pale / green / white / orange / grey cargo | cyan-blue family per flow kind (data #1fb2f5, jobs/control #7fd8ff, events #45d0e6, AI #dff6ff and 0.8× size, external #bfe6f7); approval actions keep the orange of their cable; light-theme variants |
| Effects | — | slightly brighter while moving (×1.15), dimmer while loading/unloading (×0.85), a small halo flash on arrival (+25 % size, brighter) together with the existing dock flash |

The scale was chosen from rendered checks:
1. A 1.8× cap was barely legible in the default overview.
2. 2.2× reads as a small bright block next to the machinery without dominating it.
3. The close-up shows slim packets in place of the white car.

**Cost.** Still 5 instanced draws in total (cores, halos, trails, hold markers, docks). The lit body material was replaced by an unlit one. There are no new loops and no per-frame allocations.

**Measurements** (headless Chromium, Apple M5, 6 s probes): every view held 60 fps with 0 long tasks.

| View | Draw calls | rAF CPU p50 / p99 |
|---|---|---|
| Overview | 276 | 1.2 / 4.9 ms (was 2.2 / 5.3) |
| Overview, upload moment | 273 | 3.5 / 5.2 ms |
| Data Ingestion | 154 | 1.2 / 3.9 ms |
| Selected CyfroCode | 148 | 3.6 / 6.2 ms |

The first CyfroCode run read 8.2 ms p99; two re-runs gave 6.2 and 6.4 ms, matching the previous pass.

**Checks:**
- Tests: 42/42 (the director's limits — one workflow, ≤ 3 routes, approvals — are unchanged).
- tsc, lint and build: pass.
- Leak check: 0 matches in city files.
- Engine harness: identical to every previous run, and `cyfroAiEngine.ts` is unmodified.

**Evidence:** `validation/packets-2026-10-12/` (before/after overview, route close-up, CyfroAgent → Data Ingestion, Code hosting → CyfroCode, zoom crops, perf, engine).

**Note for reviewers.** Static-export chunk file names can stay the same between builds, so a browser that already has the page open may show the old carriers. Hard-reload or use a fresh session.

## Slower packets (2026-10-12, tenth pass)

Packets were too fast: a packet's speed is its route length divided by the time its story step allows.

- **Slower story clock.** The director now plays the story `PACE = 1.6×` slower than its registry timing (`registry/director.ts`). Departures, arrivals and the machines that react to them stay in sync. This applies in overview, focus and guided modes, and to the agent's heartbeat.
- **More time travelling.** In `engine/transport.ts`, loading and unloading take less of each window (LOAD 0.16 → 0.11, UNLOAD 0.14 → 0.10).
- **Result.** A route now takes about 1.8× as long to cross. The upload goes from about 1.3 s to about 2.4 s; a discovery request from about 0.5 s to about 0.9 s.
- **Pause length.** The overview pause between workflows went from 8 to 12 s, so the city still has packet-free time 31 % of the cycle. The overview cycle is now 120 s.
- **Limits unchanged:** one workflow at a time, at most 3 routes, at most 3 packets.
- **Unaffected:** a selected chunk's own working pass, the 3 s focus rest and the CyfroAI Engine (its own clock).

**Checks:**
- Tests: 42/42.
- tsc, lint and build: pass.
- Engine harness: identical.
- Live playback (40 s of overview): at most 3 packets on 3 routes, one workflow.
- **Owner follow-up (same day):** 1.6× felt slightly too slow. Set `PACE = 1.3` and the overview pause to 10 s, giving a 98 s cycle with packet-free time 31.7 % of it. A route now takes about 1.5× its original time (the upload about 2 s). Tests 42/42, tsc, lint and build pass.

## CyfroTopology detail pass (2026-10-12, eleventh pass)

Footprint, grid cell (4,0), ports, flows, label, the original topology monitor, the filter console and the export station are all kept.

**What CyfroTopology now shows:** records arrive → relationships are built → the graph appears → node details are inspected.

**Added:**

| Element | Purpose |
|---|---|
| Graph (`chunks/topologyGraph.ts`, shared with the screen) | 14 nodes instead of 6, in three tiers with varied sizes: agent-01 at the core, 4 subnets, 9 assets. 16 relationship links (agent–subnet, subnet–asset and 3 asset–asset), drawn as instanced lines that can grow, pulse and change colour. |
| Table | Edge rim, two holo guide rings, 24 rim lights, a reveal ring that rises through the hologram, and a pulsing orange selection ring. |
| Data-feed racks ×2 and relationship processor (south, by the input port) | Feed lights; three record blocks travel rack → processor → table; an 8-segment "relationships built" bar. |
| Node-details terminal (west) with operator; new screen `topoInspect` | Build stages (Records · Relationships · Graph · Inspect) with node and link counts, then the inspected asset: db-03, its subnet and agent, link count, linked chips, and the Insights risk overlay. |
| Insight overlay pedestal (east) | Risk and agent-coverage lamps. These overlays come from CyfroAI Insights (F13), as in the product copy. |
| Graph status lamps (north) | Records → Relationships → Graph ready. |

The decorative floor projection lines were removed and replaced by the feed conduit.

**Working sequence.** Shared timing `topoK`. The selected working pass is now 12 s (`LOOP_SECONDS`).

| Progress | What happens |
|---|---|
| 0–0.15 | Records leave the feed racks and enter the table; the rim light chases. |
| 0.12–0.45 | Nodes appear tier by tier (agent, then subnets, then assets) under the rising reveal ring. |
| 0.34–0.66 | Links draw in from their first node (tree first, then cross links); the processor bar fills. |
| 0.66–0.75 | The hologram slows from spinning to still: settled and inspectable. |
| 0.78 | db-03 is selected: it enlarges and pulses, its links pulse, its path to the agent turns orange, a detail card appears, the operator reaches for the terminal, and the screen switches to node details. |
| 0.86 | The Insights risk overlay lights 2 assets orange, and the pedestal lamps come on. |

Story steps run the same sequence: i-views (the map is opened) builds the graph, and i-ask (the assistant reads the topology) shows the inspected state.

**At rest** (overview, or not selected): the graph is complete, nothing is selected, the hologram drifts slowly, links are dim and the rim is steady.

**Distinct from the discovery chunks.**
- Topology has no scanning hardware, no sweep, no pulse rings, no belts or bins, and no port tables.
- It shows a layered graph with links that draw in, a highlighted path, inspection of a single node, and overlays.

**Performance** (Apple M5, headless Chromium, 6 s probes): every view held 60 fps with 0 long tasks.

| View | Draw calls | Triangles | rAF p99 |
|---|---|---|---|
| Overview | 276 → 277 | 90.4k → 97.1k | 5.8 → 4.8 ms |
| Topology selected | 157 → 158 | 77.5k → 84.6k | 5.4 → 5.3 ms |

The new static parts merge. Nodes, links, rim and all lamps are four instanced banks; the reveal and selection rings are 2 small meshes; plus the new screen.

**Checks:**
- Tests: 42/42.
- tsc, lint and build: pass.
- Leak check: clean.
- Engine harness: identical, and `cyfroAiEngine.ts` is unmodified.

**Evidence:** `validation/topology-2026-10-12/` (before/after from six angles, the six stages, a south-west view of the node-details screen, perf, engine).

## CyfroCompliance detail pass (2026-10-12, twelfth pass)

The chunk now shows **evidence intake → control evaluation → gap identification → results**. Footprint, grid cell (3,2), ports, flows, label, the four framework cabinets, the check runner, the original compliance monitor and the gauge concept are all kept.

**Product facts behind the visuals.** These were read in `cyfro-infra-2026`, as of the branch noted in 01-codebase-audit.

| Fact | Source |
|---|---|
| Frameworks GDPR, SOC 2, NIST CSF, CCPA/CPRA | `cyfro_share/compliance/mapping.py:108`, `customer_summary.py`, `seed_catalog.py` |
| Evaluation runs after correlation (feature `compliance.frameworks`, per entitled framework) or on manual refresh | backend `services/compliance/scheduler.py:46`; `routes/compliance.py` `POST /{framework}/refresh` |
| Evidence is the correlated snapshot: ports, assets, fingerprints, correlated assets/services/vulnerabilities, relationships, agent test runs | `services/compliance/evaluation.py:47-62` |
| Statuses: passing, partial, failing, not_applicable, `not_evaluable` (no mapped check, or evidence collection incomplete) | `evaluation.py:90-195` |
| Controls requiring attestation, or manual-only, are counted separately and not scan-scored | `evaluation.py:265-312` |
| `overall_score` = mean over scored technical controls (passing 100, partial 50, failing 0) | `evaluation.py:204-215, 357-362` |
| Evaluation reports are stored and listed per framework (in-app only, no export) | `GET /{framework}/reports`; 02-feature-inventory |
| AI is used only to extract and map control catalogs (`ai_catalog.py`), never to decide a control | — |

**New 3D details:**
- **Framework board.** 48 control tiles (3 groups × 4 controls per framework), one "evidence available" strip per group, and per-framework scorecards (passing / partial / failing). All are lamps in one instanced bank.
- **Evidence path.** A north intake (the F05 job arrives here), a tube down the west edge, and an evidence station: intake hopper, rotating sorter arm, and 4 evidence bins (assets, services & ports, vulnerabilities, agent test runs) with fill and read lamps.
- **Audit workstation** with an operator, and a new screen `complianceAudit` showing:
  - evidence received
  - controls evaluated (n / 12)
  - score (technical controls)
  - run state
  - passing / partial / failing counts
  - "missing evidence · not evaluable"
  - "needs review · attestation"
  - the note "Deterministic checks — no AI decides a control"
- **Gauge.** Red / amber / green bands and 6 tick marks.
- **Output tray.** An evaluation report card comes out when a run completes.

**Working sequence** (`chunks/complianceEval.ts`, shared with the screen). It runs only when the director schedules it: the story's fan-out → i-compliance steps, or the selected chunk's 14 s working pass. There is no separate loop.

| Progress | What happens |
|---|---|
| 0–0.12 | The job packet unloads at the north intake; the intake lamp lights. |
| 0.10–0.32 | Four evidence records travel down the tube, and the sorter turns each into its bin. The evidence strips light: evidence is available, but **every control tile is still pending**. |
| 0.32–0.76 | The runner sweeps framework by framework. Each tile turns to its outcome only once evaluated (illustrative mix: mostly passing, some partial, a failing control, a not-evaluable control with a grey "missing evidence" strip, and needs-review controls in lavender that keep pulsing). Each framework's scorecard updates after its column. The bins' read lamps pulse while checks run. |
| 0.76–0.86 | The gauge, having dropped while evaluating, settles on the score computed with the product formula (SOC 2 sample: 85). |
| 0.86–1 | Results on the audit screen; the operator looks at it; the report slides into the output tray. |
| After | Calm: the last results stay visible and nothing moves. |

Reduced motion shows that completed state as a still frame. Pause freezes everything in place (browser check: 0.0000 % of pixels changed over 1.5 s while paused; motion resumed afterwards).

**Not shown, because the product does not do it:** certification, guaranteed compliance, frameworks beyond the four, AI-decided controls, automatic remediation, and report export.

**Performance** (Apple M5, headless Chromium, 6 s probes): 60 fps and 0 long tasks in every view.

| View | Draw calls | Triangles | rAF p99 |
|---|---|---|---|
| Overview | 277 → 284 | 97.1k → 102.0k | 5.1 → 5.9 ms |
| Compliance selected | 160 → 167 | 74.2k → 79.0k | 5.5 → 5.2–5.3 ms (one earlier run read 9.6 ms; re-runs did not reproduce it) |

The extra draw calls are the three gauge band materials, the instanced lamp bank, the sorter arm and the new screen.

**Checks:**
- Tests: 42/42.
- tsc, lint and build: pass.
- Leak check: clean.
- Engine harness: identical, and `cyfroAiEngine.ts` is unmodified.

**Evidence:** `validation/compliance-2026-10-12/` (before/after from six angles, six stage frames, an evaluation close-up, the reduced-motion frame, perf, engine).

## CyfroAgent detail pass (2026-10-12, thirteenth pass)

The original appliance is kept and enhanced. Footprint, grid cell (1,1), ports (uplink, upload, n, w, s), flows, label, the original agent screen, the container badge, the uplink tower and ring, and the outbound chevron are all kept. The chevron was nudged 0.25 south-east to make room.

**Verified from source.** The agent repository (`cyfro-agent-v2-26`) is still not on this machine. These facts come from the backend and the in-monorepo agent inventory (`cyfro-infra-2026/docs/cyfroagent/scan-data/agent-side-scan-data-inventory.md`):

| Capability | Source |
|---|---|
| Single-use registration tokens; register / recover | `routes/agent_control.py:138-245` |
| The agent opens its own control stream (`GET /me/control-stream`, SSE); signed commands (`/me/signing-keys`) are delivered over it and acknowledged / answered (`/me/commands/{id}/ack`, `/output`) | `agent_control.py:311-512` |
| Heartbeat, runtime events, failures, dead-letter and inventory snapshots, update manifest | `agent_control.py:375-554` |
| Three scan families with family-specific upload endpoints: port scan, asset discovery, fingerprint; fingerprint results may be uploaded in shards | `routes/scan_results.py:311-436`; inventory doc |
| Port scan = Nmap (ports, services, versions, optional Vulners) | inventory doc |
| Asset discovery = Nmap host discovery plus optional Scapy ARP / LLDP / CDP / mDNS / DHCP / NDP observations, TCP probes, SSH/TLS banners, NetBIOS, SNMP, local interfaces | inventory doc |
| Fingerprint = Trivy over filesystem, container image, repository or SBOM (vuln / misconfig / secret) | inventory doc |
| Failed deliveries are persisted locally for retry | inventory doc |
| The backend treats the agent as external and outbound-only | inventory doc |

**Not verified, so not shown in detail:** the agent's internal scheduling, how it batches results on the host, and its exact retry timing. The pack/press is labelled an illustrative metaphor in the code comments.

**Added machinery:**
- A plinth.
- West cooling fins and north vent slats.
- An east equipment panel with four network connectors and link lamps.
- A result buffer behind a glass window under the screen (one lamp per scan family: filled when collected, drained as it uploads).
- A row of 7 run-state lamps on top.
- A "signed command received" lamp on the uplink tower.
- A heartbeat lamp.

**Collection modules, each with its own equipment and motion:**

| Module | Equipment | Motion |
|---|---|---|
| Port scan (Nmap), east between the conduits | probe mast, 8-socket panel | sockets light in turn as ports are probed; 3 "open" ports stay lit |
| Asset discovery, west | listener with a dish (feed horn) | dish turns; ARP · LLDP · DHCP observation lamps pulse in turn |
| Fingerprinting (Trivy), west | host-filesystem platter stack with a read arm, a container image | top platter spins while reading; 3 shard lamps fill (sharded delivery) |

**Packaging and status:**
- The press from the previous pass is kept, plus record blocks that travel from each module to the press before it packs them.
- The packs leave with the upload convoy, which is the shared transport (F03, 3 carriers).
- New `agentStatus` screen showing:
  - outbound control stream connected, heartbeat
  - run states: Waiting for work → Signed command received → Scan running → Collecting results → Uploading results → Run complete
  - per-family cards (Nmap / passive + Nmap / Trivy shards)
  - "Uploads over HTTPS · retry queue 0"

**Working sequence** (`chunks/agentFlow.ts`, shared with the screen; driven only by the director):

| Story step | Agent state |
|---|---|
| i-connect | connected · heartbeat out |
| i-assign | signed command arrives over the agent's own connection (the F02 packet rides the F01 route) |
| i-network / i-assets / i-fingerprint | that module runs, then its result travels to the press and is packed (collect) |
| i-upload | packs leave in step with the 3-carrier upload; the buffer drains |
| i-correlate | run complete |
| otherwise | waiting for work |

When selected, the director's working pass (10 s) rehearses the same states without transport.

**Outbound-only.** No new inbound route was added. Commands only appear as the existing F02 packet on the agent-opened F01 connection (the validator requires this). Uploads and heartbeats travel outward. The chevron still points out.

**Performance** (Apple M5, headless Chromium): 60 fps and 0 long tasks in every view.

| View | Draw calls | Triangles | rAF p99 |
|---|---|---|---|
| Overview | 284 → 290 | 102.0k → 104.2k | 5.5 → 5.6 ms |
| Agent selected | 92 → 95–98 | 68.5k → 70.7k | 3.6 → 4.4–4.5 ms |

The extra draw calls are the dish and platter groups and the new screen; all lamps and blocks share one instanced bank.

**Checks:**
- Tests: 42/42.
- tsc, lint and build: pass.
- Leak check: clean.
- Engine harness: identical, and `cyfroAiEngine.ts` is unmodified.

**Evidence:** `validation/agent-2026-10-12/` (before/after from six angles, nine stage frames, port-scan close-up, perf, engine).

## Code hosting detail pass (2026-10-12, fourteenth pass)

Position (grid 1,2, beside CyfroCode), the neutral external pad, footprint, port `e` (offset 0.25), flows F16 / F17, and the label "Code hosting" are all kept. There is still no route to or from CyfroAgent (`tests/city-registry`: "CyfroCode never involves CyfroAgent").

**Facts used:**
- **Providers.** GitHub (GitHub App) and Bitbucket (Bitbucket integration). The owner confirmed both are supported. Product copy: "GitHub App and Bitbucket integrations … implemented"; the product UI shows a Bitbucket pill in `CodeReplica.tsx`.
- **Clone (F16).** CyfroCode clones when a scan is requested.
- **Pull request (F17).** A branch and pull request are pushed only after a person approves. The pad never scans, drafts or merges, and a PR is not shown as merged.

**Provider marks.** Official GitHub and Bitbucket marks from Simple Icons (CC0 path data, v16.35.0), with brand colours.
- They are drawn into a canvas strip on the hosting display. No new dependency was added; the package was only unpacked in the scratchpad to read the path data.
- A few coordinate runs were rewritten with explicit separators. They read like IPv4 literals to the repo's safety test; the shapes are identical.

**Added:**
- **Repository servers.** Top vents and 16 drive-bay activity lights.
- **Network switch.** 8 port lights, with cabling to the servers, the display and the gateway.
- **Git graph wall** (replaces the small sculpture):
  - a dark display board with frame and stands
  - glowing branch lines: `main`, a branch below it already merged back, and a `feature` branch above
  - round commit nodes in their own sphere bank
  - branch-tip tags
  - three status lamps: ready · cloning · PR open
  - provider badges in its top-left corner (both shown; the active repository's provider is lit, and it alternates per run)
- **Repository console** (`repoConsole`): provider mark and integration, `example-org/web-app`, branch, latest commit, and the clone status ("Available to CyfroCode for scanning", "Clone requested by CyfroCode — sending…" with a progress bar, "Cloned · scanning runs in CyfroCode", "Pull request opened by CyfroCode", "No changes pushed").
- **PR status display** (`prStatus`):
  - Repository ready → Scan requested (by CyfroCode) → Patch proposed (in CyfroCode) → Awaiting approval (a person decides) → PR created (open · not merged)
  - or Rejected (no pull request)
  - footer "Nothing is pushed until a person approves"
- **Transfer gateway** facing CyfroCode: terminal, illuminated port ring, and a repository package that travels from the servers past the head commit into the gateway as the clone convoy leaves.
- **PR inbox:** the third card is now amber (open, awaiting review).

**Working sequence** (`chunks/gitFlow.ts`; director-driven only):

| Step | What happens |
|---|---|
| c-clone | Head commit highlighted; servers and switch busy; package travels to the gateway; port ring lights; the 3-packet clone convoy leaves (shared transport). |
| c-scan / c-draft | Overview only: "Scan requested" → "Patch proposed (in CyfroCode)". |
| c-wait | "Awaiting approval"; the held packet waits at CyfroCode's gate (approval logic unchanged). |
| c-approved | When the F17 packet unloads: the orange fix branch grows from `main`'s head, the PR card appears, the PR-open lamp lights and the screen shows "PR created · open · not merged". |
| c-rejected | Nothing arrives: no branch, no card, "Rejected — no pull request". |
| Selected working pass (8 s) | Illustrative developer activity on the repository: the feature branch extends and a new commit appears. It is not caused by the provider or CyfroSec. |

In overview the pad stays calm: an occasional disk flash and steady lamps.

**Performance** (Apple M5, headless Chromium): 60 fps and 0 long tasks in every view.

| View | Draw calls | Triangles | rAF p99 |
|---|---|---|---|
| Overview | 290 → 294–295 | 104.3k → 108.0k | 6.1 → 5.2–7.8 ms (re-runs 5.2 / 5.9) |
| Code hosting selected | 109 → 113 | 72.0k → 75.7k | 4.9 → 4.9–5.2 ms |

The extra draw calls are the sphere commit bank, three screens and the gateway ring; the old 2-bank layout became 2 banks again.

**Checks:**
- Tests: 42/42, including the safety scan for address-like literals.
- tsc, lint and build: pass.
- Leak check: clean.
- Engine harness: identical, and `cyfroAiEngine.ts` is unmodified.

**Evidence:** `validation/code-hosting-2026-10-12/` (before/after from six angles, seven stage frames, close-ups including Bitbucket active and light theme, perf, engine).

## Fingerprinting redesign (2026-10-12, fifteenth pass)

A full rebuild of the Service Fingerprinting chunk as an inspection lab. Grid cell (1,0), footprint, ports s/w, flows F23c/F24c, the label and the director behaviour are all kept.

**Accuracy constraint.** Per `cyfro-infra-2026/docs/cyfroagent/scan-data/agent-side-scan-data-inventory.md`, fingerprinting is Trivy over one target (host filesystem, container image, repository or SBOM). It is explicitly *not* network port/banner fingerprinting. The brief's "service badges" therefore name identified **software and its role** (TLS library · openssl 3.0.2, Web server · nginx 1.24.0, …), matched against vulnerability **advisories**. There are no port probes and no protocol sniffing. Facts live in `chunks/fingerprintLab.ts`.

**What was replaced:** the drive stack, the overhead gantry with its hanging head and beam, the read-only plaque, the container-image rack, the three finding trays, and the single counters monitor.

**New layout:**

| Element | Position | Role |
|---|---|---|
| Inspection chamber | centre | base and bed, two sensor towers with 6-step lamps each, a top rail, back glass and a front lip; a sensor head on the rail with a reading plane |
| Target | on the bed | a host module with filesystem layers and a read-only lock, **or** a container image (stacked layers), alternating per run; it slides in from the loading dock |
| Loading dock | north-west | where targets arrive |
| Advisory database | north-east | 5 cartridges that flicker while matching |
| Results screen `fpResults` | east, angled to the camera | 6 identified-software tiles (role · package version · "matching…" / "advisory match" / "no match"), the key match highlighted orange, then counts for vulnerabilities 12 · misconfigurations 5 · secrets 1, and "Packed for CyfroAgent · 3 shards" |
| Inspection-control console `fpControl` with operator | south-west | target type, then Load target → Inspect → Match advisories → Classify → Pack shards |
| Classifier | south-east | three bins that fill by finding type |
| Shard output slot | south (toward the agent) | — |

**Working sequence** (`labK`; story step i-fingerprint or the selected 12 s pass):

| Progress | What happens |
|---|---|
| 0–0.12 | The target slides from the dock onto the bed; the dock lamp pulses. |
| 0.10–0.20 | The chamber powers up: tower lamps fill bottom to top and the bed glows. |
| 0.20–0.55 | The sensor head sweeps along the rail with its reading plane; package lamps on the target light one by one as software is identified. |
| 0.50–0.75 | Each package record hops from the bed to the advisory database; matched packages turn orange on the target and on the screen. |
| 0.72–0.86 | The classifier bins fill; the key match (log4j-core 2.14.1) pulses on the target and on the screen. |
| 0.84–0.97 | Three shards fill the output slot and empty as the carrier leaves for CyfroAgent (departure pulse). |
| After | Idle: the last result is held and nothing moves. |

**Distinct from Network Discovery (antenna, port board) and Asset Discovery (radar, belt, bins):** one enclosed chamber, one target under a moving sensor head, and package-level identification and matching. There is no sweep across a network and no inventory.

**Performance** (Apple M5, headless Chromium): 60 fps and 0 long tasks in every view.

| View | Draw calls | Triangles | rAF p99 |
|---|---|---|---|
| Overview | 295 → 305 | 108.0k → 109.5k | 7.2 → 6.8 ms |
| Fingerprinting selected | 73 → 81–83 | 71.4k → 72.8k | 4.8 → 4.3 ms |

The extra draw calls are the head group, the two targets, two angled screens and the reading plane.

**Checks:**
- Tests: 42/42.
- tsc, lint and build: pass.
- Leak check: clean.
- Engine harness: identical, and `cyfroAiEngine.ts` is unmodified.

**Evidence:** `validation/fingerprinting-2026-10-12/` (before/after from six angles, seven stage frames, a comparison with Network Discovery and Asset Discovery, perf, engine).

## /platform-city: dedicated page with the progressive assembly cinematic (2026-10-12, sixteenth pass)

**Product shape.**
- The homepage keeps its original three-zone scene, untouched (`platform-architecture-3d/` has no changes).
- One CTA under it, "Explore the Full 3D City", links to `/platform-city` with `prefetch={false}`. Verified: the homepage loads none of the city chunks.
- The new page is full height with no marketing header or footer. It has Back to home, the city, a workflow bar below the stage, the panel and the directory.
- It plays the assembly cinematic on every visit (no "seen" storage). With reduced motion it opens on the finished city.
- `/prototype/city` and the build-time homepage switch are kept and unchanged.

**Assembly** (`registry/assembly.ts`, pure and tested; `engine/createCity.ts` with `opts.assembly`):

| Phase | Time | What happens |
|---|---|---|
| Engine alone | 0–4 s | Close shot on the approved Engine framing, pulling back gently. Only the Engine's own cell of the CyfroSec foundation exists. |
| 18 arrivals | 4–59.4 s | One platform at a time. For each: its outline lights at its final position → the platform rises up through its foundation (1 s) → its connections to platforms already present appear and glow for 1.4 s → a short demonstration (below) → the next arrives. |
| Finale | 59.4–63.4 s | The camera settles exactly on the interactive overview, so the hand-off has no jump. |

Total: **63.4 s**.

**Presentation order:** Engine → AI provider → CyfroAI Insights → Data Ingestion → Scan Control → CyfroAgent → Your infrastructure → Network Discovery → Fingerprinting → Asset Discovery → Code hosting → CyfroCode → CyfroCompliance → Reporting → CyfroTopology → CyfroAssistant → Your team → ? → ?.
- The order is chosen for smooth camera travel: centre → north → south → west → the customer district → the code pair → the east column.
- The AI provider comes before Insights so Insights' tall wall never blocks the opening Engine shot.
- The UI says: "Platforms appear in presentation order — not the order the software runs."

**Foundations:**
- **CyfroSec foundation:** grows to cover exactly the platforms present (scaled from the full plate; exact at the end).
- **Customer plate:** the plate, its wall and the single outbound gate rise together with CyfroAgent.
- **External pads:** each pad and its bridge rise with its platform.

**Connections and transport:**
- Each cable is hidden until both of its platforms exist, then glows for 1.4 s.
- Port docks follow the same rule (`transport.setPresent`).
- No temporary or invented connections.

**Demonstrations** (`director.assembly`):
- A platform shows either its own working sequence (a k-range of its loop) or a slice of the verified story, limited to steps involving it and to carriers between platforms that already exist.
- Everything else stays calm.

| Platform | Demonstration |
|---|---|
| Provider | Engine ↔ provider request |
| Insights | ranked risks → AI explanation |
| Ingestion | records → normalise → correlate |
| Scan Control | a job queued |
| Agent | heartbeat out, signed command back over its own connection |
| Network Discovery / Fingerprinting | the agent's scan with its carriers |
| Asset Discovery | one asset sorted into inventory |
| Code hosting | commit activity |
| CyfroCode | clone from code hosting → scanners |
| Compliance | evaluation job → controls evaluated |
| Reporting | snapshot read → report |
| Topology | graph built → node inspected |
| Assistant | read tool → AI → proposal waits for a person |
| Your team | pending → approved, with the PR carrier to code hosting (illustrative decision) |
| Mystery platforms | arrive black, no activity |

**Camera.**
- One monotone cubic (Fritsch–Carlson) path over the camera's target, theta, elevation and distance, starting from the Engine's approved framing.
- Distance only ever increases (it pulls back as the city grows). Theta drifts gently from the Engine angle to the overview angle.
- The clearance over machinery only counts platforms that exist and eases in, so it never snaps.
- The path is rebuilt on resize. Its final key is the interactive overview.

**Rendering approach.**
- Platforms animate through their parent-group transform and visibility. Nothing is rebuilt or allocated per arrival.
- The city-wide static merge is still built, but the per-chunk meshes are kept (hidden) rather than removed. During assembly the per-chunk meshes show; at the end (or on Skip) the merged city is swapped in. Replay swaps back.
- All shaders are compiled before the cinematic starts, so arrivals cause no compile hitches.

**Controls:**
- **Skip:** the final state at once (all platforms, plates, cables, docks; merged city) and a smooth camera glide to the overview.
- **Pause / Resume:** freezes and continues the assembly clock, camera, demonstrations and packets.
- **Replay:** resets the presentation from the clock.
- **Dragging or selecting during playback** finishes the assembly and hands control over where the camera is.

**Verified in the browser** (headless Chromium, Apple M5):

| Check | Result |
|---|---|
| Real-time full cinematic (in-tab reload) | 3,661 frames, 60 fps, frame p50/p99/max 16.7/16.8/16.8 ms, rAF CPU p50/p99 3.3/6.3 ms, 0 long tasks. A separate run logged 0 frames over 34 ms across all 63 s. (A first run showed 1 fps for its first 7 s: the test browser throttling a freshly opened tab, not the scene.) |
| Draw calls | ~200–300 during most of the assembly, peak 511 just before the merge swap; final overview 304 (unchanged from before); Engine focused 145 |
| Skip at 19 s | final state; the lit-cable set identical to a natural finish; the remaining pixel differences are only parts whose angle accumulates over time |
| Replay × 5 | GPU geometries / textures unchanged (209 / 38): no leaks |
| Pause at 24.3 s | clock held, 0.0000 % of pixels changed over 2 s; Resume continued from 24.33 |
| Drag at 9.3 s | assembly completes, camera stays |
| Reduced motion | opens assembled (`done` at T = 0) |
| Mobile 390×844 | the same assembly; 60 fps over the first 20 s, frame max 16.8 ms |
| WebGL disabled | accessible list (19 platforms, 8 districts, 20 workflow steps) |
| Homepage | original scene and its own intro intact; CTA works from the keyboard; back/forward and Back to home work; direct load and refresh of `/platform-city/` work |

**Checks:**
- Tests: 45/45 (new `tests/city-assembly.test.cjs`):
  - the Engine first, every platform exactly once, nothing visible before its slot
  - one platform rising at a time; total 45–70 s
  - demonstration carriers only between existing platforms; gated actions only after approval; the code track never involves the agent; mystery platforms inactive
- tsc and lint: clean.
- Build: pass (default build, so the homepage shows the original scene).
- Leak check: clean.
- Engine harness: identical; Engine file unmodified.

**Evidence:** `validation/platform-city-2026-10-12/`:
- full recording `platform-city-assembly.webp` (128 frames, one every 0.5 s of the clock)
- assembly sheet
- opening frame and final overview
- `frames/`
- `controls/` (homepage CTA, skip vs natural, replays, pause, drag, reduced motion, mobile)
- perf, engine

## Mystery platforms become approved, temporary teasers (2026-10-12, seventeenth pass)

**Rule.** A black "? — Coming Soon" platform appears only for a feature that is confirmed to be **actively in development AND approved for a public teaser**. The default is none. Being documented, partly built, flag-disabled or on a roadmap is not enough, and nothing is generated from roadmap data.

**Implementation:**
- **`registry/teasers.ts`** is the public teaser list, empty by default. Each entry holds only an opaque id (`reserved-NN`), a grid cell and the two confirmations (`inDevelopment`, `teaserApproved`). The id-to-feature mapping stays outside this repository.
- **`registry/chunks.ts`:**
  - `RELEASED_CHUNKS` is the released platforms.
  - `teaserChunks(list)` builds one mystery platform per teaser with both flags true (a second filter after the validator).
  - `composeCity(teasers)` builds the visible city. The "edge" district is named "Your team", or "Your team & what comes next" while a teaser is shown.
- **`registry/index.ts`** composes `CHUNKS` / `DISTRICTS` from `TEASERS`. The registry files stay import-free so `node --test` can load them.
- **Validator** (`teasers` input):
  - opaque ids only, no extra fields (no names or notes)
  - entries must be in development AND approved, otherwise remove them; nothing ships behind a false flag
  - the mystery platforms shown must equal the approved teasers, so a withdrawn teaser leaves nothing behind
- **The two permanent placeholders (`reserved-01/02`) are removed.** The `MysteryChunk` builder, its lifecycle rules and its tests are kept; the tests now use sample teasers.
- **Layout.** The CyfroSec slab now covers only its four core districts, a full 3 × 3 block. The edge district (Your team and any teasers) stands on its own pads east of it. Your team is bridged through its west port; teasers have no bridge and no connections. So any number of teasers (0…n) leaves no empty cell (layout test updated).
- **Assembly.** `slotsFor(chunks)` derives the arrivals from the visible city:
  1. choreographed platforms in order
  2. then any released platform without its own choreography yet (it still arrives, 2.6 s)
  3. then approved teasers (1.4 s each, last)

  Progress ("n of N"), duration, camera path and final overview all follow; nothing is fixed at 19.

**Verified:**

| Case | Result |
|---|---|
| No teasers (shipped) | 17 platforms, 0 mystery labels, "1 of 17 … 17 of 17", cinematic 61.0 s; Skip / Pause / Replay work; the build contains no `reserved-` id; leak check clean |
| One approved teaser (temporary build, then reverted) | 18 platforms, exactly one mystery platform arriving last on its own pad, "18 of 18", 62.4 s, district renamed; the bundle holds only `{id:"reserved-01",grid:{x:5,z:0},inDevelopment:!0,teaserApproved:!0}` and the shared "Coming Soon" copy; leak check clean; `reserved-02` absent |
| Unapproved or inactive entries (unit tests) | produce no platform and fail validation |
| Two teasers (unit tests) | two arrivals, never a fixed count |
| Released feature without choreography (unit test) | arrives before any teaser |

**Checks:**
- Tests: 47/47. One registry test is a deliberate tripwire that fails when the shipped teaser list changes, so adding a teaser is a reviewed change.
- tsc and lint: clean.
- Build: pass.
- Engine harness: identical, and the Engine file is unmodified.
- Homepage: original scene and CTA unchanged.

**Tidy-up:**
- Test strings that used an unreleased feature name as sample text are now neutral.
- `02-feature-inventory.md` no longer pairs mystery platforms with candidate features.
- Other Phase 0 audit docs in `docs/design/3d-city/` still name unreleased features as part of the code audit. They are not in the build, but they sit in this repository; whether to move them out is an owner decision.

**Evidence:** `validation/teasers-2026-10-12/`.
- **Owner follow-up (same day):** `/platform-city` now has the site's nav bar (the same `AnnouncementBanner` + `LandingHeader` as the homepage) and **no footer**. The page is offset 104 px for the fixed nav; the stage is `100svh − 176px`. Checked on desktop and mobile; build passes.
- **Owner follow-up:** in the nav's scrolled (floating) state the "Back to home" row slid underneath it. The row is now `position: sticky`, with `top` set to the nav's measured bottom edge, updated on scroll, resize and the nav's transition. Checked at 1440, 1280 and 390 px wide, at scroll 0, 60 and 1200: never covered (e.g. nav bottom 104 / row top 126; phone 64 / 78).
- **Owner follow-up — default camera angle:**
  - Landscape overview set to θ 0.08 rad, elevation 0.60 rad (was 0.5 / 0.62): almost straight on from the south. Matched against the owner's reference screenshot.
  - It is also where the assembly cinematic ends and where "Overview" returns.
  - Portrait screens keep their rotated fit (θ 1.2, elevation 0.92).
  - Tests 47/47, build passes.
- **Owner follow-up — Platforms dropdown:**
  - A "Platforms" button (SVG chevron) now sits in the view controls after − / +. It opens the platform directory: every visible platform grouped by district, the current one marked.
  - Choosing one focuses it and closes the menu. Escape closes it and returns focus to the button; a click outside closes it. It has `aria-expanded` / `aria-controls`.
  - On phones it becomes a scrollable sheet under the controls.
  - The directory that sat below the stage is removed, since the dropdown replaces it.
  - Verified with real mouse clicks (CyfroCode, CyfroTopology, Your code hosting opened their panels). Tests 47/47, build passes.
- **Owner follow-up — nav state:**
  - On `/platform-city` the site nav now stays in its full-width top state the whole time; it never becomes the floating bar. This is the new optional `LandingHeader` prop `fixedTop` (default `false`), so every other page is unchanged.
  - Verified: city page at scroll 0 / 60 / 800 / 2000 is not floating (nav bottom 88, Back to home row at 110–126, never covered); homepage at scroll 800 still floats.
  - The lint warning on `LandingHeader.tsx` (`<img>`) was already there before this change.
- **Owner follow-up — sticky tools:**
  - On `/platform-city` the "Illustrative walkthrough — not live data" badge and the view controls (− + Platforms Labels Overview) now sit in the sticky heading row under "Back to home". They stay pinned below the nav while scrolling, like the back link; the stage is 50 px shorter to make room.
  - The prototype section keeps them inside the stage.
  - Verified at 1440 / 390 px, scroll 0 / 400 / 1500: nav bottom 88, back 110, badge 155, controls 154 when scrolled; phone 56 / 70 / 114 / 158. The Platforms dropdown opens over the city while scrolled. Tests 47/47, build passes.
- **Owner follow-up — Platforms dropdown redesign:**
  - Balanced CSS columns (3 on desktop, 1 on phones); each district is one unbroken block, so there are no empty gaps.
  - Headings and items share one left edge, and each heading shows a count. Each platform shows its name plus a one-line muted summary (full text on hover); there is a soft hover state and an outlined current platform.
  - The scroll container is separate from the column layout, so a short window or a phone scrolls vertically instead of spilling columns sideways.
  - Verified: 1440×900 no scroll needed; 1440×700 and 390×844 scroll vertically only. Tests 47/47, build passes.
- **Owner follow-up:** the Platforms dropdown's district headings are now orange (`--brand-accent-orange`), with the per-district counts removed. Checked in the dark and light themes. Tests 47/47, build passes.
- **Owner follow-up — workflow bar removed:** the "Follow a workflow" bar (Infrastructure scan / Code security / List view) is gone, together with its code.

  | Area | Removed or changed |
  |---|---|
  | `CityCinematic.tsx` | guide state and steps, the guide section of the panel, the list-view toggle; Overview now simply returns to the overview |
  | `engine/createCity.ts` | `GuideStep`, the guide clock, the `guide()` API and debug hooks, `workflows` |
  | `registry/director.ts` | the guided path and mode (`direct` now takes only the clock and the selection) |
  | `registry/story.ts` | `WORKFLOWS` |
  | `City.module.css` | `.workflows*`, `.guide*` |
  | `tests/city-director.test.cjs` | the guided test |

  - **Kept:** the HTML city list as the automatic fallback when 3D is unavailable. Its "Verified workflows" text is now generated from the story steps (no-WebGL check: 17 platforms, 8 districts, 20 steps).
  - **Checks:** tests 46/46 (47 minus the removed guided test); tsc and lint clean; build passes; leak check clean; Engine harness identical. Selecting a platform from the dropdown and Overview both work.

## Assembly fix: nothing appears before its platform arrives (2026-10-12, eighteenth pass)

**Root cause** (found with a new in-browser audit, `__cyfroCity.auditAssembly(T)`). The audit walks the rendered scene at build time T and reports anything visible that belongs to, or covers the cell of, a platform not yet arriving, plus early connections, docks and labels.
- **Platform-owned objects were fine.** Every platform's machinery, screens, lights, rim, pad, cables and docks were already hidden until its arrival.
- **The two shared foundations were not:**
  - The **customer plate + perimeter wall + gate** appeared whole with CyfroAgent. It sat empty under Your infrastructure, Network Discovery, Fingerprinting and Asset Discovery for up to ~12 s.
  - The **CyfroSec slab** grew as a bounding rectangle of the platforms present (and expanded slightly ahead of an arrival). It covered empty cells, e.g. Scan Control's before Scan Control arrived, and Assistant / Topology / Compliance cells.
- **Before the fix:** violations at 27 of 50 audited moments, all from those two foundations.

**Fix** (`engine/createCity.ts`):
- **Per-platform foundation tiles** (assembly only). The CyfroSec slab and the customer plate are cut along cell lines; each customer cell also carries its own stretch of the perimeter wall, and CyfroAgent's cell carries the gate (posts and light).
- **Tiles belong to their platform.** A tile rises with its platform (the same presence curve) and is invisible until that platform's arrival starts, so a platform and its floor and wall arrive as one unit.
- **District plates during assembly.** The real district plates (and wall) stay hidden; at the hand-off (end, Skip or drag) they replace the tiles as part of the merged city.
- **Removed:** the growing-slab and early-expansion logic.
- **Labels:** a platform's label appears only once it has started rising.
- **Timing:** `presence` is exactly 1 from `arrivedAt` on, so a connection can no longer be revealed one frame before its docks.

**Visibility states** (from the assembly clock):

| State | Presence | What shows |
|---|---|---|
| hidden | 0 | platform group, foundation tile / pad, rim, label, cables and docks all invisible; no updates |
| arriving | 0 < p < 1 | platform, its tile and its pad rise together; rim glows; label shown |
| assembled | 1 | in place; its connections (both ends assembled) appear and glow briefly; demonstration, then idle |

**Results:**
- **Audit:** 0 violations at all 50 moments (Engine-only opening; each platform 0.05 s before, 0.5 s into and 0.05 s after its arrival). Also 0 after Replay.
- **Labels:** a live, paused audit of 48 frames found no label shown for a platform before its arrival (zero clock drift).
- **Rendered frames:** before/after comparisons at 12–36 s show no empty customer plate and no empty slab cells.
- **Hand-off:** apart from labels and the HUD, the only difference between the last cinematic frame and the finished city is a thin outline on the slab's outer edges (tiles have square edges, the merged plate rounded ones).
- **Tests:** 47/47. New: every platform is absent just before its slot, arriving mid-slot, in place after; nothing else moves meanwhile; connections only once both ends are in place.
- **Performance:** real-time full cinematic at 60 fps, frame p99 / max 16.8 ms, rAF p99 7.3 ms, 0 long tasks. Draw calls peak at 560 during assembly (+~50 for the tiles); the finished city is unchanged.
- **Replay:** 24 replays leave GPU geometries / textures stable at 357 / 36.
- **Engine:** harness identical; `cyfroAiEngine.ts` unmodified (the Engine has its own tile next to it; its group is untouched).

**Evidence:** `validation/assembly-visibility-2026-10-12/`.

## AI provider detail pass (2026-10-12, nineteenth pass)

**Scope:** the External AI provider pad only (footprint, grid position (3,−1), label, external district and the F12 port unchanged). No other platform and nothing in the Engine was modified.

**Identity check:** `work/docs/License-Legal/Legal_docs.md` names the generative-AI subprocessor, but the brief requires approval before any explicit provider identity. The pad therefore stays generic ("AI provider"): no provider name or logo, no region, hosting, residency or storage claim, no provider topology. A test enforces this on the copy.

**What the pad now shows** (`chunks/edge.ts` `buildAiProviders`):
- **Request gateway** (south, facing the shared AI layer): plinth, pillars, a lintel with "in" (warm white) and "out" (green) lamps, an illuminated ring with ten chase segments, a scan bar, and three queue lights.
- **Compute racks** (north): three racks with five compute modules each (a status light and three illuminated ports per module), rails and top vents. The middle rack is the answering node, with a beacon bar.
- **Support hardware:** a cooling unit with a fan and coolant lines whose flow follows the load; a power unit with a four-step load meter; a network switch by the gateway; overhead cable trays.
- **A rail with direction chevrons** between the gateway and the compute node.
- **Status panel** (west): the `aiGateway` screen lists Request queued → Provider ready → Model active → Response prepared → Response sent. It shows the current state large with its progress, "Request in" and "Response out" indicators, "External service · outside the CyfroSec platform" and "Illustrative sample". It uses a neutral palette, not CyfroSec blue.

**How it works** (`chunks/providerFlow.ts`, shared by the pad and the screen, import-free so Node can test it):
- **One exchange (0…1):**
  1. The request docks in front of the gateway and queues.
  2. The gateway opens (scan bar, ring chase, "in" lamp) and the request token passes the ring and rides the rail to the node.
  3. The racks light up in a wave and the node works.
  4. The response token is prepared at the node and returns along the rail.
  5. It leaves through the gateway ("out" lamp).
- **Drivers:**
  - **Story steps i-insights and c-draft.** F12 now runs 0.2–0.42 (request) and 0.58–0.8 (response), leaving a visible processing window between them. F09 and F11 move to 0–0.2 and 0.8–1. CyfroAI Insights' explanation still starts at 0.8.
  - **The selected chunk's working pass:** new `LOOP_SECONDS['ai-providers'] = 10`.
  - **Pause and reduced-motion still frame:** "model active".
  - **Low-power mode:** keeps the stages and drops the chases.

**How it differs from the Engine:** external, neutral materials (white and silver gateway, warm request and green response colours, no CyfroSec blue), a portal and rack hall instead of the Engine's reactor dome and bot face, and a linear request → compute → response sequence.

**Checks:**
- **Tests:** 50/50. New `tests/city-provider.test.cjs` covers stage order in the loop and both story steps, the processing window between F12 legs, and generic copy. Two stale lint warnings in older tests were also fixed.
- tsc and lint are clean, and the build passes. The city bundle contains no provider name.
- **Engine harness:** results identical to every earlier pass; `cyfroAiEngine.ts` unmodified.
- **Performance** (1440×900, 60 fps throughout):

  | View | Draw calls | Triangles | rAF p99 |
  |---|---|---|---|
  | Overview | 299 → 300 | 110k → 112k | 6.2 → 8.9 ms (single-run noise; p50 unchanged) |
  | Selected | 75 → 78 | 84k → 87k | 3.5 → 3.7 ms |

  All new lights share one instanced draw call.
- **Replay** on `/platform-city`: geometry count plateaus at about 184 after replays. Textures stay at 37 (+1 for the status screen).

**Evidence:** `validation/ai-provider-2026-10-12/`: before, after, stages, modes, status-screen zoom, perf and Engine harness.

## Shared ChunkBase for the feature platforms (2026-10-12, twentieth pass)

**Goal:** one square platform base for the CyfroSec feature chunks and Code hosting, without touching any machinery, animation, layout or the environment pads.

**Implementation:**
- **`kit/baseSpec.ts`** (pure numbers, testable under Node):
  - `BASE`: size = FOOT 5.4, thickness 0.16, bevel 0.1, slab centre 0.15, top = DECK_TOP 0.23, front-kerb and edge-band dimensions.
  - `baseAnchor(side, offset)`: the connection anchor on the base edge, in chunk-local coordinates at deck height. It uses the same convention as `registry/grid.ts` `portWorld`.
- **`kit/chunkBase.ts`:** `chunkBase(kit, g, m)` builds the slab (`m.panel`), the blue front kerb (`m.blue`) and a thin illuminated blue band around all four sides.
  - The band uses a new shared `m.baseGlow` material: emissive #039be0, or #0278ae at lower intensity in the light theme.
  - All three parts are static boxes in shared materials, so the static and city-wide merges fold them into existing draw calls.
- **Matches the Engine's approved deck:** the slab and kerb are exactly the CyfroAI Engine's deck, so features and the Engine share the same platform; ChunkBase adds only the lit band.
- **Part of each chunk's group:** the base rises with its platform during the assembly cinematic, and its tile and visibility rules are unchanged.

**What changed visually:**
- **Customer-side features** (CyfroAgent, Network Discovery, Asset Discovery, Fingerprinting): the darker `customerPanel` surface becomes the standard panel.
- **CyfroCode:** green kerb becomes blue.
- **Scan Control and Data Ingestion:** `stripControl`, the same colour as blue, is gone (material removed as unused).
- **Code hosting:** it had the neutral external pad deck with no kerb and now stands on ChunkBase. Its engine-level external pad underneath is unchanged, so it still reads as outside CyfroSec.
- **All 13 platforms:** gain the lit edge band.

**Updated (13):** Network Discovery, Asset Discovery, Service Fingerprinting, CyfroAgent, Scan Control, Data Ingestion & Correlation, CyfroAI Insights, CyfroTopology, CyfroCode, CyfroAssistant, CyfroCompliance, Reporting & Dashboard, Code hosting.

**Excluded (unchanged):**
- **Environment pads, which keep their own base builders:**
  - Your infrastructure: `chunkDeck` with the customer panel and an edge kerb.
  - AI provider: `padDeck`.
  - Your team: `chunkDeck` with the panel and an edge kerb.
- **CyfroAI Engine** (exception, documented): its deck code is untouched. It already has the ChunkBase slab and kerb, but not the lit band; adding the band would change the approved Engine appearance, so it is left as is.
- **Also untouched:** the mystery-teaser deck and the district plates, walls, tiles and pads.

**Not changed:** grid, layout, machinery (deck size and top are identical, so nothing floats or sinks), animations, camera, assembly order, connections, boundaries, approvals, teaser lifecycle.

**Checks:**
- **Tests:** 53/53. New `tests/city-base.test.cjs` checks that:
  - `BASE` matches FOOT and DECK_TOP and the Engine's deck numbers;
  - each of the 13 builders calls ChunkBase once and has no other deck;
  - the excluded builders do not use it;
  - base anchors coincide with every port dock.
- tsc and lint are clean; the build passes.
- **Screenshots:** before/after from identical cameras (17 platforms + overview + low angle). The diff overlays show no change on the three excluded pads or the Engine deck; only moving parts and neighbouring feature decks differ.
- **Assembly:** audit shows 0 violations at 50 moments. Mid-rise frames show each base rising with its platform.
- **Controls:** Skip, Pause / Resume, Replay and selection work.
- **Performance** (1440×900, 60 fps): overview 300 → 300 draw calls (112.0k → 112.6k triangles); CyfroCode selected 167 → 167.
- **Engine harness:** the Engine is pixel-identical. Two cases differ from earlier runs only by a stray data packet from the original homepage scene in the empty area of the reference render, outside the Engine.

**Evidence:** `validation/chunk-base-2026-10-12/`.

## CyfroAI Engine platform: environmental details (2026-10-12, twenty-first pass)

**P0, the Engine is untouched.**
- `chunks/cyfroAiEngine.ts` is byte-for-byte unchanged (same sha256; a new test pins it).
- **How the layer is attached:** `withEngineSurrounds(buildCyfroAiEngine)` in `chunks/index.ts` builds the Engine exactly as before, then adds a separate layer to the same chunk group. It forwards every Engine hook (reactor, face gaze, theme, resize) unchanged, and its update and paint calls simply run the Engine's own first.
- **Why it still verifies:** the Engine harness renders the bare builder.

**Added (`chunks/engineSurrounds.ts`; layout and timing in `chunks/engineSurroundsPlan.ts`, which is import-free and tested):**
- **Floor circuitry:** thin traces with solder pads from the device's edges toward the conduits.
- **Four conduits, one per verified AI port only:**
  - north: AI provider (F12)
  - south: CyfroAI Insights (F09)
  - east: CyfroAssistant (F10)
  - west: CyfroCode (F11)
  
  Each is a recessed channel with lips, a dim lit core, and a socket with an indicator at the port end. Nothing suggests that other platform data passes through the Engine.
- **Two low cooling / auxiliary modules** at the back corners (0.34 high, behind the device). Each has top vents, a front grille, a marking plate, a status light and a vent glow strip.
- **Diagnostic terminal** in the front-left corner: small and angled. It shows Ready / Request received / Processing / Response available, labelled "Illustrative". It makes no provider, hosting or residency claim.
- **Maintenance details:** two access hatches with four fasteners and a handle slot each, plus panel seams on the open floor.

All new pieces stay inside the chunk, off the device's footprint and below 1.0 high (the Engine's top module is at about 2.1).

**Motion** (no independent loop; only the existing story steps that touch the Engine: i-insights, c-draft, i-ask):
- **Pulses:** a soft pulse travels along the conduit a request is on (toward the Engine for a request, away for a reply). Timing comes from the story's flow windows, not hard-coded.
- **Terminal:** received as the first request lands, processing until the last reply leaves, response while it leaves, then Ready.
- **Cooling modules:** their lights ease up while the Engine is busy.
- **Calm modes:** effects are about 40% weaker in the overview. Low-power mode shows steady lights; paused shows Ready.
- **Cheap screen updates:** the terminal canvas repaints only when its state or the theme changes.

**Performance** (1440×900, 60 fps):

| View | Draw calls before → after | Triangles before → after | rAF p50 |
|---|---|---|---|
| Overview | 300 → 306 | 112.6k → 114.7k | 3.2 → 3.6 ms |
| Engine selected | 152 → 158 | 94.3k → 96.3k | — |

Statics are merged per material inside the layer (the Engine chunk itself is never merged); all lights are one instanced draw call.

**Checks:**
- **Tests:** 57/57. New `tests/city-engine-surrounds.test.cjs` checks:
  - the Engine file's hash and the wrapper wiring;
  - the layout stays inside the chunk, off the device, without overlaps and below the height limit;
  - conduits only serve the four ports and end at their docks;
  - activity follows the story, with the terminal order and return to Ready.
- tsc and lint are clean; the build passes.
- **Engine harness:** results identical to the previous pass; Engine pixel-identical.
- **Before/after:** captured from the same six cameras; the before build was made by temporarily building without the wrapper. Changed pixels are only on the floor details. The orb and face also differ between two runs of the same build (live animation), so they are not a change.
- **Assembly:** audit shows 0 violations at 50 moments. The opening shows the Engine alone with its details, which belong to its chunk group.
- **Controls:** Pause / Resume, Skip, Replay and selection work.
- **Replay:** geometry count plateaus at 171 after replays; textures stay at 38 (+1 for the terminal).

**Evidence:** `validation/engine-surrounds-2026-10-12/`.

## Copy cleanup across the 3D City (2026-10-12, twenty-second pass)

**Scope:** every visitor-facing string in the city (registry copy, hotspots, districts, connection labels, story and cinematic captions, panel/HUD/menu text, accessibility labels, the no-WebGL list, page metadata and the prose on the in-scene screens). The homepage scene, geometry, animation, ids, routing and the Engine are untouched.

**Approach:**
- **Exact replacements:** 155 old → new edits, each asserted to match exactly once. No global search-and-replace was used. The edit tables are in `validation/copy-cleanup-2026-10-12/*.py`.
- **Dashes:** 53 prose em dashes removed, in favour of full stops, commas and colons for labels.
- **Hotspot names** are now Title Case headings, shown on their own line above their explanation (markup in `CityCinematic.tsx`, two CSS rules).
- **Cinematic marker:** shows "Platform · n of N" on one line and its caption below, instead of a dash-joined sentence.
- **Length:** the copy stays about the same length (2,584 → 2,630 words in the edited strings).

**Claims tightened:**
- **The 3D canvas's accessibility label** pointed to a "feature directory below" that no longer exists. It now points to the Platforms menu.
- **Agent uploads** were described as going "through the same gate" or "over the same connection". The platform has dedicated per-scan upload endpoints, so the copy now says "over outbound HTTPS".
- **The approved endpoint patch connection label** contained an internal note ("not animated until agent-side behaviour is verified"). It is now a plain description; the existing "Not animated" chip still shows.
- **AI provider copy** follows the requested structure: Request Gateway, Provider Infrastructure, Request Status. The connection text describes a shared integration layer, not a central AI server. It names no provider and makes no residency claim (`tests/city-provider.test.cjs` still passes).

**Intentionally kept:**
- **The teaser label `? — Coming Soon`:** approved earlier and pinned by the validator. It is not shown today because there are no teasers.
- **Lone "—" placeholders** meaning "no value yet" on three mock screens.
- **Developer-only validator messages** and code comments.

**Checks:**
- **Tests:** 57/57. tsc and lint are clean; the build passes.
- **Dash audit:** of the non-comment strings, only the intentional ones above remain.
- **Panels in the browser:** AI provider, Engine, CyfroCompliance, CyfroAgent, Your team and Code hosting.
- **Other UI checked:** the HUD during the cinematic, and the mobile panel at 390 px (no sideways scroll).
- **No-WebGL fallback:** shows 17 platforms, 8 districts and 20 steps, with no dash lines.
- **Unchanged:** the homepage scene folder and the Engine file (same checksum).

**Evidence:** `validation/copy-cleanup-2026-10-12/`.

## Connection lines always visible (2026-10-12, twenty-third pass)

**Diagnosis** (new debug probe `__cyfroCity.cableProbe()`):
- **What the probe measures:** for every cable from the current camera, its visibility state, raycast occlusion per sample point and the occluder's name, and screen points for measuring contrast in a screenshot. Report: `validation/connection-visibility-2026-10-12/cable-report.py`.
- **Results by how the city was reached** (overview, nothing hovered or selected):

| Reached by | Hidden by state | Low contrast | Occluded | Readable |
|---|---|---|---|---|
| Skip intro | **26 / 26** | – | – | 0 |
| Played to the end | 6 | 3 | 5 | 12 |

**Root causes:**
1. **Visibility state bug.** After the assembly, a cable's visibility was only ever set to true while `presenting`, or during its reveal glow. Skip (and anything else that ends the cinematic before a cable's glow) left every cable hidden for good.
2. **Hidden by design.** The six read-tool links (F13, F14a–e) were created with `visible = false` and shown only while an endpoint was hovered, selected or active.
3. **Marginal contrast.** Data, control and external cables were flat slate grey (`#60798d`, the same grey as the platform trim) with no glow. Median contrast against the floor was about 1.3–1.4.
4. **Occlusion is not a cause.** From straight overhead no cable is occluded. At lower angles the only occluders are the decks, screens and machines in front (ordinary perspective). No cable sits inside or under geometry.

**Fix** (`engine/createCity.ts` only; graph, routes, packets, director, Engine and homepage untouched):
- **Visibility:** a cable is visible whenever `cableState` is not `hidden`, i.e. whenever both of its platforms have arrived. No connection is hidden by default any more.
- **One small material per cable;** states change only colour and glow intensity (no material swaps):
  - **base:** the resting architecture, emissive 0.34.
  - **dim:** something else is focused. Colour mixed 50% toward the floor, emissive 0.07; still visible.
  - **rel:** touches the hovered or selected platform, emissive 0.75.
  - **on:** data is moving on the route (driven by the transport manager, so still event-driven), emissive 0.95.
  - **hl:** chosen in the details panel.
  - **glow:** just established during the assembly.
  
  Light theme uses darker blues at about 45% of the glow.
- **Colours:**
  - data, control, job and report lines: `#039BE0`
  - external links: lighter `#5fb3dc`
  - AI calls: dotted `#8fd8f5`
  - approval routes: orange
- **One line width (0.07)**, and a slightly taller strip (0.04) that sits 0.025 above the plate.

**Results:**
- **Hidden lines:** after Skip, played to the end, or on the prototype route, 0 cables are hidden.
- **Contrast:** data lines now measure about 2.4–3.6, against about 1.3–1.4 before.
- **Angles:** at five angles around the city plus overhead, all 26 cables are readable from at least one angle, and 25/26 from overhead. The remaining one is a short code-hosting link whose sample points fall under the caption box.
- **Hover** on Reporting: its 3 links go bright and the rest dim but stay visible. **Selecting CyfroCode:** its 4 links are emphasised (1 active) and the other 22 stay dimmed but visible.
- **Assembly:**
  - The audit shows 0 violations at 50 moments.
  - The visible count grows 0 → 3 → 11 → 26 through the cinematic.
  - Skip shows 26/26; Replay restarts at 0 and ends at 26/26.
  - Pause keeps all 26 visible.
- **Checks:** tests 57/57; tsc and lint are clean; the build passes; the Engine file is unchanged (hash test).
- **Performance** (1440×900, 60 fps): overview 306 → 312 draw calls (the six read-tool links, one call each); triangles about 115k; rAF p50 about 4 ms.

**Evidence:** `validation/connection-visibility-2026-10-12/`.

## Homepage → 3D City: one continuous cinematic (2026-10-12, twenty-fourth pass)

"Explore the Full 3D City" on the homepage plays a short outro and continues into /platform-city's assembly from the same camera shot.

**The outro** (3.4 s, `platform-architecture-3d/CinematicScene.tsx`):

| Time | What happens |
|---|---|
| 0–3.0 s | The camera glides, the shortest way round, to the exact first shot of the city cinematic. |
| 0.35–2.35 s | Data Sources slides out to the left and settles below the deck. |
| 0.5–2.5 s | Outputs does the same to the right. |
| 0.6–2.3 s | The CyfroAgent station leaves with Sources; Data Ingestion leaves with Outputs. |
| 1.1–2.8 s | The shared deck contracts to the Engine's own square tile. The Processing panel becomes the 5.4 m Engine deck, its kerb moves to the deck front, and the bridges and corner feet go with their sides. |
| 3.4 s | The final frame is captured as a JPEG. |

- **All transforms on existing objects,** recorded so a cancel restores the world exactly.
- **Engine untouched:** no Engine mesh, material or animation is modified. The only change to `processingMotion.ts` is a list of its non-Engine parts (packets, agent scan bar, the cable to Outputs), which the outro hides.
- **Stage glide:** the 3D stage moves to the exact rectangle the city page's stage will occupy (CSS transition 1.2 s). The page fades to its background under the nav, and the nav takes its full-width top state (`cyfro:nav-top` event) so it matches the city page's nav at the cut.

**Camera handoff contract** (`sections/cityHandoff.ts`, import-free):
- The shot is the registry Engine camera: target (−0.3, 1.5, 1.0) from the Engine chunk's origin, azimuth 14.5°, elevation 31.7°, distance 7.23.
- In homepage coordinates the Engine chunk's origin is (0.3, 0, −0.6), the reverse of the Engine frame offset, so the homepage target is (0, 1.5, 0.4).
- Both scenes share the field of view (34°, or 50° below 600 px), the portrait push-back and the orbit placement formula. `tests/city-handoff.test.cjs` pins all of this to the registry and both sources.
- The city page records its own stage rectangle per viewport size in sessionStorage. Before the first visit, the CSS-derived estimate is within 0–32 px.

**Loading and the handoff frame:**
- On hover, focus or click, the city's code is downloaded (code only; no WebGL renderer on the homepage, so never two render loops).
- At the outro's end, the frame and theme go into sessionStorage (`cyfro-city-handoff`, valid 20 s), followed by `router.push('/platform-city')`.
- While the route loads, the homepage keeps rendering the Engine-only scene.
- The city page shows the held frame over its stage until its first live frame is ready, then crossfades over 0.55 s and clears the record. Its nav does not replay its slide-in.
- If the router stalls, a normal page load follows after 12 s.

**Cancellation and accessibility:**
- Skip (navigate now) and "Stay here" / Escape (cancel and restore the homepage) during the outro.
- The page does not scroll underneath the outro.
- Repeated clicks are ignored; modified clicks (new tab or window) use the plain link.
- Reduced motion, no WebGL, or a scene that is not ready yet means ordinary navigation, and the city shows its finished overview.
- Unmount or route change cleans everything up; Back returns to the complete original homepage.

**Fixed along the way:** the homepage canvas flickered or showed blank whenever its size changed between frames. It now redraws immediately after a resize. This was visible during the outro on phones and on any window resize.

**Checks:**

| Check | Result |
|---|---|
| Unit tests | 60/60; tsc clean; build passes |
| Desktop (1440×900), real-time screencast | Engine position and size match across the last homepage frame, the held frame and the live city. No frame darker than the page background. City platforms start arriving about 4 s after the handoff. |
| Slow network (1.5 Mbit/s, 300 ms, cache off) | Homepage holds the Engine until the route arrives (+1.1 s), then the held frame and crossfade. No blank frames. |
| Mobile (390×844) | Continuous; no blank frames after the resize fix |
| Escape mid-outro | Restores in 11 ms; the next click starts in 11 ms and completes |
| Repeated clicks | One outro |
| Back | Complete homepage |
| Reduced motion | Direct to the finished overview in under 0.6 s, no veil |
| WebGL off | Homepage "unavailable" message; button goes to the city's list fallback |
| Performance (desktop) | Outro frame p50/p99 16.7/16.8 ms, max 33 ms, 0 long tasks. City's first 4 s: 16.7/16.8 ms, one 74 ms long task (construction). |
| Engine | `cyfroAiEngine.ts` hash unchanged; homepage Engine meshes untouched |

**Evidence:** `validation/homepage-outro-2026-10-12/`.

## The Engine as the city's seed: staged reveal of its support details (2026-10-12, twenty-fifth pass)

**Problem:** the homepage outro ends on the Engine alone, but the city's first frame already showed all the Engine's support details. The crossfade made them pop in at the handoff.

**Fix:** the details now belong to the city's opening, when the Engine stands alone for 4 s before the first platform. They are revealed in stages by the intro clock:
- **Hook:** a new optional `ChunkInstance.intro(T)` hook, called from `applyPresentation`.
- **Stages:** the surrounds layer is split into four stage groups (floor, panels, terminal, modules), each merged per material.
- **Seamless handoff:** the city's first frame now equals the homepage's last frame, with the Engine and its deck only.

| Stage | Window (city intro clock) | How it arrives |
|---|---|---|
| Hold | 0–0.5 s | Engine alone (the handoff crossfade happens here) |
| Floor circuitry, seams, conduit channels | 0.5–1.5 s | Rise out of the deck (3.5 cm) while spreading outward from the Engine (scale 0.9 → 1 about the device centre) |
| Conduit light trace | 0.9–2.0 s | The lit cores appear from the Engine outward to each port, with a soft glow at the trace head |
| Access hatches, fasteners, port sockets | 1.3–2.1 s | Settle up into place; socket lights dim until the light stage |
| Diagnostic monitor | 1.7–2.6 s | Rises out of the deck |
| Monitor screen boot | 2.2–2.9 s | Off → powered → header bar → title → "Starting…" with a progress bar → Ready (5 repaints only) |
| Cooling / support modules | 2.1–3.0 s | Rise 45 cm out of the deck at the back corners |
| Support lights | 2.8–3.5 s | Module status lights, vent glow and socket lights ramp up |

**Integration:**
- Pause freezes the reveal (it follows the intro clock).
- Skip and the end of the intro call `intro(null)`, so everything is in place at once.
- Replay starts from the Engine alone again.
- Reduced motion, the prototype route and the finished city never receive an intro clock, so the details are simply there.
- The Engine (`cyfroAiEngine.ts`) is untouched, and the hash test still passes.

**Checks:**
- **Tests:** 61/61. New test: stage order, a hold first, everything done 0.3 s before the first platform, `revealAt(null)` = all in place, monotone.
- tsc and lint are clean; the build passes.
- **Real-time recording:** the handoff shows no pop. The Engine holds alone, the details arrive over about 3 s, and then the camera pulls back as before. No frame is darker than the page background.
- **Pause:** two paused frames 2 s apart are pixel-identical.
- **Resume, Skip and Replay:** behave as described above.
- **Performance:** +7 draw calls in the overview (312 → 316–319) and +6 when the Engine is selected (158 → 164), from the per-stage merge. 60 fps; rAF p50 3.5–3.7 ms.

**Evidence:** `validation/engine-reveal-2026-10-12/`.

## Default overview camera calibrated to the owner's reference (2026-10-12, twenty-sixth pass)

**Root cause:** the overview preset used an earlier angle (azimuth 0.08, elevation 0.6 ≈ 34°) and a plain fit-to-screen framing. The owner's reference is lower (≈ 26.6°), straight on, a little closer, and aimed slightly left and up. All overview entry points already shared one variable (`overview`), so only that preset was wrong.

**Calibration:**
- **Setup:** rendered at a viewport whose stage equals the reference (1857×753).
- **Coarse pass:** a grid search over azimuth and elevation, scoring blurred-edge correlation, gave azimuth 0.07 and elevation 0.41.
- **Fit:** Nelder–Mead on the 17 platform labels' screen positions (measured in the reference and checked by marking them) over azimuth, elevation, distance and target x/z.
- **Result:** mean label error 34.7 → 5.9 px; edge correlation 0.32 → 0.86.
- **Camera:** azimuth 0.0032 rad, elevation 0.465 rad (26.6°), distance 30.79, target (−1.106, −0.949, 2.106).

**Preset (`engine/createCity.ts`, `overviewPreset()`):**
- **Stored relative to the fit:** `OVERVIEW_ANGLE` plus `OVERVIEW_FRAME` (distance × 0.9436; aim offset +0.029 right, −0.021 up, −0.028 forward, × the fit distance), on top of the fit-to-screen framing at that angle. Other landscape sizes keep the composition.
- **Clip guard:** if the city's outline would clip, the extra framing eases back in quarter steps toward the plain fit.
- **Portrait screens** (aspect < 0.8) keep their rotated fit.

**Entry points** — all the same `overview` value:
- end of the assembly cinematic (the camera path's last key)
- natural completion and Replay
- Skip
- the Overview button
- leaving a selected platform (panel button, Escape, empty-ground click)
- reduced-motion and direct visits, and refresh
- resize and rotation

**Verified at 1857×979:**
- Every path ends at azimuth 0.2°, elevation 26.6°, distance 30.79, with label error 5.9 px.
- No drift at +1 s or +5 s after the cinematic hands over.

**Other sizes (full city visible in each):**

| Viewport | Calibrated framing applied |
|---|---|
| 1440×900, 1280×720, 1024×768 | Full |
| 820×1180 | 75% |
| 390×844 | Portrait fit, unchanged |

**Checks:** tests 61/61; tsc and lint are clean; the build passes. The Engine and homepage are untouched.

This supersedes the 2026-10-12 default "theta 0.08 / elev 0.6" noted in earlier passes.

**Evidence:** `validation/overview-camera-2026-10-12/`.

## The way back: /platform-city → the homepage's Platform Architecture (2026-10-12, twenty-seventh pass)

Also in this pass, on the homepage: the "One platform. Every layer." section (`sections/PlatformArchitecture.tsx`) is deleted. Its `platformArch` copy stays in `en.ts` because the 3D architecture's closing caption and the old prototype route still use it. The sections now run: Hero → Why Traditional Security Platforms Fall Behind → CyfroSec Brings Together → The CyfroSec Platform → Platform Architecture 3D → CyfroAI Engine → See the platform in action → Who CyfroSec is for → Final CTA.

**City outro** (`engine/createCity.ts`, `leaveCity`, 4.8 s; "Back to home" in `CityCinematic.tsx`):
- **Start:** selection, hover and highlights are cleared, input is ignored, and the director gives a calm state (no new packets). The merged city swaps to per-platform foundations.
- **Retraction:** platforms sink into their foundations in groups, 0.9 s each, staggered 0.12 s within a group. This is presentation order, not software order.

  | Start | Group |
  |---|---|
  | 0.5 s | Reporting, CyfroAssistant, CyfroTopology, CyfroCompliance, Your team (and any teaser) |
  | 1.1 s | CyfroCode, Code hosting |
  | 1.7 s | Asset Discovery, Network Discovery, Fingerprinting, Your infrastructure, CyfroAgent |
  | 2.3 s | Scan Control, Data Ingestion, CyfroAI Insights |
  | 2.9 s | AI provider |

  A connection disappears as soon as either end starts to sink, and a label as soon as its platform does.
- **Engine details:** the support details withdraw over 3.2–4.5 s (their reveal played backwards).
- **Camera:** from wherever the visitor is to the overview by 1.2 s, then into the shared Engine shot (`cityHandoff.ts`) by 4.6 s.
- **Handoff:** at 4.8 s the Engine-only frame (JPEG) and the stage rectangle are written to the handoff record (`to: 'home'`), followed by `router.push('/#architecture-detail', { scroll: false })`. A normal page load follows after 12 s if the router stalls.
- **Controls:** Skip (go now, with no reassembly at home) and Stay here / Escape (`cancelLeave` → the full city and the overview). It runs even while paused, works from any camera state, and interrupts a running assembly.
- **Fallbacks:** reduced motion, no 3D or a modified click navigate straight to the section.

**Homepage return** (`ArchitectureCinematic.tsx`, `CinematicScene.tsx` with `entry: 'return'`):
- **Landing:** a layout effect centres the stage under the nav before the first paint, re-centring for 0.9 s while content above settles.
- **Hold:** the stage starts fixed at the city stage's rectangle, the page is behind the backdrop, the nav is in its top state with no slide-in, and the city frame is held over the stage.
- **Starting state:** the scene starts in the outro's end state: Engine only, deck contracted, camera on the shared shot.
- **Reassembly:** once ready, the held frame crossfades (0.45 s). Then the stage glides back into the page (1.2 s) while the backdrop fades and the outro plays backwards (3.4 s): the camera returns to the overview, Data Sources and Outputs slide back with their stations, the deck re-expands, and the bridges and cable return.
- **Finish:** every recorded transform is restored exactly, the original 20 s introduction is not replayed, and focus moves to the section heading.
- **Skip / Escape:** the architecture completes at once. A 6 s safety net covers a scene that never loads; no WebGL shows the page as is.

**Checks:**

| Scenario | Result |
|---|---|
| Round trip (1440×900), recorded | City retracts by group, the Engine is isolated, the homepage continues from the same frame and reassembles. Lands `/#architecture-detail` with the stage at 161–827 of 900, intro "done", focus on the heading. No frame darker than the page background. |
| Leaving from the overview, a selected CyfroCode, rotated 180° and zoomed, mid-assembly (T = 20 s), paused | All land identically |
| Skip | Complete architecture at once, no tour |
| Stay here | Remains in the city |
| Reduced motion | Section in under 0.5 s, no animation |
| No WebGL | List view, then the section |
| Browser Back / Forward | Plain navigation (no cinematic, scroll restored) |
| Mobile (390×844) | Recorded; works |
| Three client-side round trips | Heap after GC 37.9 → 40.3 → 41.3 → 41.6 MB; DOM nodes about 20.2k; listeners about 2.0k (stable) |
| Frame times | City outro p50/p99 16.7/16.8 ms, with one long frame (83–117 ms) at the final-frame capture. Homepage reassembly 16.7/16.8 ms, max 16.8 ms. |
| Code checks | Tests 61/61; tsc and lint clean; build passes; `cyfroAiEngine.ts` hash unchanged; homepage Engine meshes untouched |

**Evidence:** `validation/return-journey-2026-10-12/`.

## Codebase cleanup (2026-10-12, twenty-eighth pass)

Code quality, security and performance only. No visual or behavioural change intended, and none measured.

**Baseline:**
- Tests 61/61; tsc clean; build passes; lint 0 errors and 8 warnings. Three warnings predate the city (`<img>` in the chat widget and the header logo). Five were in validation scripts copied into `docs/`.
- **Visual baseline:** 11 deterministic captures (`validation/cleanup-2026-10-12/cleanup-capture.sh`): the homepage architecture in reduced motion; the city at intro T = 1 s, 3.8 s, 20 s, 40 s; overview; selected CyfroCode; transport; pending approval; mobile; reduced motion.
- **Noise floor:** two baseline runs differ by 0.000% in every city frame and by 0.048% on the homepage (tooltip area).
- **Performance:** overview 320 draw calls / 60 fps; selected 193; assembly T = 45 s 505; homepage scene p50/p99 16.7/16.8 ms.

**Audit findings and removals** (each confirmed unreferenced: static and dynamic imports, tests, scripts, CSS-module usage):

| Removed | Why it was dead |
|---|---|
| `.directory` / `.dirGroup*` CSS and their focus selector | The old HTML directory, replaced by the Platforms menu |
| `cableData`, `cableAI`, `cableExt`, `cableAppr` (with their theme lines), `mysteryRim` materials | Cables have per-cable materials since the connection-visibility pass |
| `drawFingerprint`, `drawSignin` canvas screens and their screen ids | No builder has shown them since the Fingerprinting and Your team redesigns |
| `toPose`, `fromPose`, `Pose` in the city orbit; the unused `fromPose` re-export from `createCity`; unused `Transport`, `Timeline`, `CityScreens` type aliases | Nothing used them |
| A stray screenshot (`nav-product2.png`) in the repository root | Left by a validation tool |
| Stale comments (CityCinematic, CityScene, the Platforms menu CSS) | Described removed features |

**Consolidated:**
- **`kit/merge.ts` `mergeStaticMeshes()`** replaces two hand-written per-material merges: per platform in `createCity` and per reveal stage in `engineSurrounds`. Transforms are now group-relative (identical results here, and safe if a group is ever offset). The city-wide merge stays separate because it keeps originals hidden for the assembly swap.
- **Duplicated CSS rules merged** (`.pageBar` transition, `.pageTools` justify-content), with identical computed styles.
- **Per-frame allocations removed:** the approval-decision lookup (17 × `Object.entries` per frame) and the surrounds' side lists.

**Reviewed and left as they are:**
- **Animation loop:** one `requestAnimationFrame` loop for the city. The page's other rAF is a one-shot layout measure; all timers are one-shot and cleared. Hidden, off-screen and not-yet-built platforms already skip their updates.
- **Small helpers:** duplicated `smooth`/`seg` helpers are kept on purpose, because import-free registry and plan modules must stay loadable by `node --test`.
- **Prototype routes:** `app/prototype/city` and `/platform-architecture` are kept (rollback and review routes; removing them before release is an owner decision).
- **Protected code:** the CyfroAI Engine and the homepage's original scene structure are untouched.

**Security / leak audit** (built bundles, not just source):
- The denylist check (`scripts/check-city-leaks.mjs` with the out-of-repo list): 0 matches in the 4 city bundles.
- City and homepage-3D bundles: no provider names, residency or region claims, internal hosts (OVH / staging / AWS), credentials, tokens or personal paths. The only environment-variable names are the public `NEXT_PUBLIC_BASE_PATH` / `NEXT_PUBLIC_ARCH_SCENE`.
- No source maps shipped. `TEASERS` is still empty (tripwire test).

**New tests** (`tests/city-cleanup.test.cjs`, 4):
- the merge utility: result, skip and threshold rules, geometry preserved, geometries returned for disposal
- handoff records: direction-filtered and expiring
- customer boundary: every flow into your environment rides CyfroAgent's own outbound connection
- homepage: section order, the removed section, and the original scene still the default with its own intro

**After:**
- Tests 65/65; tsc clean; build passes; lint 0 errors and 3 warnings (pre-existing).
- **Visual:** every city frame within 0.001% of the baseline (single pixels on animated LEDs or screens, from load timing); homepage 0.048% (noise).
- **Resources:** draw calls, triangles, geometries and textures identical.
- **Performance:** overview 320 / selected 193 / assembly 505 draw calls, 60 fps, p99 16.8 ms; homepage unchanged.
- **Other checks:** Engine harness identical; assembly audit 0 violations at 50 moments; replay counts stable (389 / 38); round trip still lands on the section without the intro.

**Evidence:** `validation/cleanup-2026-10-12/` (before / after captures, `visual-diff.txt`, perf).
