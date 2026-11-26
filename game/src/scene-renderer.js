// scene-renderer.js — the world in perspective: sky, sun, heightfield terrain, runway, rings,
// drop zone, clouds and the aircraft shadow, all projected from one chase or cockpit camera.

import { RUNWAY, terrainHeightAt, terrainColorForHeight } from './terrain-field.js';

export function createCamera(plane, mode, w, h) {
  const fx = Math.sin(plane.heading), fy = Math.cos(plane.heading);
  const rx = Math.cos(plane.heading), ry = -Math.sin(plane.heading);
  const chase = mode === 'chase';
  return {
    mode, w, h, fx, fy, rx, ry,
    camX: plane.x - fx * (chase ? 42 : -2),
    camY: plane.y - fy * (chase ? 42 : -2),
    camZ: plane.z + (chase ? 11 : 1.6),
    focal: h * 1.12,
    horizonY: h * 0.46,
    pitch: plane.pitch,
    roll: plane.roll,
  };
}

export function projectPoint(cam, x, y, z) {
  const relX = x - cam.camX, relY = y - cam.camY;
  const ahead = relX * cam.fx + relY * cam.fy;
  if (ahead < 3) return null;
  const side = relX * cam.rx + relY * cam.ry;
  const scale = cam.focal / ahead;
  let sx = cam.w / 2 + side * scale;
  let sy = cam.horizonY - (z - cam.camZ) * scale + cam.pitch * cam.focal * 0.38;
  const tilt = -cam.roll * (cam.mode === 'chase' ? 0.5 : 0.85);
  const dx = sx - cam.w / 2, dy = sy - cam.horizonY;
  const cos = Math.cos(tilt), sin = Math.sin(tilt);
  sx = cam.w / 2 + dx * cos - dy * sin;
  sy = cam.horizonY + dx * sin + dy * cos;
  return { x: sx, y: sy, ahead, scale };
}

function drawSky(ctx, view) {
  const { w, h } = view;
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#5f9fd8');
  grad.addColorStop(0.42, '#a8cdf0');
  grad.addColorStop(0.55, '#dceef7');
  grad.addColorStop(1, '#cfe3ee');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  const sunX = w * 0.78, sunY = h * 0.16;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
  glow.addColorStop(0, 'rgba(255,246,200,0.95)');
  glow.addColorStop(0.25, 'rgba(255,240,170,0.55)');
  glow.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 90, sunY - 90, 180, 180);
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 17, 0, Math.PI * 2);
  ctx.fill();
}

const ROW_DISTANCES = [18, 30, 45, 65, 90, 120, 160, 210, 270, 340, 430, 540, 670, 820, 1000, 1220, 1480, 1780, 2150, 2600];
const COL_T = [];
for (let i = 0; i <= 20; i++) COL_T.push(-1.7 + i * 0.17);

