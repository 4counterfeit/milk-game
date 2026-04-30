// --- COMIC BOOK UI & CUSTOM MODAL INJECTION ---
const style = document.createElement("style");
style.innerHTML = `
    @import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');

    body {
        font-family: 'Bangers', cursive;
        text-transform: uppercase;
        margin: 0;
        overflow: hidden;
    }

    /* Custom Comic Modal */
    #comic-modal-overlay {
        display: none;
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85);
        z-index: 5000;
        justify-content: center;
        align-items: center;
    }

    .comic-modal {
        background: #fff;
        border: 6px solid #000;
        padding: 30px;
        position: relative;
        max-width: 85%;
        text-align: center;
        box-shadow: 15px 15px 0px #E23636;
        transform: rotate(-1deg);
    }

    .comic-modal h2 {
        font-size: 4rem;
        color: #E23636;
        margin: 0 0 10px 0;
        -webkit-text-stroke: 1.5px black;
    }

    .comic-modal .score-text {
        font-size: 2.5rem;
        color: #000;
        margin-bottom: 20px;
    }

    .comic-modal .restart-btn {
        background: #FFCC00;
        font-family: 'Bangers', cursive;
        font-size: 2.5rem;
        padding: 10px 40px;
        border: 4px solid black;
        cursor: pointer;
        box-shadow: 5px 5px 0px black;
    }

    /* Home Screen Styles */
    #start-screen {
        background-color: #FFCC00 !important;
        background-image:
            radial-gradient(circle, rgba(0,0,0,0.1) 2px, transparent 2px),
            conic-gradient(from 0deg at 50% 50%, #FFCC00 0deg, #FFCC00 15deg, #FFD700 15deg, #FFD700 30deg);
        background-size: 20px 20px, 100% 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        z-index: 2000;
        overflow: hidden;
    }

    #start-screen::before {
        content: '';
        position: absolute;
        width: 200%; height: 200%;
        background: conic-gradient(from 0deg, #FFCC00 0%, #FFCC00 5%, #FFD700 5%, #FFD700 10%, #FFCC00 10%, #FFCC00 15%, #FFD700 15%, #FFD700 20%);
        background-repeat: repeat;
        animation: rotateBurst 60s linear infinite;
        z-index: -1;
    }

    @keyframes rotateBurst { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .epic-title {
        font-size: 8rem !important;
        color: #E23636;
        -webkit-text-stroke: 4px black;
        text-shadow: 8px 8px 0px #000;
        margin: 0; line-height: 0.8; letter-spacing: -2px;
        transform: skew(-5deg, -5deg);
        animation: titlePop 0.5s ease-out;
    }

    .epic-rules {
        background: white; color: black; padding: 20px; border: 4px solid black;
        margin-top: 30px; font-size: 1.5rem; box-shadow: 10px 10px 0px black;
        max-width: 400px; line-height: 1.2;
    }

    .epic-btn {
        margin-top: 40px; background: #E23636; color: white;
        font-family: 'Bangers', cursive; font-size: 4rem; padding: 10px 50px;
        border: 5px solid black; cursor: pointer; box-shadow: 8px 8px 0px black;
    }

    .hit-text {
        position: fixed; font-size: 5rem !important; color: #FFCC00;
        -webkit-text-stroke: 3px black; text-shadow: 6px 6px 0px #000;
        pointer-events: none; z-index: 1000;
    }

    #uiCoins {
        font-size: 3rem !important; color: #FFCC00 !important;
        -webkit-text-stroke: 2px black; text-shadow: 4px 4px 0px #000;
    }

    @keyframes titlePop {
        0% { transform: scale(0) rotate(-20deg); }
        80% { transform: scale(1.1) rotate(5deg); }
        100% { transform: scale(1) skew(-5deg, -5deg); }
    }
`;
document.head.appendChild(style);

// --- MODAL HTML INJECTION ---
const modalDiv = document.createElement("div");
modalDiv.id = "comic-modal-overlay";
modalDiv.innerHTML = `
    <div class="comic-modal">
        <h2>K.O.!</h2>
        <div class="score-text" id="modal-final-score">SCORE: 0</div>
        <button class="restart-btn" onclick="location.reload()">PLAY AGAIN</button>
    </div>
`;
document.body.appendChild(modalDiv);

// --- SETUP ---
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || "ontouchstart" in window || navigator.maxTouchPoints > 0;
const controlText = isMobileDevice ? "THRUST TO STRIKE!" : "CLICK TO STRIKE!";

