import * as THREE from "three";
import { MapControls } from "three/addons/controls/MapControls.js";

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
  let r = 1;
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
    part("x", "box", "#bde7ff", [-1.05, 1.1, 1.5], [0.7, 0.7, 0.12]),
    part("x", "box", "#bde7ff", [1.05, 1.1, 1.5], [0.7, 0.7, 0.12]),
    part("x", "box", "#efe2c4", [0, 0, 1.6], [0.9, 0.06, 1.3]),
  ];
  const gx = 2.15, gz = 1.6;
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
  return P;
}

// ---------- instanced batches ----------
class Batcher {
  constructor() { this.groups = new Map(); }
  add(p, world, tag) {
    const key = `${p.k}|${p.g}`;
    if (!this.groups.has(key)) this.groups.set(key, { k: p.k, g: p.g, items: [] });
    this.groups.get(key).items.push({ m: new THREE.Matrix4().multiplyMatrices(world, p.m), c: p.c, tag });
  }
  build(scene) {
    const meshes = [];
    for (const { k, g, items } of this.groups.values()) {
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: g === "roof" });
      const mesh = new THREE.InstancedMesh(G[g], mat, items.length);
      const col = new THREE.Color();
      items.forEach((it, i) => { mesh.setMatrixAt(i, it.m); mesh.setColorAt(i, col.set(it.c)); });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData = { kind: k, tags: items.map((it) => it.tag) };
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

scene.add(new THREE.HemisphereLight("#ffffff", "#9bd18b", 1.15));
const sun = new THREE.DirectionalLight("#fff4dc", 1.9);
sun.castShadow = true;
sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

const anim = []; // per-frame callbacks

// ---------- spots (science buildings) ----------
function scaffold(g) {
  for (const [x, z] of [[-6, -3], [6, -3], [-6, 3], [6, 3]]) g.add(mesh("box", C.orange, [x, 0, z], [0.4, 7, 0.4]));
  g.add(mesh("box", "#f2c48d", [0, 3.4, 0], [12.6, 0.3, 6.6]));
  g.add(mesh("box", "#f2c48d", [0, 6.8, 0], [12.6, 0.3, 6.6]));
  g.add(mesh("box", "#d9d2c3", [0, 0, 0], [9, 2.2, 4.5]));
  const cone = (x) => g.add(mesh("cone", C.orange, [x, 0, 5.2], [0.8, 1.3, 0.8]));
  cone(-4); cone(4);
}
function buildSpot(s, open) {
  const g = new THREE.Group();
  const c = blockCenter(...s.b);
  g.position.copy(c);
  g.add(mesh("box", "#e9dcc0", [0, 0, 0], [BW, 0.42, BD]));
  if (!open) { scaffold(g); }
  else if (s.id === "pip") {
    g.add(mesh("cyl", C.cream, [6, 0, -1], [7, 11, 7]));
    g.add(mesh("cyl", C.coral, [6, 9, -1], [7.3, 1, 7.3]));
    g.add(mesh("ball", C.teal, [6, 11, -1], [7, 7, 7]));
    g.add(mesh("cyl", C.ink, [6, 14, -1], [0.25, 3, 0.25]));
    const bulb = mesh("ball", C.sun, [6, 17.3, -1], [1.1, 1.1, 1.1], [0, 0, 0], { emissive: C.sun, emissiveIntensity: 0.6 });
    g.add(bulb);
    anim.push((t) => (bulb.material.emissiveIntensity = 0.4 + 0.4 * Math.sin(t * 3)));
    g.add(mesh("box", "#7a5534", [6, 0, 2.5], [2, 3, 0.4]));
    // Pip statue
    const pip = new THREE.Group();
    pip.position.set(-6, 0, 0.5);
    pip.add(mesh("cyl", "#d9d2c3", [0, 0, 0], [4, 1.2, 4]));
    pip.add(mesh("box", C.teal, [0, 1.2, 0], [2.4, 2.6, 1.8]));
    pip.add(mesh("box", C.white, [0, 3.9, 0], [3.2, 2.4, 2.4]));
    pip.add(mesh("ball", C.ink, [-0.65, 5.1, 1.2], [0.6, 0.6, 0.3]));
    pip.add(mesh("ball", C.ink, [0.65, 5.1, 1.2], [0.6, 0.6, 0.3]));
    pip.add(mesh("box", C.coral, [0, 4.4, 1.2], [1, 0.2, 0.1]));
    pip.add(mesh("cyl", C.ink, [0, 6.3, 0], [0.15, 1, 0.15]));
    pip.add(mesh("ball", C.coral, [0, 7.4, 0], [0.6, 0.6, 0.6]));
    pip.add(mesh("box", C.teal, [-1.6, 2.6, 0], [0.5, 1.6, 0.5], [0, 0, 0.5]));
    pip.add(mesh("box", C.teal, [1.6, 2.6, 0], [0.5, 1.6, 0.5], [0, 0, -0.5]));
    g.add(pip);
    anim.push((t) => (pip.children.slice(1).forEach((m) => (m.position.y += Math.sin(t * 2.4) * 0.004))));
    for (const x of [-11, 11]) g.add(mesh("ball", "#5cb85c", [x, 1.5, -4], [2.4, 2.8, 2.4]));
  } else if (s.id === "volcano") {
    g.add(mesh("cone", "#8d6748", [0, 0, -1], [13, 7, 10]));
    g.add(mesh("cyl", C.coral, [0, 6.3, -1], [2.6, 0.5, 2.1], [0, 0, 0], { emissive: C.coral, emissiveIntensity: 0.5 }));
    const puffs = [0, 1, 2].map((i) => { const p = mesh("ball", "#eeeeee", [0, 8, -1], [1.6, 1.6, 1.6]); g.add(p); return p; });
    anim.push((t) => puffs.forEach((p, i) => { const k = (t * 0.35 + i / 3) % 1; p.position.y = 7.5 + k * 7; p.position.x = Math.sin(k * 6 + i) * 1.2; p.scale.setScalar(1 + k * 2.2); p.material.opacity = 1 - k; p.material.transparent = true; }));
    g.add(mesh("box", C.cream, [8, 0, 3], [5, 3, 3]));
  } else if (s.id === "aquarium") {
    g.add(mesh("cyl", C.cream, [0, 0, 0], [16, 1.4, 10]));
    g.add(mesh("ball", C.sky, [0, 1.4, 0], [14, 10, 9], [0, 0, 0], { transparent: true, opacity: 0.45 }));
    const fish = [0, 1, 2, 3].map((i) => { const f = mesh("box", [C.orange, C.coral, C.sun, C.grape][i], [0, 3 + i, 0], [1.2, 0.6, 0.3]); g.add(f); return f; });
    anim.push((t) => fish.forEach((f, i) => { const a = t * (0.6 + i * 0.15) + i; f.position.x = Math.cos(a) * (3 + i); f.position.z = Math.sin(a) * 2; f.rotation.y = -a; }));
  } else if (s.id === "weather") {
    g.add(mesh("box", C.cream, [0, 0, 0], [5, 3, 5]));
    g.add(mesh("cyl", C.white, [0, 3, 0], [1.4, 12, 1.4]));
    const spin = new THREE.Group(); spin.position.set(0, 15.5, 0);
    for (let i = 0; i < 3; i++) { const a = mesh("box", C.ink, [0, 0, 0], [3, 0.15, 0.15]); a.rotation.y = (i * Math.PI * 2) / 3; a.position.set(Math.cos(a.rotation.y) * 1.5, 0, -Math.sin(a.rotation.y) * 1.5); spin.add(a); const cup = mesh("ball", C.coral, [Math.cos(a.rotation.y) * 3, 0, -Math.sin(a.rotation.y) * 3], [0.8, 0.8, 0.8]); spin.add(cup); }
    g.add(spin); anim.push((t) => (spin.rotation.y = t * 2));
    for (const [x, y] of [[-5, 18], [-3, 19], [-1, 18]]) g.add(mesh("ball", C.white, [x, y, 0], [3, 2.4, 2.4]));
  } else if (s.id === "planetarium") {
    g.add(mesh("box", C.cream, [0, 0, 0], [14, 4, 8]));
    g.add(mesh("ball", C.grape, [0, 4, 0], [10, 8, 7]));
    const sat = new THREE.Group(); sat.position.set(8, 11, 0);
    sat.add(mesh("ball", C.sun, [0, 0, 0], [3, 3, 3]));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.25, 8, 40), mat(C.orange)); ring.rotation.x = 1.2; sat.add(ring);
    g.add(sat); anim.push((t) => (sat.rotation.y = t * 0.5));
  } else if (s.id === "dino") {
    g.add(mesh("box", C.cream, [0, 0, -1.5], [16, 5, 6]));
    g.add(mesh("box", C.coral, [0, 5, -1.5], [17, 0.8, 7]));
    for (const x of [-6, -2, 2, 6]) g.add(mesh("cyl", C.white, [x, 0, 2], [0.8, 5, 0.8]));
    const d = new THREE.Group(); d.position.set(0, 0, 4.5); d.scale.setScalar(0.8);
    d.add(mesh("ball", C.teal, [0, 3, 0], [6, 3.4, 3]));
    for (const [x, z] of [[-1.8, -0.8], [-1.8, 0.8], [1.8, -0.8], [1.8, 0.8]]) d.add(mesh("cyl", C.teal, [x, 0, z], [0.8, 2.4, 0.8]));
    d.add(mesh("cyl", C.teal, [3.6, 3.6, 0], [0.9, 4.5, 0.9], [0, 0, -0.5]));
    d.add(mesh("ball", C.teal, [5.6, 7.6, 0], [1.6, 1.1, 1.1]));
    d.add(mesh("cone", C.teal, [-4.2, 2.6, 0], [1.4, 4, 1.4], [0, 0, 1.75]));
    g.add(d);
  } else if (s.id === "rocket") {
    g.add(mesh("cyl", "#9aa0ad", [0, 0, 0], [12, 1, 9]));
    g.add(mesh("cyl", C.white, [0, 1, 0], [3, 12, 3]));
    g.add(mesh("cone", C.coral, [0, 13, 0], [3, 4, 3]));
    for (const r of [0, Math.PI / 2]) g.add(mesh("box", C.grape, [0, 1, 0], [6, 3, 0.3], [0, r, 0]));
    g.add(mesh("box", C.orange, [5, 1, 0], [0.6, 10, 0.6]));
  }
  const lb = label(`${s.e} ${s.name}`, { bg: open ? C.sun : "#ffe2c2", size: 1.25 });
  lb.position.set(0, open ? (s.id === "pip" ? 19 : 15) : 9.5, 0);
  g.add(lb);
  if (!open) { const sign = label(`Opens at ${s.at} families`, { bg: C.white, size: 0.9 }); sign.position.set(0, 7.6, 0); g.add(sign); }
  g.traverse((o) => (o.userData.spot = s));
  scene.add(g);
  return g;
}

