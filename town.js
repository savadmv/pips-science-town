import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";
import { ITEMS, today, dayNumber } from "./discovery.js";

const DN = dayNumber();
const TODAY = today(DN);

// ---------- brand ----------
const C = {
  ink: "#2b2d42", cream: "#fff6e5", sun: "#ffc93c", coral: "#ff6b6b", teal: "#2ec4b6",
  sky: "#4cc9f0", grape: "#7b61ff", orange: "#ff9f1c", white: "#ffffff",
};
const ROOFS = [C.coral, C.grape, C.teal, C.orange, "#3d5a80", "#e76f51"];
const WALLS = ["#fff6e5", "#ffffff", "#ffe8a3", "#c9f2e0", "#ffd6d6", "#e3dcff"];
const GADGETS = [
  { n: "None", e: "–" }, { n: "Telescope", e: "🔭" }, { n: "Volcano", e: "🌋" },
  { n: "Rocket", e: "🚀" }, { n: "Satellite dish", e: "📡" }, { n: "Windmill", e: "🌬️" },
];
const PETS = [{ n: "None", e: "–" }, { n: "Cat", e: "🐱" }, { n: "Dog", e: "🐶" }, { n: "Bunny", e: "🐰" }];

// Science spots: unlocked by the number of families in town.
const SPOTS = [
  { id: "pip", name: "Pip's Lab", e: "🤖", at: 0, b: [0, 0],
    act: "The town's science HQ. Pip posts a new brain-teaser every day on @wonderlabkids.science!" },
  { id: "volcano", name: "Volcano Lab", e: "🌋", at: 10, b: [-1, 1],
    act: "Fizzy volcano: put 2 spoons of baking soda and a squirt of dish soap in a cup, then pour in vinegar. Whoosh! (A grown-up helps.)" },
  { id: "aquarium", name: "Aquarium", e: "🐠", at: 50, b: [1, -1],
    act: "Sink or float? Guess first, then drop a lemon, a coin, an apple and a plastic toy into a bowl of water." },
  { id: "weather", name: "Weather Tower", e: "🌦️", at: 150, b: [1, 1],
    act: "Make a rainbow: shine a torch through a glass of water onto white paper in a dark room." },
  { id: "planetarium", name: "Planetarium", e: "🪐", at: 400, b: [-1, -1],
    act: "Moon diary: draw the Moon's shape every night for a week. Is it growing or shrinking?" },
  { id: "dino", name: "Dino Museum", e: "🦕", at: 1000, b: [-2, 0],
    act: "Fossil maker: press a toy dinosaur's foot into play dough. That's how footprint fossils form!" },
  { id: "rocket", name: "Rocket Launch Pad", e: "🚀", at: 2500, b: [2, 0],
    act: "Balloon rocket: thread a string through a straw, tape a blown-up balloon to it, and let go!" },
];

// ---------- layout ----------
const LOT = 6, LOTS_X = 4, LOTS_Z = 2, ROAD = 5;
const BW = LOT * LOTS_X, BD = LOT * LOTS_Z;
const PX = BW + ROAD, PZ = BD + ROAD;
const reserved = new Map(SPOTS.map((s) => [s.b.join(","), s]));
const blockCenter = (bx, bz) => new THREE.Vector3(bx * PX, 0, bz * PZ);

function layoutLots(needed) {
  const blocks = [];
  let r = Math.max(...SPOTS.map((s) => Math.max(Math.abs(s.b[0]), Math.abs(s.b[1])))); // every science spot sits inside the roads
  const lots = () => blocks.length * LOTS_X * LOTS_Z;
  while (true) {
    blocks.length = 0;
    for (let bx = -r; bx <= r; bx++)
      for (let bz = -r; bz <= r; bz++)
        if (!reserved.has(`${bx},${bz}`)) blocks.push([bx, bz]);
    if (lots() >= needed || r > 60) break;
    r++;
  }
  const out = [];
  for (const [bx, bz] of blocks) {
    const c = blockCenter(bx, bz);
    for (let i = 0; i < LOTS_X; i++)
      for (let j = 0; j < LOTS_Z; j++) {
        const x = c.x - BW / 2 + LOT / 2 + i * LOT;
        const z = c.z - BD / 2 + LOT / 2 + j * LOT;
        out.push({ x, z, face: j === 0 ? Math.PI : 0, d: Math.hypot(x, z * 1.3), b: `${bx},${bz}` });
      }
  }
  out.sort((a, b) => a.d - b.d);
  return { lots: out, r };
}

const STREETS = ["Comet Close", "Rainbow Row", "Magnet Lane", "Fossil Street", "Rocket Road", "Crystal Crescent",
  "Bubble Avenue", "Planet Parade", "Dino Drive", "Lightning Lane", "Snowflake Street", "Gravity Grove", "Moonbeam Mews",
  "Seashell Street", "Atom Avenue", "Thunder Terrace", "Prism Place", "Orbit Way", "Pebble Path", "Nebula Drive",
  "Firefly Lane", "Glacier Gardens", "Starlight Street", "Tornado Turn", "Coral Close", "Meteor Mews", "Echo Lane",
  "Sunbeam Street", "Galaxy Grove", "Puddle Place"];
const streetNames = new Map();
function streetOf(lot) {
  if (!streetNames.has(lot.b)) {
    const k = streetNames.size;
    streetNames.set(lot.b, STREETS[k % STREETS.length] + (k >= STREETS.length ? ` ${Math.floor(k / STREETS.length) + 1}` : ""));
  }
  return streetNames.get(lot.b);
}

// ---------- house design ----------
const hash = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
export function parseCode(code) {
  const m = /R(\d)W(\d)G(\d)P(\d)/i.exec(code || "");
  if (!m) return null;
  const d = { r: +m[1], w: +m[2], g: +m[3], p: +m[4] };
  return d.r < ROOFS.length && d.w < WALLS.length && d.g < GADGETS.length && d.p < PETS.length ? d : null;
}
const designFor = (h) => {
  const parsed = parseCode(h.d);
  if (parsed) return parsed;
  const x = hash(h.h);
  return { r: x % ROOFS.length, w: (x >>> 3) % WALLS.length, g: 1 + ((x >>> 6) % (GADGETS.length - 1)), p: (x >>> 9) % PETS.length };
};
const codeOf = (d) => `R${d.r}W${d.w}G${d.g}P${d.p}`;

// unit geometries, each sitting on y=0
const G = {
  box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  roof: new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 14).translate(0, 0.5, 0),
  cone: new THREE.ConeGeometry(0.5, 1, 14).translate(0, 0.5, 0),
  ball: new THREE.SphereGeometry(0.5, 14, 10),
};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const part = (k, g, c, p, s, r = [0, 0, 0]) => ({ k, g, c, m: new THREE.Matrix4().compose(new THREE.Vector3(...p), _q.setFromEuler(_e.set(...r)).clone(), new THREE.Vector3(...s)) });

function houseParts(d) {
  const P = [
    part("wall", "box", WALLS[d.w], [0, 0, 0], [3.4, 2.6, 3]),
    part("roof", "roof", ROOFS[d.r], [0, 2.6, 0], [4.1, 1.8, 3.7]),
    part("x", "box", "#c75b4a", [1.0, 2.8, -0.5], [0.5, 1.2, 0.5]),
    part("x", "box", "#7a5534", [0, 0, 1.5], [0.8, 1.45, 0.12]),
    part("win", "box", "#bde7ff", [-1.05, 1.1, 1.5], [0.7, 0.7, 0.12]),
    part("win", "box", "#bde7ff", [1.05, 1.1, 1.5], [0.7, 0.7, 0.12]),
    part("win", "box", "#bde7ff", [-0.8, 1.1, -1.5], [0.7, 0.7, 0.12]),
    part("win", "box", "#bde7ff", [0.8, 1.1, -1.5], [0.7, 0.7, 0.12]),
    part("x", "box", "#efe2c4", [0, 0, 1.6], [0.9, 0.06, 1.3]),
  ];
  const gx = 2.15, gz = 1.6;
  const g0 = P.length;
  switch (d.g) {
    case 1: // telescope
      P.push(part("x", "cyl", C.ink, [-gx, 0, gz], [0.12, 0.9, 0.12]));
      P.push(part("x", "cyl", C.grape, [-gx, 0.75, gz + 0.1], [0.36, 1.5, 0.36], [-0.9, 0, 0]));
      break;
    case 2: // volcano
      P.push(part("x", "cone", "#8d6748", [gx, 0, gz], [1.5, 1.2, 1.5]));
      P.push(part("x", "ball", C.coral, [gx, 1.05, gz], [0.55, 0.3, 0.55]));
      break;
    case 3: // rocket
      P.push(part("x", "cyl", C.white, [gx, 0.2, gz], [0.6, 1.7, 0.6]));
      P.push(part("x", "cone", C.coral, [gx, 1.9, gz], [0.6, 0.8, 0.6]));
      P.push(part("x", "box", C.grape, [gx, 0, gz], [1.2, 0.6, 0.1]));
      P.push(part("x", "box", C.grape, [gx, 0, gz], [0.1, 0.6, 1.2]));
      break;
    case 4: // satellite dish
      P.push(part("x", "cyl", "#9aa0ad", [-gx, 0, gz], [0.14, 1.2, 0.14]));
      P.push(part("x", "ball", "#dfe3ea", [-gx, 1.35, gz], [1.2, 0.35, 1.2], [0.6, 0, 0]));
      break;
    case 5: // windmill
      P.push(part("x", "cyl", C.white, [gx, 0, gz - 0.2], [0.16, 2.7, 0.16]));
      P.push(part("x", "box", C.sun, [gx, 1.6, gz - 0.05], [0.18, 2.2, 0.08]));
      P.push(part("x", "box", C.sun, [gx, 2.6, gz - 0.05], [2.2, 0.18, 0.08], [0, 0, 0]));
      break;
  }
  P.slice(g0).forEach((p) => (p.role = "gad"));
  const p0 = P.length;
  if (d.p) {
    const col = ["", C.orange, "#a0703f", "#ffffff"][d.p];
    const px = d.g === 2 || d.g === 3 || d.g === 5 ? -1.6 : 1.5;
    P.push(part("x", "box", col, [px, 0, 2.6], [0.6, 0.38, 0.32]));
    P.push(part("x", "box", col, [px + 0.38, 0.28, 2.6], [0.34, 0.34, 0.34]));
    const ear = d.p === 3 ? 0.42 : 0.14;
    P.push(part("x", "box", col, [px + 0.3, 0.62, 2.52], [0.08, ear, 0.08]));
    P.push(part("x", "box", col, [px + 0.46, 0.62, 2.68], [0.08, ear, 0.08]));
    P.push(part("x", "box", C.ink, [px + 0.56, 0.4, 2.6], [0.04, 0.06, 0.18]));
  }
  P.slice(p0).forEach((p) => (p.role = "pet"));
  return P;
}

// ---------- instanced batches ----------
class Batcher {
  constructor() { this.groups = new Map(); }
  add(p, world, tag) {
    const key = `${p.k}|${p.g}`;
    if (!this.groups.has(key)) this.groups.set(key, { k: p.k, g: p.g, items: [] });
    this.groups.get(key).items.push({ m: new THREE.Matrix4().multiplyMatrices(world, p.m), c: p.c, tag, role: p.role });
  }
  build(scene, inst) {
    const meshes = [];
    for (const { k, g, items } of this.groups.values()) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: g === "roof" });
      const mesh = new THREE.InstancedMesh(G[g], mat, items.length);
      const col = new THREE.Color();
      items.forEach((it, i) => { mesh.setMatrixAt(i, it.m); mesh.setColorAt(i, col.set(it.c)); });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData = { kind: k, tags: items.map((it) => it.tag) };
      // per-house instance list, so a house can grow, hide its gadget or play
      if (inst) items.forEach((it, idx) => { if (it.tag !== undefined) { if (!inst.has(it.tag)) inst.set(it.tag, []); inst.get(it.tag).push({ mesh, idx, role: it.role, base: it.m }); } });
      scene.add(mesh);
      meshes.push(mesh);
    }
    return meshes;
  }
}

