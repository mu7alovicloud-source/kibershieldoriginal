/**
 * COSMOS X — Physics Engine
 * N-body gravitational simulation with Velocity Verlet integration
 */

export const G_CONST = 6.674e-11; // m^3 kg^-1 s^-2

// Unit conversions for simulation
// We use km, kg, seconds as internal units for numerics
// G in km^3 kg^-1 s^-2
const G_KM = 6.674e-20;

export class PhysicsBody {
  constructor(data) {
    this.id = data.id || Math.random().toString(36).slice(2);
    this.name = data.name || 'Unknown';
    this.type = data.type || 'planet';
    this.mass = data.mass || 1e24; // kg
    this.radius = data.radius || 1000; // km

    // Position in km (simulation units)
    this.position = { x: data.px || 0, y: data.py || 0, z: data.pz || 0 };
    // Velocity in km/s
    this.velocity = { x: data.vx || 0, y: data.vy || 0, z: data.vz || 0 };
    // Acceleration in km/s^2
    this.acceleration = { x: 0, y: 0, z: 0 };
    this.prevAcceleration = { x: 0, y: 0, z: 0 };

    this.isStatic = data.isStatic || false; // Sun is static by default
    this.destroyed = false;
    this.isBlackHole = data.isBlackHole || false;
    this.schwarzschildRadius = data.isBlackHole ? this.computeSchwarzschildRadius() : 0;

    // Rotation
    this.rotationPeriod = data.rotationPeriod || 1; // days
    this.rotationAngle = data.rotationAngle || 0;
    this.rotationAxis = data.rotationAxis || { x: 0, y: 1, z: 0 };

    // Collision response
    this.mergedMass = 0;
    this.impactVelocity = 0;
  }

  computeSchwarzschildRadius() {
    // Rs = 2GM/c^2, in km
    const c = 2.998e5; // km/s
    return (2 * G_KM * this.mass) / (c * c);
  }

  density() {
    // kg/km^3
    const vol = (4 / 3) * Math.PI * Math.pow(this.radius, 3);
    return this.mass / vol;
  }

  surfaceGravity() {
    // km/s^2
    return (G_KM * this.mass) / (this.radius * this.radius);
  }

  escapeVelocity() {
    // km/s
    return Math.sqrt((2 * G_KM * this.mass) / this.radius);
  }

  kineticEnergy() {
    const v2 = this.velocity.x ** 2 + this.velocity.y ** 2 + this.velocity.z ** 2;
    return 0.5 * this.mass * v2;
  }

  speed() {
    return Math.sqrt(
      this.velocity.x ** 2 + this.velocity.y ** 2 + this.velocity.z ** 2
    );
  }
}

export class PhysicsEngine {
  constructor() {
    this.bodies = new Map();
    this.time = 0; // seconds
    this.timeScale = 1;
    this.paused = false;
    this.substeps = 4;
    this.collisionEvents = [];
    this.enableCollisions = true;
    this.enableTidalForces = false;
    this.barneshut = false; // For performance with many bodies

    // Debris system
    this.debris = [];
    this.maxDebris = 200;
  }

  addBody(body) {
    this.bodies.set(body.id, body);
    return body;
  }

  removeBody(id) {
    this.bodies.delete(id);
  }

  getBody(id) {
    return this.bodies.get(id);
  }

  getAllBodies() {
    return Array.from(this.bodies.values()).filter(b => !b.destroyed);
  }

  // =============================================
  // VELOCITY VERLET INTEGRATION
  // =============================================
  step(dt) {
    if (this.paused) return;

    const scaledDt = dt * this.timeScale;
    const subDt = scaledDt / this.substeps;

    for (let s = 0; s < this.substeps; s++) {
      this._verletStep(subDt);
    }

    this.time += scaledDt;

    // Update rotation
    this.getAllBodies().forEach(body => {
      if (body.rotationPeriod > 0) {
        const rotSpeed = (2 * Math.PI) / (body.rotationPeriod * 86400); // rad/s
        body.rotationAngle += rotSpeed * scaledDt;
      }
    });

    // Process collision events
    this._processCollisions();
  }

