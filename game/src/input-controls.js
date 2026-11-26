// input-controls.js — keyboard and mouse, merged into one pilot intent per step.
// Arrows pitch and bank, W/S work the throttle, the mouse steers when moved, a click drops cargo.

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function createInput(canvas) {
  const keys = new Set();
  const edges = { drop: false, camera: false, restart: false, pause: false, start: false, mute: false, title: false, missionPick: null };
  const mouse = { x: 0.5, y: 0.5, active: false };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.code === 'Space') edges.drop = true;
    if (e.code === 'KeyC') edges.camera = true;
    if (e.code === 'KeyR') edges.restart = true;
    if (e.code === 'KeyP') edges.pause = true;
    if (e.code === 'Enter') edges.start = true;
    if (e.code === 'KeyM') edges.mute = true;
    if (e.code === 'KeyT') edges.title = true;
    if (e.code === 'Digit1') edges.missionPick = 0;
    if (e.code === 'Digit2') edges.missionPick = 1;
    if (e.code === 'Digit3') edges.missionPick = 2;
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  canvas.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX / window.innerWidth;
    mouse.y = e.clientY / window.innerHeight;
    mouse.active = true;
  });
  canvas.addEventListener('mousedown', () => {
    edges.drop = true;
    edges.start = true;
  });

  function poll() {
    let pitch = 0, roll = 0;
    if (keys.has('ArrowUp')) pitch += 1;
    if (keys.has('ArrowDown')) pitch -= 1;
    if (keys.has('ArrowRight')) roll += 1;
    if (keys.has('ArrowLeft')) roll -= 1;
    if (mouse.active) {
      const mx = (mouse.x - 0.5) * 2.4;
      const my = (0.5 - mouse.y) * 2.2;
      if (Math.abs(mx) > 0.08) roll += mx;
      if (Math.abs(my) > 0.08) pitch += my;
    }
    const out = {
      pitch: clamp(pitch, -1, 1),
      roll: clamp(roll, -1, 1),
      throttleDelta: (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0),
      brake: keys.has('KeyB') || keys.has('ShiftLeft'),
      drop: edges.drop, camera: edges.camera, restart: edges.restart,
      pause: edges.pause, start: edges.start, mute: edges.mute, title: edges.title,
      missionPick: edges.missionPick,
    };
    edges.drop = edges.camera = edges.restart = edges.pause = edges.start = edges.mute = edges.title = false;
    edges.missionPick = null;
    return out;
  }

  return { poll };
}

export function neutralInput() {
  return {
    pitch: 0, roll: 0, throttleDelta: 0, brake: false,
    drop: false, camera: false, restart: false, pause: false,
    start: false, mute: false, title: false, missionPick: null,
  };
}
