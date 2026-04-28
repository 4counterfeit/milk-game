// --- CARTOONY UI INJECTION ---
document.body.style.fontFamily = "'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', sans-serif";
const style = document.createElement('style');
style.innerHTML = `
    .hit-text {
        position: fixed;
        font-weight: 900 !important;
        font-size: 3.5rem !important;
        text-transform: uppercase;
        text-shadow: 3px 3px 0px #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000 !important; /* Thick black outline */
        pointer-events: none;
        z-index: 1000;
        transition: top 0.6s ease-out, opacity 0.6s;
    }
    #danger-bar {
        border: 4px solid #000 !important; /* Thick cartoony border */
        border-radius: 10px !important;
        box-shadow: 4px 4px 0px #000 !important;
    }
    #uiCoins, #start-screen p, #game-over-screen h1 {
        text-shadow: 2px 2px 0px #000 !important;
        letter-spacing: 2px;
    }
`;
document.head.appendChild(style);

// --- GAME STATE VARIABLES ---
let score = 0;
let isGameOver = true;

// Skill-Based Mechanics
let bagState = "neutral"; // states: neutral, warning, attack, stunned
let stateTimer = 0;
let difficultyMultiplier = 1.0;
let isStumbled = false; // Anti-spam penalty state

// Tug-of-war mechanics
let bagZ = 0; 
const MAX_Z = 25; 

// Motion Control State
let nextPunchIsLeft = true;
let lastPunchTime = 0;
const PUNCH_COOLDOWN = 200; 

// DOM Elements
const uiCoins = document.getElementById("uiCoins"); 
const dangerFill = document.getElementById("danger-bar-fill");
const shopBtn = document.getElementById("shop-btn"); 
const startScreenText = document.querySelector("#start-screen p");

// --- UI SETUP ---
if (shopBtn) shopBtn.style.display = "none";

const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

if (isMobileDevice) {
    startScreenText.innerHTML = `The bag will charge at you.<br><strong style="color: #f1c40f;">Thrust forward to punch.<br>Wait for RED to Counter! Do NOT punch on Yellow!</strong>`;
} else {
    startScreenText.innerHTML = `The bag will charge at you.<br><strong style="color: #f1c40f;">Click to punch.<br>Wait for RED to Counter! Do NOT punch on Yellow!</strong>`;
}

// --- THREE.JS SETUP (Cartoony Colors) ---
const container = document.getElementById("canvas-container");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Bright Sky Blue
scene.fog = new THREE.Fog(0x87CEEB, 30, 80);

const camera = new THREE.PerspectiveCamera(85, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, -2, 38); 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Brighter ambient
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 1.5);
spotLight.position.set(0, 40, 20);
spotLight.angle = Math.PI / 4;
spotLight.penumbra = 0.2; // Sharper shadows for toon look
spotLight.castShadow = true;
scene.add(spotLight);

// --- GYM ENVIRONMENT ---
const floorGeo = new THREE.PlaneGeometry(120, 120);
const floorMat = new THREE.MeshToonMaterial({ color: 0x2ecc71 }); // Bright Green Floor
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -15;
floor.receiveShadow = true;
scene.add(floor);

const wallGeo = new THREE.PlaneGeometry(120, 60);
const wallMat = new THREE.MeshToonMaterial({ color: 0xf39c12 }); // Vibrant Orange Wall
const wall = new THREE.Mesh(wallGeo, wallMat);
wall.position.set(0, 10, -30);
wall.receiveShadow = true;
scene.add(wall);

const trackGeo = new THREE.BoxGeometry(2, 0.5, 60);
const trackMat = new THREE.MeshToonMaterial({ color: 0x2c3e50 });
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

const bagMat = new THREE.MeshToonMaterial({ color: 0x3498db }); // Bright Blue Bag
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

// --- WEAPON MODELS ---
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