const startScreenEl = document.getElementById("start-screen");
if (startScreenEl) {
    startScreenEl.innerHTML = `
        <h1 class="epic-title">3D<br>PUNCH</h1>
        <div class="epic-rules">
            <span style="color: #2979FF;">●</span> BLUE: NEUTRAL<br>
            <span style="color: #FFCC00;">●</span> YELLOW: <strong style="text-decoration: underline;">STOP!</strong><br>
            <span style="color: #E23636;">●</span> RED: <strong>COUNTER NOW!</strong><br>
            <br>
            <small style="font-size: 1rem;">${controlText}</small>
        </div>
        <button class="epic-btn" onclick="initGame()">POW!</button>
    `;
}

// --- GAME STATE VARIABLES ---
let score = 0;
let isGameOver = true;
let bagState = "neutral";
let stateTimer = 0;
let difficultyMultiplier = 1.0;
let isStumbled = false;
let bagZ = 0;
const MAX_Z = 25;
let nextPunchIsLeft = true;
let lastPunchTime = 0;
const PUNCH_COOLDOWN = 200;

const uiCoins = document.getElementById("uiCoins");
const dangerFill = document.getElementById("danger-bar-fill");

// --- THREE.JS SETUP ---
const container = document.getElementById("canvas-container");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2c3e50); 
scene.fog = new THREE.Fog(0x2c3e50, 30, 80);

const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, -2, 38);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 1);
spotLight.position.set(0, 30, 20);
spotLight.angle = Math.PI / 4;
spotLight.penumbra = 0.5;
spotLight.castShadow = true;
scene.add(spotLight);

// --- GYM ENVIRONMENT ---
const floorGeo = new THREE.PlaneGeometry(120, 120);
const floorMat = new THREE.MeshToonMaterial({ color: 0xd35400 }); 
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -15;
floor.receiveShadow = true;
scene.add(floor);

const wallGeo = new THREE.PlaneGeometry(120, 60);
const wallMat = new THREE.MeshToonMaterial({ color: 0x7f8c8d }); 
const wall = new THREE.Mesh(wallGeo, wallMat);
wall.position.set(0, 10, -30);
wall.receiveShadow = true;
scene.add(wall);

const trackGeo = new THREE.BoxGeometry(2, 0.5, 60);
const trackMat = new THREE.MeshToonMaterial({ color: 0x555555 });
const track = new THREE.Mesh(trackGeo, trackMat);
track.position.set(0, 12.5, 10);
scene.add(track);

// --- THE PUNCHING BAG ---
const pivot = new THREE.Group();
pivot.position.y = 12;
scene.add(pivot);

const ropeGeo = new THREE.CylinderGeometry(0.1, 0.1, 8, 8);
const ropeMat = new THREE.MeshToonMaterial({ color: 0x222222 });
const rope = new THREE.Mesh(ropeGeo, ropeMat);
rope.position.y = -4;
pivot.add(rope);

const bagGroup = new THREE.Group();
bagGroup.position.y = -13;
pivot.add(bagGroup);

const bagMat = new THREE.MeshToonMaterial({ color: 0x3498db });
const bodyGeo = new THREE.CylinderGeometry(3, 3, 7, 16);
const bodyMesh = new THREE.Mesh(bodyGeo, bagMat);
bodyMesh.castShadow = true;

const topHemiGeo = new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
const topHemi = new THREE.Mesh(topHemiGeo, bagMat);
topHemi.position.y = 3.5;

const botHemiGeo = new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
const botHemi = new THREE.Mesh(botHemiGeo, bagMat);
botHemi.position.y = -3.5;

bagGroup.add(bodyMesh, topHemi, botHemi);

// --- GLOVES ---
const leftGlove = new THREE.Group();
const rightGlove = new THREE.Group();
const leftRest = new THREE.Vector3(-2.8, -5.5, -10);
const rightRest = new THREE.Vector3(2.8, -5.5, -10);

leftGlove.position.copy(leftRest);
rightGlove.position.copy(rightRest);
camera.add(leftGlove);
camera.add(rightGlove);
scene.add(camera);

const leftGloveMat = new THREE.MeshToonMaterial({ color: 0xe74c3c });
const rightGloveMat = new THREE.MeshToonMaterial({ color: 0xe74c3c });