function drawTerrain(ctx, view, cam) {
  const grid = ROW_DISTANCES.map((d) => COL_T.map((t) => {
    const wx = cam.camX + cam.fx * d + cam.rx * d * t;
    const wy = cam.camY + cam.fy * d + cam.ry * d * t;
    const wz = terrainHeightAt(wx, wy);
    return { p: projectPoint(cam, wx, wy, wz), h: wz, wx, wy };
  }));
  for (let r = grid.length - 2; r >= 0; r--) {
    for (let c = 0; c < COL_T.length - 1; c++) {
      const a = grid[r][c], b = grid[r][c + 1], d2 = grid[r + 1][c + 1], e = grid[r + 1][c];
      if (!a.p || !b.p || !d2.p || !e.p) continue;
      const avgH = (a.h + b.h + d2.h + e.h) / 4;
      const slope = Math.abs(a.h - d2.h) + Math.abs(b.h - e.h);
      ctx.fillStyle = terrainColorForHeight(avgH, slope, view.t, (a.wx + d2.wx) / 2, (a.wy + d2.wy) / 2);
      ctx.beginPath();
      ctx.moveTo(a.p.x, a.p.y);
      ctx.lineTo(b.p.x, b.p.y);
      ctx.lineTo(d2.p.x, d2.p.y);
      ctx.lineTo(e.p.x, e.p.y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function groundQuad(ctx, cam, x0, y0, x1, y1, fill) {
  const pts = [
    projectPoint(cam, x0, y0, terrainHeightAt(x0, y0) + 0.3),
    projectPoint(cam, x1, y0, terrainHeightAt(x1, y0) + 0.3),
    projectPoint(cam, x1, y1, terrainHeightAt(x1, y1) + 0.3),
    projectPoint(cam, x0, y1, terrainHeightAt(x0, y1) + 0.3),
  ];
  if (pts.some((p) => !p)) return;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fill();
}

function drawRunway(ctx, cam) {
  const hw = RUNWAY.halfWidth, hl = RUNWAY.halfLength;
  groundQuad(ctx, cam, -hw, -hl, hw, hl, '#3a3f46');
  groundQuad(ctx, cam, -hw, -hl, -hw + 1.6, hl, '#e8edf2');
  groundQuad(ctx, cam, hw - 1.6, -hl, hw, hl, '#e8edf2');
  for (let y = -hl + 30; y < hl - 30; y += 60) {
    groundQuad(ctx, cam, -1.1, y, 1.1, y + 30, '#f4f7fa');
  }
  for (let i = 0; i < 6; i++) {
    const x0 = -hw + 4 + i * ((hw * 2 - 8) / 6);
    groundQuad(ctx, cam, x0, -hl + 2, x0 + 4, -hl + 22, '#f4f7fa');
  }
  ctx.fillStyle = '#ffb84d';
  for (let y = -hl; y <= hl; y += 75) {
    for (const x of [-hw - 2, hw + 2]) {
      const p = projectPoint(cam, x, y, 1);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1.5, 1.6 * p.scale * 0.06), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRings(ctx, view, cam) {
  const m = view.mission;
  if (m.def.kind === 'cargo') return;
  for (let i = m.ringIndex; i < m.def.rings.length; i++) {
    const ring = m.def.rings[i];
    const p = projectPoint(cam, ring.x, ring.y, ring.z);
    if (!p) continue;
    const next = i === m.ringIndex;
    const radius = Math.max(6, ring.r * p.scale * (next ? 1 + 0.04 * Math.sin(view.t * 4) : 1));
    const groundP = projectPoint(cam, ring.x, ring.y, terrainHeightAt(ring.x, ring.y));
    if (groundP) {
      ctx.strokeStyle = next ? 'rgba(255,217,77,0.35)' : 'rgba(87,215,255,0.2)';
      ctx.lineWidth = Math.max(1, radius * 0.06);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(groundP.x, groundP.y);
      ctx.stroke();
    }
    ctx.strokeStyle = next ? '#ffd94d' : 'rgba(87,215,255,0.85)';
    ctx.lineWidth = Math.max(2, radius * 0.12);
    ctx.shadowColor = next ? '#ffd94d' : '#57d7ff';
    ctx.shadowBlur = next ? 16 : 6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = Math.max(1, radius * 0.04);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius * 0.82, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawDropZone(ctx, view, cam) {
  const m = view.mission;
  if (m.def.kind !== 'cargo' || m.cargo === 'delivered') return;
  const d = m.def.dropZone;
  ctx.strokeStyle = '#7dff8a';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#7dff8a';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const x = d.x + Math.cos(a) * d.r, y = d.y + Math.sin(a) * d.r;
    const p = projectPoint(cam, x, y, terrainHeightAt(x, y) + 1);
    if (!p) continue;
    if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  const base = projectPoint(cam, d.x, d.y, terrainHeightAt(d.x, d.y));
  const top = projectPoint(cam, d.x, d.y, terrainHeightAt(d.x, d.y) + 140);
  if (base && top) {
    ctx.strokeStyle = 'rgba(125,255,138,0.4)';
    ctx.lineWidth = Math.max(2, 3 * base.scale * 0.05);
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(top.x, top.y);
    ctx.stroke();
  }
  if (m.crate) {
    const p = projectPoint(cam, m.crate.x, m.crate.y, m.crate.z);
    if (p) {
      const s = Math.max(3, 4 * p.scale * 0.08);
      ctx.fillStyle = '#c98d4b';
      ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y - s * 1.4, s * 1.5, Math.PI, 0);
      ctx.stroke();
    }
  }
}

function drawClouds(ctx, cam) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 36; i++) {
    const cx = ((i * 1737) % 6200) - 3100;
    const cy = ((i * 2917) % 6200) - 3100;
    const cz = 260 + ((i * 131) % 160);
    const p = projectPoint(cam, cx, cy, cz);
    if (!p || p.ahead > 3200) continue;
    const s = Math.max(9, 110 * p.scale * 0.05);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, s * 1.7, s * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x - s * 0.8, p.y + s * 0.14, s * 1.05, s * 0.42, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + s * 0.8, p.y + s * 0.12, s * 0.95, s * 0.4, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x, p.y - s * 0.28, s * 0.9, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlaneShadow(ctx, view, cam) {
  const plane = view.plane;
  const ground = terrainHeightAt(plane.x, plane.y);
  const p = projectPoint(cam, plane.x, plane.y, ground + 0.2);
  if (!p) return;
  const agl = Math.max(0, plane.z - ground);
  const rx = Math.max(4, Math.min(120, 30 * p.scale * 0.08));
  ctx.fillStyle = `rgba(10,20,10,${Math.max(0.05, Math.min(0.45, 0.45 - agl * 0.0012))})`;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, rx, rx * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawScene(ctx, view) {
  const cam = createCamera(view.plane, view.cameraMode, view.w, view.h);
  view.camera = cam;
  drawSky(ctx, view);
  drawTerrain(ctx, view, cam);
  drawRunway(ctx, cam);
  drawDropZone(ctx, view, cam);
  drawRings(ctx, view, cam);
  drawClouds(ctx, cam);
  drawPlaneShadow(ctx, view, cam);
}
