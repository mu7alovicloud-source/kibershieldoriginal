import * as THREE from "./vendor/three.module.js";

// ======================================================
// COSMOS X — STABLE SOLAR SYSTEM
// Post-processing ishlatilmaydi.
// MaskPass / OutputShader kerak emas.
// ======================================================

// ---------- SCENE ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x01030a);

// ---------- CAMERA ----------
const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
);

camera.position.set(0, 45, 90);
camera.lookAt(0, 0, 0);

// ---------- RENDERER ----------
const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

document.body.appendChild(renderer.domElement);

renderer.outputColorSpace = THREE.SRGBColorSpace;

// ======================================================
// LIGHTING
// ======================================================

const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(
    0xffffff,
    3000,
    2000
);

sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// ======================================================
// STARS
// ======================================================

const starGeometry = new THREE.BufferGeometry();

const starCount = 6000;
const starPositions = new Float32Array(starCount * 3);

for (let i = 0; i < starCount; i++) {

    const radius = 1000;

    starPositions[i * 3] =
        (Math.random() - 0.5) * radius * 2;

    starPositions[i * 3 + 1] =
        (Math.random() - 0.5) * radius * 2;

    starPositions[i * 3 + 2] =
        (Math.random() - 0.5) * radius * 2;
}

starGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(starPositions, 3)
);

const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    sizeAttenuation: true
});

const stars = new THREE.Points(
    starGeometry,
    starMaterial
);

scene.add(stars);

// ======================================================
// SUN
// ======================================================

const sunGeometry = new THREE.SphereGeometry(
    6,
    64,
    64
);

const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffaa22
});

const sun = new THREE.Mesh(
    sunGeometry,
    sunMaterial
);

scene.add(sun);

// ======================================================
// ORBIT RINGS
// ======================================================

function createOrbit(radius) {

    const points = [];

    for (let i = 0; i <= 128; i++) {

        const angle =
            (i / 128) * Math.PI * 2;

        points.push(
            new THREE.Vector3(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            )
        );
    }

    const geometry =
        new THREE.BufferGeometry().setFromPoints(points);

    const material =
        new THREE.LineBasicMaterial({
            color: 0x26364d,
            transparent: true,
            opacity: 0.35
        });

    const orbit =
        new THREE.LineLoop(
            geometry,
            material
        );

    scene.add(orbit);

    return orbit;
}

// ======================================================
// PLANETS
// ======================================================

const planets = [];

function createPlanet(
    name,
    radius,
    distance,
    color,
    speed
) {

    const geometry =
        new THREE.SphereGeometry(
            radius,
            32,
            32
        );

    const material =
        new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.8,
            metalness: 0.05
        });

    const mesh =
        new THREE.Mesh(
            geometry,
            material
        );

    mesh.userData = {
        name: name,
        distance: distance,
        angle: Math.random() * Math.PI * 2,
        speed: speed
    };

    scene.add(mesh);

    createOrbit(distance);

    planets.push(mesh);

    return mesh;
}

// ======================================================
// SOLAR SYSTEM
// ======================================================

createPlanet(
    "Mercury",
    0.8,
    10,
    0x9b9b9b,
    0.020
);

createPlanet(
    "Venus",
    1.2,
    15,
    0xd9a441,
    0.015
);

const earth = createPlanet(
    "Earth",
    1.35,
    21,
    0x2878d7,
    0.010
);

createPlanet(
    "Mars",
    1.0,
    27,
    0xc94c32,
    0.008
);

createPlanet(
    "Jupiter",
    3.2,
    38,
    0xc99462,
    0.004
);

createPlanet(
    "Saturn",
    2.7,
    50,
    0xd6bd7c,
    0.003
);

createPlanet(
    "Uranus",
    2.0,
    62,
    0x76cdd8,
    0.002
);

createPlanet(
    "Neptune",
    1.9,
    73,
    0x4169e1,
    0.0015
);

// ======================================================
// SATURN RINGS
// ======================================================

const saturn =
    planets.find(
        p => p.userData.name === "Saturn"
    );

if (saturn) {

    const ringGeometry =
        new THREE.RingGeometry(
            3.5,
            5,
            64
        );

    const ringMaterial =
        new THREE.MeshBasicMaterial({
            color: 0xc9b88a,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });

    const rings =
        new THREE.Mesh(
            ringGeometry,
            ringMaterial
        );

    rings.rotation.x =
        Math.PI / 2;

    saturn.add(rings);
}

// ======================================================
// MOON
// ======================================================

const moonGeometry =
    new THREE.SphereGeometry(
        0.35,
        24,
        24
    );

