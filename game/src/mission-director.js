// mission-director.js — what the pilot is asked to do: three missions with different goals
// (thread the rings, drop the crate, beat the clock low), scoring, and landing judgement.

export const MISSIONS = [
  {
    id: 'rings', name: 'Ring Run', kind: 'rings', parTime: 240, parScore: 5200,
    brief: 'Thread 8 rings, then land on the strip.',
    rings: [
      { x: 0, y: 900, z: 120, r: 26 }, { x: 350, y: 1500, z: 150, r: 24 },
      { x: 900, y: 2100, z: 180, r: 24 }, { x: 1500, y: 1700, z: 160, r: 22 },
      { x: 1900, y: 900, z: 140, r: 22 }, { x: 1400, y: 200, z: 120, r: 22 },
      { x: 700, y: -500, z: 100, r: 24 }, { x: 0, y: -1000, z: 90, r: 26 },
    ],
  },
  {
    id: 'cargo', name: 'Valley Delivery', kind: 'cargo', parTime: 260, parScore: 2400,
    brief: 'Drop the crate in the glowing zone, then land.',
    dropZone: { x: -1600, y: 1600, r: 130, maxAlt: 230 },
  },
  {
    id: 'dash', name: 'Canyon Dash', kind: 'dash', parTime: 180, parScore: 5200, timeLimit: 180,
    brief: 'Beat 3:00 through low gates. Low flying pays bonus.',
    rings: [
      { x: 200, y: 700, z: 60, r: 24 }, { x: 600, y: 1200, z: 55, r: 22 },
      { x: 1100, y: 900, z: 50, r: 22 }, { x: 1500, y: 1300, z: 55, r: 22 },
      { x: 1900, y: 700, z: 50, r: 22 }, { x: 1500, y: -100, z: 55, r: 22 },
      { x: 800, y: -700, z: 60, r: 24 }, { x: 0, y: -1100, z: 70, r: 26 },
    ],
  },
];

export function createMission(index) {
  const def = MISSIONS[index];
  return {
    index, def, ringIndex: 0, score: 0, elapsed: 0,
    cargo: def.kind === 'cargo' ? 'loaded' : 'none',
    crate: null, objectivesDone: false, timeExpired: false,
    landingPoints: 0, landingLabel: '', lowBonus: 0,
    message: '', messageTimer: 0, events: [],
  };
}

export function showMessage(m, text, dur = 3.2) {
  m.message = text;
  m.messageTimer = dur;
}

export function nextTarget(m, plane) {
  if (m.objectivesDone || m.timeExpired) return { x: 0, y: -430, z: 10, label: 'RUNWAY' };
  if (m.def.kind === 'cargo') {
    const d = m.def.dropZone;
    return { x: d.x, y: d.y, z: 60, label: 'DROP ZONE' };
  }
  const ring = m.def.rings[m.ringIndex];
  if (ring) return { x: ring.x, y: ring.y, z: ring.z, label: 'RING' };
  return { x: 0, y: -430, z: 10, label: 'RUNWAY' };
}

export function missionObjectiveText(m, plane) {
  if (m.objectivesDone) return 'Objectives complete — land on the strip';
  if (m.timeExpired) return 'Time expired — land for partial score';
  if (m.def.kind === 'cargo') {
    const d = m.def.dropZone;
    const dist = Math.round(Math.hypot(d.x - plane.x, d.y - plane.y));
    return `Drop zone ${dist} m — Space drops below 750 FT`;
  }
  const total = m.def.rings.length;
  const base = m.def.kind === 'dash' ? 'Gate' : 'Ring';
  const left = m.def.kind === 'dash' ? ` · ${Math.max(0, Math.ceil(m.def.timeLimit - m.elapsed))}s left` : '';
  return `${base} ${m.ringIndex + 1}/${total} — thread the gold ring${left}`;
}

export function dropCargo(m, plane) {
  if (m.def.kind !== 'cargo' || m.cargo !== 'loaded' || !plane.airborne) return;
  m.cargo = 'falling';
  m.crate = { x: plane.x, y: plane.y, z: plane.z, vz: 0, vx: Math.sin(plane.heading) * plane.speed * 0.4, vy: Math.cos(plane.heading) * plane.speed * 0.4 };
  showMessage(m, 'Crate away!');
  m.events.push('drop');
}

