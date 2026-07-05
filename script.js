// ---------- 1. Data model ----------
const MACHINE = {
  name: "ShredSteam Generator",
  subtitle: "Waste Paper → Steam → Electricity → Light",
  org: "DIY Build Project",
  stages: [
    "Container + Shredder — holds waste paper and shreds it",
    "Hopper — feeds shredded paper down",
    "Combustion Chamber — burns paper, boils water into steam",
    "Turbine — steam spins the propeller, generating electricity",
    "Output — electricity travels the wire and lights the bulb",
  ],
  howItWorks:
    "Whole waste paper is shredded, the scraps drop into the burner, the heat produces steam, the steam pressure spins a turbine, and the resulting electricity powers a light bulb.",
  buildSteps: [
    "Step 1: Build the paper container / bin to hold incoming waste paper.",
    "Step 2: Build the shredder unit beneath the bin to shred the paper.",
    "Step 3: Build the hopper / feed chute to funnel shredded paper down.",
    "Step 4: Build the sealed combustion chamber below the hopper.",
    "Step 5: Add a small water reservoir inside the chamber for steam.",
    "Step 6: Connect a pipe from the chamber to the turbine box.",
    "Step 7: Mount the 3-blade propeller/turbine inside the turbine box.",
    "Step 8: Wire the turbine's generator to the output box.",
    "Step 9: Connect the bulb to the output box and test a burn cycle.",
  ],
  parts: [
    { id: "hopper",  label: "Hopper / Feed Chute", explodeDir: [-2.2, 0.6, 0],
      description: "Feeds shredded paper down into the combustion chamber." },
    { id: "shredder", label: "Shredder Unit",      explodeDir: [-1.4, 0.4, 1.2],
      description: "Grinds whole paper into strips before it drops toward the chamber." },
    { id: "chamber", label: "Combustion Chamber",  explodeDir: [-0.8, 0, 0],
      description: "Burns the paper and boils water into pressurized steam." },
    { id: "turbine", label: "Turbine Box",         explodeDir: [0.8, 0, 0],
      description: "Steam spins the 3-blade propeller to generate electricity." },
    { id: "output",  label: "Output Box + Bulb",   explodeDir: [2.4, 0.4, 0],
      description: "Carries current through the wire to light the bulb." },
  ],
};

const PART_SPEC = Object.fromEntries(MACHINE.parts.map(p => [p.id, p]));

document.getElementById("subtitle").textContent = MACHINE.subtitle;
document.getElementById("org").textContent = MACHINE.org;
document.getElementById("stages").innerHTML = MACHINE.stages.map(s => `<li>${s}</li>`).join("");
document.getElementById("howItWorks").textContent = MACHINE.howItWorks;

// ---------- 2. Three.js scene ----------
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020617); // Matching dark slate
scene.fog = new THREE.Fog(0x020617, 12, 35);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 4, 11); // centered default position

// Lights
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

const keyLight = new THREE.PointLight(0xffdfa9, 1.5, 30);
keyLight.position.set(3, 7, 5);
keyLight.castShadow = true;
scene.add(keyLight);

const rimLight = new THREE.PointLight(0x34d399, 1.2, 25);
rimLight.position.set(-6, 3, -4);
scene.add(rimLight);

// Cool blue filler light from below
const fillLight = new THREE.DirectionalLight(0x1e3a8a, 0.6);
fillLight.position.set(0, -1, 0);
scene.add(fillLight);

// Grid & Floor
const grid = new THREE.GridHelper(24, 24, 0x10b981, 0x064e3b);
grid.position.y = 0.01;
scene.add(grid);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.85, metalness: 0.1 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);

// OrbitControls (Provided by the CDN link)
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.02; // don't go below floor
controls.minDistance = 3;
controls.maxDistance = 25;
controls.target.set(0, 1.2, 0);

// Machine group
const machineGroup = new THREE.Group();
scene.add(machineGroup);