// --- PHYSICS & ANIMATION ---
let velX = 0, velZ = 0, spring = 0.05, friction = 0.92, scaleTarget = 1;
let activeGlove = null, punchProgress = 0, punchTarget = new THREE.Vector3(), targetPunchRot = new THREE.Vector3(), isPunching = false;

// --- MOTION CONTROL LOGIC ---
function handleMotion(event) {
    if (isGameOver) return;
    
    let accZ = event.acceleration.z; 
    if (accZ === null) return; 
    
    let now = Date.now();

    // PUNCH DETECTION
    if (Math.abs(accZ) > 8) {
        if (now - lastPunchTime < PUNCH_COOLDOWN) return;
        
        let side = nextPunchIsLeft ? "left" : "right";
        nextPunchIsLeft = !nextPunchIsLeft; 
        
        triggerPunchAnim(side, window.innerWidth / 2, window.innerHeight / 2);
        lastPunchTime = now;
    }
}

// --- GAME STATE CONTROLS ---
async function initGame() {
    isGameOver = false;
    document.getElementById("start-screen").style.display = "none";
    
    bagZ = 0;
    score = 0;
    difficultyMultiplier = 1.0;
    bagState = "neutral";
    isStumbled = false;
    stateTimer = Date.now() + 2000; 
    
    uiCoins.innerText = "SCORE: 0";
    updateDangerBar();

    if (isMobileDevice && typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permissionState = await DeviceMotionEvent.requestPermission();
            if (permissionState === 'granted') {
                window.addEventListener('devicemotion', handleMotion);
            }
        } catch (error) {
            console.error("Motion permission denied:", error);
        }
    } else if (isMobileDevice) {
        window.addEventListener('devicemotion', handleMotion);
    }
}

function triggerGameOver() {
    isGameOver = true;
    window.removeEventListener('devicemotion', handleMotion);
    
    const finalScoreEl = document.getElementById("final-score");
    if(finalScoreEl) {
        finalScoreEl.innerText = score + " Counters";
    }
    document.getElementById("game-over-screen").style.display = "flex";
}

function restartGame() {
    initGame();
    document.getElementById("game-over-screen").style.display = "none";
}

function updateDangerBar() {
    let percentage = (bagZ / MAX_Z) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    
    dangerFill.style.width = percentage + "%";
    
    if (percentage > 80) dangerFill.style.background = "#c0392b"; 
    else if (percentage > 50) dangerFill.style.background = "#f39c12"; 
    else dangerFill.style.background = "#2ecc71"; // Brighter green
}

// --- PUNCHING LOGIC ---
function triggerPunchAnim(side, clientX, clientY) {
    if (isPunching || isStumbled) return; // Prevent punching if stumbled!

    isPunching = true;
    punchProgress = 0;
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

    scaleTarget = 0.7; // Squish bag

    // SKILL CHECK LOGIC
    if (bagState === "attack") {
        // PERFECT COUNTER
        score++;
        uiCoins.innerText = "SCORE: " + score;
        bagZ -= 12; // Massive pushback
        
        bagState = "stunned";
        stateTimer = Date.now() + 600; 
        bagMat.color.setHex(0xffffff); // Flash white
        
        spawnText("SMASH!", "#2ecc71", clientX, clientY);
        difficultyMultiplier += 0.15; 

    } else if (bagState === "warning") {
        // SPAM PENALTY! Punish them heavily for hitting Yellow.
        bagZ += 8; // Massive penalty surge
        isStumbled = true; // Lock out punching
        
        spawnText("STUMBLE!", "#e74c3c", clientX, clientY);
        
        // Remove stumble state after 1 second
        setTimeout(() => {
            isStumbled = false;
        }, 1000);

    } else if (bagState === "neutral") {
        bagZ -= 0.4;
        spawnText("BOP", "#bdc3c7", clientX, clientY);
        
    } else if (bagState === "stunned") {
        bagZ -= 1.5;
        spawnText("COMBO!", "#f1c40f", clientX, clientY);
    }

    if (bagZ < 0) bagZ = 0;
}