  _verletStep(dt) {
    const bodies = this.getAllBodies().filter(b => !b.isStatic);
    const allBodies = this.getAllBodies();

    // Step 1: Update positions using current velocities and accelerations
    for (const body of bodies) {
      body.position.x += body.velocity.x * dt + 0.5 * body.acceleration.x * dt * dt;
      body.position.y += body.velocity.y * dt + 0.5 * body.acceleration.y * dt * dt;
      body.position.z += body.velocity.z * dt + 0.5 * body.acceleration.z * dt * dt;
    }

    // Step 2: Store old acceleration, compute new accelerations
    for (const body of bodies) {
      body.prevAcceleration.x = body.acceleration.x;
      body.prevAcceleration.y = body.acceleration.y;
      body.prevAcceleration.z = body.acceleration.z;
      body.acceleration.x = 0;
      body.acceleration.y = 0;
      body.acceleration.z = 0;
    }

    // Compute gravitational forces
    for (let i = 0; i < allBodies.length; i++) {
      const bi = allBodies[i];
      for (let j = i + 1; j < allBodies.length; j++) {
        const bj = allBodies[j];
        this._applyGravity(bi, bj, dt);
      }
    }

    // Step 3: Update velocities using average of old and new accelerations
    for (const body of bodies) {
      body.velocity.x += 0.5 * (body.prevAcceleration.x + body.acceleration.x) * dt;
      body.velocity.y += 0.5 * (body.prevAcceleration.y + body.acceleration.y) * dt;
      body.velocity.z += 0.5 * (body.prevAcceleration.z + body.acceleration.z) * dt;

      // Safety clamp - prevent superluminal speeds
      const maxSpeed = 2.998e5 * 0.9; // 90% speed of light in km/s
      const spd = body.speed();
      if (spd > maxSpeed) {
        const scale = maxSpeed / spd;
        body.velocity.x *= scale;
        body.velocity.y *= scale;
        body.velocity.z *= scale;
      }

      // NaN check
      if (!isFinite(body.velocity.x)) { body.velocity.x = 0; }
      if (!isFinite(body.velocity.y)) { body.velocity.y = 0; }
      if (!isFinite(body.velocity.z)) { body.velocity.z = 0; }
      if (!isFinite(body.position.x)) { body.position.x = 0; }
      if (!isFinite(body.position.y)) { body.position.y = 0; }
      if (!isFinite(body.position.z)) { body.position.z = 0; }
    }

    // Collision detection
    if (this.enableCollisions) {
      this._detectCollisions(allBodies);
    }
  }

  _applyGravity(bi, bj, dt) {
    const dx = bj.position.x - bi.position.x;
    const dy = bj.position.y - bi.position.y;
    const dz = bj.position.z - bi.position.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    
    // Softening to prevent singularity
    const epsilon = 50; // km softening length
    const softDist = Math.sqrt(distSq + epsilon * epsilon);
    const dist = softDist;

    if (dist < 1) return; // Too close, skip

    const force = G_KM * bi.mass * bj.mass / (dist * dist * dist);

    const fx = force * dx;
    const fy = force * dy;
    const fz = force * dz;

    if (!bi.isStatic) {
      bi.acceleration.x += fx / bi.mass;
      bi.acceleration.y += fy / bi.mass;
      bi.acceleration.z += fz / bi.mass;
    }

    if (!bj.isStatic) {
      bj.acceleration.x -= fx / bj.mass;
      bj.acceleration.y -= fy / bj.mass;
      bj.acceleration.z -= fz / bj.mass;
    }

    // Black hole tidal forces
    if (bi.isBlackHole || bj.isBlackHole) {
      const bh = bi.isBlackHole ? bi : bj;
      const obj = bi.isBlackHole ? bj : bi;
      
      // Check Roche limit
      const rocheDist = bh.radius * 2.456 * Math.pow(bh.density() / Math.max(1, obj.density()), 1/3);
      if (dist < rocheDist && dist < bh.schwarzschildRadius * 100) {
        this.collisionEvents.push({
          type: 'blackhole_absorb',
          blackhole: bh,
          victim: obj,
          time: this.time,
        });
      }
    }
  }

