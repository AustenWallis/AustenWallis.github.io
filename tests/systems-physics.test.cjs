const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../assets/js/systems-physics.js');
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} ≈ ${b}`);

test('orbit geometry puts transits in front and eclipses behind the stellar surface', () => {
  for (const sign of [-1, 1]) {
    const p = P.project(P.orbit(P.exoplanet.orbit, sign * Math.PI / 2), P.exoplanet.elevation);
    assert.ok(Math.hypot(p[0], p[1]) < P.exoplanet.star);
    const stellarSurface = Math.sqrt(P.exoplanet.star ** 2 - p[0] ** 2 - p[1] ** 2);
    assert.ok(sign * p[2] > stellarSurface);
  }
});

test('circle overlap handles disjoint, grazing, contained and coincident discs', () => {
  near(P.overlapArea(1, .1, 1.1), 0);
  near(P.overlapArea(1, .1, 0), Math.PI * .01);
  near(P.overlapArea(1, 1, 0), Math.PI);
  assert.ok(P.overlapArea(1, .1, 1) > 0);
  near(P.overlapArea(1, .1, 1), P.overlapArea(.1, 1, 1));
});

test('limb darkening makes a central transit deeper than an equal-area limb transit', () => {
  const center = P.blockedLight(1, .08, 0), limb = P.blockedLight(1, .08, .85);
  assert.ok(center > limb && limb > 0);
  near(P.blockedLight(1, .08, 0, 0), .08 ** 2, 1e-8);
  near(P.blockedLight(1, .08, 1.081), 0);
});

test('the same orbital phase drives transit, secondary eclipse and thermal emission', () => {
  const transit = P.planetState(Math.PI / 2), eclipse = P.planetState(3 * Math.PI / 2);
  assert.ok(transit.transit > .02 && transit.flux < .99);
  near(transit.occulted, 0);
  near(eclipse.transit, 0); near(eclipse.occulted, 1); near(eclipse.flux, 1);
  assert.ok(P.planetState(Math.PI).emission > transit.emission);
  for (let i = 0; i <= 360; i++) {
    const s = P.planetState(i * P.TAU / 360);
    assert.ok(Number.isFinite(s.flux) && s.flux > .96 && s.flux < 1.005);
    assert.ok(!(s.transit > 0 && s.occulted > 0));
  }
});

test('atmospheric bands deepen during transit and planet light vanishes in eclipse', () => {
  const transit = P.planetState(Math.PI / 2), eclipse = P.planetState(3 * Math.PI / 2);
  assert.ok(P.spectrum(1.4, transit).residual < P.spectrum(1.65, transit).residual);
  for (const wavelength of [1, 1.4, 1.9, 2.3, 2.5]) near(P.spectrum(wavelength, eclipse).residual, 0);
});

test('transit changes band cores and wings beyond continuum dimming', () => {
  const transit = { ...P.planetState(Math.PI / 2), emission: 0 };
  const transmission = wavelength => {
    const s = P.spectrum(wavelength, transit);
    return s.observed / s.stellar;
  };
  const continuum = transmission(1.1);
  assert.ok(continuum - transmission(1.4) > .009, 'the narrow atmospheric core must remain visible after continuum normalisation');
  assert.ok(transmission(1.46) - transmission(1.4) > .007);
  assert.ok(continuum - transmission(1.99) > .006, 'the broad band changes the wings as well as the centre');
  const eclipse = P.planetState(3 * Math.PI / 2);
  for (let i = 0; i <= 100; i++) {
    const s = P.spectrum(1 + i * .015, eclipse);
    near(s.observed, s.stellar);
  }
});

test('emulator predictions wait for the output layer, then cycle through three continuous profiles', () => {
  const e = P.emulator, outputAt = e.inputAt + (e.layers - 1) * e.layerStep;
  assert.equal(e.layers, 6);
  for (let cycle = 0; cycle < 3; cycle++) {
    const start = cycle * e.period;
    for (const offset of [0, e.inputAt, outputAt - .001]) {
      const state = P.emulatorState(start + offset);
      near(state.blend, 0);
      for (const u of [.25, .5, .75]) near(P.emulatorSpectrum(u, state), P.spectralFeature(u, cycle));
    }
    const midpoint = P.emulatorState(start + outputAt + e.morphDuration / 2);
    near(midpoint.blend, .5);
    const completed = P.emulatorState(start + outputAt + e.morphDuration + .01);
    near(completed.blend, 1);
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      near(P.emulatorSpectrum(u, completed), P.spectralFeature(u, (cycle + 1) % 3));
      near(P.emulatorSpectrum(u, P.emulatorState(start + e.period - .000001)), P.emulatorSpectrum(u, P.emulatorState(start + e.period)));
    }
  }
  assert.ok(P.spectralFeature(.32, 0) < .5);
  assert.ok(P.spectralFeature(.38, 1) > P.spectralFeature(.5, 1) + .4);
  assert.ok(P.spectralFeature(.53, 2) > 1.7);
});

test('Roche surface is an equipotential and mass transfer intersects the outer disc', () => {
  const mu = P.binary.mu, l1 = P.l1Point(), target = P.rochePotential([l1, 0, 0]) - .00002;
  assert.ok(l1 > -mu && l1 < 1 - mu);
  for (let i = 0; i < 120; i++) {
    const lat = Math.asin(2 * (i + .5) / 120 - 1), lon = i * 2.39996;
    const n = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
    const r = P.rocheRadius(n);
    assert.ok(r > .15 && r < .42);
    near(P.rochePotential([1 - mu + r * n[0], r * n[1], r * n[2]]), target, 1e-8);
  }
  const stream = P.ballisticStream();
  assert.ok(stream.length > 100);
  near(stream[0][0], l1 - .001);
  const end = stream.at(-1), prior = stream.at(-2);
  assert.ok(Math.hypot(end[0] + mu, end[2]) <= P.binary.disc);
  assert.ok(Math.hypot(prior[0] + mu, prior[2]) > P.binary.disc);
  assert.ok(end[2] > .05, 'Coriolis deflection, not a straight tube');
});

test('inner moons keep the Laplace angle and Callisto is outside the resonance', () => {
  const [io, europa, ganymede, callisto] = P.moons;
  near(io.frequency / europa.frequency, 2); near(europa.frequency / ganymede.frequency, 2);
  for (const t of [0, 1, 10, 500]) {
    near((io.frequency * t + io.phase) - 3 * (europa.frequency * t + europa.phase) + 2 * (ganymede.frequency * t + ganymede.phase), Math.PI, 1e-10);
  }
  assert.ok(callisto.frequency < .5 && callisto.frequency > .4);
  assert.ok(ganymede.radius > callisto.radius && io.radius > europa.radius);
});

test('disc-wind gas accelerates and conserves specific angular momentum', () => {
  for (const footpoint of [.25, .43, .61]) {
    assert.ok(P.windSpeed(1.2, footpoint) > P.windSpeed(.2, footpoint));
    const trajectory = P.windTrajectory(footpoint, .55);
    let previousOmega = Infinity;
    for (let i = 1; i < trajectory.length; i++) {
      const a = trajectory[i - 1], b = trajectory[i];
      const radius = (a.radius + b.radius) / 2, omega = (b.azimuth - a.azimuth) / (b.time - a.time);
      assert.ok(b.time > a.time && b.height > a.height && b.radius > a.radius);
      near(radius * radius * omega, Math.sqrt(footpoint) * .16, 1e-9);
      assert.ok(omega < previousOmega); previousOmega = omega;
    }
  }
});
