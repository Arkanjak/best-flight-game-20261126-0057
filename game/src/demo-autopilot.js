// demo-autopilot.js — deterministic showcase scenes for screenshots: ?shot=cover|rings|cockpit|landing
// places the aircraft mid-mission and an autopilot flies it, so every render shows real gameplay.

import { createAircraftState } from './flight-model.js';
import { createMission, nextTarget } from './mission-director.js';
import { neutralInput } from './input-controls.js';

export function readDemoRequest(search) {
  const q = new URLSearchParams(search);
  const shot = q.get('shot');
  if (!shot) return null;
  return { shot, seed: Number.parseInt(q.get('seed') || '1', 10) || 1 };
}

function placedPlane(fields) {
  const p = createAircraftState();
  Object.assign(p, fields);
  p.airborne = true;
  return p;
}

export function createDemoWorld(shot) {
  if (shot === 'rings') {
    const mission = createMission(0);
    mission.ringIndex = 2;
    mission.score = 1380;
    mission.elapsed = 96;
    const plane = placedPlane({ x: 520, y: 1780, z: 168, heading: 0.87, pitch: 0.03, roll: 0.3, speed: 58, throttle: 0.76, fuel: 63 });
    return { plane, mission, cameraMode: 'chase' };
  }
  if (shot === 'cockpit') {
    const mission = createMission(0);
    mission.ringIndex = 8;
    mission.objectivesDone = true;
    mission.score = 4300;
    mission.elapsed = 210;
    const plane = placedPlane({ x: 6, y: -980, z: 58, heading: 0, pitch: -0.06, roll: 0.02, speed: 43, throttle: 0.34, fuel: 38 });
    return { plane, mission, cameraMode: 'cockpit' };
  }
  if (shot === 'landing') {
    const mission = createMission(0);
    mission.ringIndex = 8;
    mission.objectivesDone = true;
    mission.score = 4550;
    mission.elapsed = 228;
    const plane = placedPlane({ x: -5, y: -660, z: 21, heading: 0.01, pitch: -0.03, roll: -0.03, speed: 41, throttle: 0.3, fuel: 36, damage: 5 });
    return { plane, mission, cameraMode: 'chase' };
  }
  const mission = createMission(0);
  mission.elapsed = 42;
  const plane = placedPlane({ x: -70, y: 360, z: 126, heading: 0.129, pitch: 0.02, roll: 0.08, speed: 57, throttle: 0.74, fuel: 84 });
  return { plane, mission, cameraMode: 'chase' };
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// Steer toward the current objective: bank for heading, pitch for altitude, throttle for speed.
export function autopilotInput(plane, mission) {
  const input = neutralInput();
  let target = nextTarget(mission, plane);
  let desiredSpeed = 56;
  if (mission.objectivesDone || mission.timeExpired) {
    const dist = Math.hypot(0 - plane.x, -430 - plane.y);
    target = { x: 0, y: -430, z: clamp(dist * 0.055, 4, 80), label: 'RUNWAY' };
    desiredSpeed = 40;
  }
  const desiredHeading = Math.atan2(target.x - plane.x, target.y - plane.y);
  let headingErr = desiredHeading - plane.heading;
  headingErr = Math.atan2(Math.sin(headingErr), Math.cos(headingErr));
  const rollCmd = clamp(headingErr * 1.2, -0.7, 0.7);
  input.roll = clamp((rollCmd - plane.roll) * 2.2, -1, 1);
  const pitchCmd = clamp((target.z - plane.z) * 0.004, -0.22, 0.25);
  input.pitch = clamp((pitchCmd - plane.pitch) * 2.5, -1, 1);
  const throttleCmd = clamp(0.3 + (desiredSpeed - plane.speed) * 0.02, 0.15, 0.9);
  input.throttleDelta = clamp((throttleCmd - plane.throttle) * 3, -1, 1);
  return input;
}
