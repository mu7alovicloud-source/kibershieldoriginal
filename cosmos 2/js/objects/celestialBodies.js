/**
 * COSMOS X — Celestial Body Factory
 * Creates all visual 3D representations of planets, moons, sun, rings, etc.
 */

import * as THREE from 'three';
import { loadTexture } from '../engine/textures.js';
import { SunShader, AtmosphereShader, EarthNightShader, RingShader } from '../engine/shaders.js';
import { SOLAR_SYSTEM_DATA, SUN_RENDER_RADIUS, PLANET_SCALE } from '../data/solarSystem.js';

// Planet render sizes (visual, not physically accurate)
const PLANET_RENDER_SIZES = {
  sun:      SUN_RENDER_RADIUS,
  mercury:  0.35,
  venus:    0.55,
  earth:    0.6,
  moon:     0.16,
  mars:     0.4,
  phobos:   0.05,
  deimos:   0.04,
  jupiter:  1.8,
  io:       0.18,
  europa:   0.16,
  ganymede: 0.22,
  callisto: 0.20,
  saturn:   1.5,
  titan:    0.22,
  enceladus:0.08,
  uranus:   1.0,
  neptune:  0.95,
  pluto:    0.18,
};

export class CelestialBodyFactory {
  constructor(scene) {
    this.scene = scene;
    this.bodies = new Map(); // id -> group
    this.sunMesh = null;
    this.earthMesh = null;
    this.earthCloudMesh = null;
    this.sunDirection = new THREE.Vector3(1, 0.2, 0.5).normalize();
    this.materials = new Map();
  }

  // =============================================
  // CREATE SUN
  // =============================================
  createSun(position = new THREE.Vector3(0, 0, 0)) {
    const group = new THREE.Group();
    group.position.copy(position);

    const radius = PLANET_RENDER_SIZES.sun;

    // Main plasma surface
    const geo = new THREE.SphereGeometry(radius, 64, 64);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        sunColor1: { value: new THREE.Color(0xFFFFAA) },
        sunColor2: { value: new THREE.Color(0xFF8800) },
        sunColor3: { value: new THREE.Color(0xCC4400) },
      },
      vertexShader: SunShader.vertexShader,
      fragmentShader: SunShader.fragmentShader,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.name = 'sun_surface';
    group.add(mesh);

    // Corona glow
    const coronaGeo = new THREE.SphereGeometry(radius * 1.15, 32, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xFF8800,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(coronaGeo, coronaMat));

    // Outer glow (large soft sphere)
    const glowGeo = new THREE.SphereGeometry(radius * 1.6, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xFF6600,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(glowGeo, glowMat));

