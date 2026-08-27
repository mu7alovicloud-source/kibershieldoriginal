/**
 * COSMOS X — Effects Engine
 * Supernovas, explosions, debris, particle systems, galaxy generator
 */

import * as THREE from 'three';
import { GalaxyShader } from '../engine/shaders.js';

export class EffectsEngine {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.activeEffects = [];
    this.galaxies = [];
    this._pool = [];
  }

  // =============================================
  // SUPERNOVA
  // =============================================
  triggerSupernova(position, mass = 1e30, onComplete) {
    const effect = {
      type: 'supernova',
      position: position.clone(),
      startTime: Date.now(),
      duration: 8000,
      phase: 0,
      particles: null,
      shockwave: null,
      light: null,
      debris: [],
      onComplete,
    };

    // Point light surge
    const light = new THREE.PointLight(0xFFFFAA, 0, 500);
    light.position.copy(position);
    this.scene.add(light);
    effect.light = light;

    // Shockwave ring
    const swGeo = new THREE.RingGeometry(0.1, 0.3, 64);
    const swMat = new THREE.MeshBasicMaterial({
      color: 0xFFAA44,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shockwave = new THREE.Mesh(swGeo, swMat);
    shockwave.position.copy(position);
    this.scene.add(shockwave);
    effect.shockwave = shockwave;

    // Particle explosion
    const particleCount = 5000;
    const pPositions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);
    const pVelocities = [];
    const pSizes = new Float32Array(particleCount);

    const colors = [
      new THREE.Color(0xFFFFAA),
      new THREE.Color(0xFF8800),
      new THREE.Color(0xFF4400),
      new THREE.Color(0xFFCCFF),
      new THREE.Color(0x8888FF),
    ];

    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = position.x + (Math.random() - 0.5) * 0.1;
      pPositions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.1;
      pPositions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.1;

      const color = colors[Math.floor(Math.random() * colors.length)];
      pColors[i * 3] = color.r;
      pColors[i * 3 + 1] = color.g;
      pColors[i * 3 + 2] = color.b;

      // Random velocity direction
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.5 + Math.random() * 3.0;
      pVelocities.push({
        x: Math.sin(phi) * Math.cos(theta) * speed,
        y: Math.sin(phi) * Math.sin(theta) * speed,
        z: Math.cos(phi) * speed,
      });

      pSizes[i] = 0.5 + Math.random() * 2;
    }

    const pGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(pPositions, 3);
    pGeo.setAttribute('position', posAttr);
    pGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    const pMat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(pGeo, pMat);
    this.scene.add(particles);

    effect.particles = particles;
    effect.pPositions = pPositions;
    effect.pVelocities = pVelocities;
    effect.posAttr = posAttr;

    this.activeEffects.push(effect);
    return effect;
  }

  // =============================================
  // COLLISION EXPLOSION
  // =============================================
  triggerCollisionExplosion(position, energy = 1e30) {
    const effect = {
      type: 'explosion',
      position: position.clone(),
      startTime: Date.now(),
      duration: 3000,
      particles: null,
      light: null,
    };

    const scale = Math.min(5, Math.max(0.3, Math.log10(energy / 1e28)));

    // Flash light
    const light = new THREE.PointLight(0xFF8800, 5 * scale, 50 * scale);
    light.position.copy(position);
    this.scene.add(light);
    effect.light = light;

    // Particles
    const count = Math.floor(500 * scale);
    const pos = new Float32Array(count * 3);
    const vel = [];
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = position.x;
      pos[i * 3 + 1] = position.y;
      pos[i * 3 + 2] = position.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = (0.2 + Math.random() * 1.5) * scale;
      vel.push({
        x: Math.sin(phi) * Math.cos(theta) * speed,
        y: Math.sin(phi) * Math.sin(theta) * speed,
        z: Math.cos(phi) * speed,
      });

      const heat = Math.random();
      col[i * 3] = 1.0;
      col[i * 3 + 1] = 0.3 + heat * 0.5;
      col[i * 3 + 2] = heat * 0.2;
    }

    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(pos, 3);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geo, mat);
    this.scene.add(particles);
    effect.particles = particles;
    effect.posAttr = posAttr;
    effect.pVelocities = vel;
    effect.count = count;

    this.activeEffects.push(effect);
    return effect;
  }

  // =============================================
  // DEBRIS FIELD
  // =============================================
  createDebrisField(position, count = 50, spread = 2) {
    const group = new THREE.Group();
    group.position.copy(position);

    for (let i = 0; i < count; i++) {
      const size = 0.02 + Math.random() * 0.08;
      const geo = new THREE.IcosahedronGeometry(size, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x888877,
        roughness: 0.9,
        metalness: 0.1,
      });

      const piece = new THREE.Mesh(geo, mat);
      piece.position.set(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread
      );
      piece.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      piece.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      );
      piece.userData.rotVelocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.05
      );
      group.add(piece);
    }

    this.scene.add(group);

    const effect = {
      type: 'debris',
      group,
      startTime: Date.now(),
      duration: 20000,
    };
    this.activeEffects.push(effect);
    return group;
  }

  // =============================================
  // ASTEROID STORM
  // =============================================
  createAsteroidStorm(centerPos, count = 30) {
    const asteroids = [];
    for (let i = 0; i < count; i++) {
      const pos = new THREE.Vector3(
        centerPos.x + (Math.random() - 0.5) * 80,
        centerPos.y + (Math.random() - 0.5) * 20,
        centerPos.z + (Math.random() - 0.5) * 80
      );

      const geo = new THREE.IcosahedronGeometry(0.03 + Math.random() * 0.08, 1);
      const posAttr = geo.attributes.position;
      for (let j = 0; j < posAttr.count; j++) {
        const x = posAttr.getX(j);
        const y = posAttr.getY(j);
        const z = posAttr.getZ(j);
        posAttr.setXYZ(j, x * (0.7 + Math.random() * 0.6), y * (0.7 + Math.random() * 0.6), z * (0.7 + Math.random() * 0.6));
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        color: 0x665544,
        roughness: 0.95,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      mesh.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.3
      );
      mesh.userData.rotVel = (Math.random() - 0.5) * 0.02;
      this.scene.add(mesh);
      asteroids.push(mesh);
    }

    const effect = {
      type: 'asteroid_storm',
      asteroids,
      startTime: Date.now(),
      duration: 60000,
    };
    this.activeEffects.push(effect);
    return asteroids;
  }

  // =============================================
  // GALAXY GENERATOR
  // =============================================
  generateGalaxy(options = {}) {
    const {
      type = 'spiral',
      starCount = 50000,
      radius = 500,
      arms = 4,
      position = new THREE.Vector3(0, 0, -600),
    } = options;

    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    const starColorPalette = [
      new THREE.Color(0xFFFFFF),
      new THREE.Color(0xFFEEDD),
      new THREE.Color(0xDDEEFF),
      new THREE.Color(0xFFCC88),
      new THREE.Color(0xFF8866),
      new THREE.Color(0x88AAFF),
    ];

    for (let i = 0; i < starCount; i++) {
      let x, y, z;

      if (type === 'spiral') {
        const arm = Math.floor(Math.random() * arms);
        const armAngle = (arm / arms) * Math.PI * 2;
        const dist = Math.pow(Math.random(), 0.5) * radius;
        const angle = armAngle + (dist / radius) * Math.PI * 4;
        const spread = radius * 0.08 * (1 + dist / radius);

        x = dist * Math.cos(angle) + (Math.random() - 0.5) * spread;
        z = dist * Math.sin(angle) + (Math.random() - 0.5) * spread;
        y = (Math.random() - 0.5) * radius * 0.06 * Math.exp(-dist / (radius * 0.5));
      } else if (type === 'elliptical') {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.5) * radius;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta) * 0.5;
        z = r * Math.cos(phi);
      } else if (type === 'irregular') {
        const r = Math.pow(Math.random(), 0.3) * radius;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * radius * 0.3;
        y = r * Math.sin(phi) * Math.sin(theta) * 0.3;
        z = r * Math.cos(phi);
      } else if (type === 'cluster') {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.pow(Math.random(), 1.5) * radius * 0.3;
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
      } else {
        // nebula
        x = (Math.random() - 0.5) * radius;
        y = (Math.random() - 0.5) * radius * 0.2;
        z = (Math.random() - 0.5) * radius;
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color
      const brightness = 0.3 + Math.random() * 0.7;
      let starColor;
      if (type === 'nebula') {
        // Colorful nebula
        const hue = Math.random();
        starColor = new THREE.Color().setHSL(hue, 0.8, 0.5 + brightness * 0.3);
      } else {
        starColor = starColorPalette[Math.floor(Math.random() * starColorPalette.length)].clone();
        starColor.multiplyScalar(brightness);
      }

      colors[i * 3] = starColor.r;
      colors[i * 3 + 1] = starColor.g;
      colors[i * 3 + 2] = starColor.b;

      sizes[i] = 0.3 + Math.random() * 1.2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: radius * 0.003,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const galaxy = new THREE.Points(geo, mat);
    galaxy.position.copy(position);
    galaxy.rotation.x = Math.random() * Math.PI;
    galaxy.rotation.y = Math.random() * Math.PI;
    galaxy.name = 'galaxy_' + type + '_' + Date.now();
    this.scene.add(galaxy);
    this.galaxies.push(galaxy);

    // Central glow
    const glowGeo = new THREE.SphereGeometry(radius * 0.03, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xFFEEAA,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    galaxy.add(glow);

    return galaxy;
  }

  // =============================================
  // UPDATE LOOP
  // =============================================
  update(dt) {
    const now = Date.now();
    const toRemove = [];

    for (let i = 0; i < this.activeEffects.length; i++) {
      const effect = this.activeEffects[i];
      const elapsed = now - effect.startTime;
      const progress = Math.min(elapsed / effect.duration, 1);

      if (progress >= 1) {
        this._disposeEffect(effect);
        toRemove.push(i);
        if (effect.onComplete) effect.onComplete();
        continue;
      }

      this._updateEffect(effect, progress, elapsed, dt);
    }

    // Remove completed effects (reverse order)
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.activeEffects.splice(toRemove[i], 1);
    }

    // Rotate galaxies
    for (const galaxy of this.galaxies) {
      galaxy.rotation.y += 0.0001;
    }
  }

  _updateEffect(effect, progress, elapsed, dt) {
    switch (effect.type) {
      case 'supernova': this._updateSupernova(effect, progress, elapsed); break;
      case 'explosion': this._updateExplosion(effect, progress, elapsed); break;
      case 'debris': this._updateDebris(effect, progress, dt); break;
      case 'asteroid_storm': this._updateAsteroidStorm(effect, dt); break;
    }
  }

  _updateSupernova(effect, progress, elapsed) {
    // Phase 1: Brightness surge (0-0.2)
    // Phase 2: Expansion (0.2-0.6)
    // Phase 3: Shockwave (0.3-0.7)
    // Phase 4: Fade (0.6-1.0)

    // Light curve
    let lightIntensity;
    if (progress < 0.1) {
      lightIntensity = progress / 0.1 * 50;
    } else if (progress < 0.3) {
      lightIntensity = 50 * (1 - (progress - 0.1) / 0.2 * 0.3);
    } else if (progress < 0.6) {
      lightIntensity = 35 * (1 - (progress - 0.3) / 0.3);
    } else {
      lightIntensity = 0;
    }
    if (effect.light) effect.light.intensity = lightIntensity;

    // Shockwave expansion
    if (effect.shockwave) {
      const swProgress = Math.max(0, (progress - 0.1) / 0.7);
      const swRadius = swProgress * 20;
      effect.shockwave.scale.setScalar(swRadius);
      effect.shockwave.material.opacity = Math.max(0, 0.6 * (1 - swProgress * 1.2));
    }

    // Particle update
    if (effect.posAttr && effect.pVelocities) {
      const gravity = -0.0001;
      const drag = 0.998;
      for (let i = 0; i < effect.pVelocities.length; i++) {
        const vel = effect.pVelocities[i];
        vel.x *= drag;
        vel.y = vel.y * drag + gravity;
        vel.z *= drag;

        effect.pPositions[i * 3] += vel.x;
        effect.pPositions[i * 3 + 1] += vel.y;
        effect.pPositions[i * 3 + 2] += vel.z;
      }
      effect.posAttr.needsUpdate = true;
      if (effect.particles) {
        effect.particles.material.opacity = Math.max(0, 1 - progress * 0.8);
      }
    }
  }

  _updateExplosion(effect, progress, elapsed) {
    if (effect.light) {
      effect.light.intensity = Math.max(0, 5 * (1 - progress * 2));
    }

    if (effect.posAttr && effect.pVelocities) {
      const drag = 0.97;
      for (let i = 0; i < effect.pVelocities.length; i++) {
        const vel = effect.pVelocities[i];
        vel.x *= drag;
        vel.y *= drag;
        vel.z *= drag;
        effect.posAttr.array[i * 3] += vel.x;
        effect.posAttr.array[i * 3 + 1] += vel.y;
        effect.posAttr.array[i * 3 + 2] += vel.z;
      }
      effect.posAttr.needsUpdate = true;
      if (effect.particles) {
        effect.particles.material.opacity = Math.max(0, 1 - progress * 1.2);
      }
    }
  }

  _updateDebris(effect, progress, dt) {
    if (!effect.group) return;
    effect.group.children.forEach(piece => {
      if (piece.userData.velocity) {
        piece.position.add(piece.userData.velocity);
        piece.rotation.x += piece.userData.rotVelocity.x;
        piece.rotation.y += piece.userData.rotVelocity.y;
        piece.rotation.z += piece.userData.rotVelocity.z;
        // Slow down
        piece.userData.velocity.multiplyScalar(0.99);
      }
    });
  }

  _updateAsteroidStorm(effect, dt) {
    effect.asteroids.forEach(a => {
      if (a.userData.velocity) {
        a.position.add(a.userData.velocity);
        a.rotation.y += a.userData.rotVel;
      }
    });
  }

  _disposeEffect(effect) {
    if (effect.particles) {
      effect.particles.geometry.dispose();
      effect.particles.material.dispose();
      this.scene.remove(effect.particles);
    }
    if (effect.light) {
      this.scene.remove(effect.light);
    }
    if (effect.shockwave) {
      effect.shockwave.geometry.dispose();
      effect.shockwave.material.dispose();
      this.scene.remove(effect.shockwave);
    }
    if (effect.group) {
      this.scene.remove(effect.group);
    }
    if (effect.asteroids) {
      effect.asteroids.forEach(a => {
        a.geometry.dispose();
        a.material.dispose();
        this.scene.remove(a);
      });
    }
  }

  dispose() {
    for (const effect of this.activeEffects) {
      this._disposeEffect(effect);
    }
    this.activeEffects = [];
  }
}