// ---------- helpers ----------
const mat = (c, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, ...extra });
function mesh(g, c, p, s, r = [0, 0, 0], extra) {
  const m = new THREE.Mesh(G[g], mat(c, extra));
  m.position.set(...p); m.scale.set(...s); m.rotation.set(...r);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function label(text, { bg = C.white, fg = C.ink, size = 1 } = {}) {
  const cv = document.createElement("canvas");
  const ctx = cv.getContext("2d");
  const font = "600 44px Fredoka, system-ui, sans-serif";
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 44, h = 72;
  cv.width = w; cv.height = h + 14;
  ctx.font = font;
  ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.roundRect(3, 3, w - 6, h - 6, 30); ctx.fill();
  ctx.beginPath(); ctx.moveTo(w / 2 - 12, h - 6); ctx.lineTo(w / 2, h + 10); ctx.lineTo(w / 2 + 12, h - 6); ctx.fill();
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(8, 8, w - 16, h - 16, 25); ctx.fill();
  ctx.fillStyle = fg; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(text, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  // fixed on-screen size, so tags stay readable far away and never fill the screen up close
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, sizeAttenuation: false }));
  const k = (small ? 0.00036 : 0.00042) * size;
  sp.scale.set(cv.width * k, cv.height * k, 1);
  sp.center.set(0.5, 0);
  sp.renderOrder = 5;
  return sp;
}

// ---------- scene ----------
const host = document.getElementById("scene");
const small = matchMedia("(max-width: 600px)").matches;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#bde7ff");
scene.fog = new THREE.Fog("#bde7ff", 260, 620);
const camera = new THREE.PerspectiveCamera(small ? 50 : 40, innerWidth / innerHeight, 1, 2000);
const controls = new MapControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = 1.2;
controls.minDistance = 18;
controls.maxDistance = 420;
controls.screenSpacePanning = false;

const hemi = new THREE.HemisphereLight("#ffffff", "#9bd18b", 1.15);
scene.add(hemi);
const sun = new THREE.DirectionalLight("#fff4dc", 1.9);
sun.castShadow = true;
sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

const anim = []; // per-frame callbacks
let NOW = 0; // seconds, set every frame

// ---------- fun: tweens, particles, camera shake, sound ----------
const tweens = [];
function tween(dur, fn, done) { tweens.push({ t0: NOW, dur, fn, done }); }
anim.push(() => {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i], k = Math.min(1, (NOW - w.t0) / w.dur);
    w.fn(k);
    if (k >= 1) { tweens.splice(i, 1); w.done && w.done(); }
  }
});
const later = (s, fn) => tween(s, () => {}, fn);
const backOut = (k) => 1 + 2.70158 * (k - 1) ** 3 + 1.70158 * (k - 1) ** 2;

const PMAX = 700, ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const pMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), PMAX);
pMesh.frustumCulled = false;
pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
const _pc = new THREE.Color(), _pq = new THREE.Quaternion(), _ps = new THREE.Vector3(), _pm = new THREE.Matrix4();
for (let i = 0; i < PMAX; i++) { pMesh.setMatrixAt(i, ZERO); pMesh.setColorAt(i, _pc.set(0xffffff)); }
scene.add(pMesh);
const parts = new Array(PMAX).fill(null);
let pNext = 0;
/** Spray little balls: lava, sparks, bubbles, rain, confetti… */
function burst(pos, { n = 30, colors = [C.sun], speed = 6, up = 6, grav = 14, size = 0.5, life = 1.2, spread = 1, drag = 0, bounce = true } = {}) {
  for (let k = 0; k < n; k++) {
    const i = pNext; pNext = (pNext + 1) % PMAX;
    const a = Math.random() * Math.PI * 2, r = Math.random() * speed;
    parts[i] = {
      p: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, 0, (Math.random() - 0.5) * spread)),
      v: new THREE.Vector3(Math.cos(a) * r, up * (0.6 + Math.random() * 0.6), Math.sin(a) * r),
      g: grav, s: size * (0.6 + Math.random() * 0.8), life: life * (0.7 + Math.random() * 0.6), age: 0, drag, bounce,
    };
    pMesh.setColorAt(i, _pc.set(colors[k % colors.length]));
  }
  pMesh.instanceColor.needsUpdate = true;
}
anim.push((t, dt) => {
  let any = false;
  for (let i = 0; i < PMAX; i++) {
    const q = parts[i];
    if (!q) continue;
    any = true;
    q.age += dt;
    if (q.age >= q.life) { parts[i] = null; pMesh.setMatrixAt(i, ZERO); continue; }
    q.v.y -= q.g * dt;
    if (q.drag) q.v.multiplyScalar(1 - Math.min(1, q.drag * dt));
    q.p.addScaledVector(q.v, dt);
    if (q.bounce && q.p.y < 0.45) { q.p.y = 0.45; q.v.y *= -0.35; q.v.x *= 0.7; q.v.z *= 0.7; }
    const s = q.s * (1 - (q.age / q.life) ** 3);
    pMesh.setMatrixAt(i, _pm.compose(q.p, _pq, _ps.set(s, s, s)));
  }
  if (any) pMesh.instanceMatrix.needsUpdate = true;
});

let shakeAmp = 0, shakeT0 = 0, shakeDur = 1;
function shake(amp, dur) { shakeAmp = amp; shakeT0 = NOW; shakeDur = dur; }

const sfx = (() => {
  let ac, master;
  let on = true;
  try { on = localStorage.getItem("pst-sound") !== "off"; } catch {}
  const ctx = () => {
    if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination); }
    if (ac.state === "suspended") ac.resume();
    return ac;
  };
  function tone(f0, f1, dur, type = "sine", vol = 0.3, delay = 0) {
    if (!on) return;
    try {
      const a = ctx(), t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
    } catch {}
  }
  function noise(dur, f0, f1, vol = 0.3, type = "lowpass", delay = 0) {
    if (!on) return;
    try {
      const a = ctx(), t = a.currentTime + delay, len = Math.ceil(a.sampleRate * dur), b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const s = a.createBufferSource(); s.buffer = b;
      const f = a.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(master); s.start(t);
    } catch {}
  }
  return {
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem("pst-sound", on ? "on" : "off"); } catch {} if (on) this.pop(); return on; },
    unlock() { if (on) try { ctx(); } catch {} },
    pop() { tone(420, 900, 0.12, "sine", 0.35); },
    chime() { [784, 1047, 1319].forEach((f, i) => tone(f, f, 0.6, "triangle", 0.22, i * 0.09)); },
    sparkle() { [1319, 1568, 2093, 2637].forEach((f, i) => tone(f, f * 1.01, 0.25, "sine", 0.12, i * 0.06)); },
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, f, i === 5 ? 0.7 : 0.16, "triangle", 0.22, i * 0.11)); },
    whoosh() { noise(1.4, 300, 3200, 0.4, "bandpass"); },
    rumble() { noise(1.5, 220, 60, 0.7, "lowpass"); tone(70, 40, 1.3, "sawtooth", 0.12); },
    roar() { tone(190, 70, 1.1, "sawtooth", 0.22); tone(140, 60, 1.1, "square", 0.08); noise(1.0, 900, 200, 0.25, "bandpass"); },
    splash() { noise(0.5, 2600, 500, 0.35, "highpass"); },
    clang() { [0, 0.2, 0.4].forEach((d) => tone(1250, 1150, 0.14, "square", 0.07, d)); },
    boing() { [0, 0.33, 0.66].forEach((d) => tone(220, 660, 0.22, "sine", 0.28, d)); },
    beep() { [0, 0.25, 0.5].forEach((d) => tone(1400, 1400, 0.09, "sine", 0.15, d)); },
    rain() { noise(3, 4000, 2500, 0.2, "highpass"); },
  };
})();

// ---------- night ----------
let nightOn = false, nightTemp = 0, nf = 0, winMat = null;
try { nightOn = localStorage.getItem("pst-night") === "1"; } catch {}
const DAY_BG = new THREE.Color("#bde7ff"), NIGHT_BG = new THREE.Color("#1d2452"), SUN_DAY = new THREE.Color("#fff4dc"), SUN_NIGHT = new THREE.Color("#9fb4ff");
const stars = (() => {
  const n = 700, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, e = 0.12 + Math.random() * 1.3, r = 900;
    pos.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  p.visible = false; scene.add(p); return p;
})();
function applyNight() {
  scene.background.copy(DAY_BG).lerp(NIGHT_BG, nf);
  scene.fog.color.copy(scene.background);
  hemi.intensity = 1.15 - 0.8 * nf;
  sun.intensity = 1.9 - 1.55 * nf;
  sun.color.copy(SUN_DAY).lerp(SUN_NIGHT, nf);
  if (winMat) winMat.emissiveIntensity = nf * 1.4;
  stars.material.opacity = nf; stars.visible = nf > 0.02;
}
anim.push((t, dt) => {
  const target = nightOn || NOW < nightTemp ? 1 : 0;
  if (Math.abs(nf - target) > 0.002) { nf += (target - nf) * Math.min(1, dt * 2.5); if (Math.abs(nf - target) < 0.003) nf = target; applyNight(); }
});