    // Emissive sprite for lens flare effect
    const spriteTex = this._createSpriteTexture(0xFF8800);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: spriteTex,
      color: 0xFFAA44,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }));
    sprite.scale.setScalar(radius * 8);
    group.add(sprite);

    this.sunMesh = mesh;
    this.sunMaterial = mat;
    group.userData = { type: 'sun', id: 'sun', renderRadius: radius };
    group.name = 'sun';

    this.scene.add(group);
    this.bodies.set('sun', group);
    return group;
  }

  // =============================================
  // CREATE PLANET
  // =============================================
  createPlanet(data, position = new THREE.Vector3()) {
    const group = new THREE.Group();
    group.position.copy(position);
    group.name = data.name.toLowerCase();
    group.userData = { type: data.type, id: group.name, data };

    const radius = PLANET_RENDER_SIZES[data.name.toLowerCase()] || 0.3;
    const segments = data.name === 'Sun' ? 64 : 48;

    if (data.name === 'Earth') {
      return this._createEarth(group, radius, data, position);
    }

    const geo = new THREE.SphereGeometry(radius, segments, segments);

    // Load texture and update material when ready
    const placeholder = new THREE.Color(data.color || 0x888888);
    const mat = new THREE.MeshStandardMaterial({
      color: placeholder,
      roughness: 0.8,
      metalness: 0.0,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = data.name.toLowerCase() + '_surface';
    group.add(mesh);

    // Load texture asynchronously
    const texKey = data.textureKey || data.name.toLowerCase();
    loadTexture(texKey, (texture) => {
      mat.map = texture;
      mat.color = new THREE.Color(0xffffff);
      mat.needsUpdate = true;

      // Special surface treatments
      if (data.name === 'Moon') {
        mat.roughness = 1.0;
        mat.metalness = 0.0;
      } else if (data.name === 'Venus') {
        mat.roughness = 0.6;
      } else if (data.name === 'Mars') {
        mat.roughness = 0.9;
      } else if (data.name === 'Jupiter' || data.name === 'Saturn') {
        mat.roughness = 0.4;
      }
    });

    // Atmosphere
    if (data.hasAtmosphere) {
      this._addAtmosphere(group, radius, data);
    }

    // Saturn rings
    if (data.hasRings) {
      this._addSaturnRings(group, radius, data);
    }

    // Store render radius
    group.userData.renderRadius = radius;

    this.scene.add(group);
    this.bodies.set(group.name, group);
    return group;
  }

  // =============================================
  // EARTH — Special multi-layer rendering
  // =============================================
  _createEarth(group, radius, data, position) {
    // 1. Earth Surface with day/night shader
    const geo = new THREE.SphereGeometry(radius, 64, 64);

    const dayTex = loadTexture('earth');
    const nightTex = loadTexture('earthNight');
    const cloudTex = loadTexture('earthClouds');

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTex },
        nightTexture: { value: nightTex },
        cloudTexture: { value: cloudTex },
        normalTexture: { value: null },
        specularTexture: { value: null },
        sunDirection: { value: this.sunDirection.clone() },
        time: { value: 0 },
        cameraPosition: { value: new THREE.Vector3() },
      },
      vertexShader: EarthNightShader.vertexShader,
      fragmentShader: EarthNightShader.fragmentShader,
    });

    // Update textures when remote textures load
    loadTexture('earth', (t) => { mat.uniforms.dayTexture.value = t; mat.needsUpdate = true; });
    loadTexture('earthNight', (t) => { mat.uniforms.nightTexture.value = t; mat.needsUpdate = true; });
    loadTexture('earthClouds', (t) => { mat.uniforms.cloudTexture.value = t; mat.needsUpdate = true; });

    // Create simple fallback normal map
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = normalCanvas.height = 8;
    const nc = normalCanvas.getContext('2d');
    nc.fillStyle = '#8080ff';
    nc.fillRect(0, 0, 8, 8);
    const normalMap = new THREE.CanvasTexture(normalCanvas);
    mat.uniforms.normalTexture = { value: normalMap };

    // Specular map
    const specCanvas = document.createElement('canvas');
    specCanvas.width = specCanvas.height = 8;
    const sc = specCanvas.getContext('2d');
    sc.fillStyle = '#808080';
    sc.fillRect(0, 0, 8, 8);
    mat.uniforms.specularTexture = { value: new THREE.CanvasTexture(specCanvas) };

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'earth_surface';
    group.add(mesh);
    this.earthMesh = mesh;
    this.earthMaterial = mat;

    // 2. Cloud layer
    const cloudGeo = new THREE.SphereGeometry(radius * 1.005, 48, 48);
    const cloudMat = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    loadTexture('earthClouds', (t) => {
      cloudMat.alphaMap = t;
      cloudMat.map = t;
      cloudMat.needsUpdate = true;
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    cloudMesh.name = 'earth_clouds';
    group.add(cloudMesh);
    this.earthCloudMesh = cloudMesh;

    // 3. Atmosphere
    this._addAtmosphere(group, radius, data);

    group.userData.renderRadius = radius;
    group.userData.type = 'planet';
    group.userData.id = 'earth';

    this.scene.add(group);
    this.bodies.set('earth', group);
    return group;
  }

  // =============================================
  // ATMOSPHERE
  // =============================================
  _addAtmosphere(group, radius, data) {
    const atmGeo = new THREE.SphereGeometry(radius * 1.08, 32, 32);
    const atmMat = new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: this.sunDirection.clone() },
        atmosphereColor: { value: new THREE.Color(data.atmosphereColor || 0x4facfe) },
        atmosphereDensity: { value: data.atmosphereDensity || 0.3 },
        cameraPosition: { value: new THREE.Vector3() },
      },
      vertexShader: AtmosphereShader.vertexShader,
      fragmentShader: AtmosphereShader.fragmentShader,
      transparent: true,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const atmMesh = new THREE.Mesh(atmGeo, atmMat);
    atmMesh.name = 'atmosphere';
    atmMesh.userData.isAtmosphere = true;
    group.add(atmMesh);
    return atmMesh;
  }

  // =============================================
  // SATURN RINGS
  // =============================================
  _addSaturnRings(group, radius, data) {
    const innerR = radius * 1.25;
    const outerR = radius * 2.5;
    const ringGeo = new THREE.RingGeometry(innerR, outerR, 128, 4);

    // Remap UVs for ring texture
    const pos = ringGeo.attributes.position;
    const v3 = new THREE.Vector3();
    const uv = ringGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      const dist = v3.length();
      const normalizedDist = (dist - innerR) / (outerR - innerR);
      uv.setXY(i, normalizedDist, 0.5);
    }

    const ringMat = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });

    loadTexture('saturnRing', (t) => {
      ringMat.map = t;
      ringMat.alphaMap = t;
      ringMat.needsUpdate = true;
    });

    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2.2;
    ring.name = 'saturn_rings';
    group.add(ring);
  }

  // =============================================
  // CREATE ORBIT LINE
  // =============================================
  createOrbitLine(center, sma, ecc = 0, inc = 0, color = 0x334455, parent = null) {
    const points = [];
    const segments = 256;

    for (let i = 0; i <= segments; i++) {
      const ta = (i / segments) * Math.PI * 2;
      const r = sma * (1 - ecc * ecc) / (1 + ecc * Math.cos(ta));

      const x = r * Math.cos(ta);
      const z = r * Math.sin(ta);
      const y = 0;

      points.push(new THREE.Vector3(
        x * Math.cos(inc),
        x * Math.sin(inc) + y,
        z
      ));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });

    const line = new THREE.LineLoop(geo, mat);
    if (parent) {
      line.position.copy(parent.position);
    } else {
      line.position.copy(center);
    }

    this.scene.add(line);
    return line;
  }

  // =============================================
  // CREATE STARFIELD
  // =============================================
  createStarfield() {
    const starCount = 80000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const twinkle = new Float32Array(starCount);

    // Star spectral colors
    const starColors = [
      new THREE.Color(0xFFFFFF),  // White
      new THREE.Color(0xFFEEDD),  // Warm white
      new THREE.Color(0xDDEEFF),  // Blue-white
      new THREE.Color(0xFFDDAA),  // Yellow-white
      new THREE.Color(0xFFAA66),  // Orange
      new THREE.Color(0xFF8844),  // Red-orange
      new THREE.Color(0xAADDFF),  // Blue
    ];

    for (let i = 0; i < starCount; i++) {
      // Distribute on sphere
      const phi = Math.acos(-1 + (2 * i) / starCount);
      const theta = Math.sqrt(starCount * Math.PI) * phi;
      const r = 8000 + Math.random() * 2000;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Star color
      const c = starColors[Math.floor(Math.random() * starColors.length)].clone();
      // Brightness variation
      const bright = 0.4 + Math.random() * 0.6;
      c.multiplyScalar(bright);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      // Size - most tiny, a few bright
      sizes[i] = Math.random() < 0.002 ? 3.0 + Math.random() * 2 :
                 Math.random() < 0.02 ? 1.5 + Math.random() :
                 0.5 + Math.random() * 0.8;

      twinkle[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('starSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('twinkle', new THREE.BufferAttribute(twinkle, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const stars = new THREE.Points(geo, mat);
    stars.name = 'starfield';
    stars.renderOrder = -1;
    this.scene.add(stars);
    this.starfield = stars;
    return stars;
  }

  // =============================================
  // CREATE MILKY WAY BACKGROUND
  // =============================================
  createMilkyWay() {
    const geo = new THREE.SphereGeometry(9000, 64, 64);

    const mat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    // Load milky way texture
    loadTexture('milkyway', (t) => {
      mat.map = t;
      mat.needsUpdate = true;
    });

    const sphere = new THREE.Mesh(geo, mat);
    sphere.name = 'milkyway';
    sphere.renderOrder = -2;
    this.scene.add(sphere);
    this.milkyWay = sphere;
    return sphere;
  }

  // =============================================
  // CREATE BLACK HOLE
  // =============================================
  createBlackHole(position, mass) {
    const group = new THREE.Group();
    group.position.copy(position);

    const radius = Math.max(0.5, Math.log10(mass / 1e30) * 0.5 + 1);

    // Event horizon
    const horizonGeo = new THREE.SphereGeometry(radius, 32, 32);
    const horizonMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const horizon = new THREE.Mesh(horizonGeo, horizonMat);
    group.add(horizon);

    // Accretion disk
    const diskGeo = new THREE.RingGeometry(radius * 1.2, radius * 3.5, 64);
    const diskMat = new THREE.MeshBasicMaterial({
      color: 0xFF6600,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Custom disk texture
    const diskCanvas = document.createElement('canvas');
    diskCanvas.width = 512; diskCanvas.height = 64;
    const dc = diskCanvas.getContext('2d');
    const diskGrad = dc.createLinearGradient(0, 0, 512, 0);
    diskGrad.addColorStop(0, 'rgba(255,255,200,0.9)');
    diskGrad.addColorStop(0.3, 'rgba(255,140,0,0.8)');
    diskGrad.addColorStop(0.7, 'rgba(200,50,0,0.4)');
    diskGrad.addColorStop(1, 'rgba(100,20,0,0.0)');
    dc.fillStyle = diskGrad;
    dc.fillRect(0, 0, 512, 64);
    diskMat.map = new THREE.CanvasTexture(diskCanvas);
    diskMat.alphaMap = diskMat.map;

    const disk = new THREE.Mesh(diskGeo, diskMat);
    disk.rotation.x = -Math.PI / 2;
    group.add(disk);

    // Gravitational glow
    const glowGeo = new THREE.SphereGeometry(radius * 2, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x441100,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.BackSide,
    });
    group.add(new THREE.Mesh(glowGeo, glowMat));

    group.userData = { type: 'black-hole', renderRadius: radius, accretionDisk: disk };
    group.name = 'blackhole_' + Date.now();
    this.scene.add(group);
    this.bodies.set(group.name, group);
    return group;
  }

  // =============================================
  // CREATE ASTEROID
  // =============================================
  createAsteroid(position, radius = 0.05) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Irregular geometry
    const geo = new THREE.IcosahedronGeometry(radius, 1);
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const len = Math.sqrt(x*x + y*y + z*z);
      const factor = 0.7 + Math.random() * 0.6;
      posAttr.setXYZ(i, x * factor, y * factor, z * factor);
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.4 + Math.random() * 0.2, 0.35 + Math.random() * 0.15, 0.3),
      roughness: 0.95,
      metalness: 0.1,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    group.userData = { type: 'asteroid', renderRadius: radius };
    this.scene.add(group);
    return group;
  }

  // =============================================
  // CREATE COMET
  // =============================================
  createComet(position) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Nucleus
    const geo = new THREE.IcosahedronGeometry(0.06, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x888877,
      roughness: 1.0,
    });
    const nucleus = new THREE.Mesh(geo, mat);
    group.add(nucleus);

    // Coma
    const comaGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const comaMat = new THREE.MeshBasicMaterial({
      color: 0xAADDFF,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(comaGeo, comaMat));

    // Tail (Cone extending away from Sun)
    const tailGeo = new THREE.ConeGeometry(0.25, 3.0, 16, 1, true);
    tailGeo.translate(0, 1.5, 0);
    tailGeo.rotateX(Math.PI / 2);
    const tailMat = new THREE.MeshBasicMaterial({
      color: 0x88CCFF,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const tailMesh = new THREE.Mesh(tailGeo, tailMat);
    group.add(tailMesh);

    group.userData = { type: 'comet', renderRadius: 0.06, tailMesh };
    group.name = 'comet_' + Date.now();
    this.scene.add(group);
    this.bodies.set(group.name, group);
    return group;
  }

  // =============================================
  // CREATE SATELLITE (procedural)
  // =============================================
  createSatellite(data, position) {
    const group = new THREE.Group();
    group.position.copy(position);

    switch (data.id) {
      case 'iss': this._buildISS(group); break;
      case 'hubble': this._buildHubble(group); break;
      case 'jwst': this._buildJWST(group); break;
      default: this._buildGenericSatellite(group, data); break;
    }

    group.userData = { type: 'satellite', id: data.id, data, renderRadius: 0.1 };
    group.name = 'satellite_' + data.id;
    this.scene.add(group);
    this.bodies.set(group.name, group);
    return group;
  }

  _buildISS(group) {
    const truss = this._box(2.0, 0.05, 0.05, 0x888888);
    group.add(truss);

    // Solar panel wings
    for (let side of [-1, 1]) {
      for (let pos of [-0.6, 0.6]) {
        const panel = this._box(0.4, 0.02, 0.25, 0x1a3d6e);
        panel.position.set(side * (0.85 + 0.2), 0, pos);
        group.add(panel);
        // Panel glow
        const glow = this._box(0.4, 0.01, 0.25, 0x2255AA);
        glow.position.copy(panel.position);
        glow.position.y += 0.015;
        group.add(glow);
      }
      // Habitat modules
      const module = this._cylinder(0.06, 0.06, 0.3, 8, 0xCCCCCC);
      module.position.set(side * 0.15, 0, 0);
      module.rotation.z = Math.PI / 2;
      group.add(module);
    }

    // Main module
    const main = this._cylinder(0.08, 0.08, 0.5, 16, 0xDDDDDD);
    main.rotation.z = Math.PI / 2;
    group.add(main);
  }

  _buildHubble(group) {
    // Main tube
    const body = this._cylinder(0.08, 0.08, 0.4, 16, 0xCCCCCC);
    body.rotation.z = Math.PI / 2;
    group.add(body);

    // Solar panels
    for (let side of [-1, 1]) {
      const panel = this._box(0.3, 0.01, 0.12, 0x1a3d6e);
      panel.position.set(0, side * 0.2, 0);
      group.add(panel);
    }

    // Aperture door
    const aper = this._cylinder(0.065, 0.065, 0.05, 16, 0x999999);
    aper.rotation.z = Math.PI / 2;
    aper.position.x = 0.23;
    group.add(aper);
  }

  _buildJWST(group) {
    // Mirror
    const mirrorGeo = new THREE.CircleGeometry(0.15, 6);
    const mirrorMat = new THREE.MeshStandardMaterial({
      color: 0xFFCC44,
      metalness: 0.9,
      roughness: 0.1,
    });
    const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
    mirror.rotation.y = Math.PI / 2;
    group.add(mirror);

    // Sunshield layers
    for (let i = 0; i < 5; i++) {
      const shield = this._box(0.5 - i * 0.02, 0.001, 0.3 - i * 0.01, 0xE8D890 - i * 0x080808);
      shield.position.set(-0.2, -i * 0.008, 0);
      group.add(shield);
    }

    // Support structure
    const boom = this._box(0.4, 0.01, 0.01, 0x888888);
    boom.position.set(-0.2, 0.1, 0);
    group.add(boom);
  }

  _buildGenericSatellite(group, data) {
    // Generic satellite body
    const body = this._box(0.1, 0.08, 0.08, 0xCCCCCC);
    group.add(body);

    // Solar panels
    for (let side of [-1, 1]) {
      const panel = this._box(0.18, 0.01, 0.08, 0x1a3d6e);
      panel.position.set(side * 0.14, 0, 0);
      group.add(panel);
    }

    // Antenna
    const ant = this._cylinder(0.003, 0.003, 0.1, 4, 0xAAAAAA);
    ant.position.y = 0.09;
    group.add(ant);
  }

  _box(w, h, d, color) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.4 });
    return new THREE.Mesh(geo, mat);
  }

  _cylinder(rt, rb, h, segs, color) {
    const geo = new THREE.CylinderGeometry(rt, rb, h, segs);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.5 });
    return new THREE.Mesh(geo, mat);
  }

  _createSpriteTexture(color) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    const c = new THREE.Color(color);
    grad.addColorStop(0, `rgba(${Math.floor(c.r*255)},${Math.floor(c.g*255)},${Math.floor(c.b*255)},1)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  // =============================================
  // UPDATE per frame
  // =============================================
  update(time, cameraPosition, sunPos) {
    // Update sun shader
    if (this.sunMaterial) {
      this.sunMaterial.uniforms.time.value = time;
    }

    // Update Earth shader
    if (this.earthMaterial) {
      this.earthMaterial.uniforms.time.value = time;
      this.earthMaterial.uniforms.cameraPosition.value.copy(cameraPosition);
      // Update sun direction
      const sunDir = new THREE.Vector3().subVectors(sunPos, this.earthMesh ? this.earthMesh.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3()).normalize();
      this.earthMaterial.uniforms.sunDirection.value.copy(sunDir);
    }

    // Rotate clouds
    if (this.earthCloudMesh) {
      this.earthCloudMesh.rotation.y += 0.00005;
    }

    // Update atmosphere uniforms for all bodies
    this.bodies.forEach((group) => {
      group.traverse((child) => {
        if (child.userData && child.userData.isAtmosphere && child.material && child.material.uniforms) {
          if (child.material.uniforms.cameraPosition) {
            child.material.uniforms.cameraPosition.value.copy(cameraPosition);
          }
          if (child.material.uniforms.sunDirection) {
            const worldPos = child.getWorldPosition(new THREE.Vector3());
            const sd = new THREE.Vector3().subVectors(sunPos, worldPos).normalize();
            child.material.uniforms.sunDirection.value.copy(sd);
          }
        }
      });
    });

    // Animate black hole accretion disks
    this.bodies.forEach((group) => {
      if (group.userData.type === 'black-hole') {
        const disk = group.userData.accretionDisk;
        if (disk) disk.rotation.z += 0.005;
      }
    });

    // Rotate satellites slightly & orient comets
    this.bodies.forEach((group) => {
      if (group.userData.type === 'satellite') {
        group.rotation.y += 0.002;
      }
      if (group.userData.type === 'comet' && group.userData.tailMesh) {
        const cometPos = group.getWorldPosition(new THREE.Vector3());
        const dirFromSun = new THREE.Vector3().subVectors(cometPos, sunPos).normalize();
        group.userData.tailMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dirFromSun);
      }
    });
  }

  // Remove body from scene
  removeBody(id) {
    const group = this.bodies.get(id);
    if (group) {
      this.scene.remove(group);
      this.bodies.delete(id);
    }
  }

  // Get all pickable objects
  getPickableObjects() {
    const objs = [];
    this.bodies.forEach((group) => {
      group.traverse((child) => {
        if (child.isMesh && !child.userData.isAtmosphere) {
          child.userData.parentGroup = group;
          objs.push(child);
        }
      });
    });
    return objs;
  }

  // Create selection highlight ring
  createSelectionRing(group) {
    const radius = (group.userData.renderRadius || 0.5) * 1.3;
    const geo = new THREE.RingGeometry(radius, radius * 1.06, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x4facfe,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2;
    ring.name = 'selection_ring';
    return ring;
  }
}
