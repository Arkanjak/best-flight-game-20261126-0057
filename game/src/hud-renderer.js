// hud-renderer.js — what the pilot reads: altitude, speed, heading, horizon, throttle, fuel,
// hull, mission progress, a minimap, target guidance, and the title and debrief screens.

import { MISSIONS, finalScore, missionObjectiveText, nextTarget } from './mission-director.js';
import { projectPoint } from './scene-renderer.js';
import { terrainHeightAt } from './terrain-field.js';

const FONT = 'ui-monospace, Menlo, Consolas, monospace';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,14,24,0.72)';
  ctx.strokeStyle = 'rgba(120,220,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

function headingDeg(plane) {
  return Math.round(((plane.heading * 180) / Math.PI % 360 + 360) % 360);
}

function compassLabel(deg) {
  const labels = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
  return labels[deg] || String(deg);
}

function drawHeadingTape(ctx, view) {
  const { w, plane } = view;
  const cx = w / 2, y = 14, half = 140;
  panel(ctx, cx - half - 8, y - 4, half * 2 + 16, 44);
  const hdg = headingDeg(plane);
  ctx.font = `700 13px ${FONT}`;
  ctx.textAlign = 'center';
  for (let off = -40; off <= 40; off += 5) {
    const deg = ((hdg + off) % 360 + 360) % 360;
    const x = cx + off * 3.2;
    ctx.strokeStyle = 'rgba(200,240,255,0.8)';
    ctx.beginPath();
    ctx.moveTo(x, y + 22);
    ctx.lineTo(x, y + (off % 15 === 0 ? 12 : 17));
    ctx.stroke();
    if (off % 30 === 0 && off !== 0) {
      ctx.fillStyle = '#cfeeff';
      ctx.fillText(compassLabel(deg), x, y + 34);
    }
  }
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.moveTo(cx - 6, y + 2); ctx.lineTo(cx + 6, y + 2); ctx.lineTo(cx, y + 10);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(8,14,24,0.85)';
  ctx.fillRect(cx - 24, y + 20, 48, 18);
  ctx.fillStyle = '#ffd94d';
  ctx.font = `700 15px ${FONT}`;
  ctx.fillText(String(hdg).padStart(3, '0'), cx, y + 34);
}

function drawSpeedAltitude(ctx, view) {
  const { w, plane } = view;
  const ground = terrainHeightAt(plane.x, plane.y);
  const speedKt = Math.round(plane.speed * 1.94384);
  const altFt = Math.round(plane.z * 3.28084);
  const aglFt = Math.max(0, Math.round((plane.z - ground) * 3.28084));
  const vsi = Math.round(plane.verticalSpeed * 196.85);

  panel(ctx, 14, 120, 118, 92);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#8fb8d8';
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText('SPEED', 24, 140);
  ctx.fillStyle = plane.stalling ? '#ff6666' : '#eaffea';
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(`${speedKt}`, 24, 168);
  ctx.font = `600 12px ${FONT}`;
  ctx.fillStyle = '#cfeeff';
  ctx.fillText('KT', 24, 188);
  ctx.fillText(plane.airborne ? 'AIRBORNE' : 'ON GROUND', 24, 204);

  panel(ctx, w - 132, 120, 118, 92);
  ctx.fillStyle = '#8fb8d8';
  ctx.font = `600 11px ${FONT}`;
  ctx.fillText('ALTITUDE', w - 122, 140);
  ctx.fillStyle = '#eaffea';
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(`${altFt}`, w - 122, 168);
  ctx.font = `600 12px ${FONT}`;
  ctx.fillStyle = '#cfeeff';
  ctx.fillText(`FT · AGL ${aglFt}`, w - 122, 188);
  ctx.fillText(`VS ${vsi >= 0 ? '+' : ''}${vsi} FPM`, w - 122, 204);
}

function drawHorizon(ctx, view) {
  const { w, h, plane } = view;
  const cx = w / 2, cy = h * 0.46;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-plane.roll * 0.85);
  const pitchPx = plane.pitch * 140;
  ctx.strokeStyle = 'rgba(140,255,170,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-90, pitchPx); ctx.lineTo(-28, pitchPx);
  ctx.moveTo(28, pitchPx); ctx.lineTo(90, pitchPx);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(140,255,170,0.45)';
  ctx.lineWidth = 1.5;
  for (const off of [-46, 46]) {
    ctx.beginPath();
    ctx.moveTo(-34, pitchPx + off); ctx.lineTo(34, pitchPx + off);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 26, cy); ctx.lineTo(cx - 12, cy);
  ctx.moveTo(cx + 12, cy); ctx.lineTo(cx + 26, cy);
  ctx.stroke();
}