// ---------- spots (science buildings) ----------
function scaffold(g) {
  for (const [x, z] of [[-6, -3], [6, -3], [-6, 3], [6, 3]]) g.add(mesh("box", C.orange, [x, 0, z], [0.4, 7, 0.4]));
  g.add(mesh("box", "#f2c48d", [0, 3.4, 0], [12.6, 0.3, 6.6]));
  g.add(mesh("box", "#f2c48d", [0, 6.8, 0], [12.6, 0.3, 6.6]));
  g.add(mesh("box", "#d9d2c3", [0, 0, 0], [9, 2.2, 4.5]));
  const cone = (x) => g.add(mesh("cone", C.orange, [x, 0, 5.2], [0.8, 1.3, 0.8]));
  cone(-4); cone(4);
}
const spotPlay = new Map(); // spot id -> play()
function buildSpot(s, open) {
  const g = new THREE.Group();
  const c = blockCenter(...s.b);
  g.position.copy(c);
  const W = (x, y, z) => new THREE.Vector3(x, y, z).add(g.position);
  let busy = false;
  const once = (dur, fn) => { if (busy) return; busy = true; fn(); later(dur, () => (busy = false)); };
  let play = () => {};
  g.add(mesh("box", "#e9dcc0", [0, 0, 0], [BW, 0.42, BD]));
  if (!open) {
    scaffold(g);
    // locked: the builders are busy
    play = () => once(1, () => {
      sfx.clang();
      [0, 0.2, 0.4].forEach((d, i) => later(d, () => burst(W(-5 + i * 5, i % 2 ? 6.9 : 3.5, 3.2), { n: 18, colors: [C.sun, C.orange, "#fff3b0"], speed: 4, up: 5, grav: 14, size: 0.28, life: 0.8 })));
    });
  } else if (s.id === "pip") {
    g.add(mesh("cyl", C.cream, [6, 0, -1], [7, 11, 7]));
    g.add(mesh("cyl", C.coral, [6, 9, -1], [7.3, 1, 7.3]));
    g.add(mesh("ball", C.teal, [6, 11, -1], [7, 7, 7]));
    g.add(mesh("cyl", C.ink, [6, 14, -1], [0.25, 3, 0.25]));
    const bulb = mesh("ball", C.sun, [6, 17.3, -1], [1.1, 1.1, 1.1], [0, 0, 0], { emissive: C.sun, emissiveIntensity: 0.6 });
    g.add(bulb);
    let flash = -9;
    anim.push((t) => (bulb.material.emissiveIntensity = NOW - flash < 1.2 ? 2.5 : 0.4 + 0.4 * Math.sin(t * 3) + nf * 0.8));
    g.add(mesh("box", "#7a5534", [6, 0, 2.5], [2, 3, 0.4]));
    // Pip statue
    const pip = new THREE.Group();
    pip.position.set(-6, 0, 0.5);
    pip.add(mesh("cyl", "#d9d2c3", [0, 0, 0], [4, 1.2, 4]));
    const body = new THREE.Group();
    body.add(mesh("box", C.teal, [0, 1.2, 0], [2.4, 2.6, 1.8]));
    body.add(mesh("box", C.white, [0, 3.9, 0], [3.2, 2.4, 2.4]));
    body.add(mesh("ball", C.ink, [-0.65, 5.1, 1.2], [0.6, 0.6, 0.3]));
    body.add(mesh("ball", C.ink, [0.65, 5.1, 1.2], [0.6, 0.6, 0.3]));
    body.add(mesh("box", C.coral, [0, 4.4, 1.2], [1, 0.2, 0.1]));
    body.add(mesh("cyl", C.ink, [0, 6.3, 0], [0.15, 1, 0.15]));
    body.add(mesh("ball", C.coral, [0, 7.4, 0], [0.6, 0.6, 0.6]));
    const armL = mesh("box", C.teal, [-1.6, 2.6, 0], [0.5, 1.6, 0.5], [0, 0, 0.5]);
    const armR = mesh("box", C.teal, [1.6, 2.6, 0], [0.5, 1.6, 0.5], [0, 0, -0.5]);
    body.add(armL, armR);
    pip.add(body);
    g.add(pip);
    let jumping = false;
    anim.push((t) => { if (!jumping) body.position.y = 0.6 + Math.sin(t * 2.4) * 0.25; });
    for (const x of [-11, 11]) g.add(mesh("ball", "#5cb85c", [x, 1.5, -4], [2.4, 2.8, 2.4]));
    play = () => once(1.4, () => {
      sfx.boing(); later(0.9, () => sfx.chime());
      flash = NOW; jumping = true;
      tween(1.1, (k) => {
        body.position.y = 0.6 + Math.abs(Math.sin(k * Math.PI * 2)) * 3.2;
        body.rotation.y = backOut(k) * Math.PI * 2;
        armL.rotation.z = 0.5 + Math.sin(k * Math.PI * 6) * 0.9; armR.rotation.z = -armL.rotation.z;
      }, () => { jumping = false; body.rotation.y = 0; armL.rotation.z = 0.5; armR.rotation.z = -0.5; });
      later(0.85, () => burst(W(-6, 9, 0.5), { n: 50, colors: [C.sun, C.coral, C.teal, C.grape, C.sky], speed: 7, up: 9, grav: 10, size: 0.45, life: 1.6 }));
    });
  } else if (s.id === "volcano") {
    const cone = mesh("cone", "#8d6748", [0, 0, -1], [13, 7, 10]);
    g.add(cone);
    g.add(mesh("cyl", C.coral, [0, 6.3, -1], [2.6, 0.5, 2.1], [0, 0, 0], { emissive: C.coral, emissiveIntensity: 0.5 }));
    const puffs = [0, 1, 2].map((i) => { const p = mesh("ball", "#eeeeee", [0, 8, -1], [1.6, 1.6, 1.6]); g.add(p); return p; });
    anim.push((t) => puffs.forEach((p, i) => { const k = (t * 0.35 + i / 3) % 1; p.position.y = 7.5 + k * 7; p.position.x = Math.sin(k * 6 + i) * 1.2; p.scale.setScalar(1 + k * 2.2); p.material.opacity = 1 - k; p.material.transparent = true; }));
    g.add(mesh("box", C.cream, [8, 0, 3], [5, 3, 3]));
    play = () => once(2.4, () => {
      sfx.rumble(); shake(0.9, 1.4);
      tween(0.6, (k) => cone.scale.set(13 * (1 + Math.sin(k * Math.PI) * 0.06), 7 * (1 + Math.sin(k * Math.PI * 3) * 0.05), 10));
      const lava = { colors: [C.coral, C.orange, C.sun, "#ff3b1f"], speed: 7, up: 17, grav: 18, size: 0.95, life: 2.4, spread: 1.6 };
      later(0.35, () => burst(W(0, 7, -1), { n: 110, ...lava }));
      later(0.8, () => burst(W(0, 7, -1), { n: 70, ...lava, up: 12 }));
      later(0.4, () => burst(W(0, 9, -1), { n: 25, colors: ["#d9d9d9", "#f2f2f2"], speed: 2, up: 4, grav: -2, size: 2.2, life: 2.5, bounce: false }));
    });
  } else if (s.id === "aquarium") {
    g.add(mesh("cyl", C.cream, [0, 0, 0], [16, 1.4, 10]));
    g.add(mesh("ball", C.sky, [0, 1.4, 0], [14, 10, 9], [0, 0, 0], { transparent: true, opacity: 0.45 }));
    const fish = [0, 1, 2, 3].map((i) => { const f = mesh("box", [C.orange, C.coral, C.sun, C.grape][i], [0, 3 + i, 0], [1.2, 0.6, 0.3]); g.add(f); return f; });
    let jump = -9;
    anim.push((t) => fish.forEach((f, i) => {
      const a = t * (0.6 + i * 0.15) + i; f.position.x = Math.cos(a) * (3 + i); f.position.z = Math.sin(a) * 2; f.rotation.y = -a;
      const j = (NOW - jump - i * 0.15) / 1.3;
      f.position.y = 3 + i + (j > 0 && j < 1 ? Math.sin(j * Math.PI) * (9 - i) : 0);
      f.rotation.z = j > 0 && j < 1 ? Math.PI * 2 * j : 0;
    }));
    play = () => once(2, () => {
      jump = NOW; sfx.splash(); later(1.2, () => sfx.splash());
      burst(W(0, 7, 0), { n: 50, colors: ["#ffffff", C.sky, "#bdf0ff"], speed: 3, up: 3, grav: -3, size: 0.55, life: 2.2, bounce: false });
      later(0.2, () => burst(W(0, 8.5, 0), { n: 40, colors: [C.sky, "#ffffff"], speed: 5, up: 8, grav: 16, size: 0.35, life: 1.2 }));
    });
  } else if (s.id === "weather") {
    g.add(mesh("box", C.cream, [0, 0, 0], [5, 3, 5]));
    g.add(mesh("cyl", C.white, [0, 3, 0], [1.4, 12, 1.4]));
    const spin = new THREE.Group(); spin.position.set(0, 15.5, 0);
    for (let i = 0; i < 3; i++) { const a = mesh("box", C.ink, [0, 0, 0], [3, 0.15, 0.15]); a.rotation.y = (i * Math.PI * 2) / 3; a.position.set(Math.cos(a.rotation.y) * 1.5, 0, -Math.sin(a.rotation.y) * 1.5); spin.add(a); const cup = mesh("ball", C.coral, [Math.cos(a.rotation.y) * 3, 0, -Math.sin(a.rotation.y) * 3], [0.8, 0.8, 0.8]); spin.add(cup); }
    let fast = -9, ang = 0;
    g.add(spin); anim.push((t, dt) => { ang += dt * (NOW - fast < 4 ? 9 : 2); spin.rotation.y = ang; });
    for (const [x, y] of [[-5, 18], [-3, 19], [-1, 18]]) g.add(mesh("ball", C.white, [x, y, 0], [3, 2.4, 2.4]));
    const bow = new THREE.Group(); bow.position.set(0, 0.4, -2.5); bow.visible = false; g.add(bow);
    ["#ff5a5a", "#ff9f1c", "#ffd23c", "#4cd06b", "#4cc9f0", "#7b61ff"].forEach((col, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(10.5 - i * 0.55, 0.3, 6, 48, Math.PI), new THREE.MeshBasicMaterial({ color: col, transparent: true }));
      bow.add(m);
    });
    play = () => once(6, () => {
      fast = NOW; sfx.rain();
      tween(2.6, () => { for (let k = 0; k < 3; k++) burst(W(-7 + Math.random() * 8, 17, (Math.random() - 0.5) * 2.5), { n: 1, colors: [C.sky, "#9ad8ff"], speed: 0.2, up: -14, grav: 12, size: 0.32, life: 1.3, spread: 0 }); });
      later(2.4, () => {
        sfx.sparkle(); bow.visible = true;
        tween(3.4, (k) => { const s = k < 0.25 ? backOut(k / 0.25) : 1; bow.scale.set(s, s, s); bow.children.forEach((m) => (m.material.opacity = k > 0.75 ? (1 - k) * 4 : 1)); }, () => (bow.visible = false));
      });
    });
  } else if (s.id === "planetarium") {
    g.add(mesh("box", C.cream, [0, 0, 0], [14, 4, 8]));
    g.add(mesh("ball", C.grape, [0, 4, 0], [10, 8, 7]));
    const sat = new THREE.Group(); sat.position.set(8, 11, 0);
    sat.add(mesh("ball", C.sun, [0, 0, 0], [3, 3, 3]));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.25, 8, 40), mat(C.orange)); ring.rotation.x = 1.2; sat.add(ring);
    let fastP = -9, angP = 0;
    g.add(sat); anim.push((t, dt) => { angP += dt * (NOW - fastP < 6 ? 3 : 0.5); sat.rotation.y = angP; });
    play = () => once(7, () => {
      fastP = NOW; nightTemp = NOW + 7; sfx.sparkle(); later(1.5, () => sfx.sparkle());
      for (let i = 0; i < 6; i++) later(1 + i * 0.9, () => {
        const from = W(-60 + Math.random() * 40, 70 + Math.random() * 25, -40 + Math.random() * 30);
        const star = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), new THREE.MeshBasicMaterial({ color: "#fff6c8", fog: false }));
        star.scale.set(6, 0.4, 0.4); star.rotation.z = -0.35; scene.add(star);
        tween(0.9, (k) => { star.position.copy(from).add(new THREE.Vector3(k * 80, -k * 28, k * 20)); star.material.opacity = 1 - k; star.material.transparent = true; }, () => scene.remove(star));
      });
      burst(W(0, 9, 0), { n: 40, colors: ["#ffffff", C.sun, "#c9b8ff"], speed: 4, up: 3, grav: -1, size: 0.35, life: 3, bounce: false });
    });
  } else if (s.id === "dino") {
    g.add(mesh("box", C.cream, [0, 0, -1.5], [16, 5, 6]));
    g.add(mesh("box", C.coral, [0, 5, -1.5], [17, 0.8, 7]));
    for (const x of [-6, -2, 2, 6]) g.add(mesh("cyl", C.white, [x, 0, 2], [0.8, 5, 0.8]));
    const d = new THREE.Group(); d.position.set(0, 0, 4.5); d.scale.setScalar(0.8);
    d.add(mesh("ball", C.teal, [0, 3, 0], [6, 3.4, 3]));
    for (const [x, z] of [[-1.8, -0.8], [-1.8, 0.8], [1.8, -0.8], [1.8, 0.8]]) d.add(mesh("cyl", C.teal, [x, 0, z], [0.8, 2.4, 0.8]));
    const neck = new THREE.Group(); neck.position.set(3, 4, 0); d.add(neck);
    neck.add(mesh("cyl", C.teal, [0.6, -0.4, 0], [0.9, 4.5, 0.9], [0, 0, -0.5]));
    neck.add(mesh("ball", C.teal, [2.6, 3.6, 0], [1.6, 1.1, 1.1]));
    d.add(mesh("cone", C.teal, [-4.2, 2.6, 0], [1.4, 4, 1.4], [0, 0, 1.75]));
    g.add(d);
    play = () => once(1.8, () => {
      sfx.roar(); shake(0.7, 1);
      tween(1.4, (k) => { neck.rotation.z = Math.sin(k * Math.PI) * 0.45 + Math.sin(k * Math.PI * 10) * 0.05 * (1 - k); d.position.y = Math.abs(Math.sin(k * Math.PI * 3)) * 0.6; });
      [0.2, 0.6, 1.0].forEach((t) => later(t, () => burst(W(0, 0.6, 4.5), { n: 18, colors: ["#d8c8a8", "#c2b190"], speed: 5, up: 2, grav: 6, size: 0.6, life: 0.9, spread: 3 })));
    });
  } else if (s.id === "rocket") {
    g.add(mesh("cyl", "#9aa0ad", [0, 0, 0], [12, 1, 9]));
    const rk = new THREE.Group(); g.add(rk);
    rk.add(mesh("cyl", C.white, [0, 1, 0], [3, 12, 3]));
    rk.add(mesh("cone", C.coral, [0, 13, 0], [3, 4, 3]));
    for (const r of [0, Math.PI / 2]) rk.add(mesh("box", C.grape, [0, 1, 0], [6, 3, 0.3], [0, r, 0]));
    g.add(mesh("box", C.orange, [5, 1, 0], [0.6, 10, 0.6]));
    play = () => once(4.5, () => {
      sfx.whoosh(); shake(0.4, 1.2);
      tween(3, (k) => {
        rk.position.y = k ** 2.2 * 160;
        burst(W(0, rk.position.y + 0.8, 0), { n: 3, colors: [C.sun, C.orange, C.coral], speed: 1.5, up: -6, grav: 4, size: 0.8, life: 0.7, spread: 1.4 });
        if (k < 0.3) burst(W(0, 1, 0), { n: 1, colors: ["#e6e6e6", "#cfcfcf"], speed: 6, up: 1, grav: -1, size: 2, life: 1.8, bounce: false });
      }, () => { rk.position.y = 0; tween(0.6, (k) => rk.scale.setScalar(backOut(k))); sfx.pop(); });
    });
  }
  const lb = label(`${s.e} ${s.name}`, { bg: open ? C.sun : "#ffe2c2", size: 1.25 });
  lb.position.set(0, open ? (s.id === "pip" ? 19 : 15) : 9.5, 0);
  g.add(lb);
  if (!open) { const sign = label(`Opens at ${s.at} families`, { bg: C.white, size: 0.9 }); sign.position.set(0, 7.6, 0); g.add(sign); }
  g.traverse((o) => (o.userData.spot = s));
  spotPlay.set(s.id, play);
  scene.add(g);
  return g;
}

