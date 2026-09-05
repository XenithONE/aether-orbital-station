# Validation report

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

Local verification evidence is under `output/playwright/` (excluded from Git). Production deployment checks are performed after publishing.