function spawnText(msg, color, clientX, clientY) {
    const text = document.createElement("div");
    text.className = "hit-text";
    text.innerText = msg;
    text.style.color = color;
    
    // Cartoony tilt and positioning
    const randomTilt = Math.random() * 30 - 15; 
    text.style.transform = `rotate(${randomTilt}deg)`;
    text.style.left = `${clientX + (Math.random() * 100 - 50)}px`;
    text.style.top = `${clientY - 120 + (Math.random() * 40 - 20)}px`;
    
    document.body.appendChild(text);
    
    // Animate up and fade out
    setTimeout(() => {
        text.style.top = `${parseInt(text.style.top) - 50}px`;
        text.style.opacity = "0";
    }, 50);

    setTimeout(() => text.remove(), 600);
}

// --- BAG AI & ANIMATION LOOP ---
function manageBagAI() {
    let now = Date.now();

    if (bagState === "neutral") {
        bagZ += 0.02 * difficultyMultiplier; 
        bagMat.color.setHex(0x3498db); // Blue
        
        if (now > stateTimer) {
            bagState = "warning";
            bagMat.color.setHex(0xf1c40f); // Yellow
            // More forgiving warning window
            let warningDuration = Math.max(300, 700 - (score * 15)); 
            stateTimer = now + warningDuration;
        }

    } else if (bagState === "warning") {
        if (now > stateTimer) {
            bagState = "attack";
            bagMat.color.setHex(0xe74c3c); // Red
            // Much more forgiving attack window (Starts at 0.6s, min 0.25s)
            let attackDuration = Math.max(250, 600 - (score * 10));
            stateTimer = now + attackDuration;
        }

    } else if (bagState === "attack") {
        bagZ += 0.4 * difficultyMultiplier; // Fast lunge
        if (now > stateTimer) {
            bagState = "neutral";
            stateTimer = now + 1000 + (Math.random() * 2000); 
        }

    } else if (bagState === "stunned") {
        if (now > stateTimer) {
            bagState = "neutral";
            stateTimer = now + 800 + (Math.random() * 1500);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    if (!isGameOver) {
        manageBagAI();
        pivot.position.z = bagZ;
        updateDangerBar();

        if (bagZ >= MAX_Z) {
            triggerGameOver();
        }
    }

    if (isPunching && activeGlove) {
        punchProgress += 0.12; 
        let restPos = activeGlove === leftGlove ? leftRest : rightRest;
        if (punchProgress <= 1.0) {
            let t = punchProgress < 0.4 ? Math.sin((punchProgress / 0.4) * (Math.PI / 2)) : 1 - Math.pow((punchProgress - 0.4) / 0.6, 2);
            activeGlove.position.lerpVectors(restPos, punchTarget, t);
            activeGlove.rotation.x = targetPunchRot.x * t;
            activeGlove.rotation.y = targetPunchRot.y * t;
            activeGlove.rotation.z = targetPunchRot.z * t;
        } else {
            activeGlove.position.copy(restPos);
            activeGlove.rotation.set(0, 0, 0);
            isPunching = false;
            activeGlove = null;
        }
    }
    
    velX += (0 - pivot.rotation.x) * spring;
    velZ += (0 - pivot.rotation.z) * spring;
    velX *= friction;
    velZ *= friction;
    pivot.rotation.x += velX;
    pivot.rotation.z += velZ;
    scaleTarget += (1 - scaleTarget) * 0.15;
    
    bagGroup.scale.y = scaleTarget;
    bagGroup.scale.x = 1 + (1 - scaleTarget) * 0.5;
    bagGroup.scale.z = bagGroup.scale.x;
    
    renderer.render(scene, camera);
}
animate();

window.addEventListener("pointerdown", (e) => {
    if (!isGameOver && e.target.tagName !== "BUTTON") {
        triggerPunchAnim(e.clientX < window.innerWidth / 2 ? "left" : "right", e.clientX, e.clientY);
    }
});

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