// ---------- town ----------
const state = { houses: [], lots: [], byHandle: new Map(), meshes: [], labels: new Map(), extent: 60, spotGroups: [], inst: new Map() };
const norm = (s) => (s || "").trim().replace(/^@/, "").toLowerCase();

function buildTown(houses) {
  const n = houses.length;
  const spare = Math.max(16, Math.ceil(n * 0.1));
  const { lots, r } = layoutLots(n + spare);
  const fl = new URLSearchParams(location.search).get("lot"); // film only: put house #1 on a chosen lot "x,z"
  if (fl) { const [fx, fz] = fl.split(",").map(Number); const k = lots.findIndex((l) => l.x === fx && l.z === fz); if (k > 0) [lots[0], lots[k]] = [lots[k], lots[0]]; }
  state.lots = lots;
  lots.forEach(streetOf);
  state.extent = (r + 1) * PX;

  // ground + road + blocks
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), mat("#8fd27e"));
  grass.rotation.x = -Math.PI / 2; grass.position.y = -0.05; grass.receiveShadow = true; scene.add(grass);
  const road = new THREE.Mesh(new THREE.PlaneGeometry((2 * r + 1) * PX + ROAD, (2 * r + 1) * PZ + ROAD), mat("#6d7385"));
  road.rotation.x = -Math.PI / 2; road.position.y = 0.01; road.receiveShadow = true; scene.add(road);

  const B = new Batcher();
  const I = new THREE.Matrix4();
  for (let bx = -r; bx <= r; bx++)
    for (let bz = -r; bz <= r; bz++) {
      const c = blockCenter(bx, bz);
      B.add(part("x", "box", "#d8d4ca", [0, 0, 0], [BW + 2, 0.25, BD + 2]), I.clone().makeTranslation(c.x, 0, c.z));
      if (!reserved.has(`${bx},${bz}`)) B.add(part("x", "box", "#a5dd8f", [0, 0, 0], [BW, 0.4, BD]), I.clone().makeTranslation(c.x, 0, c.z));
      B.add(part("x", "box", C.white, [0, 0, 0], [3, 0.03, 0.5]), I.clone().makeTranslation(c.x + BW / 2 + ROAD / 2, 0.02, c.z));
    }

  // houses
  houses.forEach((h, i) => {
    const lot = lots[i];
    const world = new THREE.Matrix4().compose(new THREE.Vector3(lot.x, 0.4, lot.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, lot.face, 0)), new THREE.Vector3(1, 1, 1));
    for (const p of houseParts(designFor(h))) B.add(p, world, i);
    for (const [tx, tz] of [[-2.4, -2.2], [2.4, -2.2]]) {
      const tm = new THREE.Matrix4().multiplyMatrices(world, new THREE.Matrix4().makeTranslation(tx, 0, tz));
      if ((hash(h.h) >>> (tx > 0 ? 2 : 5)) & 1) { B.add(part("x", "cyl", "#8a5a3c", [0, 0, 0], [0.3, 1, 0.3]), tm); B.add(part("x", "cone", "#4caf50", [0, 0.8, 0], [1.6, 2.4, 1.6]), tm); }
    }
  });

  // "your house here" plots
  const free = lots.slice(n, n + 8);
  free.forEach((lot) => {
    const w = new THREE.Matrix4().compose(new THREE.Vector3(lot.x, 0.4, lot.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, lot.face, 0)), new THREE.Vector3(1, 1, 1));
    B.add(part("x", "box", "#f4e3b5", [0, 0, 0], [4, 0.05, 4]), w);
    B.add(part("x", "cyl", "#8a5a3c", [0, 0, 1.3], [0.15, 1.6, 0.15]), w);
  });
  [free[0], free[3]].filter(Boolean).forEach((lot) => { const s = label("Your house here!", { bg: "#c9f2e0", size: 0.7 }); s.position.set(lot.x, 2.4, lot.z); scene.add(s); });

  // trees around the town
  const rnd = (() => { let s = 7; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0) / 4294967296; })();
  const edgeX = (r + 0.5) * PX + ROAD, edgeZ = (r + 0.5) * PZ + ROAD;
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2, k = 1.08 + rnd() * 0.9;
    const x = Math.cos(a) * edgeX * k, z = Math.sin(a) * edgeZ * k;
    if (Math.abs(x) < edgeX + 3 && Math.abs(z) < edgeZ + 3) continue;
    const s = 1 + rnd() * 1.4;
    const tm = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
    B.add(part("x", "cyl", "#8a5a3c", [0, 0, 0], [0.5, 1.5, 0.5]), tm);
    if (rnd() < 0.5) B.add(part("x", "cone", "#3f9e4d", [0, 1.2, 0], [3, 4.5, 3]), tm);
    else B.add(part("x", "ball", "#5cb85c", [0, 3, 0], [3.4, 3.4, 3.4]), tm);
  }
  state.meshes = B.build(scene, state.inst);
  const wm = state.meshes.find((m) => m.userData.kind === "win");
  if (wm) { winMat = wm.material; winMat.emissive.set("#ffc857"); winMat.emissiveIntensity = 0; }
  applyNight();

  // spots
  state.spotGroups = SPOTS.map((s) => buildSpot(s, n >= s.at));

  // name tags for every house; small ones fade in only when the camera is close
  const _v = new THREE.Vector3();
  const near = n <= 25 ? 1e9 : 85;
  if (n <= 300) houses.forEach((h, i) => showLabel(i, false));
  let tick = 0;
  anim.push(() => {
    if (n > 300 && tick++ % 20 === 0) {
      // big towns: only make tags for houses near the camera
      lots.slice(0, n).forEach((lot, i) => {
        if (!state.labels.has(i) && camera.position.distanceTo(_v.set(lot.x, 5.6, lot.z)) < near) showLabel(i, false);
      });
    }
    state.labels.forEach((s) => { s.visible = s.userData.big || camera.position.distanceTo(_v.copy(s.position)) < near; });
  });

  // cars
  const cars = [];
  for (let i = 0; i < 10; i++) {
    const car = new THREE.Group();
    car.add(mesh("box", [C.coral, C.sun, C.sky, C.grape, C.teal][i % 5], [0, 0.3, 0], [2.6, 0.9, 1.4]));
    car.add(mesh("box", C.white, [-0.2, 1.2, 0], [1.4, 0.7, 1.2]));
    const row = Math.round((rnd() * 2 - 1) * r);
    const z = row * PZ + BD / 2 + ROAD / 2 + (i % 2 ? 1.2 : -1.2);
    const dir = i % 2 ? 1 : -1, speed = 6 + rnd() * 5, off = rnd() * 1000;
    car.rotation.y = dir > 0 ? 0 : Math.PI;
    scene.add(car);
    cars.push({ car, z, dir, speed, off });
  }
  const span = edgeX * 2;
  anim.push((t) => cars.forEach((c) => { const x = (((t * c.speed + c.off) % span) + span) % span - edgeX; c.car.position.set(c.dir * x, 0, c.z); }));

  // clouds
  for (let i = 0; i < 8; i++) {
    const cl = new THREE.Group();
    for (let j = 0; j < 4; j++) cl.add(mesh("ball", C.white, [j * 4 - 6, rnd() * 2, rnd() * 3], [7, 4.5, 5]));
    cl.position.set((rnd() - 0.5) * edgeX * 2.4, 55 + rnd() * 25, (rnd() - 0.5) * edgeZ * 2.4);
    cl.traverse((o) => (o.castShadow = false));
    scene.add(cl);
    const v = 1 + rnd() * 2;
    anim.push((t, dt) => { cl.position.x += v * dt; if (cl.position.x > edgeX * 1.4) cl.position.x = -edgeX * 1.4; });
  }

  // light + camera framing
  const ext = Math.max(edgeX, edgeZ) + 20;
  sun.position.set(ext * 0.6, ext * 1.2, ext * 0.45);
  Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: ext * 4 });
  sun.shadow.camera.updateProjectionMatrix();
  controls.maxDistance = Math.max(160, ext * 2.4);
  scene.fog.near = ext * 1.6; scene.fog.far = ext * 4 + 200;
  const d = Math.max(70, Math.min(ext * 1.15, 260)) * (small ? 1.55 : 1);
  controls.target.set(0, 0, small ? -8 : 0);
  camera.position.set(d * 0.55, d * 0.75, d * 0.95);
  controls.update();
}

function showLabel(i, big) {
  const h = state.houses[i];
  if (state.labels.has(i)) {
    if (!big || state.labels.get(i).userData.big) return state.labels.get(i);
    scene.remove(state.labels.get(i));
  }
  const lot = state.lots[i];
  const fresh = h.t === TODAY.day;
  const s = label(`${fresh ? "🆕 " : ""}@${h.h}`, { bg: big ? C.sun : fresh ? "#c9f2c4" : C.white, size: big ? 0.8 : 0.55 });
  s.position.set(lot.x, 5.6, lot.z);
  s.userData.big = big;
  scene.add(s);
  state.labels.set(i, s);
  return s;
}

// ---------- camera fly ----------
let fly = null;
function flyTo(target, dist = 38, stand) {
  if (pipMode) return pipGo(target, stand); // Pip flies there and the camera follows
  const from = { p: camera.position.clone(), t: controls.target.clone() };
  target = target.clone().setY(2);
  // look from the outside of town, fairly steep, so Pip's Lab never blocks the view
  const out = new THREE.Vector3(target.x, 0, target.z);
  if (out.length() < 1) out.set(0.5, 0, 0.9);
  out.normalize();
  // on phones the info card covers the bottom half, so aim a little past the house (towards the camera) to lift it up the screen
  if (small) target.add(new THREE.Vector3(out.x * dist * 0.32, 0, out.z * dist * 0.32));
  const to = { t: target.clone(), p: target.clone().add(new THREE.Vector3(out.x * dist * 0.6, dist * 0.95, out.z * dist * 0.6)) };
  fly = { from, to, t0: performance.now(), dur: 1300 };
  return 1.3;
}

