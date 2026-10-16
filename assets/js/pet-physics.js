(function (scope) {
  'use strict';

  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;

  function create(x, y) {
    return { x, y, vx: 0, vy: 0, flying: false, sx: 0, sy: 0, dsx: 0, dsy: 0, nx: 0, ny: 0 };
  }

  function constrain(body, bounds) {
    body.x = clamp(finite(body.x, bounds.minX), bounds.minX, bounds.maxX);
    body.y = clamp(finite(body.y, bounds.minY), bounds.minY, bounds.maxY);
  }

  function settle(body) {
    body.vx = body.vy = 0;
    body.flying = false;
  }

  function relax(body) {
    settle(body);
    body.sx = body.sy = body.dsx = body.dsy = body.nx = body.ny = 0;
  }

  // Compression follows the contact normal; the perpendicular stretch
  // approximately preserves the disc's area. A damped spring restores it.
  function squash(body, nx, ny, speed) {
    const amount = clamp(0.1 + Math.abs(finite(speed)) * 0.00024, 0.1, 0.42);
    body.sx = clamp(body.sx + (nx ? -amount : amount * 0.9), -0.44, 0.44);
    body.sy = clamp(body.sy + (ny ? -amount : amount * 0.9), -0.44, 0.44);
    body.dsx = body.dsy = 0;
    body.nx = nx;
    body.ny = ny;
  }

  function launch(body, vx, vy) {
    const speed = Math.hypot(finite(vx), finite(vy));
    const scale = speed > 2200 ? 2200 / speed : 1;
    body.vx = finite(vx) * scale;
    body.vy = finite(vy) * scale;
    body.flying = speed >= 150;
    if (!body.flying) settle(body);
  }

  // Ignore old samples so a pause before releasing means "put it here".
  function releaseVelocity(samples, now) {
    const recent = samples.filter(p => now - p.t <= 100 && now >= p.t);
    if (recent.length < 2 || now - recent.at(-1).t > 65) return { vx: 0, vy: 0 };
    const first = recent[0], last = recent.at(-1);
    const elapsed = (last.t - first.t) / 1000;
    if (elapsed < 0.012) return { vx: 0, vy: 0 };
    return { vx: (last.x - first.x) / elapsed, vy: (last.y - first.y) / elapsed };
  }

  function step(body, seconds, bounds) {
    const collisions = [];
    let remaining = clamp(finite(seconds), 0, 0.05);
    constrain(body, bounds);
    while (remaining > 0.000001) {
      const dt = Math.min(remaining, 1 / 120);
      remaining -= dt;
      if (body.flying) {
        const drag = Math.exp(-0.8 * dt);
        body.vx *= drag;
        body.vy = body.vy * drag + 900 * dt;
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        let nx = 0, ny = 0, speed = 0;
        if (body.x < bounds.minX || body.x > bounds.maxX) {
          nx = body.x < bounds.minX ? 1 : -1;
          speed = Math.abs(body.vx);
          body.vx *= -0.7;
        }
        if (body.y < bounds.minY || body.y > bounds.maxY) {
          ny = body.y < bounds.minY ? 1 : -1;
          speed = Math.max(speed, Math.abs(body.vy));
          if (ny === -1 && Math.abs(body.vy) < 105) {
            body.vy = 0;
            body.vx *= Math.exp(-8 * dt);
            if (Math.abs(body.vx) < 18) settle(body);
          } else body.vy *= -0.67;
        }
        constrain(body, bounds);
        if ((nx || ny) && speed > 25) {
          squash(body, nx, ny, speed);
          collisions.push({ x: body.x, y: body.y, nx, ny, speed });
        }
      }
      for (const [strain, velocity] of [['sx', 'dsx'], ['sy', 'dsy']]) {
        body[velocity] += (-160 * body[strain] - 12 * body[velocity]) * dt;
        body[strain] += body[velocity] * dt;
        if (Math.abs(body[strain]) < 0.0001 && Math.abs(body[velocity]) < 0.001) body[strain] = body[velocity] = 0;
      }
    }
    return collisions;
  }

  const api = { clamp, create, constrain, settle, relax, squash, launch, releaseVelocity, step };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.AWPetPhysics = api;
})(typeof window !== 'undefined' ? window : globalThis);