export function updateMission(m, plane, dt, ground) {
  m.elapsed += dt;
  if (m.messageTimer > 0) m.messageTimer -= dt;

  if (m.def.kind === 'dash' && !m.objectivesDone && m.elapsed > m.def.timeLimit) {
    m.timeExpired = true;
    showMessage(m, 'Time expired — land for partial score', 4);
    m.events.push('timeout');
  }

  if ((m.def.kind === 'rings' || m.def.kind === 'dash') && !m.objectivesDone && plane.airborne) {
    const ring = m.def.rings[m.ringIndex];
    if (ring) {
      const dist = Math.hypot(ring.x - plane.x, ring.y - plane.y, ring.z - plane.z);
      if (dist < ring.r) {
        const points = 400 + Math.round(300 * (1 - dist / ring.r));
        m.score += points;
        m.ringIndex += 1;
        m.events.push('ring');
        if (m.ringIndex >= m.def.rings.length) {
          m.objectivesDone = true;
          showMessage(m, 'All rings clear — land on the strip', 4);
        } else {
          showMessage(m, `Ring clear +${points}`);
        }
      }
    }
    if (m.def.kind === 'dash' && plane.z - ground < 90) {
      m.lowBonus += dt * 6;
      m.score += dt * 6;
    }
  }

  if (m.crate) {
    const c = m.crate;
    c.vz -= 9.8 * dt;
    c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
    c.vx *= (1 - dt * 0.6); c.vy *= (1 - dt * 0.6);
    if (c.z <= ground + 1) {
      const d = m.def.dropZone;
      const inside = Math.hypot(d.x - c.x, d.y - c.y) < d.r;
      if (inside) {
        m.cargo = 'delivered';
        m.score += 900;
        showMessage(m, 'Crate delivered +900 — land on the strip', 4);
        m.events.push('delivered');
      } else {
        m.cargo = 'missed';
        m.score = Math.max(0, m.score - 300);
        showMessage(m, 'Crate missed the zone — land anyway', 4);
        m.events.push('missed');
      }
      m.objectivesDone = true;
      m.crate = null;
    }
  }
}

// Judge a touchdown: crash, or damage plus a landing grade the pilot can learn from.
export function scoreLanding(m, td) {
  if (td.vs > 8.5) return { crash: true, reason: 'Slammed into the ground — flare earlier and slower.', damage: 100, points: 0, label: 'Crash' };
  if (Math.abs(td.roll) > 0.55) return { crash: true, reason: 'Wing strike — level the wings before touchdown.', damage: 100, points: 0, label: 'Crash' };
  if (td.pitch < -0.28) return { crash: true, reason: 'Nosed in — keep the nose up on final.', damage: 100, points: 0, label: 'Crash' };
  const damage = Math.max(0, (td.vs - 2.2)) * 6 + (td.onRunway ? 0 : 12) + Math.abs(td.roll) * 16;
  let points, label;
  if (td.vs < 2.2) { points = 1000; label = 'Silk landing'; }
  else if (td.vs < 4) { points = 650; label = 'Firm touchdown'; }
  else if (td.vs < 6.5) { points = 320; label = 'Heavy arrival'; }
  else { points = 120; label = 'Rough landing'; }
  if (!td.onRunway) { points = Math.round(points * 0.5); label += ' (off strip)'; }
  m.landingPoints = points;
  m.landingLabel = label;
  return { crash: false, reason: '', damage, points, label };
}

export function finalScore(m) {
  const timeBonus = Math.min(800, Math.max(0, Math.round((m.def.parTime - m.elapsed) * 4)));
  const total = Math.round(m.score) + m.landingPoints + (m.objectivesDone ? timeBonus : 0);
  const ratio = total / m.def.parScore;
  const grade = ratio >= 0.92 ? 'S' : ratio >= 0.75 ? 'A' : ratio >= 0.55 ? 'B' : ratio >= 0.35 ? 'C' : 'D';
  return { total, timeBonus: m.objectivesDone ? timeBonus : 0, grade };
}