// ---------- marker for a found house ----------
const marker = new THREE.Group();
marker.add(mesh("cone", C.coral, [0, 0, 0], [1.6, 2.2, 1.6], [Math.PI, 0, 0]));
marker.visible = false;
scene.add(marker);
anim.push((t) => { if (marker.visible) { marker.position.y = 10 + Math.sin(t * 4) * 0.8; marker.rotation.y = t * 2; } });

// ---------- houses that come alive ----------
const lotMatrix = (lot) => new THREE.Matrix4().compose(new THREE.Vector3(lot.x, 0.4, lot.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, lot.face, 0)), new THREE.Vector3(1, 1, 1));
const _gm = new THREE.Matrix4(), _gs = new THREE.Matrix4(), _gt = new THREE.Matrix4();

/** The house pops up out of the ground (new families, welcome). */
function growHouse(i, delay = 0) {
  const recs = state.inst.get(i), lot = state.lots[i];
  if (!recs || !lot) return;
  const set = (s) => {
    _gs.makeScale(0.55 + 0.45 * Math.min(1, s), s, 0.55 + 0.45 * Math.min(1, s));
    _gt.makeTranslation(lot.x, 0.4, lot.z).multiply(_gs).multiply(_gm.makeTranslation(-lot.x, -0.4, -lot.z));
    const touched = new Set();
    recs.forEach((r) => { r.mesh.setMatrixAt(r.idx, s <= 0.001 ? ZERO : new THREE.Matrix4().multiplyMatrices(_gt, r.base)); touched.add(r.mesh); });
    touched.forEach((m) => (m.instanceMatrix.needsUpdate = true));
  };
  set(0);
  later(delay, () => {
    sfx.pop();
    burst(new THREE.Vector3(lot.x, 0.6, lot.z), { n: 26, colors: ["#e8dcc4", "#d6c7a6", "#ffffff"], speed: 6, up: 3, grav: 8, size: 0.7, life: 1, spread: 3 });
    tween(0.9, (k) => set(Math.max(0.001, backOut(k))), () => {
      set(1);
      burst(new THREE.Vector3(lot.x, 6, lot.z), { n: 30, colors: [C.sun, C.coral, C.teal, C.grape], speed: 5, up: 7, grav: 12, size: 0.35, life: 1.3 });
    });
  });
}

/** Tap a house: its science gadget goes and its pet hops. */
const playing = new Set();
function playHouse(i) {
  if (playing.has(i) || !state.inst.has(i)) return;
  playing.add(i);
  const d = designFor(state.houses[i]), lot = state.lots[i], Wm = lotMatrix(lot);
  const P = houseParts(d), recs = state.inst.get(i);
  const show = (role, v) => { recs.filter((r) => r.role === role).forEach((r) => { r.mesh.setMatrixAt(r.idx, v ? r.base : ZERO); r.mesh.instanceMatrix.needsUpdate = true; }); };
  const wrap = new THREE.Group(); wrap.position.set(lot.x, 0.4, lot.z); wrap.rotation.y = lot.face; scene.add(wrap);
  const build = (ps, pivot, parent = wrap) => {
    const grp = new THREE.Group(); grp.position.copy(pivot);
    ps.forEach((p) => { const m = new THREE.Mesh(G[p.g], mat(p.c)); m.applyMatrix4(p.m); m.position.sub(pivot); m.castShadow = true; grp.add(m); });
    parent.add(grp); return grp;
  };
  const toWorld = (v) => v.clone().applyMatrix4(Wm);
  let dur = 1.6;
  const gp = P.filter((p) => p.role === "gad"), pp = P.filter((p) => p.role === "pet");
  if (gp.length) {
    show("gad", false);
    const base = new THREE.Vector3().setFromMatrixPosition(gp[0].m).setY(0);
    const top = (y) => toWorld(base.clone().setY(y));
    if (d.g === 1) { // telescope: looks around, finds stars
      const piv = build(gp, base);
      sfx.sparkle();
      tween(1.6, (k) => (piv.rotation.y = backOut(k) * Math.PI * 2));
      [0.3, 0.8, 1.3].forEach((t) => later(t, () => burst(top(2.6), { n: 12, colors: [C.sun, "#ffffff", C.sky], speed: 2, up: 5, grav: -1, size: 0.3, life: 1.2, bounce: false })));
    } else if (d.g === 2) { // volcano: mini eruption
      const piv = build(gp, base);
      sfx.rumble(); dur = 1.8;
      tween(1.2, (k) => { const s = 1 + Math.sin(k * Math.PI * 5) * 0.12 * (1 - k); piv.scale.set(s, 2 - s, s); });
      later(0.25, () => burst(top(1.4), { n: 45, colors: [C.coral, C.orange, C.sun], speed: 2.6, up: 9, grav: 14, size: 0.42, life: 1.5 }));
    } else if (d.g === 3) { // rocket: lift off and land again
      const piv = build(gp, base);
      sfx.whoosh(); dur = 3.2;
      tween(3, (k) => {
        const h = k < 0.45 ? (k / 0.45) ** 2 : k < 0.55 ? 1 : (1 - (k - 0.55) / 0.45) ** 2;
        piv.position.y = h * 32;
        if (k < 0.45 || k > 0.7) burst(toWorld(base.clone().setY(piv.position.y + 0.3)), { n: 2, colors: [C.sun, C.orange], speed: 0.8, up: -4, grav: 3, size: 0.4, life: 0.5, spread: 0.4 });
      }, () => { piv.position.y = 0; burst(top(0.3), { n: 20, colors: ["#e6e6e6", "#ffffff"], speed: 4, up: 1.5, grav: 3, size: 0.6, life: 0.9 }); sfx.pop(); });
    } else if (d.g === 4) { // satellite dish: beep beep, signal rings
      const piv = build(gp, base);
      sfx.beep();
      tween(1.6, (k) => (piv.rotation.y = Math.sin(k * Math.PI * 2) * 0.9));
      [0, 0.35, 0.7].forEach((t) => later(t, () => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 32), new THREE.MeshBasicMaterial({ color: C.sky, transparent: true }));
        ring.position.copy(top(2)); ring.rotation.x = Math.PI / 2; scene.add(ring);
        tween(1.1, (k) => { ring.scale.setScalar(0.5 + k * 6); ring.material.opacity = 1 - k; ring.position.y = top(2).y + k * 3; }, () => scene.remove(ring));
      }));
    } else if (d.g === 5) { // windmill: blades whirr
      const piv = build([gp[0]], base);
      const hub = new THREE.Vector3().setFromMatrixPosition(gp[1].m).setY(2.7);
      const blades = build([gp[1], gp[2]], hub);
      sfx.whoosh(); dur = 2.2;
      tween(2, (k) => (blades.rotation.z = (1 - (1 - k) ** 3) * Math.PI * 6));
      [0.2, 0.7, 1.2].forEach((t) => later(t, () => burst(toWorld(hub), { n: 10, colors: ["#7bd389", "#4caf50", C.sun], speed: 5, up: 2, grav: 2, size: 0.3, life: 1.2, bounce: false })));
      void piv;
    }
  }
  if (pp.length) {
    show("pet", false);
    const base = new THREE.Vector3().setFromMatrixPosition(pp[0].m).setY(0);
    const piv = build(pp, base);
    later(0.15, () => sfx.boing());
    tween(1.4, (k) => { piv.position.y = Math.abs(Math.sin(k * Math.PI * 3)) * 0.9; piv.rotation.y = Math.sin(k * Math.PI * 3) * 0.5; });
    burst(toWorld(base.clone().setY(1.4)), { n: 10, colors: [C.coral, "#ff8fab"], speed: 1.5, up: 3, grav: -0.5, size: 0.32, life: 1.5, bounce: false });
  }
  later(dur, () => { scene.remove(wrap); show("gad", true); show("pet", true); playing.delete(i); });
}

// ---------- my house (this device) ----------
const ME_KEY = "pst-me";
const readMe = () => { try { return norm(localStorage.getItem(ME_KEY) || ""); } catch { return ""; } };
let myRing = null;
function markMyHouse() {
  const me = readMe(), i = state.byHandle.get(me);
  if (i === undefined) return;
  $("homeBtn").classList.remove("hidden");
  const lot = state.lots[i];
  myRing = new THREE.Mesh(new THREE.TorusGeometry(3.9, 0.22, 8, 48), new THREE.MeshBasicMaterial({ color: C.sun }));
  myRing.rotation.x = Math.PI / 2; myRing.position.set(lot.x, 0.55, lot.z); scene.add(myRing);
  anim.push((t) => { const s = 1 + Math.sin(t * 3) * 0.05; myRing.scale.set(s, s, s); });
}

// ---------- Pip's Daily Discovery ----------
const BOOK_KEY = "pst-book";
const readBook = () => { try { return { found: {}, streak: 0, last: null, ...(JSON.parse(localStorage.getItem(BOOK_KEY) || "{}") || {}) }; } catch { return { found: {}, streak: 0, last: null }; } };
const foundToday = () => readBook().last === DN;
let treasure = null;
function emojiSprite(e) {
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const x = cv.getContext("2d");
  x.fillStyle = "rgba(255,255,255,0.95)"; x.beginPath(); x.arc(64, 64, 56, 0, 7); x.fill();
  x.lineWidth = 9; x.strokeStyle = C.sun; x.stroke();
  x.font = "68px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',system-ui"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(e, 64, 70);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
  sp.scale.set(2.4, 2.4, 1);
  return sp;
}
const spotPos = (id) => blockCenter(...SPOTS.find((s) => s.id === id).b);
function placeTreasure() {
  if (foundToday()) return;
  const [cx, cz] = TODAY.corner;
  const p = spotPos(TODAY.spot).add(new THREE.Vector3(cx * (BW / 2 - 0.9), 1.7, cz * (BD / 2 - 0.7)));
  treasure = emojiSprite(TODAY.item.e);
  treasure.position.copy(p);
  treasure.userData.treasure = true;
  scene.add(treasure);
  let next = 0;
  anim.push((t) => {
    if (!treasure) return;
    treasure.position.y = 1.7 + Math.sin(t * 2.5) * 0.35;
    if (t > next) { next = t + 2.2; burst(treasure.position.clone().add(new THREE.Vector3(0, 0.8, 0)), { n: 6, colors: [C.sun, "#ffffff"], speed: 1.2, up: 3, grav: 1, size: 0.22, life: 1, bounce: false }); }
  });
}
function collectTreasure() {
  if (!treasure) return;
  const b = readBook();
  if (b.last !== DN) { b.streak = b.last === DN - 1 ? (b.streak || 0) + 1 : 1; b.last = DN; }
  b.found[TODAY.item.id] = b.found[TODAY.item.id] || TODAY.day;
  try { localStorage.setItem(BOOK_KEY, JSON.stringify(b)); } catch {}
  burst(treasure.position.clone(), { n: 60, colors: [C.sun, C.coral, C.teal, C.grape, C.sky], speed: 6, up: 8, grav: 10, size: 0.4, life: 1.6 });
  scene.remove(treasure); treasure = null;
  sfx.fanfare(); confetti();
  updateDot();
  const n = Object.keys(b.found).length;
  const el = document.createElement("div");
  el.className = "found";
  el.innerHTML = `<div class="bigemoji">${TODAY.item.e}</div>
    <h2>You found the ${TODAY.item.n}!</h2>
    <p class="fact">${TODAY.item.f}</p>
    <p class="stats"><b>${n}</b> / ${ITEMS.length} in your Discovery Book${b.streak > 1 ? ` · 🔥 <b>${b.streak}</b> days in a row` : ""}</p>
    <button class="big" id="openBook">📖 Open my Discovery Book</button>
    <p class="tiny">A new discovery hides in town every day. Come back tomorrow! Grown-ups: ask your kid what they found 💛</p>`;
  openModal(el);
  el.querySelector("#openBook").onclick = openBook;
}
function openBook() {
  const b = readBook(), n = Object.keys(b.found).length;
  const el = document.createElement("div");
  el.innerHTML = `<h2>📖 My Discovery Book</h2>
    <p class="stats"><b>${n}</b> / ${ITEMS.length} found${b.streak > 0 && b.last >= DN - 1 ? ` · 🔥 <b>${b.streak}</b> ${b.streak === 1 ? "day" : "days in a row"}` : ""}</p>
    <div class="book">${ITEMS.map((it) => b.found[it.id]
      ? `<button class="item got" data-id="${it.id}"><span>${it.e}</span><small>${it.n}</small></button>`
      : `<div class="item"><span class="q">?</span><small>Not found yet</small></div>`).join("")}</div>
    <p class="fact" id="bookFact">${n ? "Tap a discovery to read its fact." : "Nothing yet! Something new hides in town every day. Tap 🔎 for today's hint."}</p>
    <p class="tiny">Saved only on this device. No sign-up.</p>`;
  openModal(el);
  el.addEventListener("click", (e) => { const it = ITEMS.find((x) => x.id === e.target.closest("[data-id]")?.dataset.id); if (it) { el.querySelector("#bookFact").innerHTML = `<b>${it.e} ${it.n}:</b> ${it.f}`; sfx.pop(); } });
}
function openHint() {
  const el = document.createElement("div");
  if (foundToday()) {
    el.innerHTML = `<h2>🔎 Today's discovery</h2><p>You already found today's <b>${TODAY.item.n}</b> ${TODAY.item.e}! A new one hides in town tomorrow.</p><button class="big" id="openBook">📖 My Discovery Book</button>`;
    openModal(el); el.querySelector("#openBook").onclick = openBook; return;
  }
  el.innerHTML = `<h2>🔎 Today's discovery</h2>
    <p>Pip hid something in town today… ✨</p>
    <p class="fact">It's near the <b>${TODAY.near}</b>! Zoom in and look for a sparkle, then tap it.</p>
    <button class="big" id="flyHint">🚁 Fly me close</button>`;
  openModal(el);
  el.querySelector("#flyHint").onclick = () => { closeModal(); marker.visible = false; flyTo(spotPos(TODAY.spot), 62, { r: 17 }); };
}
function updateDot() { $("hintBtn").querySelector(".dot").classList.toggle("hidden", foundToday()); }