  _detectCollisions(bodies) {
    for (let i = 0; i < bodies.length; i++) {
      const bi = bodies[i];
      if (bi.destroyed) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const bj = bodies[j];
        if (bj.destroyed) continue;

        const dx = bj.position.x - bi.position.x;
        const dy = bj.position.y - bi.position.y;
        const dz = bj.position.z - bi.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDist = bi.radius + bj.radius;

        if (dist < minDist && dist > 0) {
          // Compute relative velocity
          const dvx = bj.velocity.x - bi.velocity.x;
          const dvy = bj.velocity.y - bi.velocity.y;
          const dvz = bj.velocity.z - bi.velocity.z;
          const relSpeed = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz);

          this.collisionEvents.push({
            type: 'collision',
            bodyA: bi,
            bodyB: bj,
            relativeVelocity: relSpeed,
            impactPoint: {
              x: (bi.position.x + bj.position.x) / 2,
              y: (bi.position.y + bj.position.y) / 2,
              z: (bi.position.z + bj.position.z) / 2,
            },
            time: this.time,
          });

          // Prevent duplicate events by temporarily marking
          bi.destroyed = true;
          bj.destroyed = true;
        }
      }
    }
  }

  _processCollisions() {
    const events = this.collisionEvents.splice(0);
    return events;
  }

  // =============================================
  // PHYSICS UTILITIES
  // =============================================

  // Compute circular orbit velocity at given distance from parent
  circularOrbitVelocity(parentMass, distKm) {
    return Math.sqrt(G_KM * parentMass / distKm); // km/s
  }

  // Compute orbit from Keplerian elements
  keplerToState(sma, ecc, inc, raan, argP, ta, parentMass) {
    // Standard Keplerian to Cartesian conversion
    const mu = G_KM * parentMass; // km^3/s^2
    const p = sma * (1 - ecc * ecc); // semi-latus rectum in km
    const r = p / (1 + ecc * Math.cos(ta));

    // Position in orbital plane
    const rx = r * Math.cos(ta);
    const ry = r * Math.sin(ta);

    // Velocity in orbital plane
    const sqrtMuP = Math.sqrt(mu / p);
    const vx = sqrtMuP * (-Math.sin(ta));
    const vy = sqrtMuP * (ecc + Math.cos(ta));

    // Rotation matrices
    const cosRaan = Math.cos(raan), sinRaan = Math.sin(raan);
    const cosInc = Math.cos(inc), sinInc = Math.sin(inc);
    const cosArgP = Math.cos(argP), sinArgP = Math.sin(argP);

    // Perifocal to inertial rotation
    const Qxx = cosRaan * cosArgP - sinRaan * sinArgP * cosInc;
    const Qxy = -cosRaan * sinArgP - sinRaan * cosArgP * cosInc;
    const Qyx = sinRaan * cosArgP + cosRaan * sinArgP * cosInc;
    const Qyy = -sinRaan * sinArgP + cosRaan * cosArgP * cosInc;
    const Qzx = sinArgP * sinInc;
    const Qzy = cosArgP * sinInc;

    return {
      px: Qxx * rx + Qxy * ry,
      py: Qyx * rx + Qyy * ry,
      pz: Qzx * rx + Qzy * ry,
      vx: Qxx * vx + Qxy * vy,
      vy: Qyx * vx + Qyy * vy,
      vz: Qzx * vx + Qzy * vy,
    };
  }

  // MERGE two bodies
  mergeBodies(idA, idB) {
    const a = this.bodies.get(idA);
    const b = this.bodies.get(idB);
    if (!a || !b) return null;

    // Conservation of momentum: m1v1 + m2v2 = (m1+m2)v
    const totalMass = a.mass + b.mass;
    const vx = (a.mass * a.velocity.x + b.mass * b.velocity.x) / totalMass;
    const vy = (a.mass * a.velocity.y + b.mass * b.velocity.y) / totalMass;
    const vz = (a.mass * a.velocity.z + b.mass * b.velocity.z) / totalMass;

    // Merge into larger body
    const larger = a.mass >= b.mass ? a : b;
    const smaller = a.mass >= b.mass ? b : a;

    larger.mass = totalMass;
    // New radius from density conservation
    const vol = (4 / 3) * Math.PI * (Math.pow(a.radius, 3) + Math.pow(b.radius, 3));
    larger.radius = Math.pow(vol / ((4 / 3) * Math.PI), 1 / 3);
    larger.velocity.x = vx;
    larger.velocity.y = vy;
    larger.velocity.z = vz;
    larger.destroyed = false;

    this.bodies.delete(smaller.id);

    return larger;
  }

  // DESTROY body (fragments it)
  destroyBody(id) {
    const body = this.bodies.get(id);
    if (!body) return [];

    const fragments = [];
    const count = Math.min(20, Math.max(3, Math.floor(body.mass / 1e22)));

    for (let i = 0; i < count; i++) {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const speed = body.speed() * 0.1 + Math.random() * 5;

      const fragment = new PhysicsBody({
        id: body.id + '_frag_' + i,
        name: body.name + ' fragment',
        type: 'asteroid',
        mass: body.mass / count,
        radius: body.radius * Math.pow(1 / count, 1 / 3),
        px: body.position.x + (Math.random() - 0.5) * body.radius * 2,
        py: body.position.y + (Math.random() - 0.5) * body.radius * 2,
        pz: body.position.z + (Math.random() - 0.5) * body.radius * 2,
        vx: body.velocity.x + Math.cos(angle1) * Math.cos(angle2) * speed,
        vy: body.velocity.y + Math.sin(angle1) * Math.cos(angle2) * speed,
        vz: body.velocity.z + Math.sin(angle2) * speed,
      });

      fragments.push(fragment);
      this.addBody(fragment);
    }

    this.removeBody(id);
    return fragments;
  }

  // Convert body to black hole
  convertToBlackHole(id) {
    const body = this.bodies.get(id);
    if (!body) return;
    body.isBlackHole = true;
    body.schwarzschildRadius = body.computeSchwarzschildRadius();
    body.radius = Math.max(body.schwarzschildRadius * 3, body.radius);
    body.type = 'black-hole';
    return body;
  }

  // Serialize state for save/load
  serialize() {
    const data = {
      time: this.time,
      timeScale: this.timeScale,
      bodies: [],
    };
    this.bodies.forEach(body => {
      data.bodies.push({
        id: body.id,
        name: body.name,
        type: body.type,
        mass: body.mass,
        radius: body.radius,
        px: body.position.x,
        py: body.position.y,
        pz: body.position.z,
        vx: body.velocity.x,
        vy: body.velocity.y,
        vz: body.velocity.z,
        isStatic: body.isStatic,
        isBlackHole: body.isBlackHole,
        rotationPeriod: body.rotationPeriod,
        rotationAngle: body.rotationAngle,
      });
    });
    return data;
  }

  deserialize(data) {
    this.bodies.clear();
    this.time = data.time || 0;
    this.timeScale = data.timeScale || 1;
    for (const bd of data.bodies) {
      this.addBody(new PhysicsBody(bd));
    }
  }
}
