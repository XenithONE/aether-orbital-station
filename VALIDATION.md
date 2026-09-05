# Validation report

## Version 2 — WebGPU expedition (2026-09-05)

The simulator now uses Three.js 0.185.1 WebGPURenderer with the same rendering family as the independent viewer. All custom cosmos shading uses TSL. The station HDRI is included locally. The old WebGLRenderer implementation described in the version 1 history below has been replaced.

Verified against the Vite production build on localhost:

- Native WebGPU initialization and local HDRI/model/texture loading: passed.
- Initial material preparation renders all four rooms and three sectors before enabling entry. One measured native run took 4.36 seconds for this preparation, excluding downloads. This is device-dependent.
- Physical observation-room console → route choice → charging → warp → Aurora → exterior view → Gargantua: passed.
- UI-free PNG capture of the destination through the cupola: passed; the saved image was inspected.
- Walk to the orrery, activate it, and observe the expanded planetary model: passed.
- Walk to the MILO charging dock, start its flight, and observe the moving Blender-authored drone: passed.
- Walk to the biosphere control, activate growing foliage and lights: passed.
- Walk to the laboratory scanner, collect all three records for the current sector, and read the log: passed.
- Closed hatch collision, open hatch passage into the transit corridor, and furniture collision: passed.
- Window shutter movement, reactor power reduction/recovery, reactor-off warp interlock, zero-gravity ascent/descent, and interior/exterior switching: passed.
- Separate navigation-state tests cover charge cancellation, loss of power while charging, repeated round trips, all nine discoveries, duplicate prevention, saved-record reload and corrupt-save handling.
- Automatic WebGL 2 fallback with `navigator.gpu` unavailable: passed. Gargantua arrival was visually inspected; switching to the low rendering preset also passed without a page error.
- Emulated touch Chromium at 390×844: standard quality and reduced-motion preference selected correctly, directional-pad movement passed, all three route cards were available, and Aurora arrival was visually inspected. No horizontal page overflow or page errors were observed. This is browser emulation, not a physical-phone test.
- Split final fallback and mobile checks returned explicit passing results after the combined screenshot run exceeded the CLI wrapper time limit.

Visual iteration:

1. Replaced rigid blanket blocks with draped cloth geometry, softened pillows, and replaced floating vertical bars with short bed rails and ladders.
2. Reduced reactor glare and added an inner illuminated axis, induction collars and a rotating slotted sleeve.
3. Stowed the inactive projection and moved small control indicators onto their physical controls.
4. Refined spiral-arm dust, the alien planet and the accretion-disk composition over several captures.
5. Fixed distant black-hole silhouette artifacts caused by overlapping surfaces. A single depth-tested TSL composition now draws its dark centre, disk and light rings. The actual interior/GTAO setup was checked from centre and angled viewpoints under WebGPU and WebGL 2.
6. Changed interaction selection to favour the control the player is looking toward and suppressed control prompts during warp.

During settled desktop exploration, sampled rendering was approximately 55–60 FPS at 1440×1000 on this workstation. First material use can cost more; initialization now prepares the main views. No claim is made about this frame rate on other hardware.

Audio synthesis and its state triggers were exercised, but subjective sound quality was not assessed by listening. The distant celestial environments, gravitational-lensing appearance and warp routes are authored visual approximations, not a physical astronomy simulation.

The original exterior remains Blender MCP authored. The new MILO model was created by the installed Blender 5.2 in background mode because the Blender MCP endpoint was not running. Its editable source and generator are included.

Local evidence and replay scripts are under `output/playwright/odyssey-*` (excluded from Git).

## Version 1 history

Verified on 2026-09-05 with Playwright CLI and Chromium on this workstation. The screenshots were inspected, not only DOM assertions.

## Station simulator