// ---------- UI ----------
const $ = (id) => document.getElementById(id);
const toastEl = $("toast");
let toastT;
function toast(msg, ms = 3500) { toastEl.textContent = msg; toastEl.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.add("hidden"), ms); }

function openModal(html) { $("modalBody").innerHTML = ""; if (typeof html === "string") $("modalBody").innerHTML = html; else $("modalBody").append(html); $("modal").classList.remove("hidden"); }
function closeModal() { $("modal").classList.add("hidden"); designer.stop(); }
$("modal").addEventListener("click", (e) => {
  if (e.target.id === "modal" || e.target.closest("[data-close]")) closeModal();
  const o = e.target.closest("[data-open]");
  if (o) { e.preventDefault(); if (o.dataset.open === "design") openDesigner(); if (o.dataset.open === "claim") openClaim(); }
});
const tpl = (id) => $(id).content.cloneNode(true);
$("getHouse").onclick = $("ctaMobile").onclick = () => openModal(tpl("tplGet"));
$("privacyLink").onclick = (e) => { e.preventDefault(); openModal(tpl("tplPrivacy")); };
$("collapse").onclick = () => { const c = $("card"); c.classList.toggle("collapsed"); $("collapse").textContent = c.classList.contains("collapsed") ? "+" : "–"; };

function info(html) { $("info").innerHTML = `<button class="icon" aria-label="Close">✕</button>${html}`; $("info").classList.remove("hidden"); document.body.classList.add("info-open"); $("info").querySelector(".icon").onclick = () => { $("info").classList.add("hidden"); document.body.classList.remove("info-open"); marker.visible = false; }; }

function showHouse(i, { fly = true, playIt = true } = {}) {
  const h = state.houses[i], d = designFor(h), lot = state.lots[i];
  showLabel(i, true);
  marker.position.set(lot.x, 10, lot.z); marker.visible = true;
  const wait = fly ? flyTo(new THREE.Vector3(lot.x, 0, lot.z), 38, { r: 5, dir: new THREE.Vector3(Math.sin(lot.face), 0, Math.cos(lot.face)) }) : 0;
  const g = GADGETS[d.g], p = PETS[d.p];
  const welcome = h.pending && new URLSearchParams(location.search).get("new") === "1";
  const mine = norm(h.h) === readMe();
  if (welcome) { confetti(); sfx.fanfare(); growHouse(i, wait + 0.2); }
  else if (playIt) later(wait, () => playHouse(i));
  const ex = TODAY.experiment;
  info(`${welcome ? "<h3>🎉 Welcome to Pip's Science Town!</h3>" : ""}<h3>🏡 @${h.h}</h3>
    <p><b>House #${(i + 1).toLocaleString()}</b> on <b>${streetOf(lot)}</b></p>
    ${h.pending ? `<p><span class="tag">⚒️ moving in</span> Builders are finishing it. It shows up for everyone within a day.</p>` : `<p>Moved in: ${h.t || "recently"}</p>`}
    <p>Science gadget: ${g.n} ${g.e !== "–" ? g.e : ""}${d.p ? `<br>Pet: ${p.n} ${p.e}` : ""}</p>
    ${mine || welcome ? `<div class="lab"><b>🧪 Today in my lab: ${ex.e} ${ex.n}</b><p>${ex.s}</p></div>` : ""}
    <div class="row"><button class="soft" id="playHouse">👆 Play!</button><button class="soft" id="storyHouse">📲 Share</button><button class="soft" id="shareHouse">🔗 Link</button></div>
    <p class="tiny">Tip: add the link to your Instagram story with the 🔗 Link sticker so friends can visit!</p>`);
  $("playHouse").onclick = () => playHouse(i);
  const link = `${location.origin}${location.pathname}?find=${encodeURIComponent(h.h)}`;
  $("shareHouse").onclick = () => copy(link, "Link copied! Add it to your story with the Link sticker 💛");
  $("storyHouse").onclick = async () => {
    if (navigator.share) { try { await navigator.share({ title: "My house in Pip's Science Town", text: `Come visit our house #${i + 1} on ${streetOf(lot)} in Pip's Science Town! 🏡🔬`, url: link }); return; } catch {} }
    copy(link, "Link copied! Add it to your story with the Link sticker 💛");
  };
  history.replaceState(null, "", `?find=${encodeURIComponent(h.h)}`);
}
function showSpot(s, { fly = true, playIt = false } = {}) {
  const n = state.houses.length, open = n >= s.at;
  const grp = state.spotGroups[SPOTS.indexOf(s)];
  const wait = fly ? flyTo(grp.position.clone(), 62, { r: 15 }) : 0;
  marker.visible = false;
  const play = () => spotPlay.get(s.id)?.();
  if (playIt) later(wait, play);
  const verb = { pip: "🤖 Make Pip jump", volcano: "🌋 Erupt!", aquarium: "🐠 Splash!", weather: "🌦️ Make it rain", planetarium: "🌌 Star show", dino: "🦖 Roar!", rocket: "🚀 Launch!" }[s.id];
  const f = TODAY.fact;
  info(`<h3>${s.e} ${s.name}</h3>
    <p>${open ? '<span class="tag open">Open!</span>' : `<span class="tag">Opens at ${s.at} families · ${s.at - n} to go</span>`}</p>
    ${s.id === "pip" ? `<p><b>Pip's fact of the day:</b> ${f.e} ${f.f}</p>` : open ? `<p><b>Try this at home:</b> ${s.act}</p>` : `<p>The builders are working! Every family that moves in brings this closer. Share the town with a friend! 💛</p>`}
    <button class="soft wide" id="playSpot">${open ? verb : "🔨 Watch the builders"}</button>`);
  $("playSpot").onclick = play;
}
$("buildingsBtn").onclick = () => {
  const n = state.houses.length;
  const ul = document.createElement("div");
  ul.innerHTML = `<h2>🔬 Science spots</h2><p class="tiny">New buildings open as more families move in. Each one has a free activity to try at home.</p><ul class="spots">${SPOTS.map((s, i) => `<li><span class="em">${s.e}</span><span class="t"><b>${s.name}</b><span>${n >= s.at ? "Open! Tap to visit" : `Opens at ${s.at} families`}</span></span><button data-spot="${i}">Visit</button></li>`).join("")}</ul>`;
  ul.addEventListener("click", (e) => { const b = e.target.closest("[data-spot]"); if (b) { closeModal(); showSpot(SPOTS[+b.dataset.spot], { playIt: true }); } });
  openModal(ul);
};

function find(q) {
  const k = norm(q);
  if (!k) return;
  const i = state.byHandle.get(k);
  if (i === undefined) { toast(`No house for @${k} yet. Comment LAB on our Instagram to move in! 🏡`, 5000); return; }
  showHouse(i);
}
$("findForm").onsubmit = (e) => { e.preventDefault(); find($("findInput").value); $("findInput").blur(); };

async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg); } catch { prompt("Copy this:", text); }
}

function updateGoal() {
  const n = state.houses.length;
  document.querySelector(".count").innerHTML = `<b id="families">${n.toLocaleString()}</b> ${n === 1 ? "family lives" : "families live"} here`;
  document.querySelector(".count").innerHTML = n === 0 ? "<b>Be the first family</b> to move in! 🏡" : document.querySelector(".count").innerHTML;
  const next = SPOTS.find((s) => s.at > n);
  if (!next) { $("goalText").textContent = "Every science spot is open! 🎉"; $("goalBar").style.width = "100%"; return; }
  const prev = [...SPOTS].reverse().find((s) => s.at <= n)?.at ?? 0;
  $("goalText").innerHTML = `<b>${(next.at - n).toLocaleString()}</b> more ${next.at - n === 1 ? "family" : "families"} until the <b>${next.name}</b> opens ${next.e}`;
  requestAnimationFrame(() => ($("goalBar").style.width = `${Math.max(4, ((n - prev) / (next.at - prev)) * 100)}%`));
}

// ---------- designer ----------
const designer = (() => {
  let r, sc, cam, grp, raf, d = { r: 0, w: 0, g: 1, p: 1 };
  function rebuild() {
    if (grp) sc.remove(grp);
    grp = new THREE.Group();
    for (const p of houseParts(d)) { const m = new THREE.Mesh(G[p.g], mat(p.c, { flatShading: p.g === "roof" })); m.applyMatrix4(p.m); m.castShadow = true; grp.add(m); }
    grp.add(mesh("cyl", "#a5dd8f", [0, -0.4, 0.5], [9, 0.4, 9]));
    sc.add(grp);
  }
  function start(canvas) {
    r = new THREE.WebGLRenderer({ canvas, antialias: true });
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true;
    sc = new THREE.Scene(); sc.background = new THREE.Color("#bde7ff");
    sc.add(new THREE.HemisphereLight("#ffffff", "#9bd18b", 1.2));
    const l = new THREE.DirectionalLight("#fff4dc", 1.8); l.position.set(6, 10, 8); l.castShadow = true; sc.add(l);
    cam = new THREE.PerspectiveCamera(32, 2, 0.1, 100);
    rebuild();
    const loop = (t) => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.floor(w * r.getPixelRatio())) { r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      const a = t / 2500;
      cam.position.set(Math.sin(a) * 11, 6.5, Math.cos(a) * 11 + 0.6);
      cam.lookAt(0, 1.7, 0.6);
      r.render(sc, cam);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; if (r) { r.dispose(); r = null; } }
  return { start, stop, rebuild: () => sc && rebuild(), get d() { return d; }, set(k, v) { d = { ...d, [k]: v }; } };
})();

function openDesigner() {
  const el = document.createElement("div");
  el.className = "designer";
  const chips = (key, list, render) => `<div class="opt"><div class="lbl">${render.title}</div><div class="chips">${list.map((x, i) => `<button data-k="${key}" data-v="${i}" ${render.swatch ? `class="swatch" style="background:${x}" aria-label="${render.title} ${i + 1}"` : ""}>${render.swatch ? "" : `${x.e} ${x.n}`}</button>`).join("")}</div></div>`;
  el.innerHTML = `<h2>🎨 Design your house</h2>
    <canvas></canvas>
    ${chips("r", ROOFS, { title: "Roof", swatch: true })}
    ${chips("w", WALLS, { title: "Walls", swatch: true })}
    ${chips("g", GADGETS, { title: "Science gadget" })}
    ${chips("p", PETS, { title: "Pet" })}
    <div class="code">Your house code<br><b id="code"></b></div>
    <button class="big" id="copyCode">📋 Copy code</button>
    <p class="tiny">Then comment <b>LAB</b> on any of our posts and DM us your code on Instagram (<a href="https://www.instagram.com/wonderlabkids.science/" target="_blank" rel="noopener">@wonderlabkids.science</a>). Already have a house? Just DM the code and we'll repaint it!</p>`;
  openModal(el);
  const refresh = () => {
    el.querySelectorAll("[data-k]").forEach((b) => b.classList.toggle("on", designer.d[b.dataset.k] === +b.dataset.v));
    el.querySelector("#code").textContent = `LAB ${codeOf(designer.d)}`;
  };
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-k]");
    if (b) { designer.set(b.dataset.k, +b.dataset.v); designer.rebuild(); refresh(); try { localStorage.setItem("pst-design", codeOf(designer.d)); } catch {} }
  });
  el.querySelector("#copyCode").onclick = () => copy(`LAB ${codeOf(designer.d)}`, "Code copied! Now DM it to us on Instagram 💌");
  refresh();
  designer.start(el.querySelector("canvas"));
}
$("designBtn").onclick = openDesigner;