// DOM Overlays for part labels
const labelsContainer = document.createElement("div");
labelsContainer.style.position = "absolute";
labelsContainer.style.inset = "0";
labelsContainer.style.pointerEvents = "none";
labelsContainer.style.zIndex = "10";
document.body.appendChild(labelsContainer);

function makePart(id, geometry, color, position, explodeDir, labelText = "", description = "", emissive = 0x000000) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive,
    roughness: 0.4,
    metalness: 0.35
  });
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  let labelEl = null;
  if (labelText) {
    labelEl = document.createElement("div");
    labelEl.className = "part-label-overlay";
    labelEl.innerHTML = `<div class="part-label-title">${labelText}</div>` +
      (description ? `<div class="part-label-desc">${description}</div>` : "");
    labelsContainer.appendChild(labelEl);
  }

  mesh.userData = {
    id,
    assembledPos: position.slice(),
    explodeDir,
    label: labelText,
    overlayEl: labelEl
  };
  
  machineGroup.add(mesh);
  return mesh;
}

const parts = [];

// --- Stage 1: Hopper (Custom LatheGeometry Funnel) ---
const funnelPoints = [];
funnelPoints.push(new THREE.Vector2(0.12, 0.0));  // Base inner hole radius
funnelPoints.push(new THREE.Vector2(0.12, 0.4));  // Vertical neck
funnelPoints.push(new THREE.Vector2(0.68, 1.2));  // Angled slope
funnelPoints.push(new THREE.Vector2(0.68, 1.5));  // Flanged top lip
const hopperFunnelGeo = new THREE.LatheGeometry(funnelPoints, 32);

const hopper = makePart(
  "hopper",
  hopperFunnelGeo,
  0x94a3b8, // Slate 400 (lightened)
  [-4.0, 1.6, 0],
  PART_SPEC.hopper.explodeDir,
  PART_SPEC.hopper.label,
  PART_SPEC.hopper.description
);
parts.push(hopper);

// Shredded paper pile inside hopper (modeled as a group of individual paper strips)
const paperGroup = new THREE.Group();
paperGroup.position.set(-4.0, 2.6, 0);
machineGroup.add(paperGroup);

const paperStrips = [];
const numStrips = 12;
for (let i = 0; i < numStrips; i++) {
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.015, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 })
  );
  // Distribute spherically inside top of the funnel
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * 0.45;
  strip.position.set(
    Math.cos(angle) * radius, 
    Math.random() * 0.25, 
    Math.sin(angle) * radius
  );
  strip.rotation.set(
    Math.random() * 0.5, 
    Math.random() * Math.PI, 
    Math.random() * 0.5
  );
  paperGroup.add(strip);
  paperStrips.push(strip);
}

// --- Shredder unit (sits under the funnel, shreds paper right before it drops to the chamber) ---
const shredderAssembledPos = [-4.0, 0.4, 0];
const shredderGroup = new THREE.Group();
shredderGroup.position.set(...shredderAssembledPos);

const shredderLabelEl = document.createElement("div");
shredderLabelEl.className = "part-label-overlay";
shredderLabelEl.innerHTML = `<div class="part-label-title">${PART_SPEC.shredder.label}</div>` +
  `<div class="part-label-desc">${PART_SPEC.shredder.description}</div>`;
labelsContainer.appendChild(shredderLabelEl);

shredderGroup.userData = {
  id: "shredder",
  assembledPos: shredderAssembledPos.slice(),
  explodeDir: PART_SPEC.shredder.explodeDir,
  label: PART_SPEC.shredder.label,
  overlayEl: shredderLabelEl
};
machineGroup.add(shredderGroup);
parts.push(shredderGroup);

const shredderHousing = new THREE.Mesh(
  new THREE.BoxGeometry(1.3, 0.6, 1.1),
  new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.5, metalness: 0.3 })
);
shredderHousing.castShadow = true;
shredderHousing.receiveShadow = true;
shredderGroup.add(shredderHousing);

const feedSlot = new THREE.Mesh(
  new THREE.BoxGeometry(1.0, 0.06, 0.35),
  new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 })
);
feedSlot.position.set(0, 0.3, 0);
shredderGroup.add(feedSlot);

const rollerGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.9, 6);
const rollerA = new THREE.Mesh(rollerGeo, new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.3 }));
rollerA.rotation.z = Math.PI / 2;
rollerA.position.set(-0.16, 0.18, 0);
shredderGroup.add(rollerA);

const rollerB = new THREE.Mesh(rollerGeo, new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.3 }));
rollerB.rotation.z = Math.PI / 2;
rollerB.position.set(0.16, 0.18, 0);
shredderGroup.add(rollerB);

// --- Paper container / bin (holds whole waste paper before shredding) ---
const containerAssembledPos = [-4.0, 1.15, 0];
const containerGroup = new THREE.Group();
containerGroup.position.set(...containerAssembledPos);
containerGroup.userData = { assembledPos: containerAssembledPos.slice(), explodeDir: PART_SPEC.hopper.explodeDir };
machineGroup.add(containerGroup);
parts.push(containerGroup);

const binWalls = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 0.8, 1.3),
  new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6, metalness: 0.2 })
);
binWalls.castShadow = true;
binWalls.receiveShadow = true;
containerGroup.add(binWalls);

const binCavity = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 0.5, 1.0),
  new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
);
binCavity.position.set(0, 0.2, 0);
containerGroup.add(binCavity);

// Whole (unshredded) paper sheets stacked in the open bin
for (let i = 0; i < 6; i++) {
  const sheet = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.02, 0.62),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 })
  );
  sheet.position.set((Math.random() - 0.5) * 0.25, 0.32 + i * 0.025, (Math.random() - 0.5) * 0.2);
  sheet.rotation.y = (Math.random() - 0.5) * 0.3;
  containerGroup.add(sheet);
}

// --- Stage 2: Combustion chamber ---
const chamberGeo = new THREE.BoxGeometry(1.5, 1.8, 1.3);
const chamber = makePart(
  "chamber",
  chamberGeo,
  0x475569, // Slate 600 (lightened)
  [-2.1, 0.9, 0],
  PART_SPEC.chamber.explodeDir,
  PART_SPEC.chamber.label,
  PART_SPEC.chamber.description
);
parts.push(chamber);

// External Hatch / Inspection Port on Chamber (adding geometric details)
const hatchGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.08, 16);
const hatch = makePart(
  "hatch",
  hatchGeo,
  0x94a3b8, // Slate 400 (lightened)
  [-2.1, 0.9, 0.66],
  PART_SPEC.chamber.explodeDir
);
hatch.rotation.x = Math.PI / 2;
parts.push(hatch);

// Glass Window insert inside the hatch to see the flame
const windowGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.09, 16);
const windowMesh = makePart(
  "window",
  windowGeo,
  0xba954a,
  [-2.1, 0.9, 0.675],
  PART_SPEC.chamber.explodeDir
);
windowMesh.rotation.x = Math.PI / 2;
parts.push(windowMesh);

// Internal flame glow (small emissive sphere inside the hatch window)
const flame = makePart(
  "flame",
  new THREE.SphereGeometry(0.18, 16, 16),
  0xef4444, // Red 500
  [-2.1, 0.9, 0.69],
  PART_SPEC.chamber.explodeDir,
  "",
  "",
  0xf97316 // Orange 500 emissive
);
parts.push(flame);

// Water reservoir inside the chamber, feeds the steam (plan Build Step 3)
const reservoirGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.4, 20);
const reservoir = makePart(
  "reservoir",
  reservoirGeo,
  0x0ea5e9, // Sky 500 (water)
  [-2.1, 0.35, -0.15],
  PART_SPEC.chamber.explodeDir
);
reservoir.material.transparent = true;
reservoir.material.opacity = 0.55;
reservoir.material.roughness = 0.15;
reservoir.material.metalness = 0.05;
parts.push(reservoir);