// ---------- town ----------
const state = { houses: [], lots: [], byHandle: new Map(), meshes: [], labels: new Map(), extent: 60, spotGroups: [] };
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
  state.meshes = B.build(scene);

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
  const s = label(`@${h.h}`, { bg: big ? C.sun : C.white, size: big ? 0.8 : 0.55 });
  s.position.set(lot.x, 5.6, lot.z);
  s.userData.big = big;
  scene.add(s);
  state.labels.set(i, s);
  return s;
}

// ---------- camera fly ----------
let fly = null;
function flyTo(target, dist = 38) {
  const from = { p: camera.position.clone(), t: controls.target.clone() };
  target = target.clone().setY(2);
  // look from the outside of town, fairly steep, so Pip's Lab never blocks the view
  const out = new THREE.Vector3(target.x, 0, target.z);
  if (out.length() < 1) out.set(0.5, 0, 0.9);
  out.normalize();
  const to = { t: target.clone(), p: target.clone().add(new THREE.Vector3(out.x * dist * 0.6, dist * 0.95, out.z * dist * 0.6)) };
  fly = { from, to, t0: performance.now(), dur: 1300 };
}

// ---------- marker for a found house ----------
const marker = new THREE.Group();
marker.add(mesh("cone", C.coral, [0, 0, 0], [1.6, 2.2, 1.6], [Math.PI, 0, 0]));
marker.visible = false;
scene.add(marker);
anim.push((t) => { if (marker.visible) { marker.position.y = 10 + Math.sin(t * 4) * 0.8; marker.rotation.y = t * 2; } });

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

