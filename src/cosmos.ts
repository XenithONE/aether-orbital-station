import * as T from 'three/webgpu';
import { attribute, cameraPosition, dot, float, mix, mx_noise_float, normalWorld, positionLocal, positionWorld, smoothstep, texture, uniform, uv, vec2, vec3 } from 'three/tsl';
import { asset } from './materials';

export type Destination = 'sol' | 'aurora' | 'gargantua';

/** Cinematic vistas, not a general-relativity simulation. TSL shading supports
 * WebGPU and WebGL 2. Celestial layers remain far beyond the station hull. */
export function createCosmos(scene: T.Scene) {
  const group = new T.Group(); group.name = 'Distant celestial environment'; scene.add(group);
  const sol = new T.Group(), aurora = new T.Group(), gargantua = new T.Group(); group.add(sol, aurora, gargantua);
  const destinations = { sol, aurora, gargantua };
  let destination: Destination = 'sol', inside = false, elapsed = 0, warpAmount = 0;
  const phase = uniform(0), warp = uniform(0);
  const coarse = matchMedia('(pointer: coarse)').matches, planetResolution = coarse ? '2k' : '8k';
  const loader = new T.TextureLoader();
  const image = (name: string, srgb = false) => { const tex = loader.load(asset(name)); tex.anisotropy = 8; if (srgb) tex.colorSpace = T.SRGBColorSpace; return tex; };
  let seed = 873491; const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };

  // The orbital terminator must not move when the cabin lighting rig changes.
  const sunlight = vec3(new T.Vector3(-.66, .46, .61).normalize());
  const sunDot = dot(normalWorld.normalize(), sunlight), dayside = smoothstep(-.12, .19, sunDot);
  const day = texture(image(`${planetResolution}_earth_daymap.jpg`, true)), night = texture(image('earth_night.png', true));
  const earthMaterial = new T.MeshBasicNodeMaterial();
  earthMaterial.colorNode = day.rgb.mul(sunDot.max(0).mul(1.08).add(.035)).mul(dayside)
    .add(night.rgb.mul(vec3(1.7, 1.08, .48)).mul(float(1).sub(dayside))).add(vec3(.003, .009, .02).mul(float(1).sub(dayside)));
  const earth = new T.Mesh(new T.SphereGeometry(1400, 128, 80), earthMaterial);
  earth.name = 'SOL · Earth day / city lights'; earth.rotation.set(0, 3.9, .4); sol.add(earth);
  const cloudMaterial = new T.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  cloudMaterial.colorNode = vec3(.89, .95, 1).mul(sunDot.max(0).mul(1.28).add(.1));
  cloudMaterial.opacityNode = texture(image(`${planetResolution}_earth_clouds.jpg`)).r.mul(.83);
  const clouds = new T.Mesh(new T.SphereGeometry(1404, 112, 72), cloudMaterial);
  clouds.name = 'Earth · separate cloud layer'; clouds.rotation.copy(earth.rotation); sol.add(clouds);
  const view = cameraPosition.sub(positionWorld).normalize();
  const rim = float(1).sub(dot(view, normalWorld.normalize()).abs()).clamp();
  const atmosphereMaterial = new T.MeshBasicNodeMaterial({ transparent: true, blending: T.AdditiveBlending, depthWrite: false });
  atmosphereMaterial.colorNode = mix(vec3(.04, .18, .7), vec3(.18, .6, 1.8), rim.pow(3)).mul(sunDot.mul(.8).add(.3).clamp(.03, 1));
  atmosphereMaterial.opacityNode = rim.pow(5).mul(.85);
  const atmosphere = new T.Mesh(new T.SphereGeometry(1420, 112, 72), atmosphereMaterial);
  atmosphere.name = 'Earth · illuminated atmospheric limb'; sol.add(atmosphere);
  const moonMaterial = new T.MeshBasicNodeMaterial();
  const lunarNoise = mx_noise_float(positionLocal.mul(.11)).mul(.14).add(mx_noise_float(positionLocal.mul(.38)).mul(.05));
  moonMaterial.colorNode = vec3(.28, .29, .31).add(lunarNoise).mul(sunDot.max(0).mul(1.2).add(.02));
  const moon = new T.Mesh(new T.SphereGeometry(63, 48, 32), moonMaterial); moon.position.set(2000, 700, -4900); sol.add(moon);

  // One merged draw call. Quads avoid WebGPU's 1-pixel Points size limit.
  type Star = { p: T.Vector3; size: number; tint: T.Color };
  const mergedStars = (stars: Star[], opacity = 1) => {
    const positions: number[] = [], colors: number[] = [], uvs: number[] = [], indices: number[] = [];
    const direction = new T.Vector3(), right = new T.Vector3(), up = new T.Vector3();
    for (const star of stars) {
      direction.copy(star.p).normalize(); right.crossVectors(direction, Math.abs(direction.y) > .98 ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 1, 0)).normalize(); up.crossVectors(right, direction).normalize();
      const first = positions.length / 3;
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const point = star.p.clone().addScaledVector(right, x * star.size).addScaledVector(up, y * star.size);
        positions.push(point.x, point.y, point.z); colors.push(star.tint.r, star.tint.g, star.tint.b); uvs.push((x + 1) / 2, (y + 1) / 2);
      }
      indices.push(first, first + 1, first + 2, first, first + 2, first + 3);
    }
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3)); geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeBoundingSphere();
    const material = new T.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    material.colorNode = attribute('color', 'vec3'); material.opacityNode = float(1).sub(uv().sub(.5).length().mul(2)).max(0).pow(2.6).mul(opacity);
    const mesh = new T.Mesh(geometry, material); mesh.name = 'Merged stellar billboards'; return mesh;
  };
  const stellarPoints: Star[] = [];
  for (let i = 0; i < (coarse ? 3200 : 6500); i++) {
    const a = random() * Math.PI * 2, y = random() * 2 - 1, s = Math.sqrt(1 - y * y), bright = random();
    const tint = new T.Color().setHSL(random() < .2 ? .09 : .58 + random() * .1, .08 + random() * .3, .6 + random() * .3); tint.multiplyScalar(bright > .985 ? 5 : .65 + random() * 1.35);
    stellarPoints.push({ p: new T.Vector3(s * Math.cos(a), y, s * Math.sin(a)).multiplyScalar(8200), size: bright > .985 ? 13 + random() * 7 : 2.6 + random() * 5, tint });
  }
  group.add(mergedStars(stellarPoints, .95));
  const milky = new T.Mesh(new T.SphereGeometry(9200, 48, 32), new T.MeshBasicMaterial({ map: image('2k_stars_milky_way.jpg', true), side: T.BackSide, color: 0x515b76 }));
  milky.rotation.set(.35, .4, .7); sol.add(milky);

  // A distant emission nebula uses four noise octaves for lit gas and dust.
  const nebulaMaterial = new T.MeshBasicNodeMaterial({ side: T.BackSide });
  const nebulaP = positionLocal.normalize().mul(3.6);
  const gas = mx_noise_float(nebulaP).mul(.55).add(mx_noise_float(nebulaP.mul(2.3)).mul(.26)).add(mx_noise_float(nebulaP.mul(5.1)).mul(.13)).add(mx_noise_float(nebulaP.mul(12.7)).mul(.06));
  const ridge = smoothstep(-.1, .31, gas).pow(2), distribution = mx_noise_float(nebulaP.mul(.6).add(12)).mul(.5).add(.5).clamp();
  const dust = smoothstep(-.22, .32, mx_noise_float(nebulaP.mul(3.7).add(43)));
  nebulaMaterial.colorNode = mix(vec3(.017, .06, .1), vec3(.115, .022, .06), distribution).mul(ridge.mul(distribution).mul(dust).mul(1.15)).add(vec3(.0006, .001, .003));
  const nebula = new T.Mesh(new T.SphereGeometry(9100, 48, 32), nebulaMaterial); nebula.rotation.set(.2, -.4, .6); aurora.add(nebula);
  const galaxyRoot = new T.Group(); galaxyRoot.position.set(650, 450, -5000); galaxyRoot.rotation.set(.26, -.2, -.24); galaxyRoot.updateMatrix(); aurora.add(galaxyRoot);
  const galaxyMaterial = new T.MeshBasicNodeMaterial({ transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide });
  const gp = uv().sub(.5).mul(2), gr = gp.length().max(.006), ga = gp.y.atan(gp.x);
  const turbulence = mx_noise_float(gp.mul(8)).mul(1.2).add(mx_noise_float(gp.mul(23)).mul(.35));
  const twist = ga.mul(3).sub(gr.log().mul(6.7)).add(turbulence);
  const grain = mx_noise_float(gp.mul(38)).mul(.65).add(mx_noise_float(gp.mul(95)).mul(.32)).add(mx_noise_float(gp.mul(213)).mul(.18)).add(.62).max(.025);
  const arms = twist.cos().mul(.5).add(.5).pow(4).mul(gr.mul(-2.8).exp()), finerArms = twist.add(1.25).cos().mul(.5).add(.5).pow(12).mul(.11);
  const darkLane = float(1).sub(twist.add(.6).cos().mul(.5).add(.5).pow(11).mul(.75));
  const envelope = float(1).sub(smoothstep(.64, 1, gr)), bulge = gr.mul(-16).exp();
  galaxyMaterial.colorNode = mix(vec3(.22, .34, .49), vec3(.36, .22, .35), smoothstep(.2, .85, gr)).mul(arms.add(finerArms).mul(grain).mul(2.25)).mul(darkLane)
    .add(vec3(.24, .21, .16).mul(gr.mul(-3.5).exp()).mul(grain).mul(.7))
    .add(vec3(1.25, .79, .4).mul(bulge).mul(2.5));
  galaxyMaterial.opacityNode = envelope.mul(.92);
  const galaxy = new T.Mesh(new T.PlaneGeometry(6600, 4200), galaxyMaterial); galaxy.name = 'AURORA · three-arm spiral galaxy and dust lanes'; galaxyRoot.add(galaxy);
  const clusterStars: Star[] = [];
  for (let i = 0; i < (coarse ? 1800 : 3800); i++) {
    const r = Math.pow(random(), .58) * .95, arm = Math.floor(random() * 3), scatter = (random() - .5) * (.28 + r * .24), theta = (Math.log(Math.max(.012, r)) * 6.7 + arm * Math.PI * 2) / 3 + scatter;
    const p = new T.Vector3(Math.cos(theta) * r * 3300, Math.sin(theta) * r * 2100, 12 + random() * 100).applyMatrix4(galaxyRoot.matrix);
    const tint = new T.Color().setHSL(random() < .2 ? .94 : .6, .25 + random() * .35, .6 + random() * .3); tint.multiplyScalar(.6 + random() * 2.2);
    clusterStars.push({ p, size: 1.9 + random() * 4.5, tint });
  }
  const stellarArms = mergedStars(clusterStars, .8); stellarArms.name = 'AURORA · resolved stellar nurseries'; aurora.add(stellarArms);
  const alienMaterial = new T.MeshBasicNodeMaterial(), ap = positionLocal.normalize().mul(4);
  const continents = mx_noise_float(ap).add(mx_noise_float(ap.mul(3.7)).mul(.31)).add(mx_noise_float(ap.mul(11.3)).mul(.17)).add(mx_noise_float(ap.mul(29.1)).mul(.075)), alienLight = dot(normalWorld.normalize(), vec3(.2, .8, .6).normalize()).max(0);
  const terrainGrain = mx_noise_float(ap.mul(47)).mul(.15).add(.75);
  const surface = mix(vec3(.009, .033, .05), vec3(.063, .09, .071).mul(terrainGrain), smoothstep(-.06, .07, continents));
  const cloudBands = smoothstep(.19, .55, mx_noise_float(ap.mul(8).add(22)).add(mx_noise_float(ap.mul(17)).mul(.4)).add(mx_noise_float(ap.mul(43)).mul(.21)));
  alienMaterial.colorNode = mix(surface, vec3(.43, .58, .59), cloudBands.mul(.66)).mul(alienLight.mul(1.4).add(.013));
  const alien = new T.Mesh(new T.SphereGeometry(1050, 96, 64), alienMaterial); alien.position.set(-2050, -1430, -2950); alien.name = 'AURORA · ocean exoplanet'; aurora.add(alien);
  const alienAtmosphereMaterial = new T.MeshBasicNodeMaterial({ transparent: true, blending: T.AdditiveBlending, depthWrite: false });
  alienAtmosphereMaterial.colorNode = vec3(.11, .83, 1.4).mul(alienLight.mul(.8).add(.2)); alienAtmosphereMaterial.opacityNode = rim.pow(5).mul(.75);
  const alienAtmosphere = new T.Mesh(new T.SphereGeometry(1062, 96, 64), alienAtmosphereMaterial); alienAtmosphere.position.copy(alien.position); aurora.add(alienAtmosphere);

  // The apparent shadow, disk and lensing arcs are composited in ONE distant
  // surface. Closely spaced kilometre-distant planes fight for 24-bit depth
  // precision when the walk camera has a 5.5 cm near plane. A single surface
  // retains cabin occlusion and avoids that unstable inter-layer depth test.
  const blackHoleRoot = new T.Group(); blackHoleRoot.position.set(150, 170, -2930); gargantua.add(blackHoleRoot);
  const blackHoleMaterial = new T.MeshBasicNodeMaterial({ transparent: true, depthWrite: true, alphaTest: .001, side: T.DoubleSide });
  const hp = uv().sub(.5).mul(vec2(2.5, 2)), hr = hp.length();
  const shadow = float(1).sub(smoothstep(.235, .241, hr)), outsideShadow = float(1).sub(shadow);
  const dp = vec2(hp.x, hp.y.sub(hp.x.mul(.025)).div(.16)), dr = dp.length(), da = dp.y.atan(dp.x);
  const streak = mx_noise_float(vec2(da.mul(4).add(phase.mul(.025)), dr.mul(100))).mul(.33).add(.67);
  const bands = dr.mul(290).add(mx_noise_float(dp.mul(17)).mul(3)).sin().mul(.2).add(.8);
  const diskEdge = smoothstep(.19, .27, dr).mul(float(1).sub(smoothstep(.74, 1, dr))).mul(outsideShadow);
  const heat = float(1).sub(smoothstep(.23, .84, dr)), doppler = da.cos().mul(.27).add(.75);
  const diskRadiance = mix(vec3(.68, .075, .008), vec3(3.8, 1.6, .38), heat).mul(streak).mul(bands).mul(doppler).mul(1.45).mul(diskEdge);
  const photon = hr.sub(.245).abs().mul(-195).exp(), corona = hr.sub(.25).abs().mul(-27).exp().mul(smoothstep(.242, .29, hr));
  const lensRadius = vec2(hp.x, hp.y.mul(.94)).length(), arch = lensRadius.sub(.276).abs().mul(-140).exp().mul(smoothstep(.07, .18, hp.y.abs()));
  const arcTexture = mx_noise_float(vec2(hp.x.mul(30).add(phase.mul(.01)), hp.y.mul(105))).mul(.25).add(.75);
  const haloRadiance = vec3(3.6, 1.57, .42).mul(photon.mul(2).add(corona.mul(.42))).mul(hp.x.mul(-.6).add(.7).clamp(.25, 1.2));
  const lensRadiance = vec3(2.9, 1.07, .2).mul(arch).mul(arcTexture).mul(.9);
  const alpha = shadow.max(diskEdge).max(photon.add(corona.mul(.45)).add(arch.mul(.85)).clamp());
  blackHoleMaterial.colorNode = diskRadiance.add(haloRadiance.add(lensRadiance).mul(outsideShadow)).div(alpha.max(.001));
  blackHoleMaterial.opacityNode = alpha;
  const blackHole = new T.Mesh(new T.PlaneGeometry(6500, 5200), blackHoleMaterial);
  blackHole.name = 'GARGANTUA · depth-stable lensed vista'; blackHoleRoot.add(blackHole);
  const deepSpace = milky.clone(); deepSpace.material = (milky.material as T.MeshBasicMaterial).clone(); (deepSpace.material as T.MeshBasicMaterial).color.setHex(0x352934); deepSpace.rotation.set(-.7, .3, 1.2); gargantua.add(deepSpace);

  // The warp field remains outside the pressure hull, preserving readability.
  const warpGeometry = new T.BufferGeometry(), warpPositions: number[] = [], warpUvs: number[] = [], warpIndices: number[] = [];
  for (let i = 0; i < (coarse ? 280 : 600); i++) {
    const angle = random() * Math.PI * 2, radius = 300 + random() * 1150, x = Math.cos(angle) * radius, y = Math.sin(angle) * radius, z = -400 - random() * 5500, length = 170 + random() * 650, width = 1.5 + random() * 3;
    const tangentX = -Math.sin(angle) * width, tangentY = Math.cos(angle) * width, first = warpPositions.length / 3;
    warpPositions.push(x - tangentX, y - tangentY, z, x + tangentX, y + tangentY, z, x + tangentX, y + tangentY, z - length, x - tangentX, y - tangentY, z - length); warpUvs.push(0, 0, 1, 0, 1, 1, 0, 1); warpIndices.push(first, first + 1, first + 2, first, first + 2, first + 3);
  }
  warpGeometry.setAttribute('position', new T.Float32BufferAttribute(warpPositions, 3)); warpGeometry.setAttribute('uv', new T.Float32BufferAttribute(warpUvs, 2)); warpGeometry.setIndex(warpIndices);
  const warpMaterial = new T.MeshBasicNodeMaterial({ transparent: true, blending: T.AdditiveBlending, side: T.DoubleSide, depthWrite: false });
  warpMaterial.colorNode = mix(vec3(.04, .4, 1.8), vec3(1.8, 2.6, 3.4), uv().y).mul(warp.mul(2)); warpMaterial.opacityNode = float(1).sub(uv().x.sub(.5).abs().mul(2)).pow(1.5).mul(uv().y.mul(Math.PI).sin()).mul(warp);
  warpMaterial.positionNode = vec3(positionLocal.x, positionLocal.y, positionLocal.z.add(phase.mul(warp).mul(1150)).add(7000).mod(6400).sub(6600));
  const warpField = new T.Mesh(warpGeometry, warpMaterial); warpField.frustumCulled = false; warpField.visible = false; warpField.name = 'Warp · exterior stellar trails'; group.add(warpField);

  function setView(interior: boolean) {
    inside = interior;
    for (const object of [earth, clouds, atmosphere]) { object.position.set(0, interior ? -1000 : -2100, interior ? -1650 : -850); object.scale.setScalar(interior ? 1 : 1.25); }
    // Frame the same celestial landmarks behind the station's exterior camera.
    // These are separate presentation scales, as with the existing Earth view.
    aurora.rotation.set(interior ? 0 : -.28, interior ? 0 : .65, 0);
    gargantua.rotation.copy(aurora.rotation);
  }
  function setDestination(id: Destination) { if (!(id in destinations)) return; destination = id; for (const [key, environment] of Object.entries(destinations)) environment.visible = key === id; }
  function setWarp(amount: number) { warpAmount = T.MathUtils.clamp(Number.isFinite(amount) ? amount : 0, 0, 1); warp.value = warpAmount; warpField.visible = warpAmount > .005; }
  setView(false); setDestination('sol');
  return { earth, clouds, setView, setDestination, setWarp, getState: () => ({ destination, interior: inside, warp: warpAmount }),
    update(dt: number, speed: number) { elapsed += Math.min(dt, .1); phase.value = elapsed; earth.rotation.y += dt * .00045 * speed; clouds.rotation.y += dt * .00055 * speed; alien.rotation.y += dt * .0015 * speed; },
  };
}
