# Asset credits and licenses

## Original work

AETHER station geometry, interior geometry, instrument displays, signs, UI, generated audio and application code were created for this project. The user-supplied image was used as visual reference and is not included in this repository or deployment.

- The original double-ring station was authored with Blender MCP. Source: `blender/aether-station.blend` and `blender/build_station.py`.
- MILO, the survey drone, was newly authored in Blender. Its source is `blender/survey-drone.blend` and `blender/build_survey_drone.py`; the exported asset is `public/assets/survey-drone.glb` (approximately 1.03 MB). Blender MCP was unavailable for this addition, so the installed Blender executable was run in background mode. The drone is original geometry, not a downloaded third-party model.
- The expanded interiors include original panel and fastener geometry, pipes, cables, fabric details, hydroponic growth, a six-planet holographic orrery, and the drone's charging dock.
- The Aurora and Gargantua destinations, their nebulae, artistic accretion and lensing effects, and the warp tunnel are original procedural Three.js / TSL artwork in `src/cosmos.ts`. No additional astronomy image assets were downloaded for these destinations. Their appearances are artistic approximations, not numerical astronomy simulations.
- Destination names, the nine observation entries, and the navigation UI are authored fiction. Environmental audio and the warp sweeps are synthesized with Web Audio; no third-party sound recordings are used.

## Poly Haven — CC0

Source and license: https://polyhaven.com/license

- Metal Plate — https://polyhaven.com/a/metal_plate — diffuse, OpenGL normal and roughness, 1K. Floor material.
- Metal Plate 02 — https://polyhaven.com/a/metal_plate_02 — diffuse, OpenGL normal and roughness, 1K. Hull material and embedded GLB textures.
- Blue Metal Plate — https://polyhaven.com/a/blue_metal_plate — diffuse, OpenGL normal and roughness, 1K. Hatches and service panels.
- Studio Small 09 — https://polyhaven.com/a/studio_small_09 — 1K HDRI used by both the simulator and the standalone viewer. The simulator includes the original HDR file at `public/assets/studio_small_09_1k.hdr` (approximately 1.62 MB); the standalone single-HTML viewer fetches it from Poly Haven's CDN.

Textures are tiled and used with material color, roughness and normal-strength adjustments. Both applications derive environment lighting and reflections from the HDRI. The viewer links to the original HDRI page.

## Solar System Scope / INOVE — CC BY 4.0

Source: https://www.solarsystemscope.com/textures/

License: https://creativecommons.org/licenses/by/4.0/

- `8k_earth_daymap.jpg`
- `8k_earth_clouds.jpg`
- `2k_earth_daymap.jpg` and `2k_earth_clouds.jpg` for touch devices
- `2k_stars_milky_way.jpg`

Credit: **Solar System Scope / INOVE**, based on NASA elevation and imagery data. Source images were downloaded unchanged; rendering uses rotation, color management, lighting and cloud transparency. No endorsement is implied.

## NASA / Three.js examples

- `earth_night.png`, originally `earth_lights_2048.png` from https://threejs.org/examples/textures/planets/earth_lights_2048.png
- Three.js: https://github.com/mrdoob/three.js — MIT license.
- NASA imagery use guidance: https://www.nasa.gov/nasa-brand-center/images-and-media/

## Libraries and typography

- Three.js — MIT.
- Rapier — Apache-2.0.
- Vite — MIT.
- TypeScript — Apache-2.0.
- glTF Transform — MIT.
- Manrope and DM Sans — Google Fonts, SIL Open Font License; system fonts are used when unavailable.

Third-party assets retain their respective licenses. The source-code license does not replace these terms.
