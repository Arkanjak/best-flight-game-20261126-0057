// flight-model.js — the aircraft: throttle, pitch, roll, stall, fuel and ground handling.
// Arcade-honest physics: speed buys lift, pitch trades speed for height, bank turns the nose,
// and a slow nose-high aeroplane stalls. Touchdown quality is reported, never hidden.

export const STALL_SPEED = 24; // metres per second
const TAKEOFF_SPEED = 27;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function createAircraftState() {
  return {
    x: 0, y: -380, z: 0,
    heading: 0, pitch: 0, roll: 0,
    speed: 0, throttle: 0,
    fuel: 100, damage: 0,
    airborne: false, verticalSpeed: 0, stalling: false,
    justTouchedDown: false, touchdownVs: 0,
  };
}

// Advance the aircraft one fixed step. `ground` is the terrain height under the aircraft.
// Sets justTouchedDown (with touchdownVs) on the step an airborne aircraft meets the ground.
export function stepFlight(p, input, dt, ground) {
  p.justTouchedDown = false;
  p.throttle = clamp(p.throttle + input.throttleDelta * dt * 0.55, 0, 1);
  const thrust = p.fuel > 0 ? p.throttle : 0;
  p.fuel = Math.max(0, p.fuel - (0.12 + thrust * 0.75) * dt * 0.5);

  const authority = clamp(p.speed / 45, 0.25, 1);
  p.pitch += input.pitch * dt * 0.85 * authority;
  if (input.pitch === 0) p.pitch += (0 - p.pitch) * dt * 0.25;
  p.pitch = clamp(p.pitch, -0.5, 0.45);
  if (!p.airborne && p.speed <= TAKEOFF_SPEED) p.pitch = Math.min(p.pitch, 0.16);

  p.roll += input.roll * dt * 1.9 * authority;
  if (input.roll === 0) p.roll += (0 - p.roll) * dt * 1.4;
  p.roll = clamp(p.roll, -1.05, 1.05);
  if (!p.airborne) {
    p.roll += (0 - p.roll) * dt * 6;
    if (p.speed > 2) p.heading += input.roll * dt * 0.25;
  } else {
    p.heading += (9.8 * Math.tan(p.roll)) / Math.max(p.speed, 16) * dt;
  }
  p.heading = Math.atan2(Math.sin(p.heading), Math.cos(p.heading));

  const engine = thrust * 16;
  const drag = 0.0022 * p.speed * p.speed;
  const gravityAlongPitch = -9.8 * Math.sin(p.pitch) * 0.6;
  let accel = engine - drag + gravityAlongPitch;
  if (!p.airborne) accel -= p.speed * 0.06;
  if (input.brake) accel -= p.speed * 0.7 + 2;
  p.speed = Math.max(0, p.speed + accel * dt);

  let vz = 0;
  if (p.airborne) {
    const lift = clamp(p.speed / 34, 0, 1);
    const stallSink = p.speed < STALL_SPEED + 3 && p.pitch > 0.1
      ? (STALL_SPEED + 3 - p.speed) * 0.45 + p.pitch * 5
      : 0;
    p.stalling = p.speed < STALL_SPEED + 2 && p.pitch > 0.08;
    vz = p.speed * Math.sin(p.pitch) * (0.3 + 0.7 * lift) - (1 - lift) * 9 - stallSink - 0.5;
  } else {
    p.stalling = false;
  }

  const horizontal = p.airborne ? p.speed * Math.cos(p.pitch) : p.speed;
  p.x = clamp(p.x + Math.sin(p.heading) * horizontal * dt, -4500, 4500);
  p.y = clamp(p.y + Math.cos(p.heading) * horizontal * dt, -4500, 4500);
  p.z += vz * dt;
  p.verticalSpeed = vz;

  if (!p.airborne) {
    p.z = ground;
    p.verticalSpeed = 0;
    if (p.speed > TAKEOFF_SPEED && p.pitch > 0.05) {
      p.airborne = true;
      p.z = ground + 0.6;
      p.verticalSpeed = 1.2;
    }
  } else if (p.z <= ground + 0.25) {
    if (vz <= 0.6) {
      p.justTouchedDown = true;
      p.touchdownVs = -vz;
      p.airborne = false;
      p.z = ground;
      p.verticalSpeed = 0;
    } else {
      p.z = ground + 0.25;
    }
  }
}