// ---------- claim ("Claim my house" button in our DMs) ----------
const CLAIM_KEY = "pst-claim";
const readClaim = () => { try { return JSON.parse(localStorage.getItem(CLAIM_KEY) || "null"); } catch { return null; } };
function openClaim() {
  const el = document.createElement("div");
  el.innerHTML = `<h2>🏡 Claim your house</h2>
    <p>Type the Instagram @ you used to comment or DM <b>LAB</b>.</p>
    <form class="find" id="claimForm" autocomplete="off"><span>@</span><input id="claimInput" placeholder="your.instagram" aria-label="Your Instagram username" autocapitalize="off" /><button aria-label="Move in">🔑</button></form>
    <button class="big" id="claimGo">🏡 Move in!</button>
    <p class="tiny">We only show your public Instagram @ on your door. Never kids' names or photos. Haven't sent LAB yet? <a href="https://www.instagram.com/wonderlabkids.science/" target="_blank" rel="noopener">Comment LAB on our posts</a> so the builders know you're coming!</p>`;
  openModal(el);
  const go = (e) => {
    e?.preventDefault();
    const h = norm(el.querySelector("#claimInput").value);
    if (!/^[a-z0-9._]{1,30}$/.test(h)) { toast("That doesn't look like an Instagram username 🤔"); return; }
    claimAs(h);
  };
  el.querySelector("#claimForm").onsubmit = go;
  el.querySelector("#claimGo").onclick = go;
  setTimeout(() => el.querySelector("#claimInput").focus(), 50);
}
function claimAs(h) {
  try { localStorage.setItem(ME_KEY, h); } catch {}
  if (!state.byHandle.has(h)) {
    let d = "";
    try { d = localStorage.getItem("pst-design") || ""; } catch {}
    try { localStorage.setItem(CLAIM_KEY, JSON.stringify({ h, d, t: new Date().toISOString().slice(0, 10) })); } catch {}
  }
  location.replace(`${location.pathname}?find=${encodeURIComponent(h)}&new=1`);
}
function confetti() {
  const cols = [C.coral, C.sun, C.teal, C.grape, C.sky, C.orange];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement("i");
    p.className = "confetti";
    p.style.left = `${Math.random() * 100}vw`;
    p.style.background = cols[i % cols.length];
    p.style.animationDelay = `${Math.random() * 0.6}s`;
    p.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.append(p);
    setTimeout(() => p.remove(), 3800);
  }
}

// ---------- Pip mode: a little jetpack Pip you steer with one finger ----------
let pipMode = true;
try { pipMode = localStorage.getItem("pst-view") !== "map"; } catch {}
const bot = new THREE.Group();
const botBody = new THREE.Group(); bot.add(botBody);
botBody.add(mesh("box", C.teal, [0, 0.5, 0], [1.3, 1.4, 1.0]));
botBody.add(mesh("box", C.white, [0, 1.9, 0], [1.8, 1.35, 1.35]));
botBody.add(mesh("ball", C.ink, [-0.38, 2.6, 0.68], [0.34, 0.34, 0.16]));
botBody.add(mesh("ball", C.ink, [0.38, 2.6, 0.68], [0.34, 0.34, 0.16]));
botBody.add(mesh("box", C.coral, [0, 2.2, 0.69], [0.5, 0.1, 0.05]));
botBody.add(mesh("cyl", C.ink, [0, 3.2, 0], [0.08, 0.55, 0.08]));
const botLight = mesh("ball", C.coral, [0, 3.85, 0], [0.38, 0.38, 0.38], [0, 0, 0], { emissive: C.coral, emissiveIntensity: 0.6 });
botBody.add(botLight);
botBody.add(mesh("cyl", C.orange, [-0.35, 0.3, -0.65], [0.38, 1.1, 0.38]));
botBody.add(mesh("cyl", C.orange, [0.35, 0.3, -0.65], [0.38, 1.1, 0.38]));
const botArmL = mesh("box", C.teal, [-0.85, 0.5, 0], [0.28, 0.9, 0.28], [0, 0, 0.4]);
const botArmR = mesh("box", C.teal, [0.85, 0.5, 0], [0.28, 0.9, 0.28], [0, 0, -0.4]);
botBody.add(botArmL, botArmR);
const botShadow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
botShadow.rotation.x = -Math.PI / 2;
bot.scale.setScalar(1.25);
bot.visible = false;
scene.add(bot, botShadow);

const pip = { pos: new THREE.Vector3(0, 0.45, PZ / 2), yaw: 0.52, pitch: 0.82, dist: small ? 44 : 40, look: new THREE.Vector3(), move: null, keys: new Set(), placed: false };
const _cv = new THREE.Vector3(), _lv = new THREE.Vector3();

/** Fly Pip to a point. stand: {r, dir} stops r units short (in front of a house door, or before a building). Returns the travel time. */
function pipGo(target, stand) {
  const to = target.clone().setY(0.45);
  if (stand?.r) {
    const dir = stand.dir ? stand.dir.clone() : pip.pos.clone().sub(to).setY(0);
    if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
    to.add(dir.normalize().multiplyScalar(stand.r));
    if (stand.dir) { pip.yawGoal = Math.atan2(dir.x, dir.z); pip.distGoal = small ? 34 : 30; pip.pitchGoal = 1.0; } // swing round to the front door, a bit closer and steeper so nothing blocks the view
  }
  const d = pip.pos.distanceTo(to);
  if (d < 0.5) return 0;
  const dur = Math.min(3.2, Math.max(0.5, 0.35 + d / 26));
  pip.move = { from: pip.pos.clone(), to, t0: NOW, dur, h: d < 7 ? 0.8 : Math.min(16, 5 + d * 0.12) };
  if (d > 7) sfx.whoosh(); else sfx.pop();
  return dur;
}
function pipFace(dx, dz, dt) {
  if (Math.abs(dx) + Math.abs(dz) < 1e-4) return;
  const want = Math.atan2(dx, dz);
  let a = want - bot.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a));
  bot.rotation.y += a * Math.min(1, dt * 10);
}
anim.push((t, dt) => {
  if (!pipMode) return;
  const before = pip.pos.clone();
  let flying = false;
  if (pip.move) {
    const m = pip.move, k = Math.min(1, (NOW - m.t0) / m.dur), e = ease(k);
    pip.pos.lerpVectors(m.from, m.to, e);
    pip.pos.y = 0.45 + Math.sin(k * Math.PI) * m.h;
    flying = m.h > 1;
    if (k >= 1) { pip.move = null; burst(pip.pos.clone().setY(0.6), { n: 10, colors: ["#e8dcc4", "#ffffff"], speed: 3, up: 1.5, grav: 4, size: 0.4, life: 0.6 }); }
  }
  // keyboard: arrows / WASD walk relative to the camera
  if (pip.keys.size && !pip.move) {
    const f = (pip.keys.has("ArrowUp") || pip.keys.has("w") ? 1 : 0) - (pip.keys.has("ArrowDown") || pip.keys.has("s") ? 1 : 0);
    const r = (pip.keys.has("ArrowRight") || pip.keys.has("d") ? 1 : 0) - (pip.keys.has("ArrowLeft") || pip.keys.has("a") ? 1 : 0);
    const sp = 16 * dt;
    pip.pos.x += (-Math.sin(pip.yaw) * f + Math.cos(pip.yaw) * r) * sp;
    pip.pos.z += (-Math.cos(pip.yaw) * f - Math.sin(pip.yaw) * r) * sp;
  }
  const lim = state.extent + 30;
  pip.pos.x = Math.max(-lim, Math.min(lim, pip.pos.x)); pip.pos.z = Math.max(-lim, Math.min(lim, pip.pos.z));
  const dx = pip.pos.x - before.x, dz = pip.pos.z - before.z;
  pipFace(dx, dz, dt);
  const moving = Math.hypot(dx, dz) > 0.002;
  bot.position.copy(pip.pos);
  botBody.position.y = Math.sin(t * 3) * 0.12 + (moving && !flying ? Math.abs(Math.sin(t * 14)) * 0.25 : 0);
  botBody.rotation.x = flying ? 0.25 : 0;
  botArmL.rotation.z = flying ? 1.2 : 0.4 + (moving ? Math.sin(t * 14) * 0.3 : 0); botArmR.rotation.z = -botArmL.rotation.z;
  botLight.material.emissiveIntensity = 0.5 + 0.5 * Math.sin(t * 5) + nf;
  if (flying) burst(_lv.set(0, 0.2, -0.85).applyAxisAngle(_cv.set(0, 1, 0), bot.rotation.y).multiplyScalar(1.25).add(pip.pos), { n: 2, colors: [C.sun, C.orange], speed: 0.6, up: -3, grav: 2, size: 0.35, life: 0.4, spread: 0.3, bounce: false });
  botShadow.position.set(pip.pos.x, 0.47, pip.pos.z);
  botShadow.scale.setScalar(1.25 / (1 + (pip.pos.y - 0.45) * 0.08));
  // Pip finds today's discovery by flying close to it
  if (treasure && pip.pos.distanceTo(treasure.position) < 4.2) collectTreasure();
  // follow camera (swings round smoothly when a house wants to be seen from the front)
  if (pip.yawGoal !== null && pip.yawGoal !== undefined) {
    let a = pip.yawGoal - pip.yaw; a = Math.atan2(Math.sin(a), Math.cos(a));
    pip.yaw += a * Math.min(1, dt * 2.5);
    if (Math.abs(a) < 0.01) pip.yawGoal = null;
  }
  if (pip.distGoal) { pip.dist += (pip.distGoal - pip.dist) * Math.min(1, dt * 2); if (Math.abs(pip.distGoal - pip.dist) < 0.2) pip.distGoal = 0; }
  if (pip.pitchGoal) { pip.pitch += (pip.pitchGoal - pip.pitch) * Math.min(1, dt * 2); if (Math.abs(pip.pitchGoal - pip.pitch) < 0.01) pip.pitchGoal = 0; }
  _cv.set(Math.sin(pip.yaw) * Math.cos(pip.pitch), Math.sin(pip.pitch), Math.cos(pip.yaw) * Math.cos(pip.pitch)).multiplyScalar(pip.dist);
  _lv.copy(pip.pos).setY(Math.min(pip.pos.y, 4) + 1.5);
  // on phones the info card covers the bottom, so look a bit past Pip to lift him up the screen
  if (small && document.body.classList.contains("info-open")) _lv.add(new THREE.Vector3(Math.sin(pip.yaw), 0, Math.cos(pip.yaw)).multiplyScalar(pip.dist * 0.2));
  const kk = 1 - Math.exp(-dt * 6);
  pip.look.lerp(_lv, kk);
  camera.position.lerp(_cv.add(pip.look), kk);
  camera.lookAt(pip.look);
  controls.target.copy(pip.look);
});
function placePip() {
  const me = state.byHandle.get(readMe());
  if (me !== undefined) { const l = state.lots[me]; pip.pos.set(l.x + Math.sin(l.face) * 5, 0.45, l.z + Math.cos(l.face) * 5); }
  else pip.pos.set(0, 0.45, PZ / 2);
  pip.look.copy(controls.target); // start from the overview and swoop down to Pip
  pip.placed = true;
}
function setView(v) {
  pipMode = v;
  try { localStorage.setItem("pst-view", v ? "pip" : "map"); } catch {}
  bot.visible = botShadow.visible = v;
  controls.enabled = !v;
  fly = null;
  if (v) { pip.move = null; pip.look.copy(controls.target); }
  else { controls.target.copy(pip.pos).setY(0); }
  $("viewBtn").textContent = v ? "🗺️" : "🤖";
  $("viewBtn").setAttribute("aria-label", v ? "Switch to map view" : "Switch to Pip view");
}