// --- Feed hose connecting the shredder outlet to the combustion chamber ---
const feedHoseCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-4.0, 0.15, 0),
  new THREE.Vector3(-3.4, 0.05, 0.25),
  new THREE.Vector3(-2.85, 0.45, 0),
]);
const feedHoseGeo = new THREE.TubeGeometry(feedHoseCurve, 24, 0.07, 10, false);
const feedHoseMat = new THREE.MeshStandardMaterial({
  color: 0x475569,
  roughness: 0.85,
  metalness: 0.1,
  emissive: 0xf59e0b, // Amber 500 — glows while paper is being fed through
  emissiveIntensity: 0
});
const feedHose = new THREE.Mesh(feedHoseGeo, feedHoseMat);
feedHose.userData = { id: "feed-hose", assembledPos: [0, 0, 0], explodeDir: [0, 0, 0] };
feedHose.castShadow = true;
feedHose.receiveShadow = true;
machineGroup.add(feedHose);
parts.push(feedHose);

// --- Pipe connecting chamber to turbine ---
const pipeCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-1.35, 1.6, 0),
  new THREE.Vector3(-0.6, 2.0, 0),
  new THREE.Vector3(0.15, 1.8, 0),
]);
const pipeGeo = new THREE.TubeGeometry(pipeCurve, 32, 0.09, 12, false);
const pipeMat = new THREE.MeshStandardMaterial({
  color: 0xcbd5e1,
  metalness: 0.8,
  roughness: 0.2,
  emissive: 0x38bdf8, // Sky 400 — glows while steam is flowing through
  emissiveIntensity: 0
});
const pipe = new THREE.Mesh(pipeGeo, pipeMat);
pipe.userData = { id: "pipe", assembledPos: [0, 0, 0], explodeDir: [0, 0, 0] };
pipe.castShadow = true;
pipe.receiveShadow = true;
machineGroup.add(pipe);
parts.push(pipe);

// --- Stage 3: Turbine box ---
const turbineGeo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
const turbineBox = makePart(
  "turbine",
  turbineGeo,
  0x475569, // Slate 600 (lightened)
  [0.8, 1.1, 0],
  PART_SPEC.turbine.explodeDir,
  PART_SPEC.turbine.label,
  PART_SPEC.turbine.description
);
parts.push(turbineBox);

// Propeller inside a window on the Turbine Box front face
const propellerFrontGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.08, 24);
const propWindow = makePart(
  "prop-window",
  propellerFrontGeo,
  0xcbd5e1, // Slate 300 (lightened)
  [0.8, 1.1, 0.72],
  PART_SPEC.turbine.explodeDir
);
propWindow.rotation.x = Math.PI / 2;
parts.push(propWindow);

// Rotate logic for turbine propeller
const propGroup = new THREE.Group();
propGroup.position.set(0.8, 1.1, 0.76);
propGroup.userData = { id: "propeller", assembledPos: [0.8, 1.1, 0.76], explodeDir: PART_SPEC.turbine.explodeDir };

// Hub
const hub = new THREE.Mesh(
  new THREE.CylinderGeometry(0.1, 0.1, 0.08, 16),
  new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9 })
);
hub.rotation.x = Math.PI / 2;
propGroup.add(hub);

// 3 Blades
for (let i = 0; i < 3; i++) {
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.08, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.8, roughness: 0.3 })
  );
  blade.position.y = 0.22;
  const holder = new THREE.Group();
  holder.add(blade);
  holder.rotation.z = (i * Math.PI * 2) / 3;
  propGroup.add(holder);
}
machineGroup.add(propGroup);
parts.push(propGroup);

// --- Wire from turbine to output box ---
const wireCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(1.5, 0.9, 0),
  new THREE.Vector3(2.35, 0.5, 0.35),
  new THREE.Vector3(3.0, 0.45, 0),
]);
const wireGeo = new THREE.TubeGeometry(wireCurve, 20, 0.04, 8, false);
const wireMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
const wire = new THREE.Mesh(wireGeo, wireMat);
wire.userData = { id: "wire", assembledPos: [0, 0, 0], explodeDir: [0, 0, 0] };
machineGroup.add(wire);
parts.push(wire);