function drawBars(ctx, view) {
  const { h, plane } = view;
  const x = 22, y0 = h - 104, wBar = 162;
  panel(ctx, x - 6, y0 - 24, wBar + 92, 96);
  const bar = (y, label, frac, color, text) => {
    ctx.fillStyle = '#8fb8d8';
    ctx.font = `600 11px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y + 4);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(x + 52, y - 7, wBar - 40, 11);
    ctx.fillStyle = color;
    ctx.fillRect(x + 52, y - 7, (wBar - 40) * Math.max(0, Math.min(1, frac)), 11);
    ctx.fillStyle = '#eaffea';
    ctx.fillText(text, x + wBar + 20, y + 4);
  };
  bar(y0, 'THR', plane.throttle, '#57d7ff', `${Math.round(plane.throttle * 100)}%`);
  bar(y0 + 26, 'FUEL', plane.fuel / 100, plane.fuel < 20 ? '#ff6666' : '#ffd94d', `${Math.round(plane.fuel)}`);
  bar(y0 + 52, 'HULL', 1 - plane.damage / 100, plane.damage > 55 ? '#ff8844' : '#7dff8a', `${Math.round(100 - plane.damage)}%`);
}

function drawMissionPanel(ctx, view) {
  const { plane, mission } = view;
  panel(ctx, 14, 14, 330, 92);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd94d';
  ctx.font = `700 16px ${FONT}`;
  ctx.fillText(mission.def.name.toUpperCase(), 24, 38);
  ctx.fillStyle = '#eaffea';
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText(missionObjectiveText(mission, plane), 24, 60);
  const mins = Math.floor(mission.elapsed / 60);
  const secs = String(Math.floor(mission.elapsed % 60)).padStart(2, '0');
  ctx.fillStyle = '#cfeeff';
  ctx.fillText(`Score ${Math.round(mission.score)} · Time ${mins}:${secs}`, 24, 82);
  if (mission.def.kind === 'cargo') {
    ctx.fillText(`Cargo: ${mission.cargo.toUpperCase()}`, 24, 98);
  }
}

function drawMinimap(ctx, view) {
  const { w, h, plane, mission } = view;
  const size = 156, x0 = w - size - 14, y0 = h - size - 14;
  panel(ctx, x0, y0, size, size);
  const map = (wx, wy) => [x0 + size / 2 + (wx / 2600) * (size / 2), y0 + size / 2 - (wy / 2600) * (size / 2)];
  ctx.fillStyle = '#8fb8d8';
  ctx.font = `700 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('N', x0 + size / 2, y0 + 14);
  const [rx0, ry0] = map(-30, 450);
  const [rx1, ry1] = map(30, -450);
  ctx.fillStyle = '#e8edf2';
  ctx.fillRect(rx0, ry0, Math.max(2, rx1 - rx0), ry1 - ry0);
  if (mission.def.kind === 'cargo') {
    const d = mission.def.dropZone;
    const [dx, dy] = map(d.x, d.y);
    ctx.strokeStyle = '#7dff8a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(dx, dy, 7, 0, Math.PI * 2); ctx.stroke();
  } else {
    mission.def.rings.forEach((ring, i) => {
      if (i < mission.ringIndex) return;
      const [px, py] = map(ring.x, ring.y);
      ctx.fillStyle = i === mission.ringIndex ? '#ffd94d' : '#57d7ff';
      ctx.beginPath(); ctx.arc(px, py, i === mission.ringIndex ? 4 : 3, 0, Math.PI * 2); ctx.fill();
    });
  }
  const [px, py] = map(plane.x, plane.y);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(plane.heading);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -7); ctx.lineTo(4.5, 5); ctx.lineTo(-4.5, 5);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawTargetGuidance(ctx, view) {
  const { w, h, plane, mission, camera } = view;
  if (!camera) return;
  const target = nextTarget(mission, plane);
  const p = projectPoint(camera, target.x, target.y, target.z);
  const onScreen = p && p.x > 30 && p.x < w - 30 && p.y > 30 && p.y < h - 30;
  const dist = Math.round(Math.hypot(target.x - plane.x, target.y - plane.y));
  ctx.font = `700 13px ${FONT}`;
  ctx.textAlign = 'center';
  if (onScreen) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 12); ctx.lineTo(p.x + 9, p.y); ctx.lineTo(p.x, p.y + 12); ctx.lineTo(p.x - 9, p.y);
    ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.fillText(`${target.label} ${dist} m`, p.x, p.y - 48);
  } else {
    const bearing = Math.atan2(target.x - plane.x, target.y - plane.y);
    let rel = bearing - plane.heading;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    const ax = w / 2 + Math.sin(rel) * 150;
    const ay = h * 0.46 - Math.cos(rel) * 110;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(rel);
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(9, 8); ctx.lineTo(-9, 8);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffd94d';
    ctx.fillText(`${target.label} ${dist} m`, ax, ay + 26);
  }
  if (mission.objectivesDone) {
    const aim = projectPoint(camera, 0, -400, 2);
    if (aim) {
      ctx.strokeStyle = '#7dff8a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(aim.x, aim.y - 10); ctx.lineTo(aim.x + 8, aim.y); ctx.lineTo(aim.x, aim.y + 10); ctx.lineTo(aim.x - 8, aim.y);
      ctx.closePath(); ctx.stroke();
      ctx.fillStyle = '#7dff8a';
      ctx.fillText('TDZ', aim.x, aim.y - 16);
    }
  }
}

