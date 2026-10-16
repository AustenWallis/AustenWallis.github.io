(() => {
  'use strict';
  const root = document.getElementById('aw-blueprint');
  const P = window.AWPetPhysics;
  const toggle = root?.querySelector('[data-pet-toggle]');
  const layer = root?.querySelector('.bp-pet-layer');
  if (!P || !toggle || !layer) return;
  const pet = layer.querySelector('.bp-pet');
  const sprite = layer.querySelector('.bp-pet-body');
  const canvas = layer.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const side = root.querySelector('.bp-side');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'aw-star-pet-v1';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (_) { /* Storage is optional. */ }
  if (typeof saved !== 'object' || Array.isArray(saved)) saved = {};
  let enabled = saved.enabled !== false;
  let reduced = preference.matches;
  let active = false, frame = 0, lastFrame = 0, painted = false;
  let width = 0, height = 0, size = 76.8, radius = 35.328;
  let bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  let pointer = null, suppressClickUntil = 0, hovering = false;
  let lastInteraction = performance.now(), happyUntil = 0, impactUntil = 0;
  let particles = [], trail = [], wasFlying = false;
  const body = P.create(0, 0);
  const random = (low, high) => low + Math.random() * (high - low);

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ enabled,
        x: (body.x - bounds.minX) / Math.max(1, bounds.maxX - bounds.minX),
        y: (body.y - bounds.minY) / Math.max(1, bounds.maxY - bounds.minY) }));
    } catch (_) { /* Private browsing must not disable the pet. */ }
  }

  function resize(initial = false) {
    const old = bounds;
    width = document.documentElement.clientWidth;
    height = window.innerHeight;
    size = window.innerWidth <= 640 ? 60.8 : 76.8;
    radius = size * 0.46;
    const inset = radius + 10;
    const minX = Math.min(side.getBoundingClientRect().right + inset, width - inset);
    bounds = { minX: Math.max(inset, minX), maxX: Math.max(inset, width - inset),
      minY: Math.min(inset, height / 2), maxY: Math.max(height / 2, height - inset) };
    bounds.minX = Math.min(bounds.minX, bounds.maxX);
    if (initial) {
      body.x = Number.isFinite(saved.x) ? bounds.minX + P.clamp(saved.x, 0, 1) * (bounds.maxX - bounds.minX) : bounds.maxX - 28;
      body.y = Number.isFinite(saved.y) ? bounds.minY + P.clamp(saved.y, 0, 1) * (bounds.maxY - bounds.minY) : bounds.maxY - 65;
    } else {
      body.x = bounds.minX + P.clamp((body.x - old.minX) / Math.max(1, old.maxX - old.minX), 0, 1) * (bounds.maxX - bounds.minX);
      body.y = bounds.minY + P.clamp((body.y - old.minY) / Math.max(1, old.maxY - old.minY), 0, 1) * (bounds.maxY - bounds.minY);
      cancelDrag(); P.relax(body);
    }
    P.constrain(body, bounds);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(width * dpr); canvas.height = Math.ceil(height * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    clearEmbers(); render(performance.now());
  }

  function clearEmbers() {
    particles = []; trail = [];
    ctx?.clearRect(0, 0, width, height);
    painted = false;
  }

  function ember(x, y, vx, vy, burst = false) {
    if (reduced || !ctx || particles.length >= 340) return;
    const life = random(0.45, 1.05);
    particles.push({ x, y, vx, vy, life, total: life, size: random(1.1, burst ? 4 : 3.5) });
  }

  function flare(x = body.x, y = body.y, strength = 1) {
    if (reduced) return;
    for (let i = 0; i < 26 * strength; i++) {
      const angle = random(0, Math.PI * 2), speed = random(45, 145) * strength;
      ember(x + Math.cos(angle) * radius * 0.7, y + Math.sin(angle) * radius * 0.7,
        Math.cos(angle) * speed, Math.sin(angle) * speed, true);
    }
  }

  function drawEmbers(dt) {
    if (!ctx) return;
    particles = particles.filter(p => (p.life -= dt) > 0);
    trail = trail.filter(p => (p.life -= dt) > 0);
    if (!particles.length && !trail.length) {
      if (painted) ctx.clearRect(0, 0, width, height);
      painted = false; return;
    }
    painted = true;
    ctx.clearRect(0, 0, width, height); ctx.save(); ctx.lineCap = 'round';
    // A fading hot spine beneath the embers; the canvas never captures input.
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1], b = trail[i], fade = Math.max(0, a.life / 0.65);
      for (const [stroke, thickness, alpha] of [['#ed4b12', 38, 0.2], ['#ff8d1d', 16, 0.5], ['#ffd257', 5, 0.95]]) {
        ctx.strokeStyle = stroke; ctx.globalAlpha = fade * fade * alpha;
        ctx.lineWidth = Math.max(0.2, thickness * fade * a.heat);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= Math.exp(-2 * dt); p.vy = p.vy * Math.exp(-2 * dt) - 19 * dt;
      const fade = p.life / p.total;
      const glowRadius = p.size * 4.3 * fade;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowRadius);
      glow.addColorStop(0, 'rgba(255,160,24,.8)');
      glow.addColorStop(0.3, 'rgba(255,87,10,.35)');
      glow.addColorStop(1, 'rgba(238,62,10,0)');
      ctx.globalAlpha = fade * 0.7; ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(p.x, p.y, glowRadius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = Math.min(1, fade * 1.4);
      ctx.fillStyle = fade > 0.6 ? '#ffcf55' : fade > 0.25 ? '#ff9020' : '#cf4517';
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.2, p.size * fade), 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = Math.max(0.5, p.size * fade * 0.6);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.stroke();
    }
    ctx.restore();
  }

  function render(now) {
    const speed = Math.hypot(body.vx, body.vy), resting = !pointer && !body.flying;
    const quiet = now - lastInteraction;
    let expression = 'idle';
    if (pointer || now < impactUntil) expression = 'held';
    else if (body.flying || now < happyUntil) expression = 'flying';
    else if ((!hovering && quiet > 20000) || (!reduced && resting && quiet > 3000 && now % 5900 < 150)) expression = 'sleepy';
    pet.dataset.expression = expression;
    const bob = reduced || !resting ? 0 : Math.sin(now / 900) * 2;
    const stretch = reduced ? 0 : Math.min(speed / 7500, 0.2);
    const horizontal = speed ? body.vx * body.vx / (speed * speed) : 0.5;
    const sx = reduced ? 1 : P.clamp(1 + body.sx + stretch * (2 * horizontal - 1) - (pointer ? 0.06 : 0), 0.52, 1.55);
    const sy = reduced ? 1 : P.clamp(1 + body.sy + stretch * (1 - 2 * horizontal) + (pointer ? 0.08 : 0), 0.52, 1.55);
    const tilt = reduced ? 0 : P.clamp(body.vx / 100, -16, 16) + (pointer ? -3 : Math.sin(now / 1700) * 1.4);
    const dx = reduced ? 0 : -body.nx * radius * Math.max(0, 1 - sx);
    const dy = reduced ? 0 : -body.ny * radius * Math.max(0, 1 - sy);
    pet.style.transform = `translate3d(${(body.x - size / 2 + dx).toFixed(2)}px,${(body.y - size / 2 + dy + bob).toFixed(2)}px,0)`;
    sprite.style.transform = `rotate(${tilt.toFixed(2)}deg) scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
  }

  function tick(now) {
    frame = 0;
    if (!active || reduced) return;
    if (lastFrame && now - lastFrame < 1000 / 32) { frame = requestAnimationFrame(tick); return; }
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 1 / 60;
    lastFrame = now;
    const oldX = body.x, oldY = body.y;
    for (const hit of P.step(body, dt, bounds)) {
      impactUntil = now + 140; happyUntil = now + 800;
      flare(hit.x - hit.nx * radius, hit.y - hit.ny * radius, Math.min(1.2, hit.speed / 900));
    }
    const speed = Math.hypot(body.vx, body.vy);
    if (body.flying && speed > 180) {
      trail.push({ x: body.x, y: body.y, life: 0.65, heat: Math.min(1, speed / 900) });
      const count = Math.min(18, Math.ceil(speed * dt / 3));
      for (let i = 0; i < count; i++) {
        const t = Math.random();
        ember(oldX + (body.x - oldX) * t + random(-12, 12), oldY + (body.y - oldY) * t + random(-12, 12),
          -body.vx * random(0.08, 0.16) + random(-45, 45), -body.vy * random(0.08, 0.16) + random(-45, 45));
      }
    }
    if (wasFlying && !body.flying) save();
    wasFlying = body.flying;
    drawEmbers(dt); render(now);
    frame = requestAnimationFrame(tick);
  }

  function cancelDrag() {
    const id = pointer?.id;
    pointer = null; pet.dataset.held = 'false';
    if (id !== undefined && pet.hasPointerCapture(id)) pet.releasePointerCapture(id);
  }

  function sync() {
    active = enabled && !document.hidden && !document.body.classList.contains('bp-gallery-open');
    layer.hidden = !active;
    toggle.setAttribute('aria-checked', String(enabled));
    toggle.querySelector('[data-pet-state]').textContent = enabled ? 'On' : 'Off';
    if (!active || reduced) {
      cancelAnimationFrame(frame); frame = 0; lastFrame = 0;
      cancelDrag(); P.relax(body); clearEmbers();
    }
    if (active) {
      render(performance.now());
      if (!reduced && !frame) frame = requestAnimationFrame(tick);
    }
  }

  toggle.addEventListener('click', () => {
    enabled = !enabled; lastInteraction = performance.now(); sync(); save();
  });
  pet.addEventListener('pointerdown', event => {
    if (!active || pointer || event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault(); lastInteraction = performance.now(); P.relax(body);
    pet.dataset.pointer = 'true';
    pointer = { id: event.pointerId, dx: event.clientX - body.x, dy: event.clientY - body.y,
      startX: event.clientX, startY: event.clientY, moved: false, samples: [{ x: body.x, y: body.y, t: lastInteraction }] };
    pet.setPointerCapture(event.pointerId); pet.dataset.held = 'true';
    pet.focus({ preventScroll: true }); render(lastInteraction);
  });
  pet.addEventListener('pointermove', event => {
    if (pointer?.id !== event.pointerId) return;
    const now = performance.now();
    body.x = event.clientX - pointer.dx; body.y = event.clientY - pointer.dy;
    P.constrain(body, bounds);
    pointer.moved ||= Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 5;
    pointer.samples.push({ x: body.x, y: body.y, t: now });
    pointer.samples = pointer.samples.filter(p => now - p.t < 120);
    lastInteraction = now; render(now);
  });
  pet.addEventListener('pointerup', event => {
    if (pointer?.id !== event.pointerId) return;
    const now = performance.now(), moved = pointer.moved;
    const velocity = P.releaseVelocity(pointer.samples, now);
    cancelDrag();
    if (moved) suppressClickUntil = now + 400;
    if (!reduced) {
      P.launch(body, velocity.vx, velocity.vy);
      if (!body.flying) P.squash(body, 0, -1, 200);
    }
    happyUntil = now + 700; lastInteraction = now;
    render(now); save();
  });
  function pointerCancelled(event) {
    if (pointer?.id !== event.pointerId) return;
    cancelDrag(); P.relax(body); save(); render(performance.now());
  }
  pet.addEventListener('pointercancel', pointerCancelled);
  pet.addEventListener('lostpointercapture', pointerCancelled);
  pet.addEventListener('dragstart', event => event.preventDefault());
  pet.addEventListener('blur', () => { delete pet.dataset.pointer; });
  pet.addEventListener('pointerenter', () => { hovering = true; lastInteraction = performance.now(); render(lastInteraction); });
  pet.addEventListener('pointerleave', () => { hovering = false; });
  pet.addEventListener('click', () => {
    const now = performance.now();
    if (now < suppressClickUntil) return;
    lastInteraction = now; happyUntil = now + 1000;
    if (!reduced) { P.squash(body, 0, -1, 280); flare(); }
    render(now);
  });
  pet.addEventListener('keydown', event => {
    delete pet.dataset.pointer;
    if (event.key === 'Escape') {
      event.preventDefault(); enabled = false; sync(); save(); toggle.focus(); return;
    }
    const vector = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!vector) return;
    event.preventDefault(); cancelDrag(); P.relax(body);
    lastInteraction = performance.now(); happyUntil = lastInteraction + 700;
    if (event.shiftKey && !reduced) P.launch(body, vector[0] * 1400, vector[1] * 1400);
    else {
      body.x += vector[0] * 24; body.y += vector[1] * 24; P.constrain(body, bounds);
      if (!reduced) P.squash(body, vector[0], vector[1], 100);
    }
    render(lastInteraction); save();
  });

  preference.addEventListener('change', event => { reduced = event.matches; sync(); });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('resize', () => resize());
  window.addEventListener('pagehide', save);
  new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  resize(true); toggle.hidden = false; sync();
})();
