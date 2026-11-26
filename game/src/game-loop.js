// game-loop.js — SKYLANE entry point: wires input, flight, missions, rendering and sound
// into one fixed-step loop, and owns the title / flying / paused / debrief state machine.

import { createAircraftState, stepFlight } from './flight-model.js';
import { isOnRunway, terrainHeightAt } from './terrain-field.js';
import { createMission, dropCargo, scoreLanding, showMessage, updateMission } from './mission-director.js';
import { createInput } from './input-controls.js';
import { drawScene } from './scene-renderer.js';
import { drawChasePlane, drawCockpit } from './aircraft-renderer.js';
import { drawEndScreen, drawHud, drawTitleScreen } from './hud-renderer.js';
import { autopilotInput, createDemoWorld, readDemoRequest } from './demo-autopilot.js';
import { createSoundEngine } from './sound-synth.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const sound = createSoundEngine();
const STEP = 1 / 60;

let W = 0, H = 0;
function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;
}
window.addEventListener('resize', resize);
resize();

let mode = 'title'; // title | flying | paused | complete | crashed
let selected = 0;
let plane = createAircraftState();
let mission = createMission(0);
let cameraMode = 'chase';
let crashReason = '';
let pendingComplete = false;
let fuelWarned = false;
let time = 0;
let frames = 0;

const demo = readDemoRequest(window.location.search);
if (demo) {
  const world = createDemoWorld(demo.shot);
  plane = world.plane;
  mission = world.mission;
  cameraMode = world.cameraMode;
  mode = 'flying';
  time = 12.5;
  for (let i = 0; i < 140; i++) stepDemo(STEP);
}

function resetPlaneOnRunway() {
  plane = createAircraftState();
  plane.z = terrainHeightAt(plane.x, plane.y);
}

function startMission(index) {
  selected = index;
  resetPlaneOnRunway();
  mission = createMission(index);
  cameraMode = 'chase';
  pendingComplete = false;
  fuelWarned = false;
  crashReason = '';
  mode = 'flying';
  sound.resume();
  showMessage(mission, 'Throttle up with W — rotate at 55 KT', 4);
}

function toTitle() {
  resetPlaneOnRunway();
  mission = createMission(selected);
  mode = 'title';
}

function crash(reason) {
  crashReason = reason;
  mode = 'crashed';
  sound.thud();
  sound.setEngine(0, false);
}

function handleTouchdown() {
  const td = {
    vs: plane.touchdownVs,
    onRunway: isOnRunway(plane.x, plane.y),
    roll: plane.roll,
    pitch: plane.pitch,
    speed: plane.speed,
  };
  const result = scoreLanding(mission, td);
  plane.damage = Math.min(100, plane.damage + result.damage);
  sound.thud();
  if (result.crash || plane.damage >= 100) {
    crash(result.crash ? result.reason : 'Hull failure — too many heavy arrivals.');
    return;
  }
  showMessage(mission, `${result.label} +${result.points}`, 3.5);
  if (mission.objectivesDone || mission.timeExpired) {
    pendingComplete = true;
  } else {
    showMessage(mission, 'Objectives remain — take off again', 3.5);
  }
}

function stepFlying(dt, pilot) {
  if (pilot.camera) cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
  if (pilot.mute) sound.toggleMute();
  if (pilot.drop) dropCargo(mission, plane);
  const ground = terrainHeightAt(plane.x, plane.y);
  stepFlight(plane, pilot, dt, ground);
  if (plane.justTouchedDown) handleTouchdown();
  if (mode !== 'flying') return;
  updateMission(mission, plane, dt, terrainHeightAt(plane.x, plane.y));
  for (const event of mission.events) {
    if (event === 'ring') sound.beep(880);
    if (event === 'delivered') sound.beep(660, 0.2);
    if (event === 'missed') sound.beep(220, 0.2);
    if (event === 'drop') sound.beep(520);
  }
  mission.events.length = 0;
  if (plane.fuel <= 0 && !fuelWarned) {
    fuelWarned = true;
    showMessage(mission, 'Fuel empty — glide to the strip', 4);
  }
  if (pendingComplete && !plane.airborne && plane.speed < 4) {
    mode = 'complete';
    sound.setEngine(0, false);
    sound.beep(990, 0.25);
  }
  sound.setEngine(plane.throttle, plane.airborne);
}

function stepDemo(dt) {
  time += dt;
  stepFlying(dt, autopilotInput(plane, mission));
}

function step(dt) {
  if (demo) {
    stepDemo(dt);
    return;
  }
  const pilot = input.poll();
  if (mode === 'title') {
    if (pilot.missionPick !== null) selected = pilot.missionPick;
    if (pilot.start) startMission(selected);
    return;
  }
  if (mode === 'paused') {
    if (pilot.pause || pilot.start) mode = 'flying';
    if (pilot.restart) startMission(selected);
    return;
  }
  if (mode === 'complete' || mode === 'crashed') {
    if (pilot.restart) startMission(selected);
    else if (pilot.missionPick !== null) startMission(pilot.missionPick);
    else if (pilot.title) toTitle();
    return;
  }
  if (pilot.pause) {
    mode = 'paused';
    sound.setEngine(0, false);
    return;
  }
  if (pilot.restart) {
    startMission(selected);
    return;
  }
  time += dt;
  stepFlying(dt, pilot);
}

function render() {
  const view = { w: W, h: H, t: time, plane, mission, cameraMode, mode, selected, crashReason, camera: null };
  drawScene(ctx, view);
  if (cameraMode === 'chase') drawChasePlane(ctx, view);
  else drawCockpit(ctx, view);
  if (mode !== 'title') drawHud(ctx, view);
  if (mode === 'title') drawTitleScreen(ctx, view);
  if (mode === 'complete' || mode === 'crashed') drawEndScreen(ctx, view);
  if (mode === 'paused') {
    ctx.fillStyle = 'rgba(6,10,20,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#eaffea';
    ctx.font = '700 34px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED — P to resume', W / 2, H / 2);
  }
  frames += 1;
  if (demo && frames > 24) window.__shotReady = true;
}

let last = performance.now();
let accumulator = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  accumulator += dt;
  while (accumulator >= STEP) {
    step(STEP);
    accumulator -= STEP;
  }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