// --- Stage 4: Output box + bulb ---
const outputBoxGeo = new THREE.BoxGeometry(1.1, 1.0, 1.1);
const outputBox = makePart(
  "output",
  outputBoxGeo,
  0x475569, // Slate 600 (lightened)
  [3.5, 0.5, 0],
  PART_SPEC.output.explodeDir,
  PART_SPEC.output.label,
  PART_SPEC.output.description
);
parts.push(outputBox);

// Bulb Socket
const socketGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.15, 16);
const socket = makePart(
  "socket",
  socketGeo,
  0xd97706, // Amber socket
  [3.5, 1.05, 0],
  PART_SPEC.output.explodeDir
);
parts.push(socket);

// Glowing Bulb Glass Sphere
const bulbGlass = makePart(
  "bulb-glass",
  new THREE.SphereGeometry(0.22, 24, 24),
  0x020617,
  [3.5, 1.25, 0],
  PART_SPEC.output.explodeDir,
  "Light Bulb",
  "Glows brighter as electricity flows in from the turbine.",
  0x000000
);
parts.push(bulbGlass);

const bulbLight = new THREE.PointLight(0xf59e0b, 0, 8);
bulbLight.position.set(3.5, 1.25, 0);
machineGroup.add(bulbLight);

// ---------- 3. Dynamic Interactive Animations -----------
let dropStrips = []; // array of paper active in feed cycle
function clearFallingStrips() {
  dropStrips.forEach(s => machineGroup.remove(s));
  dropStrips = [];
}

// Function to feed drop strip
function spawnFeedStrip() {
  if (fuelLevel <= 0) return;
  
  // Create a paper fragment dropping visually
  const s = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.015, 0.08),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9 })
  );
  s.position.set(-4.0, 0.1, 0); // start just below the shredder
  s.userData = {
    velY: -0.05,
    rotX: Math.random() * 0.1,
    rotY: Math.random() * 0.1,
    progress: 0
  };
  machineGroup.add(s);
  dropStrips.push(s);
}

let feedSheets = []; // whole paper sheets falling into the funnel's mouth
function clearFeedSheets() {
  feedSheets.forEach(s => machineGroup.remove(s));
  feedSheets = [];
}

// Function to feed a whole paper sheet into the funnel
function spawnFeedSheet() {
  if (fuelLevel <= 0) return;

  const sheet = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.02, 0.45),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85 })
  );
  sheet.position.set(-4.0, 4.0, 0); // start above the funnel's open mouth
  sheet.rotation.y = Math.random() * Math.PI;
  sheet.userData = {
    velY: -0.045,
    rotX: (Math.random() - 0.5) * 0.08,
  };
  machineGroup.add(sheet);
  feedSheets.push(sheet);
}

// ---------- 4. Interaction state ----------
let rotating = false;
let exploded = false;
let isDay = true;
let burnCount = 0;
let buildIndex = 0;
let fuelLevel = 100;

let steamPulse = 0;
let bulbPulse = 0;
let spinBoost = 0;
let spinSpeed = 0.02;
let shredderBoost = 0;
let shredderSpeed = 0.015;

const bars = {
  fuel: document.getElementById("bar-fuel"),
  steam: document.getElementById("bar-steam"),
  bulb: document.getElementById("bar-bulb"),
};
const burnCountEl = document.getElementById("burnCount");
const buildCaptionEl = document.getElementById("buildCaption");

function setBar(el, pct) {
  el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}
setBar(bars.fuel, fuelLevel);

// ---------- 5. Controls ----------
document.getElementById("btnRotate").addEventListener("click", () => {
  rotating = !rotating;
});

document.getElementById("btnExplode").addEventListener("click", (e) => {
  exploded = !exploded;
  e.target.textContent = exploded ? "🧲 Collapse" : "💥 Explode";
  parts.forEach(p => {
    if (p.userData.explodeDir.every(v => v === 0)) return; // skip pipe/wire
    const target = exploded
      ? p.userData.assembledPos.map((v, i) => v + p.userData.explodeDir[i])
      : p.userData.assembledPos;
    p.userData.animTarget = target;
  });
});

