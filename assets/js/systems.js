/* Blueprint observatory. Geometry, measurements and motion share one clock.
 * All drawing is local Canvas 2D: no video, WebGL dependency or network asset.
 */
(() => {
  'use strict';
  const root = document.getElementById('aw-blueprint');
  if (!root || !window.AWPhysics) return;
  const P = window.AWPhysics;
  const { TAU, clamp, mix, smooth, fract, orbit, rotate, project } = P;
  const canvas = root.querySelector('.bp-canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const hero = root.querySelector('.bp-hero'), headline = root.querySelector('.bp-name');
  const replay = root.querySelector('.bp-replay'), skip = root.querySelector('.bp-skip');
  const previous = root.querySelector('.bp-previous'), next = root.querySelector('.bp-next');
  const motion = root.querySelector('.bp-motion'), status = root.querySelector('.bp-status');
  const sceneLabel = root.querySelector('.bp-scene-label'), sceneDetail = root.querySelector('.bp-scene-detail');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const settings = { duration: 4.8, cycleSeconds: 15 };
  const scenes = [
    { name: 'Star + exoplanet', detail: 'Transit spectroscopy / secondary eclipse / thermal phase', aria: 'A rotating, limb-darkened star and a transiting planet. The foreground orbit crosses in front of the star. The planet is hidden behind it during secondary eclipse. The light curve and spectrum follow the same orbital phase. The dashed spectrum shows the star alone; the solid spectrum includes the planet, with its contribution amplified twelve times for visibility.' },
    { name: 'Cataclysmic variable', detail: 'Roche-lobe overflow / ballistic stream / differential disc rotation', aria: 'A tidally distorted donor and a white dwarf orbit their common centre of mass. Gas passes through the inner Lagrange point and curves into an accretion disc, making a bright impact spot.' },
    { name: 'Active galactic nucleus', detail: 'Jet-producing AGN / dusty torus shown in cutaway', aria: 'A black hole with a differentially rotating accretion disc, a cutaway dusty torus, and opposed jets perpendicular to the disc. Knots of material travel away from the nucleus.' },
    { name: 'Jupiter + moons', detail: 'Io : Europa : Ganymede = 4 : 2 : 1 / orbital spacing compressed', aria: 'An oblate, banded Jupiter with a rotating storm and four Galilean moons. The three inner moons retain the four-to-two-to-one orbital resonance. Callisto has its own longer period. Moons and orbit paths are correctly hidden behind Jupiter.' },
    { name: 'Simulation → emulation', detail: 'Training spectra → neural network → inference', aria: 'A laptop displays a disc-wind model and its illustrative spectrum. A database feeds a six-layer neural network. When the activation reaches the output neurons, the spectrum changes between a P Cygni profile, double-peaked emission and broad emission. The laptop spectrum and prediction change together. These are illustrative outputs, not benchmark results.' },
    { name: 'Speculate / disc wind', detail: 'Biconical outflow / accelerating gas / conserved angular momentum', aria: 'Two disc winds launch from a range of disc radii. Particles accelerate along helical paths and rotate more slowly as they expand. A schematic P Cygni profile shows blueshifted absorption and broad emission.' }
  ];
  let w = 0, h = 0, headingBottom = 0, fontSize = 13.667, colors = {}, stackedScene = false;
  let scene = 0, time = 0, cycleElapsed = 0, lastTime = null, raf = 0;
  let paused = false, inView = true, transition = null, intro = null;
  let activePage = root.dataset.activePage || 'about';
  const ink = () => colors.ink;
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const scale = (a, s) => a.map(v => v * s);
  const sample = (fn, n = 80) => Array.from({ length: n + 1 }, (_, i) => fn(i / n));
  const tint = Array.from({ length: 101 }, (_, i) => `rgb(${Math.round(8 + i * .27)},${Math.round(46 + i * .65)},${Math.round(76 + i * .74)})`);
  const paper = '#07355b', dark = '#05243d';

  function path(points, alpha = 1, weight = 1.2, color = colors.line, dash = []) {
    if (points.length < 2 || alpha <= 0) return;
    ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.strokeStyle = color; ctx.lineWidth = weight;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.stroke(); ctx.restore();
  }
  function polygon(points, fill, alpha = 1, stroke = null, weight = 1) {
    ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = weight; ctx.lineJoin = 'round'; ctx.stroke(); }
    ctx.restore();
  }
  function dot(x, y, radius, color = colors.ink, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill(); ctx.restore();
  }
  function ring(x, y, radius, alpha = 1, weight = 1, color = colors.accent) {
    ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.strokeStyle = color; ctx.lineWidth = weight;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.stroke(); ctx.restore();
  }
  function glow(x, y, radius, alpha = .3) {
    ctx.save(); ctx.globalAlpha *= alpha;
    const fill = ctx.createRadialGradient(x, y, 0, x, y, radius);
    fill.addColorStop(0, '#c7f6ff90'); fill.addColorStop(.3, '#b9ebf02a'); fill.addColorStop(1, '#b9ebf000');
    ctx.fillStyle = fill; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
  }
  function label(value, x, y, { align = 'left', alpha = 1, color = colors.muted } = {}) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
    ctx.font = `400 ${fontSize}px "IBM Plex Mono", monospace`; ctx.textAlign = align;
    ctx.fillText(value, x, y); ctx.restore();
  }
  function rounded(x, y, width, height, radius, fill, stroke, weight = 1, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = weight; ctx.stroke(); }
    ctx.restore();
  }

  // Small primitives are sorted in a common camera coordinate system. In
  // particular, orbit arcs are never drawn as one background-only ellipse.
  class Drawing {
    constructor(g, elevation = .34, roll = -.18) { this.g = g; this.elevation = elevation; this.roll = roll; this.items = []; }
    point(p) {
      const q = project(p, this.elevation, this.roll);
      return [this.g.cx + q[0] * this.g.unit, this.g.cy + q[1] * this.g.unit, q[2]];
    }
    face(points, fill, alpha = 1) {
      const p = points.map(v => this.point(v));
      this.items.push({ kind: 0, p, z: p.reduce((v, a) => v + a[2], 0) / p.length, fill, alpha });
    }
    line(points, { alpha = .6, weight = 1.15, color = colors.accent, front = false, depthBias = .0002 } = {}) {
      const p = points.map(v => this.point(v));
      for (let i = 1; i < p.length; i++) {
        const depth = (p[i - 1][2] + p[i][2]) / 2;
        this.items.push({ kind: 1, p: [p[i - 1], p[i]], z: depth + depthBias, alpha: front ? alpha * (depth > 0 ? 1 : .36) : alpha, weight, color });
      }
    }
    particle(p, radius = 1.5, alpha = 1, color = colors.ink, halo = false) {
      const q = this.point(p);
      this.items.push({ kind: 2, p: q, z: q[2] + .001, radius, alpha, color, halo });
    }
    flush() {
      this.items.sort((a, b) => a.z - b.z);
      const opacity = ctx.globalAlpha;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const item of this.items) {
        ctx.globalAlpha = opacity * item.alpha;
        if (item.kind === 0) {
          ctx.beginPath(); item.p.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
          ctx.fillStyle = item.fill; ctx.fill();
          // Same-colour seam coverage avoids cracks between adjacent faces.
          ctx.strokeStyle = item.fill; ctx.lineWidth = .55; ctx.stroke();
        } else if (item.kind === 1) {
          ctx.beginPath(); ctx.moveTo(item.p[0][0], item.p[0][1]); ctx.lineTo(item.p[1][0], item.p[1][1]);
          ctx.strokeStyle = item.color; ctx.lineWidth = item.weight; ctx.stroke();
        } else {
          if (item.halo) glow(item.p[0], item.p[1], item.radius * 4, .5);
          ctx.fillStyle = item.color; ctx.beginPath(); ctx.arc(item.p[0], item.p[1], item.radius, 0, TAU); ctx.fill();
        }
      }
      ctx.globalAlpha = opacity;
    }
  }

  function surface(d, fn, origin, spin, type = 'star', latitudes = 20, longitudes = 48, illumination = [.4, .15, 1]) {
    const world = (lat, lon, inflate = 1) => add(origin, scale(rotate(fn(lat, lon), spin), inflate));
    const boundary = [];
    for (let i = 0; i < latitudes; i++) {
      const lat0 = -Math.PI / 2 + i * Math.PI / latitudes, lat1 = lat0 + Math.PI / latitudes;
      for (let j = 0; j < longitudes; j++) {
        const lon0 = j * TAU / longitudes, lon1 = lon0 + TAU / longitudes;
        const middle = rotate(fn((lat0 + lat1) / 2, (lon0 + lon1) / 2), spin);
        const radius = Math.hypot(...middle), viewDepth = project(middle, d.elevation, d.roll)[2] / radius;
        if (type !== 'donor' && viewDepth < -.09) continue;
        const latitude = (lat0 + lat1) / 2, longitude = (lon0 + lon1) / 2;
        let brightness = 23 + 56 * Math.pow(Math.max(0, viewDepth), .7);
        if (type === 'jupiter') {
          const band = Math.sin(latitude * 21 + .15 * Math.sin(longitude * 5)) + .35 * Math.sin(latitude * 57 + longitude * 2);
          brightness = 17 + 24 * (band + 1) + 19 * Math.max(0, viewDepth);
        } else if (type === 'star') {
          brightness += 4 * Math.sin(longitude * 19 + latitude * 13) * Math.cos(latitude * 29 - longitude * 7);
        } else if (type === 'planet') {
          const lit = middle.reduce((sum, value, k) => sum + value * illumination[k], 0) / (radius * Math.hypot(...illumination));
          brightness = 2 + 38 * Math.max(0, lit);
        } else if (type === 'blackhole') brightness = 0;
        const vertices = [world(lat0, lon0), world(lat0, lon1), world(lat1, lon1), world(lat1, lon0)];
        d.face(vertices, tint[Math.round(clamp(brightness, 0, 100))]);
        if (type === 'donor') {
          boundary.push(vertices[0]);
          if (i === latitudes - 1) boundary.push(vertices[3]);
        }
      }
    }
    if (type !== 'planet' && type !== 'blackhole' && Math.hypot(...fn(0, 0)) > .15) {
      const bands = type === 'jupiter' ? 9 : 5;
      for (let i = 1; i <= bands; i++) {
        const lat = -Math.PI / 2 + i * Math.PI / (bands + 1);
        const points = sample(u => world(lat, u * TAU, 1.006));
        if (type === 'donor') d.line(points, { alpha: .56, weight: 1.25, depthBias: .012 });
        else visibleSurfaceLine(d, points, origin, .56, type === 'jupiter' ? 1.4 : 1.25);
      }
      for (let j = 0; j < 10; j++) {
        const points = sample(u => world(-Math.PI / 2 + u * Math.PI, j * TAU / 10, 1.006), 44);
        if (type === 'donor') d.line(points, { alpha: .43, weight: 1.2, depthBias: .012 });
        else visibleSurfaceLine(d, points, origin, type === 'jupiter' ? .19 : .43, 1.2);
      }
    }
    if (type === 'donor') {
      // The Roche lobe is not a sphere: culling against its centre hides the
      // L1 cusp. Draw the full equipotential and use its projected silhouette.
      const points = boundary.map(p => ({ world: p, view: d.point(p) })).sort((a, b) => a.view[0] - b.view[0] || a.view[1] - b.view[1]);
      const turn = (a, b, c) => (b.view[0] - a.view[0]) * (c.view[1] - a.view[1]) - (b.view[1] - a.view[1]) * (c.view[0] - a.view[0]);
      const hull = values => { const result = []; values.forEach(p => { while (result.length > 1 && turn(result[result.length - 2], result[result.length - 1], p) <= 0) result.pop(); result.push(p); }); return result; };
      const lower = hull(points), upper = hull([...points].reverse());
      const rim = [...lower.slice(0, -1), ...upper.slice(0, -1)].map(p => p.world);
      d.line([...rim, rim[0]], { alpha: .9, weight: 2.3, color: colors.ink, depthBias: .04 });
    }
  }
  function visibleSurfaceLine(d, points, origin, alpha, weight) {
    const centerDepth = d.point(origin)[2];
    for (let i = 1; i < points.length; i++) {
      if (d.point(points[i])[2] > centerDepth && d.point(points[i - 1])[2] > centerDepth)
        d.line([points[i - 1], points[i]], { alpha, weight, depthBias: Math.hypot(...points[i].map((v, k) => v - origin[k])) * .045 });
    }
  }
  function globe(d, origin, radius, spin, type = 'star', polar = 1, illumination = [.4, .15, 1]) {
    const fn = (lat, lon) => [radius * Math.cos(lat) * Math.cos(lon), radius * polar * Math.sin(lat), radius * Math.cos(lat) * Math.sin(lon)];
    surface(d, fn, origin, spin, type, radius < .15 ? 10 : 24, radius < .15 ? 24 : 64, illumination);
    // Camera-facing limb, kept in the depth queue with all other geometry.
    d.line(sample(u => add(origin, [radius * Math.cos(u * TAU), -radius * polar * Math.sin(u * TAU) * Math.cos(d.elevation), radius * Math.sin(u * TAU) * Math.sin(d.elevation)]), 110), { alpha: .95, weight: type === 'planet' || type === 'blackhole' ? 1.5 : 2.5, color: colors.ink, depthBias: radius * .15 });
  }
  function orbitalTrack(d, radius, weight = 1.25) {
    d.line(sample(u => orbit(radius, u * TAU), 180), { alpha: .74, weight, front: true });
  }
  function disc(d, center, radius, t, inner = .13, outerRate = .42) {
    const segments = 84, bands = 9;
    const at = (r, a, height = 0) => add(center, [r * Math.cos(a), height, r * Math.sin(a)]);
    for (let j = 0; j < bands; j++) {
      const r0 = mix(inner, radius, j / bands), r1 = mix(inner, radius, (j + 1) / bands);
      const spin = t * outerRate / Math.pow((r0 + r1) / (2 * radius), 1.5);
      for (let i = 0; i < segments; i++) {
        const a = i * TAU / segments, b = (i + 1) * TAU / segments;
        const texture = Math.sin(a * 3 - spin) * .5 + Math.sin(a * 17 + r0 * 23 - spin * 2) * .22;
        const brightness = 17 + (1 - j / bands) * 44 + texture * 10;
        d.face([at(r0, a), at(r1, a), at(r1, b), at(r0, b)], tint[Math.round(clamp(brightness, 0, 100))]);
      }
    }
    [inner, radius].forEach((r, i) => d.line(sample(u => at(r, u * TAU)), { alpha: i ? .85 : 1, weight: i ? 1.8 : 2.3, color: colors.ink }));
    for (let j = 0; j < 22; j++) {
      const r = mix(inner * 1.2, radius * .98, (j + .5) / 22), speed = outerRate / (r / radius) ** 1.5;
      const a = t * speed + j * 2.39996;
      d.line(sample(u => at(r, a - u * (.13 + .16 * j / 22), .008), 9), { alpha: .45 + .35 * (1 - j / 22), weight: j % 3 ? 1.1 : 1.8 });
    }
  }
  function crosshair(d, p, radius = .045, alpha = .6) {
    d.line([add(p, [-radius, 0, 0]), add(p, [radius, 0, 0])], { alpha });
    d.line([add(p, [0, 0, -radius]), add(p, [0, 0, radius])], { alpha });
  }
  function view() {
    const compact = stackedScene || w < 780, left = compact ? 0 : w * .43, right = w - 1;
    const top = compact ? headingBottom + 30 : 28, width = right - left;
    const stacked = width < 340, plotHeight = stacked ? 216 : 145, plotY = h - plotHeight - 10;
    const drawingTop = top + 23, drawingBottom = plotY - 24;
    const unit = Math.min(width / 4.1, (drawingBottom - drawingTop) / 3.35, 116);
    return { compact, stacked, left, right, width, top, plotY, plotHeight, drawingHeight: drawingBottom - drawingTop, cx: (left + right) / 2, cy: (drawingTop + drawingBottom) / 2, unit };
  }
  function sceneView(g, index) {
    // Frame each subject on its own proportions. A flat orbit should not be
    // shrunk to the same bounding sphere as a tall bipolar outflow.
    const extents = [[3.7, 1.65, 155], [4.6, 2.25, 130], [3.1, 3.2, 112], [3.95, 1.65, 155], [3.8, 2.6, 130], [3.8, 3.3, 112]][index];
    const plotHeight = Math.min(g.plotHeight, [g.plotHeight, g.plotHeight, 106, 106, g.stacked ? 216 : 145, g.plotHeight][index]);
    const recovered = g.plotHeight - plotHeight, drawingHeight = g.drawingHeight + recovered;
    return { ...g, plotHeight, plotY: g.plotY + recovered, drawingHeight, cy: g.cy + recovered / 2, unit: Math.min(g.width / extents[0], drawingHeight / extents[1], extents[2]) };
  }
  function frame(g, index, rightText) {
    const figure = '0' + (index + 1);
    label('FIG. ' + figure, g.left + 2, g.top, { alpha: .8 });
    if (rightText && (g.width > 255 || rightText.length < 10)) label(rightText, g.right - 2, g.top, { align: 'right', color: colors.accent });
    const corners = [[g.left + 2, g.top + 16], [g.right - 2, g.top + 16], [g.left + 2, g.plotY - 14], [g.right - 2, g.plotY - 14]];
    corners.forEach(([x, y], i) => path([[x, y + (i < 2 ? 7 : -7)], [x, y], [x + (i % 2 ? -7 : 7), y]], .32, 1));
  }
  function panel(x, y, width, height, title) {
    path([[x, y], [x + width, y]], .37, 1);
    label(title, x, y + 19, { color: colors.muted });
    return { x: x + 1, y: y + 29, width: width - 2, height: height - 39 };
  }
  function graph(box, fn, min, max, { color = colors.accent, alpha = .9, weight = 1.7, fill = false, dash = [] } = {}) {
    const points = sample(u => [box.x + box.width * u, box.y + box.height * (1 - (fn(u) - min) / (max - min))], 130);
    if (fill) polygon([[box.x, box.y + box.height], ...points, [box.x + box.width, box.y + box.height]], colors.accent, .045);
    path(points, alpha, weight, color, dash);
  }
  function cursor(box, u, value, min, max) {
    const x = box.x + box.width * u, y = box.y + box.height * (1 - (value - min) / (max - min));
    path([[x, box.y - 2], [x, box.y + box.height + 3]], .3, 1);
    dot(x, y, 3, colors.ink); ring(x, y, 6, .3);
  }

  const lightCurve = sample(u => P.planetState(u * TAU).flux, 360);
  function curveFlux(u) {
    const x = clamp(u) * 360, i = Math.min(359, Math.floor(x));
    return mix(lightCurve[i], lightCurve[i + 1], x - i);
  }
  function surfacePatch(d, origin, radius, spin, lat, lon, latitudeSize, longitudeSize, color, alpha = 1, polar = 1) {
    const point = (a, s = 1) => {
      const latitude = lat + Math.sin(a) * latitudeSize * s, longitude = lon + Math.cos(a) * longitudeSize * s;
      return add(origin, rotate([radius * Math.cos(latitude) * Math.cos(longitude), radius * polar * Math.sin(latitude), radius * Math.cos(latitude) * Math.sin(longitude)], spin));
    };
    const centerDepth = d.point(origin)[2];
    const middle = point(0, 0);
    if (d.point(middle)[2] < centerDepth + radius * .08) return;
    const outline = sample(u => point(u * TAU), 36);
    // Small triangles, rather than one large patch, maintain correct depth.
    for (let i = 1; i < outline.length; i++) d.face([middle, outline[i - 1], outline[i]], color, alpha);
    d.line(outline, { alpha: .45 * alpha, weight: 1, color: colors.accent });
  }
  function planetary(g, t) {
    const phase = t * TAU / P.exoplanet.period + .2, state = P.planetState(phase);
    const tag = state.transit > .0002 ? 'TRANSIT' : state.occulted > .01 ? 'ECLIPSE' : g.stacked ? 'ORBIT' : 'ORBITAL PHASE';
    frame(g, 0, tag);
    const d = new Drawing(g, P.exoplanet.elevation, -.18);
    orbitalTrack(d, P.exoplanet.orbit, 1.45);
    glow(g.cx, g.cy, g.unit * .87, .18);
    globe(d, [0, 0, 0], P.exoplanet.star, t * .15);
    for (let i = 0; i < 300; i++) {
      const lat = Math.asin(2 * (i + .5) / 300 - 1), lon = i * 2.39996 + t * .15;
      const p = [.624 * Math.cos(lat) * Math.cos(lon), .624 * Math.sin(lat), .624 * Math.cos(lat) * Math.sin(lon)];
      if (d.point(p)[2] > .04) d.particle(p, .65, .22, colors.accent);
    }
    const position = orbit(P.exoplanet.orbit, phase);
    globe(d, position, P.exoplanet.planet, phase, 'planet', 1, scale(position, -1));
    if (state.transit > 0) {
      const q = d.point(position);
      // The atmospheric annulus brightens only against the stellar disc.
      d.line(sample(u => add(position, [.101 * Math.cos(u * TAU), -.101 * Math.sin(u * TAU) * Math.cos(d.elevation), .101 * Math.sin(u * TAU) * Math.sin(d.elevation)]), 48), { alpha: .85, weight: 2, color: colors.accent });
      glow(q[0], q[1], g.unit * .13, .35);
    }
    d.flush();
    const gap = 24, width = g.stacked ? g.width : (g.width - gap) / 2;
    const first = panel(g.left, g.plotY, width, g.stacked ? 82 : g.plotHeight, 'FLUX / ORBIT');
    graph(first, () => 1, .971, 1.006, { alpha: .2, weight: 1, dash: [3, 5] });
    graph(first, curveFlux, .971, 1.006, { fill: true, weight: 2 });
    cursor(first, fract(phase / TAU), state.flux, .971, 1.006);
    const second = panel(g.stacked ? g.left : g.left + width + gap, g.stacked ? g.plotY + 94 : g.plotY, width, g.stacked ? g.plotHeight - 94 : g.plotHeight, 'SPECTRUM / Δ ×12');
    // Show a recognisable spectrum throughout the orbit. Only the difference
    // due to the planet is magnified; photometry and eclipse geometry stay physical.
    const stellar = u => P.spectrum(1 + u * 1.5, state).stellar;
    const enhanced = u => {
      const s = P.spectrum(1 + u * 1.5, state);
      return s.stellar + 12 * (s.observed - s.stellar);
    };
    const point = (u, value) => [second.x + second.width * u, second.y + second.height * (1 - (value - .32) / .84)];
    const reference = sample(u => point(u, stellar(u)), 130);
    const observed = sample(u => point(u, enhanced(u)), 130);
    polygon([...reference, ...observed.slice().reverse()], colors.accent, .14);
    graph(second, stellar, .32, 1.16, { alpha: .5, weight: 1.2, color: colors.muted, dash: [3, 4] });
    graph(second, enhanced, .32, 1.16, { weight: 2.1, color: colors.ink });
    label('1.0', second.x, second.y + second.height + 17, { alpha: .65 });
    label('2.5 μm', second.x + second.width, second.y + second.height + 17, { align: 'right', alpha: .65 });
  }

  // The Roche surface and ballistic path are computed once in the rotating
  // binary frame, then both are transformed with the stars on every frame.
  const l1 = P.l1Point(), gasStream = P.ballisticStream();
  const rocheMesh = new Map();
  function donorSurface(lat, lon) {
    const key = lat.toFixed(7) + '/' + lon.toFixed(7);
    if (!rocheMesh.has(key)) {
      const direction = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
      rocheMesh.set(key, scale(direction, P.rocheRadius(direction) * P.binary.separation));
    }
    return rocheMesh.get(key);
  }
  function cataclysmic(g, t) {
    frame(g, 1, 'ROCHE-LOBE OVERFLOW');
    const a = t * P.binary.rate + .35, separation = P.binary.separation, mu = P.binary.mu;
    const d = new Drawing(g, .49, -.16);
    const wd = rotate([-mu * separation, 0, 0], a), donor = rotate([(1 - mu) * separation, 0, 0], a);
    d.line(sample(u => orbit(mu * separation, u * TAU)), { alpha: .16, weight: 1 });
    d.line(sample(u => orbit((1 - mu) * separation, u * TAU)), { alpha: .16, weight: 1 });
    crosshair(d, [0, 0, 0], .055, .45);
    surface(d, donorSurface, donor, a, 'donor', 20, 48);
    const discRate = P.binary.rate * Math.sqrt((1 - mu) / P.binary.disc ** 3);
    disc(d, wd, P.binary.disc * separation, t, .085, discRate);
    globe(d, wd, .073, t * .4, 'star');
    const transform = p => rotate(scale(p, separation), a);
    const stream = gasStream.filter((_, i) => i % 8 === 0).map(transform);
    stream.push(transform(gasStream[gasStream.length - 1]));
    d.line(stream, { alpha: .45, weight: 3 });
    d.line(stream, { alpha: .95, weight: 1.15, color: colors.ink });
    // RK4 samples are uniformly spaced in flight time, so material naturally
    // accelerates as it falls. The stream ends at the disc, never at its centre.
    for (let j = 0; j < 13; j++) {
      const flightTime = (gasStream.length - 1) * P.binary.streamStep;
      const u = fract(t * P.binary.rate / flightTime + j / 13), i = Math.floor(u * (gasStream.length - 1));
      d.particle(transform(gasStream[i]), 1.8, .9);
    }
    const impact = transform(gasStream[gasStream.length - 1]);
    d.particle(add(impact, [0, .018, 0]), 2.6, 1, colors.ink, true);
    d.particle(transform([l1, 0, 0]), 2.3, .8, colors.accent);
    d.flush();
    const graphBox = panel(g.left, g.plotY, g.width, g.plotHeight, g.stacked ? 'RADIAL VELOCITY' : 'RADIAL VELOCITY / MODEL');
    const rv1 = u => -mu * Math.cos(u * TAU), rv2 = u => (1 - mu) * Math.cos(u * TAU);
    graph(graphBox, () => 0, -.8, .8, { alpha: .22, weight: 1 });
    graph(graphBox, rv2, -.8, .8, { alpha: .5 });
    graph(graphBox, rv1, -.8, .8, { color: colors.ink, weight: 2 });
    cursor(graphBox, fract(a / TAU), rv1(a / TAU), -.8, .8);
  }

  function torus(d, t) {
    const major = .96, minor = .22, around = 64, tube = 16;
    const point = (a, b) => [(major + minor * Math.cos(b)) * Math.cos(a), minor * Math.sin(b), (major + minor * Math.cos(b)) * Math.sin(a)];
    // Remove a front sector so the smaller disc remains visible. A deliberate
    // cutaway, not a claim that real AGN tori have this opening.
    const omitted = angle => angle > Math.PI * .17 && angle < Math.PI * .83;
    for (let i = 0; i < around; i++) {
      const a = i * TAU / around, b = (i + 1) * TAU / around;
      if (omitted((a + b) / 2)) continue;
      for (let j = 0; j < tube; j++) {
        const c = j * TAU / tube, e = (j + 1) * TAU / tube;
        const shade = 10 + 16 * (1 + Math.sin(c)) + 3 * Math.sin(a * 23 + c * 9 - t * .09);
        d.face([point(a, c), point(b, c), point(b, e), point(a, e)], tint[Math.round(clamp(shade, 0, 100))]);
      }
      if (i % 4 === 0) d.line(sample(u => point(a, u * TAU), 24), { alpha: .35, weight: 1 });
    }
    for (let j = 0; j < 8; j++) {
      const b = j * TAU / 8;
      for (let i = 1; i <= around; i++) {
        const a0 = (i - 1) * TAU / around, a1 = i * TAU / around;
        if (!omitted((a0 + a1) / 2)) d.line([point(a0, b), point(a1, b)], { alpha: .33, weight: 1 });
      }
    }
    [.15625 * Math.PI, .84375 * Math.PI].forEach(a => {
      d.face(sample(u => point(a, u * TAU), 32), '#1b506b');
      d.line(sample(u => point(a, u * TAU), 36), { alpha: .65, weight: 1.3, color: colors.ink });
      for (let k = -3; k <= 3; k++) {
        const y = k * minor / 4, halfWidth = Math.sqrt(minor * minor - y * y);
        d.line([[(major - halfWidth) * Math.cos(a), y, (major - halfWidth) * Math.sin(a)], [(major + halfWidth) * Math.cos(a), y, (major + halfWidth) * Math.sin(a)]], { alpha: .35, weight: .8 });
      }
    });
    // Ghost the removed sector in the manner of an engineering cutaway.
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(b => d.line(sample(u => point(mix(.15625 * Math.PI, .84375 * Math.PI, u), b), 45), { alpha: .085, weight: 1 }));
  }
  function jets(d, t) {
    [-1, 1].forEach(sign => {
      for (let j = 0; j < 7; j++) {
        const angle = j * TAU / 7;
        d.line(sample(u => {
          const radius = .025 + .055 * Math.pow(u, .6) + .065 * u ** 4;
          return [radius * Math.cos(angle), sign * (.1 + u * 1.55), radius * Math.sin(angle)];
        }, 45), { alpha: j % 2 ? .22 : .47, weight: j % 2 ? 1 : 1.6 });
      }
      d.line(sample(u => [0, sign * (.11 + u * 1.52), 0], 50), { alpha: .16, weight: 7, color: colors.accent });
      d.line(sample(u => {
        const radius = .035 + .065 * u, angle = u * TAU * 3;
        return [radius * Math.cos(angle), sign * (.13 + u * 1.5), radius * Math.sin(angle)];
      }, 110), { alpha: .28, weight: 1 });
      for (let i = 0; i < 34; i++) {
        const u = fract(t * .46 + i / 34), angle = i * 2.39996, radius = (.012 + .045 * u) * (.3 + fract(i * .723));
        const p = [radius * Math.cos(angle), sign * (.13 + u * 1.5), radius * Math.sin(angle)];
        d.line([p, [p[0], p[1] - sign * (.025 + .06 * u), p[2]]], { alpha: (1 - u) * .7 + .2, weight: 1.7, color: colors.ink });
      }
      [.45, .92, 1.38].forEach((height, i) => {
        const r = .05 + height * .026;
        d.line(sample(u => [r * Math.cos(u * TAU), sign * height, r * Math.sin(u * TAU)], 32), { alpha: .22 + .25 * (.5 + .5 * Math.sin(t * 3 - i * 2)), weight: 2 });
      });
    });
  }
  function agn(g, t) {
    frame(g, 2, 'TORUS / CUTAWAY');
    const d = new Drawing(g, .43, -.23);
    torus(d, t); disc(d, [0, 0, 0], .68, t, .13);
    globe(d, [0, 0, 0], .106, 0, 'blackhole');
    jets(d, t); d.flush();
    const box = panel(g.left, g.plotY, g.width, g.plotHeight, 'DIFFERENTIAL ROTATION');
    const y = box.y + box.height * .48;
    [0, 1, 2].forEach(i => {
      const x = box.x + box.width * (.15 + i * .35), radius = Math.min(14, box.height * .38);
      ring(x, y, radius, .35, 1.3);
      const theta = t * .5 / Math.pow(.4 + i * .3, 1.5);
      path(sample(u => [x + radius * Math.cos(theta - u * .8), y + radius * Math.sin(theta - u * .8)], 24), .9, 2.3, colors.ink);
      dot(x + radius * Math.cos(theta), y + radius * Math.sin(theta), 2.4);
    });
    if (!g.stacked) label('Ω ∝ r⁻³ᐟ²', box.x + box.width / 2, box.y + box.height + 17, { align: 'center', alpha: .8 });
  }

  function jupiter(g, t) {
    frame(g, 3, 'GALILEAN RESONANCE');
    const d = new Drawing(g, .16, -.18), phase = t * .14;
    const spin = t * .14 * 4 * 42.459306 / 9.925; // Io's hours / Jupiter's rotation hours.
    P.moons.forEach(m => {
      orbitalTrack(d, m.track, 1.15);
      const p = orbit(m.track, phase * m.frequency + m.phase);
      globe(d, p, m.radius, phase * m.frequency, 'planet');
      // A crisp, lit edge keeps small satellites legible without enlarging
      // Ganymede/Callisto relative to one another or giving them star coronas.
      d.particle(p, Math.max(1, m.radius * g.unit * .35), .7, colors.accent);
    });
    globe(d, [0, 0, 0], .55, spin, 'jupiter', .935);
    // South is negative y; latitude of the Great Red Spot is about −22°.
    surfacePatch(d, [0, 0, 0], .558, spin, -.38, 1.4, .065, .17, '#668d9c', .9, .935);
    surfacePatch(d, [0, 0, 0], .562, spin, -.38, 1.4, .034, .105, '#204b69', .9, .935);
    d.flush();
    const box = panel(g.left, g.plotY, g.width, g.plotHeight, g.stacked ? 'IO : EU : GA = 4:2:1' : 'IO : EUROPA : GANYMEDE = 4 : 2 : 1');
    for (let i = 0; i < 3; i++) {
      const y = box.y + (i + .5) * box.height / 3, m = P.moons[i];
      path([[box.x, y], [box.x + box.width, y]], .18, 1);
      for (let k = 0; k < m.frequency; k++) {
        const u = fract(phase / TAU + k / m.frequency + m.phase / (TAU * m.frequency));
        dot(box.x + box.width * u, y, 2.6, colors.ink, .9 - i * .17);
      }
    }
  }

  const windFamilies = [.25, .43, .61].map((footpoint, i) => P.windTrajectory(footpoint, (.36 + i * .19)));
  function windWorld(point, azimuth, sign) {
    return [point.radius * Math.cos(point.azimuth + azimuth), sign * point.height, point.radius * Math.sin(point.azimuth + azimuth)];
  }
  function windDrawing(d, t, miniature = false) {
    // Match the wind's launch angular momentum and its compressed time unit.
    disc(d, [0, 0, 0], .76, t * .7, .11, .16 / .76 ** 1.5);
    globe(d, [0, 0, 0], .079, 0, 'star');
    const count = miniature ? 4 : 7;
    [-1, 1].forEach(sign => {
      windFamilies.forEach((trajectory, family) => {
        if (miniature && family === 1) return;
        const duration = trajectory[trajectory.length - 1].time;
        for (let j = 0; j < count; j++) {
          const azimuth = j * TAU / count + family * .31;
          const points = trajectory.filter((_, i) => i % (miniature ? 8 : 5) === 0).map(p => windWorld(p, azimuth, sign));
          d.line(points, { alpha: family === 1 ? .13 : .31, weight: miniature ? .85 : 1.1, front: true });
          const particles = miniature ? 4 : 7;
          for (let k = 0; k < particles; k++) {
            const flight = fract(t * .7 / duration + k / particles + j * .137 + family * .17) * duration;
            const point = P.atWindTime(trajectory, flight), tail = P.atWindTime(trajectory, Math.max(0, flight - .12));
            const alpha = .85 * (1 - smooth((point.height - 1.1) / .45));
            d.line([windWorld(tail, azimuth, sign), windWorld(point, azimuth, sign)], { alpha, weight: miniature ? 1.2 : 1.8, color: colors.ink });
            if (!miniature && k % 3 === 0) d.particle(windWorld(point, azimuth, sign), 1.5, alpha, colors.ink);
          }
        }
        if (!miniature && family !== 1) [72, 145, 220].forEach(i => {
          const p = trajectory[i];
          d.line(sample(u => windWorld(p, u * TAU, sign), 60), { alpha: .14, weight: .9 });
        });
      });
    });
  }
  const lineProfile = (u, strength = 1) => 1 + .43 * P.gaussian(u, .53, .135) - .67 * strength * P.gaussian(u, .33, .075);
  function wind(g, t) {
    frame(g, 5, 'ROTATING DISC WIND');
    const d = new Drawing(g, .32, -.2); windDrawing(d, t); d.flush();
    const box = panel(g.left, g.plotY, g.width, g.plotHeight, g.stacked ? 'P CYGNI / MODEL' : 'P CYGNI / ILLUSTRATIVE LINE');
    graph(box, () => 1, .28, 1.52, { alpha: .26, weight: 1 });
    graph(box, lineProfile, .28, 1.52, { fill: true, weight: 2 });
    const zero = box.x + box.width * .5;
    path([[zero, box.y], [zero, box.y + box.height]], .18, 1, colors.line, [2, 4]);
    if (!g.stacked) {
      label('−v / blue', box.x, box.y + box.height + 17, { alpha: .7 });
      label('+v / red', box.x + box.width, box.y + box.height + 17, { align: 'right', alpha: .7 });
    }
  }
  function network(g, state) {
    const box = panel(g.left, g.plotY, g.width, g.plotHeight, g.stacked ? 'TRAIN → EMULATE' : 'TRAINING SET → EMULATOR → SPECTRUM');
    const bandHeight = g.stacked ? 82 : box.height, mid = box.y + bandHeight * .5;
    const databaseX = box.x + box.width * .075, radius = Math.min(18, box.width * .055);
    const databaseHeight = Math.min(42, radius * 1.9, bandHeight * .6), top = mid - databaseHeight / 2, bottom = mid + databaseHeight / 2;
    const ellipse = (y, front = false, alpha = .8) => path(sample(u => [databaseX + radius * Math.cos(u * (front ? Math.PI : TAU)), y + radius * .35 * Math.sin(u * (front ? Math.PI : TAU))], 40), alpha, 1.8, colors.ink);
    // A cylinder of stored spectra replaces the unrelated blinking matrix.
    path([[databaseX - radius, top], [databaseX - radius, bottom]], .9, 1.8, colors.ink);
    path([[databaseX + radius, top], [databaseX + radius, bottom]], .9, 1.8, colors.ink);
    ellipse(top); ellipse(bottom, true);
    [.33, .66].forEach(f => ellipse(mix(top, bottom, f), true, .55));
    const dataPulse = 1 - smooth(state.phase / P.emulator.inputAt);
    if (dataPulse > .01) glow(databaseX, mid, radius * 2.3, dataPulse * .35);

    const start = box.x + box.width * (g.stacked ? .28 : .23), end = box.x + box.width * (g.stacked ? .93 : .67);
    const spacing = Math.min(15, (bandHeight - 12) / 4), nodeRadius = Math.min(3.5, box.width * (g.stacked ? .013 : .008));
    const nodes = [3, 4, 5, 5, 4, 3].map((count, layer) => Array.from({ length: count }, (_, row) => [mix(start, end, layer / (P.emulator.layers - 1)), mid + (row - (count - 1) / 2) * spacing]));
    const arrival = layer => P.emulator.inputAt + layer * P.emulator.layerStep;
    for (let layer = 1; layer < nodes.length; layer++) {
      const travel = (state.phase - arrival(layer - 1)) / P.emulator.layerStep;
      nodes[layer - 1].forEach(a => nodes[layer].forEach(b => {
        path([a, b], .26, .9);
        if (travel >= 0 && travel <= 1) {
          const tail = Math.max(0, travel - .24);
          path([[mix(a[0], b[0], tail), mix(a[1], b[1], tail)], [mix(a[0], b[0], travel), mix(a[1], b[1], travel)]], .7, 1.25, colors.ink);
        }
      }));
    }
    nodes.forEach((column, layer) => {
      const activation = P.gaussian(state.phase, arrival(layer), .14);
      column.forEach(([x, y]) => {
        dot(x, y, nodeRadius + 1.3, dark);
        if (activation > .04) glow(x, y, nodeRadius * 4, activation * .4);
        ring(x, y, nodeRadius, .56 + .44 * activation, 1.2 + activation * .8, colors.ink);
        if (activation > .04) dot(x, y, nodeRadius * .66, colors.ink, activation);
      });
    });
    const feedStart = databaseX + radius + 5, feedEnd = start - nodeRadius - 6;
    path([[feedStart, mid], [feedEnd, mid]], .45, 1.2);
    if (state.phase < P.emulator.inputAt) dot(mix(feedStart, feedEnd, state.phase / P.emulator.inputAt), mid, 2.1, colors.ink);

    const prediction = g.stacked
      ? { x: box.x + 2, y: box.y + 101, width: box.width - 4, height: box.height - 104 }
      : { x: box.x + box.width * .79, y: box.y + 2, width: box.width * .20, height: box.height - 4 };
    const outputAt = arrival(nodes.length - 1), signal = clamp((state.phase - outputAt) / P.emulator.morphDuration);
    const outputPulse = P.gaussian(state.phase, outputAt, .2);
    if (g.stacked) {
      const edge = box.x + box.width - 5, floor = prediction.y - 7;
      path([[end + 6, mid], [edge, mid], [edge, floor]], .35 + .5 * outputPulse, 1.2);
      path([[edge - 3, floor - 4], [edge, floor], [edge + 3, floor - 4]], .5, 1.2);
    } else {
      path([[end + 8, mid], [prediction.x - 8, mid]], .4, 1.2);
      if (signal > 0 && signal < 1) dot(mix(end + 8, prediction.x - 8, signal), mid, 2.2, colors.ink);
    }
    const value = u => P.emulatorSpectrum(u, state);
    const point = (u, offset) => [prediction.x + prediction.width * u, prediction.y + prediction.height * (1 - (value(u) + offset - .25) / 1.65)];
    const upper = sample(u => point(u, .075), 70), lower = sample(u => point(u, -.075), 70).reverse();
    polygon([...upper, ...lower], colors.accent, .17 + .12 * outputPulse);
    graph(prediction, () => 1, .25, 1.9, { alpha: .18, weight: 1, dash: [2, 4] });
    graph(prediction, value, .25, 1.9, { color: colors.ink, weight: 2 + .4 * outputPulse });
  }
  function laptop(g, t) {
    frame(g, 4, 'PHYSICS → INFERENCE');
    const inference = P.emulatorState(t);
    const sw = Math.min(g.width * .77, g.unit * 2.94), sh = sw * .6;
    const x = g.cx - sw / 2, y = g.cy - sh * .66, bezel = Math.max(5, sw * .037);
    const baseY = y + sh, deck = sw * .22, spread = sw * .105;
    glow(g.cx, baseY + deck, sw * .7, .1);
    // Milled chassis: a filled silhouette, bevel, inset glass and a deep hinge.
    rounded(x - 2, y - 2, sw + 4, sh + 5, 8, '#113f5b', colors.ink, 2.7);
    rounded(x, y, sw, sh, 7, '#092b45', colors.accent, 1.1);
    rounded(x + bezel, y + bezel, sw - bezel * 2, sh - bezel * 2, 2, '#041c31', colors.line, 1.2);
    dot(g.cx, y + bezel * .48, 1.3, colors.accent, .7);
    const sx = x + bezel + 2, sy = y + bezel + 2, iw = sw - bezel * 2 - 4, ih = sh - bezel * 2 - 4;
    ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, iw, ih); ctx.clip();
    // Subtle computational mesh and a genuinely animated model in the glass.
    for (let k = 1; k < 11; k++) path([[sx + iw * k / 11, sy], [sx + iw * k / 11, sy + ih]], .08, 1);
    for (let k = 1; k < 7; k++) path([[sx, sy + ih * k / 7], [sx + iw, sy + ih * k / 7]], .08, 1);
    const split = sw > 260;
    const mini = { cx: sx + iw * (split ? .34 : .5), cy: sy + ih * .53, unit: ih * .27 };
    const d = new Drawing(mini, .3, -.15); windDrawing(d, t, true); d.flush();
    if (split) {
      const px = sx + iw * .66;
      path([[px - 5, sy + 12], [px - 5, sy + ih - 12]], .25, 1);
      label('MODEL', px + 4, sy + 21, { alpha: .7 });
      const b = { x: px + 4, y: sy + ih * .36, width: iw * .29, height: ih * .43 };
      graph(b, u => P.emulatorSpectrum(u, inference), .25, 1.9, { weight: 1.7, color: colors.ink });
    }
    ctx.restore();
    path([[x + sw * .08, baseY + 1], [x + sw * .92, baseY + 1]], 1, 4, '#031c30');
    const deckPoints = [[x, baseY], [x + sw, baseY], [x + sw + spread, baseY + deck], [x - spread, baseY + deck]];
    polygon(deckPoints, '#13415d', 1, colors.ink, 2.3);
    polygon([[x - spread, baseY + deck], [x + sw + spread, baseY + deck], [x + sw + spread - 5, baseY + deck + 5], [x - spread + 5, baseY + deck + 5]], '#082c47', 1, colors.accent, 1.3);
    const deckPoint = (u, v) => [x + sw * u + spread * v * (2 * u - 1), baseY + deck * v];
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 12; col++) {
        const u = .065 + col * .0725, v = .1 + row * .12;
        polygon([deckPoint(u, v), deckPoint(u + .058, v), deckPoint(u + .058, v + .085), deckPoint(u, v + .085)], '#06253e', 1, '#94c7d8', .7);
      }
    }
    polygon([deckPoint(.29, .59), deckPoint(.71, .59), deckPoint(.72, .66), deckPoint(.28, .66)], dark, 1, colors.line, .7);
    polygon([deckPoint(.37, .73), deckPoint(.63, .73), deckPoint(.64, .94), deckPoint(.36, .94)], '#0e3651', 1, colors.accent, 1.2);
    path([deckPoint(.12, 1), deckPoint(.87, 1)], .6, 1.3, colors.ink);
    network(g, inference);
  }
  const painters = [planetary, cataclysmic, agn, jupiter, laptop, wind];
  function drawScene(index, g, t, alpha = 1, offset = 0) {
    if (alpha <= 0) return;
    ctx.save(); ctx.beginPath(); ctx.rect(g.left - 1, g.top - 17, g.width + 2, h - g.top + 17); ctx.clip();
    ctx.translate(offset, 0); ctx.globalAlpha *= alpha; painters[index](sceneView(g, index), t); ctx.restore();
  }

  function rackGeometry(g) {
    const width = g.unit * .67, height = g.unit * 1.96, y = g.cy - height * .58;
    return [0, 1, 2].map(i => ({ x: g.cx + (i - 1) * width * 1.38 - width / 2, y: y + Math.abs(i - 1) * g.unit * .08, width, height }));
  }
  function rack(g, r, index, p, opacity) {
    const { x, y, width, height } = r, depth = width * .23;
    ctx.save(); ctx.globalAlpha *= opacity;
    polygon([[x, y], [x + depth, y - depth * .58], [x + width + depth, y - depth * .58], [x + width, y]], '#154661', 1, colors.ink, 1.6);
    polygon([[x + width, y], [x + width + depth, y - depth * .58], [x + width + depth, y + height - depth * .58], [x + width, y + height]], '#06253e', 1, colors.accent, 1.5);
    rounded(x, y, width, height, 2.5, '#082b45', colors.ink, 2.5);
    const margin = width * .12, bayH = height * .084;
    for (let row = 0; row < 8; row++) {
      const by = y + height * .12 + row * height * .103;
      rounded(x + margin, by, width - margin * 2, bayH, 1.2, '#10405d', colors.accent, 1.15);
      const activity = .25 + .75 * (.5 + .5 * Math.sin(p * 49 + row * 1.7 + index * 2.1));
      dot(x + width * .22, by + bayH * .5, Math.max(1.3, width * .025), colors.ink, activity);
      rounded(x + width * .37, by + bayH * .31, width * .36, bayH * .38, .8, colors.accent, null, 1, .18 + .36 * activity);
      for (let j = 0; j < 3; j++) path([[x + width * (.78 + j * .035), by + bayH * .27], [x + width * (.78 + j * .035), by + bayH * .75]], .45, .7);
    }
    path([[x + margin, y + height * .065], [x + width - margin, y + height * .065]], .8, 2, colors.ink);
    const bus = g.cy + g.unit * 1.17;
    const cable = [[x + width / 2, y + height + 2], [x + width / 2, bus], [g.cx, bus]];
    path(cable, .43, 1.6);
    const u = fract(p * 4.3 + index / 3);
    const packet = u < .5 ? [cable[0][0], mix(cable[0][1], bus, u * 2)] : [mix(cable[1][0], g.cx, u * 2 - 1), bus];
    dot(packet[0], packet[1], 2, colors.ink, .8);
    ctx.restore();
  }
  function progress(g, percent, opacity) {
    const width = Math.min(g.width - 8, g.unit * 3.55), height = g.stacked ? 30 : 34;
    const x = g.cx - width / 2, y = g.plotY + 5;
    ctx.save(); ctx.globalAlpha *= opacity;
    rounded(x, y, width, height, height / 2, '#0c4163', colors.ink, 2);
    ctx.beginPath(); ctx.roundRect(x, y, width, height, height / 2); ctx.clip();
    ctx.fillStyle = colors.ink; ctx.fillRect(x, y, width * percent / 100, height);
    ctx.font = `500 ${fontSize + 4}px "IBM Plex Mono", monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = colors.ink; ctx.fillText(`${percent}%`, g.cx, y + height / 2);
    ctx.beginPath(); ctx.rect(x, y, width * percent / 100, height); ctx.clip();
    ctx.fillStyle = paper; ctx.fillText(`${percent}%`, g.cx, y + height / 2);
    ctx.restore();
    label(percent < 100 ? (g.stacked ? 'SOLVING THE MODEL' : 'SIMULATE / SAMPLE / CONVERGE') : 'MODEL READY', g.cx, y + height + 25, { align: 'center', alpha: opacity * .85 });
  }
  function computeIntro(g, elapsed) {
    const p = clamp(elapsed / settings.duration);
    const computeView = { ...g, unit: Math.min(g.width / 3.4, g.drawingHeight / 2.65, 116) };
    const opacity = 1 - smooth((p - .56) / .24), racks = rackGeometry(computeView);
    if (p < .86) {
      label(g.stacked ? 'HPC / COMPUTE' : 'HPC / PARALLEL COMPUTE', g.left + 2, g.top, { alpha: opacity, color: colors.accent });
      racks.forEach((r, i) => rack(computeView, r, i, p, opacity * smooth(p / .09)));
      const percent = Math.round(100 * (1 - Math.pow(1 - clamp((p - .07) / .48), 1.8)));
      progress(computeView, percent, 1 - smooth((p - .65) / .16));
    }
    if (p > .55 && p < .96) {
      const target = new Drawing(sceneView(g, 0), P.exoplanet.elevation, -.18);
      for (let i = 0; i < 24; i++) {
        const rackIndex = Math.floor(i / 8), row = i % 8, r = racks[rackIndex];
        const source = { x: r.x + r.width * .12, y: r.y + r.height * (.12 + row * .103), width: r.width * .76, height: r.height * .084 };
        const local = smooth((p - .56 - (row + rackIndex) * .006) / .31);
        const curve = sample(u => {
          // Keep left/right and top/bottom correspondence as each server bay
          // unfurls into a latitude. Closed-loop interpolation twists itself.
          const a = Math.PI * (1 - u), lat = 1.15 - row * 2.3 / 7;
          const point = [.62 * Math.cos(lat) * Math.cos(a), .62 * Math.sin(lat), .62 * Math.cos(lat) * Math.sin(a)];
          const dest = target.point(point), start = [source.x + source.width * u, source.y + source.height / 2];
          return [mix(start[0], dest[0], local), mix(start[1], dest[1], local)];
        }, 70);
        path(curve, Math.sin(Math.PI * clamp((p - .55) / .41)) * .6, mix(2.1, 1.2, local), colors.accent);
      }
      if (p > .7) for (let j = 0; j < 5; j++) {
        const lon = .15 + j * (Math.PI - .3) / 4;
        const trace = smooth((p - .7 - j * .012) / .15);
        path(sample(u => {
          const lat = Math.PI / 2 - u * Math.PI * trace;
          return target.point([.62 * Math.cos(lat) * Math.cos(lon), .62 * Math.sin(lat), .62 * Math.cos(lat) * Math.sin(lon)]);
        }, 50), .5 * Math.sin(Math.PI * clamp((p - .7) / .27)), 1.3, colors.ink);
      }
      for (let i = 0; i < 100; i++) {
        const r = racks[i % 3], start = [r.x + r.width * fract(i * .618), r.y + r.height * fract(i * .381)];
        const azimuth = i * 2.39996, latitude = Math.asin(2 * (i + .5) / 100 - 1);
        const dest = target.point([.62 * Math.cos(latitude) * Math.cos(azimuth), .62 * Math.sin(latitude), .62 * Math.cos(latitude) * Math.sin(azimuth)]);
        const local = smooth((p - .6 - fract(i * .71) * .08) / .23);
        const x = mix(start[0], dest[0], local), y = mix(start[1], dest[1], local) - Math.sin(local * Math.PI) * g.unit * .17;
        dot(x, y, 1.1, colors.ink, Math.sin(local * Math.PI) * .75);
      }
    }
    if (p > .76) drawScene(0, g, 0, smooth((p - .76) / .24));
    headline.style.opacity = String(.18 + .82 * smooth((p - .51) / .43));
    // No scale or layout transform: the text resolves exactly where it rests.
  }

  function draw() {
    if (activePage !== 'about') return;
    ctx.clearRect(0, 0, w, h);
    if (!w || !h) return;
    const g = view();
    if (intro) computeIntro(g, intro.elapsed);
    else if (transition) {
      const q = smooth(transition.elapsed / .48);
      drawScene(transition.from, g, transition.time, 1 - q, -transition.direction * q * 30);
      drawScene(transition.to, g, 0, q, transition.direction * (1 - q) * 30);
    } else drawScene(scene, g, time);
  }
  function canMove() {
    return activePage === 'about' && inView && !document.hidden && !reduced.matches && (!paused || intro || transition);
  }
  function updateControls(automatic = false) {
    const shown = transition ? transition.to : scene;
    sceneLabel.setAttribute('aria-live', automatic ? 'off' : 'polite');
    sceneLabel.replaceChildren(document.createTextNode(scenes[shown].name));
    const count = document.createElement('small'); count.textContent = `${String(shown + 1).padStart(2, '0')} / 06`; sceneLabel.append(count);
    sceneDetail.textContent = scenes[shown].detail;
    canvas.setAttribute('aria-label', scenes[shown].aria + ' Illustrative models; sizes, distances and timescales are adjusted for clarity.');
    const motionLabel = intro ? 'Building' : reduced.matches ? 'Motion off' : paused ? 'Resume' : 'Pause';
    root.querySelector('.bp-motion-label').textContent = motionLabel;
    motion.setAttribute('data-state', paused || reduced.matches ? 'paused' : 'running');
    motion.setAttribute('aria-label', `${motionLabel} animation`);
    motion.setAttribute('title', `${motionLabel} animation`);
    motion.disabled = reduced.matches || !!intro;
    motion.setAttribute('aria-pressed', String(paused || reduced.matches));
    previous.disabled = next.disabled = !!intro || !!transition;
    replay.hidden = !!intro; skip.hidden = !intro; replay.disabled = reduced.matches;
    status.textContent = intro ? 'COMPUTE → BLUEPRINT' : reduced.matches ? 'SYSTEM / STATIC' : paused ? 'SYSTEM / PAUSED' : 'SYSTEM / IN MOTION';
  }
  function tick(now) {
    raf = 0;
    const delta = lastTime === null ? 0 : Math.min(.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    if (canMove()) {
      if (intro) {
        intro.elapsed += delta;
        if (intro.elapsed >= settings.duration) { intro = null; time = 0; headline.style.opacity = ''; updateControls(); }
      } else if (transition) {
        transition.elapsed += delta;
        if (transition.elapsed >= .48) {
          const automatic = transition.automatic;
          scene = transition.to; transition = null; time = 0; cycleElapsed = 0; updateControls(automatic);
        }
      } else if (!paused) {
        time += delta; cycleElapsed += delta;
        if (cycleElapsed >= settings.cycleSeconds) move(1, true);
      }
    }
    draw();
    if (canMove()) { if (!raf) raf = requestAnimationFrame(tick); } else lastTime = null;
  }
  function wake() {
    if (canMove()) {
      if (!raf) { lastTime = null; raf = requestAnimationFrame(tick); }
    } else { cancelAnimationFrame(raf); raf = 0; lastTime = null; draw(); }
  }
  function resize() {
    if (activePage !== 'about') return;
    const rect = hero.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    w = rect.width; h = rect.height; headingBottom = headline.offsetTop + headline.offsetHeight;
    stackedScene = getComputedStyle(hero).getPropertyValue('--bp-stack').trim() === '1';
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const css = getComputedStyle(root);
    fontSize = parseFloat(getComputedStyle(sceneLabel).fontSize) || 13.667;
    colors = { ink: css.getPropertyValue('--bp-ink').trim(), line: css.getPropertyValue('--bp-line').trim(), muted: css.getPropertyValue('--bp-muted').trim(), accent: css.getPropertyValue('--bp-accent').trim() };
    draw(); wake();
  }
  function move(direction, automatic = false) {
    if (intro || transition) return;
    const target = (scene + direction + scenes.length) % scenes.length;
    cycleElapsed = 0;
    if (reduced.matches) { scene = target; time = 0; updateControls(automatic); draw(); return; }
    transition = { from: scene, to: target, time, direction, elapsed: 0, automatic };
    updateControls(automatic); wake();
  }
  function settle() {
    intro = null; headline.style.opacity = ''; cycleElapsed = 0;
    if (transition) { scene = transition.to; transition = null; time = 0; }
    updateControls(); draw(); wake();
  }
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  motion.addEventListener('click', () => { paused = !paused; cycleElapsed = 0; updateControls(); wake(); });
  replay.addEventListener('click', () => {
    if (reduced.matches) return;
    scene = 0; time = 0; transition = null; cycleElapsed = 0; paused = false;
    intro = { elapsed: 0 }; updateControls(); draw(); wake();
  });
  skip.addEventListener('click', settle);
  let touch = null;
  canvas.addEventListener('pointerdown', event => { if (event.pointerType === 'touch') touch = [event.clientX, event.clientY]; });
  canvas.addEventListener('pointerup', event => {
    if (!touch) return;
    const dx = event.clientX - touch[0], dy = event.clientY - touch[1]; touch = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
  });
  canvas.addEventListener('pointercancel', () => { touch = null; });
  root.addEventListener('aw:pagechange', event => {
    activePage = event.detail.page;
    if (activePage !== 'about') settle(); else resize();
    wake();
  });
  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(entries => { inView = entries[0].isIntersecting; wake(); }).observe(hero);
  document.addEventListener('visibilitychange', wake);
  reduced.addEventListener('change', () => { if (reduced.matches) settle(); updateControls(); wake(); });
  updateControls(); resize();
  document.fonts.ready.then(() => {
    resize();
    let seen = false;
    try { seen = sessionStorage.getItem('aw-compute-intro') === 'seen'; } catch { /* Storage may be disabled. */ }
    if (!seen && activePage === 'about' && !reduced.matches) {
      try { sessionStorage.setItem('aw-compute-intro', 'seen'); } catch { /* Still allow the preview. */ }
      replay.click();
    }
  });
})();