const moonMaterial =
    new THREE.MeshStandardMaterial({
        color: 0xaaaaaa
    });

const moon =
    new THREE.Mesh(
        moonGeometry,
        moonMaterial
    );

moon.position.set(
    2.3,
    0,
    0
);

earth.add(moon);

// ======================================================
// SIMPLE CAMERA CONTROLS
// ======================================================

let cameraAngle = 0;
let cameraDistance = 90;
let cameraHeight = 45;

let mouseDown = false;
let lastMouseX = 0;
let lastMouseY = 0;

renderer.domElement.addEventListener(
    "mousedown",
    (event) => {

        mouseDown = true;

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
);

window.addEventListener(
    "mouseup",
    () => {
        mouseDown = false;
    }
);

window.addEventListener(
    "mousemove",
    (event) => {

        if (!mouseDown) return;

        const dx =
            event.clientX - lastMouseX;

        const dy =
            event.clientY - lastMouseY;

        cameraAngle -= dx * 0.005;

        cameraHeight += dy * 0.15;

        cameraHeight =
            Math.max(
                5,
                Math.min(150, cameraHeight)
            );

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }
);

renderer.domElement.addEventListener(
    "wheel",
    (event) => {

        cameraDistance +=
            event.deltaY * 0.08;

        cameraDistance =
            Math.max(
                15,
                Math.min(500, cameraDistance)
            );
    }
);

// ======================================================
// RESIZE
// ======================================================

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );
    }
);

// ======================================================
// SIMULATION
// ======================================================

let running = true;
let simulationSpeed = 1;

function animate() {

    requestAnimationFrame(animate);

    if (running) {

        // Sun rotation
        sun.rotation.y +=
            0.002 * simulationSpeed;

        // Planet orbits
        for (const planet of planets) {

            const data =
                planet.userData;

            data.angle +=
                data.speed *
                simulationSpeed;

            planet.position.x =
                Math.cos(data.angle) *
                data.distance;

            planet.position.z =
                Math.sin(data.angle) *
                data.distance;

            planet.rotation.y +=
                0.01 *
                simulationSpeed;
        }

        // Moon orbit
        if (earth) {

            const moonAngle =
                performance.now() *
                0.001 *
                simulationSpeed;

            moon.position.x =
                Math.cos(moonAngle) * 2.3;

            moon.position.z =
                Math.sin(moonAngle) * 2.3;
        }
    }

    // Camera
    camera.position.x =
        Math.sin(cameraAngle) *
        cameraDistance;

    camera.position.z =
        Math.cos(cameraAngle) *
        cameraDistance;

    camera.position.y =
        cameraHeight;

    camera.lookAt(
        0,
        0,
        0
    );

    renderer.render(
        scene,
        camera
    );
}

// ======================================================
// KEYBOARD CONTROLS
// ======================================================

window.addEventListener(
    "keydown",
    (event) => {

        if (event.code === "Space") {

            event.preventDefault();

            running = !running;
        }

        if (event.key === "1") {
            simulationSpeed = 1;
        }

        if (event.key === "2") {
            simulationSpeed = 10;
        }

        if (event.key === "3") {
            simulationSpeed = 100;
        }

        if (event.key === "4") {
            simulationSpeed = 1000;
        }
    }
);

// ======================================================
// START
// ======================================================

console.log(
    "COSMOS X: Universe initialized"
);

console.log(
    "Bodies:",
    planets.length + 2
);

animate();
// ======================================================
// RENDER CANVAS FIX
// ======================================================

const app = document.getElementById("app");

if (app) {
    // Canvasni app ichiga joylashtiramiz
    if (renderer.domElement.parentElement !== app) {
        app.appendChild(renderer.domElement);
    }
}

// Canvas doim ko'rinadigan bo'lishi uchun
renderer.domElement.style.position = "fixed";
renderer.domElement.style.left = "0";
renderer.domElement.style.top = "0";
renderer.domElement.style.width = "100vw";
renderer.domElement.style.height = "100vh";
renderer.domElement.style.display = "block";
renderer.domElement.style.zIndex = "0";
renderer.domElement.style.pointerEvents = "auto";

// Renderni qayta o'lchash
renderer.setSize(
    window.innerWidth,
    window.innerHeight,
    false
);

camera.aspect =
    window.innerWidth / window.innerHeight;

camera.updateProjectionMatrix();

console.log("COSMOS X Renderer:", {
    width: renderer.domElement.width,
    height: renderer.domElement.height,
    visible: renderer.domElement.offsetWidth,
    visibleHeight: renderer.domElement.offsetHeight
});