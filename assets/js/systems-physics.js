/* Shared geometry for the blueprint drawings and their measurements.
 * Orthographic camera: +depth is towards the observer; orbits lie in x–z.
 * These are explanatory models, not fits to a particular observed system.
 */
((scope) => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (x, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const fract = x => x - Math.floor(x);
  const orbit = (radius, phase) => [radius * Math.cos(phase), 0, radius * Math.sin(phase)];
  const rotate = ([x, y, z], phase) => [x * Math.cos(phase) - z * Math.sin(phase), y, x * Math.sin(phase) + z * Math.cos(phase)];
  function project([x, y, z], elevation = .3, roll = -.18) {
    const vertical = -y * Math.cos(elevation) + z * Math.sin(elevation);
    return [x * Math.cos(roll) - vertical * Math.sin(roll), x * Math.sin(roll) + vertical * Math.cos(roll), y * Math.sin(elevation) + z * Math.cos(elevation)];
  }
  function overlapArea(r1, r2, distance) {
    const d = Math.max(0, distance);
    if (d >= r1 + r2) return 0;
    if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
    const a = Math.acos(clamp((d * d + r1 * r1 - r2 * r2) / (2 * d * r1), -1, 1));
    const b = Math.acos(clamp((d * d + r2 * r2 - r1 * r1) / (2 * d * r2), -1, 1));
    return r1 * r1 * a + r2 * r2 * b - .5 * Math.sqrt(Math.max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)));
  }
  // Integrate a linear limb-darkening law in annuli. This also handles ingress
  // and egress: no hand-timed switch or light-curve/position mismatch.
  function blockedLight(starRadius, planetRadius, distance, limb = .55) {
    let blocked = 0, total = 0, previousArea = 0;
    const rings = 56;
    for (let i = 1; i <= rings; i++) {
      const outer = starRadius * i / rings, inner = starRadius * (i - 1) / rings;
      const mu = Math.sqrt(1 - ((inner + outer) / (2 * starRadius)) ** 2);
      const intensity = 1 - limb * (1 - mu);
      const area = overlapArea(outer, planetRadius, distance);
      blocked += (area - previousArea) * intensity;
      total += Math.PI * (outer * outer - inner * inner) * intensity;
      previousArea = area;
    }
    return clamp(blocked / total);
  }
  const exoplanet = Object.freeze({ star: .62, planet: .09, orbit: 1.65, elevation: .12, period: 12 });
  function planetState(phase) {
    const p = project(orbit(exoplanet.orbit, phase), exoplanet.elevation);
    const distance = Math.hypot(p[0], p[1]);
    const area = overlapArea(exoplanet.star, exoplanet.planet, distance);
    const transit = p[2] > 0 ? blockedLight(exoplanet.star, exoplanet.planet, distance) : 0;
    const occulted = p[2] < 0 ? area / (Math.PI * exoplanet.planet ** 2) : 0;
    // Hot-planet thermal phase: dayside faces us at superior conjunction.
    const dayside = (1 - p[2] / exoplanet.orbit) / 2;
    const emission = (.0006 + .0034 * dayside) * (1 - occulted);
    return { position: p, distance, transit, occulted: clamp(occulted), dayside, emission, flux: 1 - transit + emission };
  }
  const gaussian = (x, center, width) => Math.exp(-.5 * ((x - center) / width) ** 2);
  function spectrum(wavelength, state) {
    // A schematic near-IR continuum with illustrative molecular bands, in µm.
    const stellar = (1.05 - .13 * (wavelength - 1)) * (1 - .28 * gaussian(wavelength, 1.4, .055) - .22 * gaussian(wavelength, 1.9, .07) - .14 * gaussian(wavelength, 2.3, .035));
    // The planet's opacity has a narrower 1.4 µm core, broader 1.9 µm wings
    // and a narrow 2.3 µm band. Their overlap with the stellar bands changes
    // the profile during transit, rather than applying grey attenuation.
    const atmosphere = .34 * gaussian(wavelength, 1.4, .026) + .12 * gaussian(wavelength, 1.4, .06)
      + .46 * gaussian(wavelength, 1.9, .095) + .30 * gaussian(wavelength, 2.3, .018);
    const planet = (.7 + .4 * (wavelength - 1)) * (1 - .3 * gaussian(wavelength, 1.4, .07) - .25 * gaussian(wavelength, 1.9, .07));
    const observed = stellar * (1 - state.transit * (1 + atmosphere)) + state.emission * planet;
    return { stellar, observed, residual: (observed / stellar - 1) * 100 };
  }
  // Illustrative inference sequence. All layer activations and both plotted
  // spectra use this clock, so a prediction changes only at the output layer.
  const emulator = Object.freeze({ period: 4.5, inputAt: .55, layerStep: .36, layers: 6, morphDuration: .55 });
  function emulatorState(time) {
    const cycle = Math.floor(time / emulator.period), phase = time - cycle * emulator.period;
    const outputAt = emulator.inputAt + (emulator.layers - 1) * emulator.layerStep;
    return { phase, from: cycle % 3, to: (cycle + 1) % 3, blend: smooth((phase - outputAt) / emulator.morphDuration) };
  }
  function spectralFeature(u, index) {
    if (index === 0) return 1 + .50 * gaussian(u, .57, .13) - .63 * gaussian(u, .32, .065);
    if (index === 1) return 1 + .47 * gaussian(u, .38, .064) + .58 * gaussian(u, .63, .072) - .13 * gaussian(u, .505, .045);
    return 1 + .60 * gaussian(u, .5, .14) + .14 * gaussian(u, .53, .045);
  }
  function emulatorSpectrum(u, state) {
    return mix(spectralFeature(u, state.from), spectralFeature(u, state.to), state.blend);
  }
  // Circular restricted three-body potential, separation=1, total mass=1.
  const binary = Object.freeze({ mu: 2 / 7, separation: 2.12, disc: .27, rate: .37, streamStep: .002 });
  function rochePotential([x, y, z], mu = binary.mu) {
    return -(1 - mu) / Math.hypot(x + mu, y, z) - mu / Math.hypot(x - 1 + mu, y, z) - .5 * (x * x + z * z);
  }
  function l1Point(mu = binary.mu) {
    let lo = -mu + .0001, hi = 1 - mu - .0001;
    for (let i = 0; i < 70; i++) {
      const x = (lo + hi) / 2;
      const derivative = (1 - mu) * (x + mu) / Math.abs(x + mu) ** 3 + mu * (x - 1 + mu) / Math.abs(x - 1 + mu) ** 3 - x;
      if (derivative > 0) lo = x; else hi = x;
    }
    return (lo + hi) / 2;
  }
  function rocheRadius(direction, mu = binary.mu) {
    const center = 1 - mu;
    // Infinitesimally inside the critical surface to avoid the tangent at L1.
    const target = rochePotential([l1Point(mu), 0, 0], mu) - .00002;
    const value = radius => rochePotential([center + direction[0] * radius, direction[1] * radius, direction[2] * radius], mu) - target;
    let lo = .0001, hi = lo;
    for (let i = 1; i < 1000; i++) {
      hi = i * .001;
      if (value(hi) >= 0) break;
      lo = hi;
    }
    for (let i = 0; i < 36; i++) {
      const mid = (lo + hi) / 2;
      if (value(mid) > 0) hi = mid; else lo = mid;
    }
    return (hi + lo) / 2;
  }
  function streamDerivative([x, z, vx, vz], mu) {
    const r1 = Math.hypot(x + mu, z), r2 = Math.hypot(x - 1 + mu, z);
    return [vx, vz, 2 * vz + x - (1 - mu) * (x + mu) / r1 ** 3 - mu * (x - 1 + mu) / r2 ** 3, -2 * vx + z - (1 - mu) * z / r1 ** 3 - mu * z / r2 ** 3];
  }
  function ballisticStream(mu = binary.mu, discRadius = binary.disc) {
    let state = [l1Point(mu) - .001, 0, -.012, 0];
    const points = [], dt = binary.streamStep;
    for (let i = 0; i < 5000; i++) {
      points.push([state[0], 0, state[1]]);
      if (Math.hypot(state[0] + mu, state[1]) <= discRadius) break;
      const add = (a, b, f) => a.map((v, j) => v + b[j] * f);
      const a = streamDerivative(state, mu), b = streamDerivative(add(state, a, dt / 2), mu);
      const c = streamDerivative(add(state, b, dt / 2), mu), d = streamDerivative(add(state, c, dt), mu);
      state = state.map((v, j) => v + dt * (a[j] + 2 * b[j] + 2 * c[j] + d[j]) / 6);
    }
    return points;
  }
  const moons = Object.freeze([
    { name: 'Io', frequency: 4, phase: .2, radius: .034, track: .95 },
    { name: 'Europa', frequency: 2, phase: 1.1, radius: .029, track: 1.24 },
    { name: 'Ganymede', frequency: 1, phase: (Math.PI + 3.1) / 2, radius: .049, track: 1.53 },
    { name: 'Callisto', frequency: 7.155588 / 16.690440, phase: 4.1, radius: .045, track: 1.84 }
  ]);
  function windSpeed(distance, footpoint) {
    const acceleration = (distance / .55) ** 1.5;
    return .075 + (.9 * Math.sqrt(.4 / footpoint) - .075) * acceleration / (1 + acceleration);
  }
  function windTrajectory(footpoint, angle) {
    let time = 0, azimuth = 0;
    const points = [], ds = 1.65 / 240, angularMomentum = Math.sqrt(footpoint) * .16;
    for (let i = 0; i <= 240; i++) {
      const distance = i * ds, radius = footpoint + distance * Math.sin(angle);
      if (i) {
        const middle = distance - ds / 2, midRadius = footpoint + middle * Math.sin(angle);
        const dt = ds / windSpeed(middle, footpoint);
        time += dt;
        azimuth += angularMomentum / (midRadius * midRadius) * dt;
      }
      points.push({ radius, height: distance * Math.cos(angle), azimuth, time });
    }
    return points;
  }
  function atWindTime(points, time) {
    let lo = 0, hi = points.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (points[m].time < time) lo = m; else hi = m; }
    const p = clamp((time - points[lo].time) / (points[hi].time - points[lo].time));
    return { radius: mix(points[lo].radius, points[hi].radius, p), height: mix(points[lo].height, points[hi].height, p), azimuth: mix(points[lo].azimuth, points[hi].azimuth, p) };
  }
  const api = { TAU, clamp, mix, smooth, fract, orbit, rotate, project, overlapArea, blockedLight, exoplanet, planetState, spectrum, gaussian, emulator, emulatorState, spectralFeature, emulatorSpectrum, binary, rochePotential, rocheRadius, l1Point, ballisticStream, moons, windSpeed, windTrajectory, atWindTime };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.AWPhysics = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis);
