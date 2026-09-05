import * as T from 'three/webgpu';
import { float, mix, mx_noise_float, positionLocal, smoothstep, uniform, uv, vec2, vec3 } from 'three/tsl';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type WarpPresentation = {
  phase: 'idle' | 'charging' | 'jumping' | 'arriving';
  progress: number; intensity: number; reducedMotion: boolean;
};
const ease = (value: number) => { const x = T.MathUtils.clamp(value, 0, 1); return x * x * (3 - 2 * x); };

/** A bounded, real 3D funnel surrounds the station. Its furthest point is less
 * than 490 m away, in front of Earth, yet the perspective, gas and moving rings
 * imply a much longer passage. Every material retains the cabin's depth test.
 * Navigation supplies phase/progress; this module owns presentation only. */
export function createWarpEffects(coarse: boolean) {
  const group = new T.Group(); group.name = 'FOLD DRIVE · spatial passage'; group.visible = false; group.renderOrder = 20;
  let state: WarpPresentation = { phase: 'idle', progress: 0, intensity: 0, reducedMotion: false };
  let elapsed = 0, flowTime = 0, coverAmount = 0, apertureAmount = 0, ringAmount = 0, chargingAmount = 0;
  const clock = uniform(0), cover = uniform(0), reveal = uniform(0), revealActive = uniform(0), energy = uniform(0), travel = uniform(0);

  // A gently curved surface, with a flared near end and a distant exit, gives
  // moving geometry actual parallax while remaining closer than the planets.
  const profile = (t: number) => {
    const points = [[420, 180], [240, 390], [0, 425], [-150, 375], [-300, 250], [-400, 115], [-450, 38], [-470, 8]];
    const a = T.MathUtils.clamp(t, 0, 1) * (points.length - 1), i = Math.min(points.length - 2, Math.floor(a)), f = ease(a - i);
    return { z: T.MathUtils.lerp(points[i][0], points[i + 1][0], f), r: T.MathUtils.lerp(points[i][1], points[i + 1][1], f) };
  };
  const radial = coarse ? 64 : 96, longitudinal = coarse ? 56 : 84;
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  for (let j = 0; j <= longitudinal; j++) {
    const t = j / longitudinal, p = profile(t);
    for (let i = 0; i <= radial; i++) {
      const angle = i / radial * Math.PI * 2;
      positions.push(Math.cos(angle) * p.r, Math.sin(angle) * p.r, p.z); uvs.push(i / radial, t);
      if (j < longitudinal && i < radial) { const first = j * (radial + 1) + i; indices.push(first, first + 1, first + radial + 2, first, first + radial + 2, first + radial + 1); }
    }
  }
  const shellGeometry = new T.BufferGeometry(); shellGeometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); shellGeometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); shellGeometry.setIndex(indices); shellGeometry.computeVertexNormals();
  const tunnelMaterial = new T.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide });
  const theta = uv().x.mul(Math.PI * 2), depth = uv().y;
  const virtualDepth = depth.div(float(1.13).sub(depth)).mul(2.5);
  const gasCoordinate = vec3(theta.cos().mul(3.2), theta.sin().mul(3.2), virtualDepth.sub(clock.mul(.52)));
  const gas = mx_noise_float(gasCoordinate).mul(.55).add(mx_noise_float(gasCoordinate.mul(2.3)).mul(.28)).add(mx_noise_float(gasCoordinate.mul(5.7)).mul(.12));
  const helical = theta.mul(5).add(virtualDepth.mul(2.8)).sub(clock.mul(1.45)).add(gas.mul(4));
  const fibres = helical.sin().mul(.5).add(.5).pow(10).mul(gas.mul(.55).add(.6));
  const nebula = smoothstep(-.25, .35, gas), pulses = virtualDepth.mul(4.5).sub(clock.mul(3.5)).sin().mul(.5).add(.5).pow(14);
  const palette = mix(vec3(.028, .018, .11), vec3(.025, .19, .28), gas.mul(2).add(.5).clamp());
  tunnelMaterial.colorNode = palette.mul(nebula.mul(1.9).add(.3))
    .add(vec3(.035, .43, .74).mul(fibres).mul(.8))
    .add(vec3(.32, .08, .6).mul(pulses).mul(fibres).mul(.6))
    .add(vec3(.002, .008, .023));
  const angularRadius = positionLocal.xy.length().div(positionLocal.z.negate().max(1));
  const opened = float(1).sub(smoothstep(reveal.sub(.055).max(0), reveal.add(.055), angularRadius)).mul(revealActive);
  tunnelMaterial.opacityNode = cover.mul(float(1).sub(opened));
  const tunnel = new T.Mesh(shellGeometry, tunnelMaterial); tunnel.name = 'Curved volumetric passage'; tunnel.frustumCulled = false; group.add(tunnel);

  // The end caps seal the old vista throughout transit, including its centre.
  const capMaterial = new T.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide });
  const capP = uv().sub(.5).mul(2), capR = capP.length(), capA = capP.y.atan(capP.x);
  const vortex = capA.mul(6).add(capR.mul(17)).sub(clock.mul(1.4));
  capMaterial.colorNode = vec3(.009, .022, .07).add(vec3(.07, .24, .47).mul(vortex.sin().mul(.5).add(.5).pow(7)).mul(float(1).sub(capR).max(.1)));
  capMaterial.opacityNode = cover.mul(float(1).sub(revealActive.mul(smoothstep(0, .05, reveal))));
  const farCap = new T.Mesh(new T.CircleGeometry(8.2, 64), capMaterial); farCap.position.z = -470.4; group.add(farCap);
  const backCap = new T.Mesh(new T.CircleGeometry(181, 64), tunnelMaterial); backCap.position.z = 420.4; group.add(backCap);

  // A luminous aperture grows from a small spatial tear into the passage.
  const apertureMaterial = new T.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
  const apertureNoise = mx_noise_float(vec3(positionLocal.x.mul(8), positionLocal.y.mul(8), clock.mul(.6))).mul(.35).add(.75);
  apertureMaterial.colorNode = mix(vec3(.12, .45, 1.45), vec3(1.45, 2.2, 2.55), apertureNoise).mul(energy).mul(.75);
  apertureMaterial.opacityNode = energy.mul(.8);
  const aperture = new T.Mesh(new T.TorusGeometry(1, .017, coarse ? 6 : 10, coarse ? 128 : 192), apertureMaterial);
  aperture.name = 'Spacetime aperture'; aperture.renderOrder = 10; group.add(aperture);
  const apertureEcho = new T.Mesh(new T.TorusGeometry(1, .004, 6, coarse ? 96 : 160), apertureMaterial); apertureEcho.renderOrder = 11; group.add(apertureEcho);

  // Rings are physical instanced geometry passing the station, not a streak
  // sprite laid over the viewport. Their motion accelerates into the tunnel.
  const ringMaterial = new T.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
  ringMaterial.colorNode = vec3(.08, .75, 1.35).mul(energy.mul(.4).add(.25)); ringMaterial.opacityNode = travel.mul(.32);
  const ringCount = coarse ? 12 : 22;
  const rings = new T.InstancedMesh(new T.TorusGeometry(1, .006, 5, coarse ? 64 : 96), ringMaterial, ringCount); rings.frustumCulled = false; rings.name = 'Passing energy rings'; rings.renderOrder = 5; group.add(rings);

  // Actual helical filaments wind around the funnel, separated from its wall.
  const filamentParts: T.BufferGeometry[] = [];
  const filamentCount = coarse ? 7 : 12;
  for (let i = 0; i < filamentCount; i++) {
    const points: T.Vector3[] = [];
    for (let j = 0; j <= 64; j++) {
      const t = .18 + j / 64 * .81, p = profile(t), angle = i / filamentCount * Math.PI * 2 + t * Math.PI * 4.5;
      points.push(new T.Vector3(Math.cos(angle) * p.r * .972, Math.sin(angle) * p.r * .972, p.z));
    }
    filamentParts.push(new T.TubeGeometry(new T.CatmullRomCurve3(points), coarse ? 70 : 100, .43, 4, false));
  }
  const filamentMaterial = new T.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending });
  const pulse = positionLocal.z.mul(.075).add(clock.mul(5)).sin().mul(.5).add(.5).pow(5);
  filamentMaterial.colorNode = mix(vec3(.15, .07, .75), vec3(.14, 1.15, 1.75), pulse).mul(.8);
  filamentMaterial.opacityNode = travel.mul(.48);
  const filaments = new T.Mesh(mergeGeometries(filamentParts), filamentMaterial); filaments.name = 'Helical plasma filaments'; filaments.renderOrder = 4; group.add(filaments); filamentParts.forEach(part => part.dispose());

  // Converging motes are small real meshes. They gather around the aperture in
  // charge, then become high-speed particles flowing along the tunnel wall.
  let seed = 3917; const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const particleCount = coarse ? 180 : 360;
  const particleData = Array.from({ length: particleCount }, () => ({ angle: random() * Math.PI * 2, phase: random(), radius: random(), speed: .7 + random() * .6 }));
  const particleMaterial = new T.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending });
  particleMaterial.colorNode = vec3(.34, 1.4, 2.1); particleMaterial.opacityNode = energy.mul(.66);
  const particles = new T.InstancedMesh(new T.OctahedronGeometry(1, 0), particleMaterial, particleCount); particles.frustumCulled = false; particles.name = 'Converging spatial particles'; particles.renderOrder = 8; group.add(particles);
  const matrix = new T.Matrix4(), quaternion = new T.Quaternion(), position = new T.Vector3(), scale = new T.Vector3();

  function applyState(next: WarpPresentation) {
    state = { ...next, progress: T.MathUtils.clamp(next.progress, 0, 1), intensity: T.MathUtils.clamp(next.intensity, 0, 1) };
    const p = state.progress;
    group.visible = state.phase !== 'idle';
    if (state.phase === 'idle') { coverAmount = 0; apertureAmount = 0; ringAmount = 0; chargingAmount = 0; }
    else if (state.phase === 'charging') { chargingAmount = ease(p); coverAmount = ease((p - .66) / .34) * .55; apertureAmount = ease(p); ringAmount = ease((p - .25) / .75) * .32; }
    else if (state.phase === 'jumping') { chargingAmount = 1; coverAmount = .55 + ease(p / .13) * .45; apertureAmount = 1 + ease(p / .2) * 3.7; ringAmount = .32 + ease(p / .15) * .68; }
    else { chargingAmount = 1 - ease(p); coverAmount = 1 - ease((p - .87) / .13); apertureAmount = Math.pow(ease((p - .18) / .72), 1.7) * 2.6; ringAmount = 1 - ease(p); }
    cover.value = coverAmount;
    revealActive.value = state.phase === 'arriving' && p > .18 ? 1 : 0;
    reveal.value = state.phase === 'arriving' ? apertureAmount : 0;
    energy.value = state.phase === 'idle' ? 0 : state.phase === 'charging' ? .12 + chargingAmount * .88 : state.phase === 'arriving' ? 1 - ease((p - .72) / .28) : 1;
    travel.value = ringAmount;
    aperture.visible = state.phase === 'charging' || state.phase === 'arriving' || state.phase === 'jumping' && p < .22;
    apertureEcho.visible = aperture.visible;
  }

  function update(dt: number) {
    if (!group.visible) return;
    elapsed += Math.max(0, Math.min(dt, .1));
    const motion = state.reducedMotion ? .045 : 1;
    const speed = state.phase === 'charging' ? .025 + chargingAmount * .055 : state.phase === 'jumping' ? .11 + ease(state.progress / .25) * .19 : .3 * (1 - ease(state.progress));
    flowTime += dt * speed * motion; clock.value = elapsed * motion;
    if (state.phase === 'arriving') {
      const angular = apertureAmount, distance = 465 / Math.sqrt(1 + angular * angular);
      aperture.position.set(0, 0, -distance); aperture.scale.setScalar(Math.max(2, angular * distance));
    } else if (state.phase === 'jumping') {
      const r = 108 + ease(state.progress / .2) * 350, z = -Math.sqrt(Math.max(30 * 30, 470 * 470 - r * r));
      aperture.position.set(0, 0, z); aperture.scale.setScalar(r);
    } else { aperture.position.set(0, 0, -420); aperture.scale.setScalar(4 + chargingAmount * 104); }
    aperture.rotation.z = elapsed * motion * .3;
    apertureEcho.position.copy(aperture.position); apertureEcho.position.z += 2; apertureEcho.scale.copy(aperture.scale).multiplyScalar(1.07); apertureEcho.rotation.z = -elapsed * motion * .2;
    filaments.rotation.z = elapsed * motion * .07;
    for (let i = 0; i < ringCount; i++) {
      const t = 1 - ((i / ringCount + flowTime) % 1), p = profile(t);
      position.set(0, 0, p.z); scale.setScalar(p.r * .985); matrix.compose(position, quaternion, scale); rings.setMatrixAt(i, matrix);
    }
    rings.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < particleCount; i++) {
      const data = particleData[i];
      if (state.phase === 'charging') {
        const cycle = (data.phase + elapsed * (.1 + chargingAmount * .4) * motion) % 1;
        const r = (55 + data.radius * 240) * (1 - cycle) + aperture.scale.x * cycle;
        const angle = data.angle + elapsed * motion * .18;
        position.set(Math.cos(angle) * r, Math.sin(angle) * r, -100 - cycle * 305);
        scale.setScalar(.27 + (1 - cycle) * .8);
      } else {
        const t = 1 - ((data.phase + flowTime * data.speed * 1.6) % 1), p = profile(t), angle = data.angle + t * 3;
        position.set(Math.cos(angle) * p.r * .91, Math.sin(angle) * p.r * .91, p.z); scale.set(.3, .3, state.reducedMotion ? .3 : 1.5 + ringAmount * 3);
      }
      matrix.compose(position, quaternion, scale); particles.setMatrixAt(i, matrix);
    }
    particles.instanceMatrix.needsUpdate = true;
  }
  applyState(state);
  return { group, setState: applyState, update,
    setView(inside: boolean) { group.rotation.set(inside ? 0 : -.28, inside ? 0 : .65, 0); },
    getState: () => ({ phase: state.phase, progress: state.progress, cover: coverAmount, aperture: apertureAmount, tunnelVisibility: group.visible, ringAmount, reducedMotion: state.reducedMotion }),
  };
}