- Production TypeScript / Vite build: passed.
- Initial GLB and texture loading: passed. Entry waits for initial assets.
- Observation console: close/open shutters; visible panel movement: passed.
- Collision against console furniture: passed.
- Walk up to the cupola hatch, open it with E, walk into the corridor: passed.
- Map travel to all four rooms: passed.
- Cabin lighting normal/night modes: passed.
- Solar control state: passed.
- Reactor off/on and observable power decline/recovery: passed.
- Artificial gravity off; rise using Space, descend using Q; restore gravity: passed.
- Navigation beacon: passed.
- Audio on/off UI and audio-context initialization: passed. Subjective sound quality was not assessed by listening.
- UI-free PNG download: passed; downloaded image inspected.
- Interior/exterior switching and return position: passed.
- Mobile viewport 390×844 with touch capability: passed.
- Mobile directional pad and map travel: passed.
- Mobile uses 2K planet imagery and the standard rendering preset.

Issues found and fixed during iteration:

1. Earth position overwhelmed the exterior and obscured the station silhouette; corrected the framing.
2. Static screen housings covered their display planes; moved displays in front of their bezels.
3. CSS display rules overrode hidden attributes; added a consistent hidden rule.
4. Habitat and lab arrival positions intersected furniture; moved spawns into clear floor space.
5. Hatch frame gaps and missing frame colliders allowed incorrect passage; closed gaps and added proxies.
6. The opaque reactor sleeve hid the animated core; changed the sleeve to glass.
7. Exterior GLB lacked UVs and embedded PBR maps; authored world-projected UVs and embedded the image textures.
8. Added bevels, panel joints, fasteners, interior bunk depth, thinner plant leaves and lighter mobile assets.

Observed desktop rendering during sampled station exploration: approximately 60 FPS at 1440×1000 on this workstation. This is not a guarantee for other devices. Diagnostic triangle counts include normal, shadow and post-processing passes rather than unique asset triangles.

## Standalone WebGPU viewer

- Three.js version: 0.185.1, pinned consistently across imports and decoders.
- Native WebGPU backend: passed.
- Forced WebGL 2 backend: passed.
- Automatic fallback with `navigator.gpu` unavailable (simulated with an initialization script): passed.
- HDRI studio, bronze/ceramic/glass demo, 3-light rig, shadows, GTAO and Bloom: visually inspected.
- Local embedded-texture Meshopt GLB selection: passed with the station asset.
- Actual `DataTransfer` file-drop event: passed with the station GLB.
- Replacement followed by reload: passed.
- Invalid GLB: error shown; previous valid model preserved.
- Exposure control and automatic rotation: passed.
- UI-free PNG download: passed and visually inspected.
- Mobile responsive settings panel: inspected at 390×844.

The test browser blocked direct `file://` navigation at its automation boundary. HTTP/localhost execution was verified. The HTML is one file, but Three.js/decoder modules and the initial HDRI need network access. The guide includes a localhost alternative for browsers that restrict direct-file execution.

Draco, KTX2 and animation-loader support are configured using official loaders; a separate Draco/KTX2/animated fixture was not used in this test run. Complex nested transmission is subject to real-time renderer limitations. This project does not claim a Cycles-equivalent path-traced renderer.

Known non-fatal console messages: Rapier compatibility initialization deprecation warning in the simulator, and the expected automatic-fallback warning when WebGPU is intentionally unavailable. The invalid-file test intentionally generates a handled error.

## Published deployment

GitHub Pages deployment succeeded for commit `20ee5cb` on 2026-09-05. A fresh Chromium session verified the public HTTPS URLs:

- [Station](https://xenithone.github.io/aether-orbital-station/): model/texture loading, entry, keyboard walking and map travel passed.
- [WebGPU station viewer](https://xenithone.github.io/aether-orbital-station/viewer.html?station=1): the shared GLB loaded with the native WebGPU backend.
- [WebGL 2 viewer](https://xenithone.github.io/aether-orbital-station/viewer.html?backend=webgl): fallback rendering passed.
- No HTTP responses with status 400 or higher, or uncaught page errors, occurred during these public checks.
- Published landing, observation room and WebGPU station screenshots were inspected.

The first workflow started before Pages was enabled and failed at site configuration; enabling Pages and running the next deployment resolved it. Local verification evidence is under `output/playwright/` (excluded from Git).