function createGloveMesh(mat, isLeft) {
  const group = new THREE.Group();
  const fist = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), mat);
  fist.scale.set(1, 1.2, 1.3);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 2, 16), mat);
  cuff.position.set(0, -2, 0);
  const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), mat);
  thumb.scale.set(1, 1.4, 1);
  thumb.position.set(isLeft ? 1.4 : -1.4, -0.2, 0.8);
  thumb.rotation.z = isLeft ? -0.4 : 0.4;
  group.add(fist, cuff, thumb);
  return group;
}

leftGlove.add(createGloveMesh(leftGloveMat, true));
rightGlove.add(createGloveMesh(rightGloveMat, false));

function handleMotion(event) {
  if (isGameOver) return;
  let accZ = event.acceleration.z;
  if (accZ === null) return;
  let now = Date.now();
  if (Math.abs(accZ) > 8) {
    if (now - lastPunchTime < PUNCH_COOLDOWN) return;
    let side = nextPunchIsLeft ? "left" : "right";
    nextPunchIsLeft = !nextPunchIsLeft;
    triggerPunchAnim(side, window.innerWidth / 2, window.innerHeight / 2);
    lastPunchTime = now;
  }
}

window.initGame = async function () {
  isGameOver = false;
  document.getElementById("start-screen").style.display = "none";
  bagZ = 0; score = 0; difficultyMultiplier = 1.0; bagState = "neutral";
  isStumbled = false; stateTimer = Date.now() + 1500;
  uiCoins.innerText = "SCORE: 0";
  updateDangerBar();

  if (isMobileDevice && typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
    try {
      const permissionState = await DeviceMotionEvent.requestPermission();
      if (permissionState === "granted") window.addEventListener("devicemotion", handleMotion);
    } catch (error) {}
  } else if (isMobileDevice) {
    window.addEventListener("devicemotion", handleMotion);
  }
};

function triggerGameOver() {
  isGameOver = true;
  window.removeEventListener("devicemotion", handleMotion);
  document.getElementById("modal-final-score").innerText = "FINAL SCORE: " + score;
  document.getElementById("comic-modal-overlay").style.display = "flex";
}

function updateDangerBar() {
  let p = (bagZ / MAX_Z) * 100;
  dangerFill.style.width = Math.min(p, 100) + "%";
  if (p > 80) dangerFill.style.background = "#E23636";
  else if (p > 50) dangerFill.style.background = "#FFCC00";
  else dangerFill.style.background = "#2ecc71";
}

function triggerPunchAnim(side, clientX, clientY) {
  if (isPunching || isStumbled) return;
  isPunching = true; punchProgress = 0;
  activeGlove = side === "left" ? leftGlove : rightGlove;
  let dynamicZTarget = -20 + bagZ;
  if (side === "left") {
    punchTarget.set(1.5, 2, dynamicZTarget);
    targetPunchRot.set(0.5, -0.5, Math.PI / 3);
    velX += 0.4; velZ -= 0.3;
  } else {
    punchTarget.set(-1.5, 2, dynamicZTarget);
    targetPunchRot.set(0.5, 0.5, -Math.PI / 3);
    velX -= 0.4; velZ -= 0.3;
  }
  setTimeout(() => checkHit(clientX, clientY), 120);
}

function checkHit(clientX, clientY) {
  if (isGameOver) return;
  scaleTarget = 0.6;
  if (bagState === "attack") {
    score++; uiCoins.innerText = "SCORE: " + score;
    bagZ -= 13; bagState = "stunned"; stateTimer = Date.now() + 600;
    bagMat.color.setHex(0xffffff);
    spawnText("BOOM!", "#FFCC00", clientX, clientY);
    difficultyMultiplier += 0.15;
  } else if (bagState === "warning") {
    bagZ += 9; isStumbled = true;
    spawnText("UGH!", "#E23636", clientX, clientY);
    setTimeout(() => (isStumbled = false), 1000);
  } else if (bagState === "neutral") {
    bagZ -= 0.5;
    spawnText("BAP", "#fff", clientX, clientY);
  } else if (bagState === "stunned") {
    bagZ -= 2;
    spawnText("WACK!", "#FFCC00", clientX, clientY);
  }
  if (bagZ < 0) bagZ = 0;
}