let steamParticles = [];
function spawnSteamParticles() {
  for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.8 })
    );
    // start at combustion end pipe inlet
    p.position.set(-1.35 + Math.random() * 0.1, 1.6 + Math.random() * 0.1, (Math.random() - 0.5) * 0.2);
    p.userData = {
      progress: 0,
      speed: 0.02 + Math.random() * 0.015,
      randomOffset: new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
      )
    };
    machineGroup.add(p);
    steamParticles.push(p);
  }
}

document.getElementById("btnBurn").addEventListener("click", () => {
  if (fuelLevel <= 0) return;
  
  burnCount++;
  burnCountEl.textContent = burnCount;
  
  // Trigger animations
  spawnFeedSheet();
  spawnFeedStrip();
  shredderBoost = 1.2;

  fuelLevel = Math.max(0, fuelLevel - 10);
  setBar(bars.fuel, fuelLevel);
  // Scale down the remaining heap of paper scraps
  const scalePct = fuelLevel / 100;
  paperGroup.scale.set(scalePct, scalePct, scalePct);
  
  // Set timers to trigger burner, steam, and electricity stages sequence
  setTimeout(() => {
    // Stage 2: Combustion Chamber glows
    steamPulse = 100;
    
    // Smoke/Steam Spawns
    spawnSteamParticles();
    
    setTimeout(() => {
      // Stage 3: Turbine Spin boost
      spinBoost = 1.35;
      
      setTimeout(() => {
        // Stage 4: Lightbulb flares
        bulbPulse = 100;
      }, 350);
      
    }, 280);
    
  }, 250);
});

document.getElementById("btnDayNight").addEventListener("click", (e) => {
  isDay = !isDay;
  e.target.textContent = isDay ? "☀️ Day" : "🌙 Night";
  keyLight.intensity = isDay ? 1.5 : 0.22;
  rimLight.intensity = isDay ? 1.2 : 2.0;
  ambient.intensity = isDay ? 0.35 : 0.12;
  scene.background = new THREE.Color(isDay ? 0x020617 : 0x000207);
});

document.getElementById("btnNextPart").addEventListener("click", () => {
  buildCaptionEl.textContent = MACHINE.buildSteps[buildIndex];
  buildIndex = (buildIndex + 1) % MACHINE.buildSteps.length;
});

document.getElementById("btnReset").addEventListener("click", () => {
  exploded = false;
  rotating = false;
  document.getElementById("btnExplode").textContent = "💥 Explode";
  burnCount = 0;
  fuelLevel = 100;
  buildIndex = 0;
  burnCountEl.textContent = 0;
  buildCaptionEl.innerHTML = "";
  setBar(bars.fuel, fuelLevel);
  setBar(bars.steam, 0);
  setBar(bars.bulb, 0);
  clearFallingStrips();
  clearFeedSheets();

  // Clean steam
  steamParticles.forEach(p => machineGroup.remove(p));
  steamParticles = [];
  
  // Reset targets
  parts.forEach(p => {
    if (p.userData.explodeDir.every(v => v === 0)) return;
    p.userData.animTarget = p.userData.assembledPos;
  });
  
  // Reset rot
  machineGroup.rotation.y = 0;
  paperGroup.scale.set(1, 1, 1);
  
  // Reset controls
  controls.reset();
  camera.position.set(0, 4, 11);
});