function drawMessages(ctx, view) {
  const { w, h, plane, mission, t } = view;
  ctx.textAlign = 'center';
  if (mission.messageTimer > 0 && mission.message) {
    ctx.font = `700 22px ${FONT}`;
    ctx.fillStyle = 'rgba(8,14,24,0.65)';
    const tw = ctx.measureText(mission.message).width;
    ctx.fillRect(w / 2 - tw / 2 - 14, h * 0.2 - 26, tw + 28, 38);
    ctx.fillStyle = '#ffe98a';
    ctx.fillText(mission.message, w / 2, h * 0.2);
  }
  if (plane.stalling && (t % 0.6) < 0.35) {
    ctx.font = `700 30px ${FONT}`;
    ctx.fillStyle = '#ff4444';
    ctx.fillText('STALL', w / 2, h * 0.32);
  }
  if (plane.fuel <= 0 && plane.airborne) {
    ctx.font = `700 17px ${FONT}`;
    ctx.fillStyle = '#ffb84d';
    ctx.fillText('FUEL EMPTY — GLIDE TO THE STRIP', w / 2, h * 0.36);
  }
  ctx.font = `600 12px ${FONT}`;
  ctx.fillStyle = 'rgba(207,238,255,0.85)';
  ctx.textAlign = 'right';
  ctx.fillText(view.cameraMode === 'chase' ? 'CAM CHASE · C' : 'CAM COCKPIT · C', w - 16, 22);
}

export function drawHud(ctx, view) {
  drawMissionPanel(ctx, view);
  drawHeadingTape(ctx, view);
  drawSpeedAltitude(ctx, view);
  drawHorizon(ctx, view);
  drawBars(ctx, view);
  drawMinimap(ctx, view);
  drawTargetGuidance(ctx, view);
  drawMessages(ctx, view);
}

export function drawTitleScreen(ctx, view) {
  const { w, h, selected } = view;
  ctx.fillStyle = 'rgba(6,10,20,0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = `700 ${Math.min(72, w * 0.07)}px ${FONT}`;
  ctx.fillText('SKYLANE', w / 2, h * 0.24);
  ctx.fillStyle = '#cfeeff';
  ctx.font = `600 ${Math.min(20, w * 0.02)}px ${FONT}`;
  ctx.fillText('VALLEY PATROL — rings, cargo and the clock', w / 2, h * 0.3);

  MISSIONS.forEach((m, i) => {
    const y = h * 0.42 + i * 64;
    const active = i === selected;
    panel(ctx, w / 2 - 300, y - 30, 600, 52);
    ctx.fillStyle = active ? '#ffd94d' : '#eaffea';
    ctx.font = `700 19px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}. ${m.name}`, w / 2 - 280, y - 4);
    ctx.font = `600 13px ${FONT}`;
    ctx.fillStyle = '#cfeeff';
    ctx.fillText(m.brief, w / 2 - 280, y + 16);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaffea';
  ctx.font = `600 15px ${FONT}`;
  ctx.fillText('Press 1 / 2 / 3 to choose a mission, ENTER or click to fly', w / 2, h * 0.78);
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = '#9fc6e8';
  ctx.fillText('Arrows pitch & bank · W/S throttle · Mouse steers · Space drops cargo', w / 2, h * 0.83);
  ctx.fillText('C camera · B brake · P pause · R restart · M mute', w / 2, h * 0.87);
}

export function drawEndScreen(ctx, view) {
  const { w, h, mode, mission, crashReason } = view;
  ctx.fillStyle = 'rgba(6,10,20,0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  if (mode === 'complete') {
    const result = finalScore(mission);
    ctx.fillStyle = '#7dff8a';
    ctx.font = `700 44px ${FONT}`;
    ctx.fillText('MISSION COMPLETE', w / 2, h * 0.3);
    ctx.fillStyle = '#ffd94d';
    ctx.font = `700 64px ${FONT}`;
    ctx.fillText(`GRADE ${result.grade}`, w / 2, h * 0.42);
    ctx.fillStyle = '#eaffea';
    ctx.font = `600 18px ${FONT}`;
    ctx.fillText(`Flight score ${Math.round(mission.score)} · Landing ${mission.landingLabel} +${mission.landingPoints}`, w / 2, h * 0.52);
    ctx.fillText(`Time bonus +${result.timeBonus} · Total ${result.total}`, w / 2, h * 0.57);
  } else {
    ctx.fillStyle = '#ff6666';
    ctx.font = `700 44px ${FONT}`;
    ctx.fillText('AIRCRAFT DOWN', w / 2, h * 0.3);
    ctx.fillStyle = '#eaffea';
    ctx.font = `600 18px ${FONT}`;
    ctx.fillText(crashReason || 'The valley wins this round.', w / 2, h * 0.42);
    ctx.fillText(`Score banked: ${Math.round(mission.score)}`, w / 2, h * 0.5);
  }
  ctx.fillStyle = '#cfeeff';
  ctx.font = `600 15px ${FONT}`;
  ctx.fillText('R fly again · 1 / 2 / 3 change mission · T title', w / 2, h * 0.66);
}