function spawnText(msg, color, clientX, clientY) {
  const text = document.createElement("div");
  text.className = "hit-text"; text.innerText = msg; text.style.color = color;
  const tilt = Math.random() * 40 - 20;
  text.style.transform = `rotate(${tilt}deg) scale(0.5)`;
  text.style.left = `${clientX - 50}px`; text.style.top = `${clientY - 100}px`;
  document.body.appendChild(text);
  setTimeout(() => {
    text.style.top = `${clientY - 200}px`; text.style.transform = `rotate(${tilt + 10}deg) scale(1.5)`; text.style.opacity = "0";
  }, 50);
  setTimeout(() => text.remove(), 600);
}

function manageBagAI() {
  let now = Date.now();
  if (bagState === "neutral") {
    bagZ += 0.025 * difficultyMultiplier;
    bagMat.color.setHex(0x3498db);
    if (now > stateTimer) {
      bagState = "warning"; bagMat.color.setHex(0xf1c40f);
      stateTimer = now + Math.max(350, 800 - score * 20);
    }
  } else if (bagState === "warning") {
    if (now > stateTimer) {
      bagState = "attack"; bagMat.color.setHex(0xe74c3c);
      stateTimer = now + Math.max(250, 600 - score * 15);
    }
  } else if (bagState === "attack") {
    bagZ += 0.5 * difficultyMultiplier;
    if (now > stateTimer) {
      bagState = "neutral"; stateTimer = now + 1000 + Math.random() * 2000;
    }
  } else if (bagState === "stunned") {
    if (now > stateTimer) { bagState = "neutral"; stateTimer = now + 500; }
  }
}

let velX = 0, velZ = 0, spring = 0.05, friction = 0.92, scaleTarget = 1;
let activeGlove = null, punchProgress = 0, punchTarget = new THREE.Vector3(), targetPunchRot = new THREE.Vector3(), isPunching = false;

// --- 60 FPS LOCK SYSTEM ---
let lastFrameTime = performance.now();
const FPS = 60;
const FRAME_INTERVAL = 1000 / FPS;

function animate() {
  requestAnimationFrame(animate);
  
  const now = performance.now();
  const delta = now - lastFrameTime;

  // Only run game logic if enough time has passed (locks loop to 60 FPS)
  if (delta >= FRAME_INTERVAL) {
    // Adjust lastFrameTime, retaining remainder for precision
    lastFrameTime = now - (delta % FRAME_INTERVAL);

    if (!isGameOver) {
      manageBagAI();
      pivot.position.z = bagZ; updateDangerBar();
      if (bagZ >= MAX_Z) triggerGameOver();
    }
    
    if (isPunching && activeGlove) {
      punchProgress += 0.15;
      let restPos = activeGlove === leftGlove ? leftRest : rightRest;
      if (punchProgress <= 1.0) {
        let t = Math.sin(punchProgress * Math.PI);
        activeGlove.position.lerpVectors(restPos, punchTarget, t);
        activeGlove.rotation.x = targetPunchRot.x * t;
      } else {
        activeGlove.position.copy(restPos); activeGlove.rotation.set(0, 0, 0); isPunching = false;
      }
    }
    
    velX += (0 - pivot.rotation.x) * spring; velZ += (0 - pivot.rotation.z) * spring;
    velX *= friction; velZ *= friction;
    pivot.rotation.x += velX; pivot.rotation.z += velZ;
    scaleTarget += (1 - scaleTarget) * 0.2;
    bagGroup.scale.y = scaleTarget;
    bagGroup.scale.x = 1 + (1 - scaleTarget) * 0.5;
    bagGroup.scale.z = bagGroup.scale.x;
    
    renderer.render(scene, camera);
  }
}
animate();

window.addEventListener("pointerdown", (e) => {
  if (!isGameOver && e.target.tagName !== "BUTTON" && !e.target.closest("#start-screen") && !e.target.closest(".comic-modal")) {
    triggerPunchAnim(e.clientX < window.innerWidth / 2 ? "left" : "right", e.clientX, e.clientY);
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let deferredPrompt; // This variable stores the "Install" event
const installBanner = document.getElementById('install-banner');

// 1. Listen for the event when the browser says "The app is installable"
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing automatically
    e.preventDefault();
    
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show your custom banner/button
    if (installBanner) {
        installBanner.style.display = 'block';
    }
});

// 2. Add the click listener to your custom button
installBanner.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    // Show the actual browser install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, clear it out
    deferredPrompt = null;
    
    // Hide the button
    installBanner.style.display = 'none';
});

// 3. Optional: Hide the banner if the user installs it
window.addEventListener('appinstalled', () => {
    installBanner.style.display = 'none';
    console.log('PWA was installed');
});