function showHouse(i) {
  const h = state.houses[i], d = designFor(h), lot = state.lots[i];
  showLabel(i, true);
  marker.position.set(lot.x, 10, lot.z); marker.visible = true;
  flyTo(new THREE.Vector3(lot.x, 0, lot.z));
  const g = GADGETS[d.g], p = PETS[d.p];
  const welcome = h.pending && new URLSearchParams(location.search).get("new") === "1";
  if (welcome) confetti();
  info(`${welcome ? "<h3>🎉 Welcome to Pip's Science Town!</h3>" : ""}<h3>🏡 @${h.h}</h3>
    <p><b>House #${(i + 1).toLocaleString()}</b> on <b>${streetOf(lot)}</b></p>
    ${h.pending ? `<p><span class="tag">⚒️ moving in</span> Builders are finishing it. It shows up for everyone within a day.</p>` : `<p>Moved in: ${h.t || "recently"}</p>`}
    <p>Science gadget: ${g.n} ${g.e !== "–" ? g.e : ""}${d.p ? `<br>Pet: ${p.n} ${p.e}` : ""}</p>
    <div class="row"><button class="soft" id="storyHouse">📲 Share my house</button><button class="soft" id="shareHouse">🔗 Copy link</button></div>
    <p class="tiny">Tip: add the link to your Instagram story with the 🔗 Link sticker so friends can visit!</p>`);
  const link = `${location.origin}${location.pathname}?find=${encodeURIComponent(h.h)}`;
  $("shareHouse").onclick = () => copy(link, "Link copied! Add it to your story with the Link sticker 💛");
  $("storyHouse").onclick = async () => {
    if (navigator.share) { try { await navigator.share({ title: "My house in Pip's Science Town", text: `Come visit our house #${i + 1} on ${streetOf(lot)} in Pip's Science Town! 🏡🔬`, url: link }); return; } catch {} }
    copy(link, "Link copied! Add it to your story with the Link sticker 💛");
  };
  history.replaceState(null, "", `?find=${encodeURIComponent(h.h)}`);
}
function showSpot(s) {
  const n = state.houses.length, open = n >= s.at;
  const grp = state.spotGroups[SPOTS.indexOf(s)];
  flyTo(grp.position.clone(), 55);
  marker.visible = false;
  info(`<h3>${s.e} ${s.name}</h3>
    <p>${open ? '<span class="tag open">Open!</span>' : `<span class="tag">Opens at ${s.at} families · ${s.at - n} to go</span>`}</p>
    ${open ? `<p><b>Try this at home:</b> ${s.act}</p>` : `<p>Every family that moves in brings this closer. Share the town with a friend! 💛</p>`}`);
}
$("buildingsBtn").onclick = () => {
  const n = state.houses.length;
  const ul = document.createElement("div");
  ul.innerHTML = `<h2>🔬 Science spots</h2><p class="tiny">New buildings open as more families move in. Each one has a free activity to try at home.</p><ul class="spots">${SPOTS.map((s, i) => `<li><span class="em">${s.e}</span><span class="t"><b>${s.name}</b><span>${n >= s.at ? "Open! Tap to visit" : `Opens at ${s.at} families`}</span></span><button data-spot="${i}">Visit</button></li>`).join("")}</ul>`;
  ul.addEventListener("click", (e) => { const b = e.target.closest("[data-spot]"); if (b) { closeModal(); showSpot(SPOTS[+b.dataset.spot]); } });
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
    if (!state.byHandle.has(h)) {
      let d = "";
      try { d = localStorage.getItem("pst-design") || ""; } catch {}
      try { localStorage.setItem(CLAIM_KEY, JSON.stringify({ h, d, t: new Date().toISOString().slice(0, 10) })); } catch {}
    }
    location.replace(`${location.pathname}?find=${encodeURIComponent(h)}&new=1`);
  };
  el.querySelector("#claimForm").onsubmit = go;
  el.querySelector("#claimGo").onclick = go;
  setTimeout(() => el.querySelector("#claimInput").focus(), 50);
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

