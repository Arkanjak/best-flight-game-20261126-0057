// aircraft-renderer.js — the aeroplane itself: a red-and-white sport plane seen from chase view,
// and a lit instrument panel for cockpit view. Both views keep the aircraft in frame.

function drawChasePlaneBody(ctx, s, plane, t) {
  // Wings with red tips.
  ctx.fillStyle = '#e8edf2';
  ctx.strokeStyle = '#9fb3c8';
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath();
  ctx.moveTo(-2.6 * s, 0.25 * s);
  ctx.lineTo(-0.5 * s, -0.15 * s);
  ctx.lineTo(0.5 * s, -0.15 * s);
  ctx.lineTo(2.6 * s, 0.25 * s);
  ctx.lineTo(2.4 * s, 0.55 * s);
  ctx.lineTo(-2.4 * s, 0.55 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d23b3b';
  ctx.fillRect(-2.6 * s, 0.22 * s, 0.55 * s, 0.3 * s);
  ctx.fillRect(2.05 * s, 0.22 * s, 0.55 * s, 0.3 * s);

  // Fuselage, nose away from the camera.
  ctx.fillStyle = '#f2f4f6';
  ctx.beginPath();
  ctx.moveTo(0, -1.55 * s);
  ctx.quadraticCurveTo(0.34 * s, -0.9 * s, 0.3 * s, 0.1 * s);
  ctx.quadraticCurveTo(0.24 * s, 0.8 * s, 0.1 * s, 1.15 * s);
  ctx.lineTo(-0.1 * s, 1.15 * s);
  ctx.quadraticCurveTo(-0.24 * s, 0.8 * s, -0.3 * s, 0.1 * s);
  ctx.quadraticCurveTo(-0.34 * s, -0.9 * s, 0, -1.55 * s);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d23b3b';
  ctx.fillRect(-0.3 * s, 0.55 * s, 0.6 * s, 0.14 * s);

  // Canopy.
  ctx.fillStyle = 'rgba(127,212,255,0.92)';
  ctx.beginPath();
  ctx.ellipse(0, -0.35 * s, 0.26 * s, 0.48 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5b7d99';
  ctx.stroke();

  // Tailplane and fin.
  ctx.fillStyle = '#e8edf2';
  ctx.beginPath();
  ctx.moveTo(-0.85 * s, 0.95 * s);
  ctx.lineTo(0.85 * s, 0.95 * s);
  ctx.lineTo(0.7 * s, 1.2 * s);
  ctx.lineTo(-0.7 * s, 1.2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d23b3b';
  ctx.beginPath();
  ctx.moveTo(0, 0.55 * s);
  ctx.lineTo(0.12 * s, 1.2 * s);
  ctx.lineTo(-0.12 * s, 1.2 * s);
  ctx.closePath();
  ctx.fill();

  // Propeller blur at the nose.
  ctx.fillStyle = 'rgba(210,228,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, -1.58 * s, 0.85 * s, 0.13 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Navigation lights: red left, green right, blinking.
  const blink = (t % 1) < 0.55;
  ctx.fillStyle = blink ? '#ff4444' : '#7a1f1f';
  ctx.beginPath(); ctx.arc(-2.55 * s, 0.35 * s, 0.09 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = blink ? '#44ff77' : '#1f6a33';
  ctx.beginPath(); ctx.arc(2.55 * s, 0.35 * s, 0.09 * s, 0, Math.PI * 2); ctx.fill();

  // Exhaust shimmer at high throttle.
  if (plane.throttle > 0.7 && plane.airborne) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, (1.35 + i * 0.22) * s, 0.14 * s + i * 0.05 * s, 0.1 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawChasePlane(ctx, view) {
  const { w, h, plane, t } = view;
  const s = Math.min(w, h) * 0.115;
  ctx.save();
  ctx.translate(w / 2, h * 0.67 + plane.pitch * 30);
  ctx.rotate(plane.roll * 0.85);
  drawChasePlaneBody(ctx, s, plane, t);
  ctx.restore();
}

function drawGauge(ctx, cx, cy, r, label, valueText, needleAngle) {
  ctx.fillStyle = '#141a26';
  ctx.strokeStyle = '#7fd4ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(200,230,255,0.7)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8);
    ctx.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92);
    ctx.stroke();
  }
  ctx.strokeStyle = '#ffd94d';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(needleAngle) * r * 0.72, cy + Math.sin(needleAngle) * r * 0.72);
  ctx.stroke();
  ctx.fillStyle = '#cfeeff';
  ctx.font = `700 ${Math.max(10, r * 0.3)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(valueText, cx, cy + r * 0.55);
  ctx.font = `600 ${Math.max(8, r * 0.22)}px ui-monospace, monospace`;
  ctx.fillStyle = '#8fb8d8';
  ctx.fillText(label, cx, cy + r * 0.82);
}

export function drawCockpit(ctx, view) {
  const { w, h, plane } = view;
  // Window pillars.
  ctx.fillStyle = '#10141c';
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(w * 0.09, 0); ctx.lineTo(w * 0.16, h * 0.74); ctx.lineTo(0, h * 0.74);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w, 0); ctx.lineTo(w * 0.91, 0); ctx.lineTo(w * 0.84, h * 0.74); ctx.lineTo(w, h * 0.74);
  ctx.closePath(); ctx.fill();
  // Panel.
  ctx.fillStyle = '#10141c';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h * 0.74);
  ctx.quadraticCurveTo(w / 2, h * 0.68, w, h * 0.74);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#2c3e55';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.74);
  ctx.quadraticCurveTo(w / 2, h * 0.68, w, h * 0.74);
  ctx.stroke();

  const speedKt = Math.round(plane.speed * 1.94384);
  const altFt = Math.round(plane.z * 3.28084);
  const hdg = Math.round(((plane.heading * 180) / Math.PI % 360 + 360) % 360);
  const r = h * 0.058;
  drawGauge(ctx, w * 0.37, h * 0.865, r, 'SPEED KT', String(speedKt),
    Math.PI * 0.75 + Math.min(1, speedKt / 170) * Math.PI * 1.5);
  drawGauge(ctx, w * 0.5, h * 0.845, r * 1.08, 'ALT FT', String(altFt),
    Math.PI * 0.75 + ((altFt % 1000) / 1000) * Math.PI * 1.5);
  drawGauge(ctx, w * 0.63, h * 0.865, r, 'HEADING', String(hdg).padStart(3, '0'),
    -Math.PI / 2 + (hdg / 360) * Math.PI * 2);

  // Warning lamps.
  const lamp = (x, label, on, color) => {
    ctx.fillStyle = on ? color : '#232c3d';
    ctx.beginPath();
    ctx.arc(x, h * 0.775, h * 0.012, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = on ? '#fff' : '#5b708c';
    ctx.font = `700 ${Math.max(9, h * 0.014)}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, h * 0.8);
  };
  lamp(w * 0.44, 'STALL', plane.stalling, '#ff4444');
  lamp(w * 0.5, 'FUEL', plane.fuel < 25, '#ffb84d');
  lamp(w * 0.56, 'HULL', plane.damage > 55, '#ff8844');
}