// ---------- 6. Render loop ----------
const tempV = new THREE.Vector3();
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (rotating) machineGroup.rotation.y += 0.008;

  // Ease parts toward explode/assemble targets
  parts.forEach(p => {
    if (p.userData.animTarget) {
      p.position.x += (p.userData.animTarget[0] - p.position.x) * 10 * delta;
      p.position.y += (p.userData.animTarget[1] - p.position.y) * 10 * delta;
      p.position.z += (p.userData.animTarget[2] - p.position.z) * 10 * delta;
    }
  });

  // Project exploded state overlay labels
  parts.forEach(p => {
    const labelEl = p.userData.overlayEl;
    if (labelEl) {
      if (exploded) {
        tempV.setFromMatrixPosition(p.matrixWorld);
        tempV.project(camera);
        
        // Transform NDC to screenspace coord window
        const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        const y = -(tempV.y * 0.5 - 0.5) * window.innerHeight;
        
        labelEl.style.left = `${x}px`;
        labelEl.style.top = `${y - 30}px`;
        
        // Only visible when in front of camera
        if (tempV.z <= 1.0) {
          labelEl.classList.add("visible");
        } else {
          labelEl.classList.remove("visible");
        }
      } else {
        labelEl.classList.remove("visible");
      }
    }
  });

  // combustion/flame flicker
  const flicker = 0.55 + Math.random() * 0.45;
  flame.material.emissiveIntensity = flicker * (steamPulse / 100 + 0.2);
  flame.scale.setScalar(0.9 + Math.random() * 0.25);

  // paper strip animation dropping
  for (let i = dropStrips.length - 1; i >= 0; i--) {
    const s = dropStrips[i];
    s.position.y += s.userData.velY;
    s.rotation.x += s.userData.rotX;
    s.rotation.y += s.userData.rotY;
    
    // hit burning height
    if (s.position.y <= -0.3) {
      machineGroup.remove(s);
      dropStrips.splice(i, 1);
    }
  }

  // whole paper sheets falling into the funnel's mouth
  for (let i = feedSheets.length - 1; i >= 0; i--) {
    const s = feedSheets[i];
    s.position.y += s.userData.velY;
    s.rotation.x += s.userData.rotX;

    // sinks into the funnel opening
    if (s.position.y <= 3.0) {
      machineGroup.remove(s);
      feedSheets.splice(i, 1);
    }
  }

  // steam pressure decay
  if (steamPulse > 0) {
    steamPulse -= 16 * delta;
    setBar(bars.steam, Math.max(0, steamPulse));
  }
  // steam pipe glows brighter the harder steam is flowing through it
  pipeMat.emissiveIntensity = (Math.max(0, steamPulse) / 100) * 1.6;

  // propeller spin speed adjustment
  if (spinBoost > 0) { 
    spinBoost -= 0.65 * delta; 
  }
  propGroup.rotation.z += (spinSpeed + Math.max(0, spinBoost)) * 80 * delta;

  // shredder roller spin (idle grind + boosted spin after Feed & Burn)
  if (shredderBoost > 0) {
    shredderBoost -= 0.8 * delta;
  }
  const shredderRate = (shredderSpeed + Math.max(0, shredderBoost)) * 80 * delta;
  rollerA.rotation.x += shredderRate;
  rollerB.rotation.x -= shredderRate;

  // feed hose glows brighter while freshly-shredded paper is being fed through
  feedHoseMat.emissiveIntensity = (Math.max(0, shredderBoost) / 1.2) * 1.3;

  // bulb brightness decay
  if (bulbPulse > 0) { 
    bulbPulse -= 20 * delta; 
    setBar(bars.bulb, Math.max(0, bulbPulse)); 
  }
  bulbLight.intensity = (Math.max(0, bulbPulse) / 100) * 8;
  const colVal = Math.max(0, bulbPulse) / 100;
  bulbGlass.material.emissive.setRGB(colVal, colVal * 0.82, colVal * 0.35);
  bulbGlass.material.emissiveIntensity = colVal * 8;

  // Steam particles traveling in pipe mapping curve
  for (let i = steamParticles.length - 1; i >= 0; i--) {
    const p = steamParticles[i];
    p.userData.progress += p.userData.speed;
    
    if (p.userData.progress >= 1.0) {
      machineGroup.remove(p);
      steamParticles.splice(i, 1);
    } else {
      // Get point along spline tube mapping
      const pt = pipeCurve.getPointAt(p.userData.progress);
      p.position.copy(pt).add(p.userData.randomOffset);
      p.material.opacity = (1.0 - p.userData.progress) * 0.9;
    }
  }

  controls.update();
  renderer.render(scene, camera);
}
animate();

// ---------- 7. Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