// ---------- picking ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const targets = [...state.meshes.filter((m) => m.userData.kind === "wall" || m.userData.kind === "roof"), ...state.spotGroups];
  const hit = ray.intersectObjects(targets, true)[0];
  if (!hit) return;
  if (hit.object.userData.spot) return showSpot(hit.object.userData.spot);
  const tag = hit.object.userData.tags?.[hit.instanceId];
  if (tag !== undefined) showHouse(tag);
});

// ---------- loop ----------
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const clock = new THREE.Clock();
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  if (fly) {
    const k = Math.min(1, (performance.now() - fly.t0) / fly.dur), e = ease(k);
    camera.position.lerpVectors(fly.from.p, fly.to.p, e);
    controls.target.lerpVectors(fly.from.t, fly.to.t, e);
    if (k >= 1) fly = null;
  }
  for (const f of anim) f(t, dt);
  controls.update();
  renderer.render(scene, camera);
});

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
    document.body.classList.add("film");
    renderer.setAnimationLoop(null);
    if (qs.get("you")) showLabel(0, true);
    window.__state = state;
    window.__film = (t, pos, tgt) => {
      camera.position.set(...pos); controls.target.set(...tgt); camera.lookAt(controls.target);
      for (const f of anim) f(t, 1 / 30);
      state.labels.forEach((s) => { s.visible = s.userData.big || camera.position.distanceTo(s.position) < 85; });
      renderer.render(scene, camera);
      return true;
    };
    window.__filmReady = true;
    return;
  }
  if (qs.get("find")) setTimeout(() => find(qs.get("find")), 600);
  else if (qs.get("claim")) openClaim();
  if (small) { $("card").classList.add("collapsed"); $("collapse").textContent = "+"; }
})();