// one finger: tap = go there, drag = turn the camera; two fingers: pinch = zoom; wheel = zoom
const fingers = new Map();
let pinch0 = 0, dist0 = 0;
renderer.domElement.addEventListener("pointerdown", (e) => { if (!pipMode) return; fingers.set(e.pointerId, [e.clientX, e.clientY]); renderer.domElement.setPointerCapture?.(e.pointerId); if (fingers.size === 2) { const [a, b] = [...fingers.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); dist0 = pip.dist; } });
renderer.domElement.addEventListener("pointermove", (e) => {
  if (!pipMode || !fingers.has(e.pointerId)) return;
  const prev = fingers.get(e.pointerId);
  fingers.set(e.pointerId, [e.clientX, e.clientY]);
  if (fingers.size === 1) {
    pip.yawGoal = null; pip.pitchGoal = 0;
    pip.yaw -= (e.clientX - prev[0]) * 0.008;
    pip.pitch = Math.max(0.45, Math.min(1.35, pip.pitch + (e.clientY - prev[1]) * 0.005));
  } else if (fingers.size === 2 && pinch0) {
    const [a, b] = [...fingers.values()];
    pip.distGoal = 0;
    pip.dist = Math.max(14, Math.min(170, dist0 * pinch0 / Math.max(10, Math.hypot(a[0] - b[0], a[1] - b[1]))));
  }
});
const lift = (e) => { fingers.delete(e.pointerId); if (fingers.size < 2) pinch0 = 0; };
renderer.domElement.addEventListener("pointercancel", lift);
renderer.domElement.addEventListener("wheel", (e) => { if (!pipMode) return; e.preventDefault(); pip.distGoal = 0; pip.dist = Math.max(14, Math.min(170, pip.dist * (1 + e.deltaY * 0.0012))); }, { passive: false });
addEventListener("keydown", (e) => { if (!pipMode || e.target.closest?.("input, textarea")) return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(k)) { pip.keys.add(k); pip.move = null; e.preventDefault(); } });
addEventListener("keyup", (e) => { const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; pip.keys.delete(k); });
addEventListener("blur", () => pip.keys.clear());

// ---------- picking ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let down = null;
addEventListener("pointerdown", () => sfx.unlock(), { once: true });
renderer.domElement.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
const isNear = (p, d = 95) => camera.position.distanceTo(p) < d;
renderer.domElement.addEventListener("pointerup", (e) => {
  lift(e);
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const targets = [...state.meshes.filter((m) => m.userData.kind === "wall" || m.userData.kind === "roof" || m.userData.kind === "win"), ...state.spotGroups];
  if (treasure) targets.unshift(treasure);
  const hit = ray.intersectObjects(targets, true)[0];
  // Pip view: "near" means near Pip; map view: near the camera
  const close = (p, dMap, dPip) => (pipMode ? pip.pos.distanceTo(_lv.set(p.x, 0.45, p.z)) < dPip : isNear(p, dMap));
  if (hit?.object.userData.treasure) {
    if (pipMode) { const t = pipGo(treasure.position, { r: 0.1 }); return t ? null : collectTreasure(); }
    return collectTreasure();
  }
  if (hit?.object.userData.spot) {
    const s = hit.object.userData.spot;
    return showSpot(s, { fly: !close(state.spotGroups[SPOTS.indexOf(s)].position, 110, 20), playIt: true });
  }
  const tag = hit?.object.userData.tags?.[hit.instanceId];
  if (tag !== undefined) { const l = state.lots[tag]; return showHouse(tag, { fly: pipMode || !isNear(new THREE.Vector3(l.x, 0, l.z), 75) }); }
  if (pipMode) {
    // tap on the ground: Pip flies there
    const g = new THREE.Vector3();
    if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.45), g)) pipGo(g);
  }
});

// ---------- loop ----------
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const clock = new THREE.Clock();
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  NOW = t;
  if (fly && !pipMode) {
    const k = Math.min(1, (performance.now() - fly.t0) / fly.dur), e = ease(k);
    camera.position.lerpVectors(fly.from.p, fly.to.p, e);
    controls.target.lerpVectors(fly.from.t, fly.to.t, e);
    if (k >= 1) fly = null;
  }
  for (const f of anim) f(t, dt);
  if (!pipMode) controls.update();
  const sk = NOW - shakeT0 < shakeDur ? shakeAmp * (1 - (NOW - shakeT0) / shakeDur) : 0;
  const off = new THREE.Vector3((Math.random() - 0.5) * sk, (Math.random() - 0.5) * sk, (Math.random() - 0.5) * sk);
  camera.position.add(off);
  renderer.render(scene, camera);
  camera.position.sub(off);
});

// ---------- toolbar ----------
$("hintBtn").onclick = () => { sfx.pop(); openHint(); };
$("viewBtn").onclick = () => { sfx.pop(); setView(!pipMode); toast(pipMode ? "🤖 Tap anywhere and Pip flies there! Drag to look around." : "🗺️ Map view: drag to move, pinch to zoom.", 3500); };
$("bookBtn").onclick = () => { sfx.pop(); openBook(); };
$("homeBtn").onclick = () => { const i = state.byHandle.get(readMe()); if (i !== undefined) showHouse(i); };
const setNightIcon = () => ($("nightBtn").textContent = nightOn ? "☀️" : "🌙");
$("nightBtn").onclick = () => { nightOn = !nightOn; try { localStorage.setItem("pst-night", nightOn ? "1" : "0"); } catch {} setNightIcon(); sfx.sparkle(); };
const setSoundIcon = () => ($("soundBtn").textContent = sfx.on ? "🔊" : "🔇");
$("soundBtn").onclick = () => { sfx.toggle(); setSoundIcon(); };
setNightIcon(); setSoundIcon();

// ---------- boot ----------
(async () => {
  const qs = new URLSearchParams(location.search);
  // name tags are drawn on canvases, so wait (briefly) for the Fredoka font first
  try { await Promise.race([document.fonts.load("600 44px Fredoka"), new Promise((r) => setTimeout(r, 2500))]); } catch {}
  let houses = [];
  try {
    const res = await fetch(`data/houses.json?v=${Date.now()}`, { cache: "no-store" });
    houses = (await res.json()).houses || [];
  } catch (e) { console.warn("houses.json not loaded", e); }
  const film = qs.get("film") === "1"; // video capture mode (local only)
  if (film) pipMode = false;
  if (qs.get("you")) houses.unshift({ h: qs.get("you"), d: qs.get("code") || "", t: "today" });
  const demo = +qs.get("demo") || 0; // local testing only
  for (let i = 0; i < demo; i++) houses.push({ h: `demo_family_${i + 1}`, t: "demo" });
  const claim = readClaim();
  if (claim && claim.h) {
    if (houses.some((x) => norm(x.h) === claim.h)) { try { localStorage.removeItem(CLAIM_KEY); } catch {} }
    else if (!film) houses.push({ h: claim.h, d: claim.d, t: claim.t, pending: true });
  }
  const seen = new Set();
  houses = houses.filter((h) => h && h.h && !seen.has(norm(h.h)) && seen.add(norm(h.h)));
  state.houses = houses;
  houses.forEach((h, i) => state.byHandle.set(norm(h.h), i));
  buildTown(houses);
  updateGoal();
  const l = $("loading"); l.style.opacity = 0; setTimeout(() => l.remove(), 500);
  if (film) {
    l.remove();
    document.body.classList.add("film");
    renderer.setAnimationLoop(null);
    if (qs.get("you")) showLabel(0, true);
    window.__state = state;
    window.__film = (t, pos, tgt) => {
      NOW = t;
      camera.position.set(...pos); controls.target.set(...tgt); camera.lookAt(controls.target);
      for (const f of anim) f(t, 1 / 30);
      state.labels.forEach((s) => { s.visible = s.userData.big || camera.position.distanceTo(s.position) < 85; });
      renderer.render(scene, camera);
      return true;
    };
    // for Town Story Reels: trigger effects at a film time, e.g. __play("volcano"), __playHouse(0), __grow(0), __night(true)
    window.__play = (id) => spotPlay.get(id)?.();
    window.__playHouse = (i) => playHouse(i);
    window.__grow = (i) => growHouse(i, 0);
    window.__night = (v) => { nightOn = !!v; nf = v ? 1 : 0; applyNight(); };
    window.__filmReady = true;
    return;
  }
  placeTreasure(); markMyHouse(); updateDot();
  placePip(); setView(pipMode);
  // families who moved in today pop up out of the ground
  houses.forEach((h, i) => { if (h.t === TODAY.day && !h.pending) growHouse(i, 0.8 + Math.min(i, 30) * 0.12); });
  if (!qs.get("find") && !qs.get("claim")) {
    let seenTip = false;
    try { seenTip = localStorage.getItem("pst-tip") === "1"; localStorage.setItem("pst-tip", "1"); } catch {}
    if (!seenTip) setTimeout(() => toast(pipMode ? "🤖 Tap anywhere and Pip flies there! Tap houses and buildings to play." : "👆 Tap the buildings and houses. They do things!", 5000), 1500);
    if (!foundToday()) setTimeout(() => toast("✨ Pip hid something in town today… Tap 🔎 for a hint!", 5000), seenTip ? 1800 : 6500);
  }
  if (qs.get("find")) setTimeout(() => find(qs.get("find")), 600);
  else if (qs.get("claim")) {
    // ManyChat buttons can pass the Instagram username: ?claim=their.name moves them in with no typing
    const h = norm(qs.get("claim"));
    if (h !== "1" && /^[a-z0-9._]{1,30}$/.test(h) && /[a-z]/.test(h)) claimAs(h);
    else openClaim();
  }
  if (small) { $("card").classList.add("collapsed"); $("collapse").textContent = "+"; }
})();
