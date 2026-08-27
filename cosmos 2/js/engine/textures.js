/**
 * COSMOS X — Procedural Texture Generator
 * Generates high-quality planet textures via Canvas when real textures are unavailable
 * Also handles texture URL loading with fallback
 */

import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

// =============================================
// TEXTURE URL REGISTRY
// Uses NASA/public domain texture CDN links
// =============================================
const TEXTURE_URLS = {
  sun:       'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg/1280px-The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg',
  mercury:   'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Mercury_in_true_color.jpg/1024px-Mercury_in_true_color.jpg',
  venus:     'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Venus-real_color.jpg/1024px-Venus-real_color.jpg',
  earth:     'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/The_Blue_Marble_%28remastered%29.jpg/1280px-The_Blue_Marble_%28remastered%29.jpg',
  earthNight:'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/The_earth_at_night.jpg/1280px-The_earth_at_night.jpg',
  earthClouds:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Cloudless_Earth.jpg/1280px-Cloudless_Earth.jpg',
  moon:      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/1280px-FullMoon2010.jpg',
  mars:      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/1024px-OSIRIS_Mars_true_color.jpg',
  jupiter:   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Jupiter_and_its_shrunken_Great_Red_Spot.jpg/1280px-Jupiter_and_its_shrunken_Great_Red_Spot.jpg',
  saturn:    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/1280px-Saturn_during_Equinox.jpg',
  saturnRing:'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Saturn-Rings-Labeled.jpg/1280px-Saturn-Rings-Labeled.jpg',
  uranus:    'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Uranus2.jpg/1024px-Uranus2.jpg',
  neptune:   'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg/1024px-Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg',
  pluto:     'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Pluto-01_Stern_03_Pluto_Color_TXT.jpg/1024px-Pluto-01_Stern_03_Pluto_Color_TXT.jpg',
  io:        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Io_highest_resolution_true_color.jpg/1024px-Io_highest_resolution_true_color.jpg',
  europa:    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Europa-moon-with-margins.jpg/1024px-Europa-moon-with-margins.jpg',
  ganymede:  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Ganymede_g1_true-edit1.jpg/1024px-Ganymede_g1_true-edit1.jpg',
  callisto:  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Callisto.jpg/1024px-Callisto.jpg',
  titan:     'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Titan_in_true_color.jpg/1024px-Titan_in_true_color.jpg',
  enceladus: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Enceladus_from_Cassini_Orbiter_%282005-07-14%29.jpg/1024px-Enceladus_from_Cassini_Orbiter_%282005-07-14%29.jpg',
  phobos:    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Phobos_colour_2008.jpg/1024px-Phobos_colour_2008.jpg',
  deimos:    'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Deimos-MRO.jpg/1024px-Deimos-MRO.jpg',
  milkyway:  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/ESO-VLT-Laser-phot-0a-99.jpg/2048px-ESO-VLT-Laser-phot-0a-99.jpg',
  nebula:    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Crab_Nebula.jpg/1280px-Crab_Nebula.jpg',
};

// =============================================
// LOAD TEXTURE WITH FALLBACK
// =============================================
export function loadTexture(key, onLoad) {
  if (textureCache.has(key)) {
    const t = textureCache.get(key);
    if (onLoad) onLoad(t);
    return t;
  }

  const url = TEXTURE_URLS[key];
  if (!url) {
    const t = generateProceduralTexture(key);
    textureCache.set(key, t);
    if (onLoad) onLoad(t);
    return t;
  }

  // Create placeholder while loading
  const placeholder = generateProceduralTexture(key);
  textureCache.set(key + '_placeholder', placeholder);

  const tex = textureLoader.load(
    url,
    (loaded) => {
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = 16;
      loaded.needsUpdate = true;
      textureCache.set(key, loaded);
      if (onLoad) onLoad(loaded);
    },
    undefined,
    () => {
      // On error, keep using procedural
      const proc = generateProceduralTexture(key);
      textureCache.set(key, proc);
      if (onLoad) onLoad(proc);
    }
  );

  return placeholder;
}

export function loadTextureAsync(key) {
  return new Promise((resolve) => {
    if (textureCache.has(key)) {
      resolve(textureCache.get(key));
      return;
    }
    loadTexture(key, resolve);
  });
}

// =============================================
// PROCEDURAL TEXTURE GENERATION
// High-quality canvas-based textures
// =============================================
function generateProceduralTexture(key) {
  switch (key) {
    case 'sun':       return generateSunTexture();
    case 'mercury':   return generateMercuryTexture();
    case 'venus':     return generateVenusTexture();
    case 'earth':     return generateEarthTexture();
    case 'earthNight':return generateEarthNightTexture();
    case 'earthClouds':return generateEarthCloudsTexture();
    case 'moon':      return generateMoonTexture();
    case 'mars':      return generateMarsTexture();
    case 'jupiter':   return generateJupiterTexture();
    case 'saturn':    return generateSaturnTexture();
    case 'saturnRing':return generateSaturnRingTexture();
    case 'uranus':    return generateUranusTexture();
    case 'neptune':   return generateNeptuneTexture();
    case 'pluto':     return generatePlutoTexture();
    case 'io':        return generateIoTexture();
    case 'europa':    return generateEuropaTexture();
    case 'ganymede':  return generateGanymedeTexture();
    case 'callisto':  return generateCallistoTexture();
    case 'titan':     return generateTitanTexture();
    case 'enceladus': return generateEnceladusTexture();
    case 'phobos':    return generatePhobosTexture();
    case 'deimos':    return generateDeimosTexture();
    case 'milkyway':  return generateMilkyWayTexture();
    default:          return generateDefaultTexture(key);
  }
}

function makeCanvas(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d') };
}

function makeTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  return t;
}

// Noise helpers
function noise2D(x, y, seed = 1) {
  const n = Math.sin(x * 127.1 * seed + y * 311.7 * seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, y, scale, seed = 1) {
  const ix = Math.floor(x / scale);
  const iy = Math.floor(y / scale);
  const fx = (x / scale) - ix;
  const fy = (y / scale) - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = noise2D(ix, iy, seed);
  const b = noise2D(ix + 1, iy, seed);
  const c = noise2D(ix, iy + 1, seed);
  const d = noise2D(ix + 1, iy + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (d - b + a - c) * ux * uy;
}

function fbm(x, y, octaves = 6, seed = 1) {
  let val = 0, amp = 0.5, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += smoothNoise(x * freq, y * freq, 1, seed + i * 7) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return val / max;
}

// --- SUN ---
function generateSunTexture() {
  const { canvas, ctx } = makeCanvas(1024);
  const id = ctx.createImageData(1024, 1024);
  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const n = fbm(x / 200, y / 200, 8, 3);
      const n2 = fbm(x / 80, y / 80, 4, 7);
      const plasma = n * 0.6 + n2 * 0.4;
      const r = Math.min(255, Math.floor(200 + plasma * 55));
      const g = Math.min(255, Math.floor(80 + plasma * 100));
      const b = Math.min(255, Math.floor(plasma * 30));
      const i = (y * 1024 + x) * 4;
      id.data[i] = r; id.data[i+1] = g; id.data[i+2] = b; id.data[i+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  return makeTexture(canvas);
}

// --- MERCURY ---
function generateMercuryTexture() {
  const { canvas, ctx } = makeCanvas(1024);
  const id = ctx.createImageData(1024, 1024);
  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const n = fbm(x / 150, y / 150, 7, 11);
      const base = 120 + n * 80;
      // Craters
      const cx1 = 300, cy1 = 400;
      const cd1 = Math.sqrt((x - cx1) ** 2 + (y - cy1) ** 2);
      const crater1 = Math.max(0, 1 - cd1 / 40) * 0.4;
      const r = Math.min(255, Math.floor(base * (0.9 + crater1 * 0.1)));
      const i = (y * 1024 + x) * 4;
      id.data[i] = r; id.data[i+1] = Math.floor(r * 0.95); id.data[i+2] = Math.floor(r * 0.88); id.data[i+3] = 255;
    }
  }
  // Draw craters
  ctx.putImageData(id, 0, 0);
  drawCraters(ctx, 1024, 35, [0.4, 0.55]);
  return makeTexture(canvas);
}

function drawCraters(ctx, size, count, colorRange) {
  for (let i = 0; i < count; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const r = 5 + Math.random() * 30;
    
    // Rim
    const rimGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rimGrad.addColorStop(0, `rgba(60,55,50,0.8)`);
    rimGrad.addColorStop(0.7, `rgba(60,55,50,0.3)`);
    rimGrad.addColorStop(0.85, `rgba(180,160,140,0.5)`);
    rimGrad.addColorStop(1, `rgba(0,0,0,0)`);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.fill();
  }
}

// --- VENUS ---
function generateVenusTexture() {
  const { canvas, ctx } = makeCanvas(1024);
  const id = ctx.createImageData(1024, 1024);
  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const n = fbm(x / 300, y / 80, 5, 5);
      const n2 = fbm(x / 100, y / 30, 4, 9);
      const band = n * 0.5 + n2 * 0.5;
      const r = Math.min(255, Math.floor(200 + band * 40));
      const g = Math.min(255, Math.floor(170 + band * 30));
      const b = Math.min(255, Math.floor(80 + band * 20));
      const i = (y * 1024 + x) * 4;
      id.data[i] = r; id.data[i+1] = g; id.data[i+2] = b; id.data[i+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  return makeTexture(canvas);
}

// --- EARTH ---
function generateEarthTexture() {
  const { canvas, ctx } = makeCanvas(2048);
  const size = 2048;
  const id = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lat = (y / size - 0.5) * Math.PI;
      const lon = (x / size) * Math.PI * 2;

      // Continent mask using multi-octave noise
      const cx = Math.cos(lat) * Math.cos(lon);
      const cy = Math.cos(lat) * Math.sin(lon);
      const cz = Math.sin(lat);
      
      const land = fbm(cx * 3 + 2, cy * 3 + 5, 8, 1) + fbm(cz * 3 + 1, cx * 3 + 3, 5, 13) * 0.5;
      const isLand = land > 0.52;
      
      let r, g, b;
      if (isLand) {
        // Elevation detail
        const elev = fbm(cx * 8, cy * 8 + cz * 5, 6, 2);
        // Green forests to brown mountains to white peaks
        if (elev > 0.7) { r = 230; g = 230; b = 230; } // Snow
        else if (elev > 0.6) { r = 160; g = 140; b = 120; } // Mountain rock
        else {
          // Biome based on latitude
          const absLat = Math.abs(lat);
          if (absLat > 1.1) { r = 220; g = 230; b = 240; } // Polar
          else if (absLat > 0.8) { r = 100; g = 130; b = 100; } // Boreal
          else if (absLat > 0.5) { r = 70; g = 120; b = 60; } // Temperate
          else { r = 60; g = 110; b = 50; } // Tropical
          // Add noise variation
          r += Math.floor((elev - 0.5) * 40);
          g += Math.floor((elev - 0.5) * 40);
          b += Math.floor((elev - 0.5) * 20);
        }
        // Desert regions
        if (Math.abs(lat) > 0.3 && Math.abs(lat) < 0.5) {
          const desertN = fbm(cx * 5, cy * 5 + 7, 4, 8);
          if (desertN > 0.55) { r = 200; g = 170; b = 110; }
        }
      } else {
        // Ocean
        const depth = fbm(cx * 6, cy * 6 + cz * 4, 7, 4);
        r = Math.floor(10 + depth * 20);
        g = Math.floor(50 + depth * 50);
        b = Math.floor(130 + depth * 60);
        // Shallow coastal areas
        if (land > 0.45) { r += 20; g += 30; b += 20; }
      }

      // Polar ice caps
      if (Math.abs(lat) > 1.25) {
        const iceBlend = Math.min(1, (Math.abs(lat) - 1.25) / 0.1);
        r = Math.floor(r + (220 - r) * iceBlend);
        g = Math.floor(g + (230 - g) * iceBlend);
        b = Math.floor(b + (240 - b) * iceBlend);
      }

      const idx = (y * size + x) * 4;
      id.data[idx] = Math.max(0, Math.min(255, r));
      id.data[idx+1] = Math.max(0, Math.min(255, g));
      id.data[idx+2] = Math.max(0, Math.min(255, b));
      id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  return makeTexture(canvas);
}

// --- EARTH NIGHT ---
function generateEarthNightTexture() {
  const { canvas, ctx } = makeCanvas(2048);
  const size = 2048;
  ctx.fillStyle = '#000005';
  ctx.fillRect(0, 0, size, size);
  
  const id = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lat = (y / size - 0.5) * Math.PI;
      const lon = (x / size) * Math.PI * 2;
      const cx = Math.cos(lat) * Math.cos(lon);
      const cy = Math.cos(lat) * Math.sin(lon);
      const cz = Math.sin(lat);
      
      // City light clusters matching continent positions
      const land = fbm(cx * 3 + 2, cy * 3 + 5, 8, 1) + fbm(cz * 3 + 1, cx * 3 + 3, 5, 13) * 0.5;
      const isLand = land > 0.52;
      
      let r = 0, g = 0, b = 0;
      if (isLand) {
        const cities = fbm(cx * 15 + 3, cy * 15 + 7, 5, 6);
        if (cities > 0.62) {
          const intensity = Math.pow((cities - 0.62) / 0.38, 2);
          r = Math.floor(255 * intensity * 1.0);
          g = Math.floor(220 * intensity * 0.8);
          b = Math.floor(120 * intensity * 0.5);
        }
      }
      
      const idx = (y * size + x) * 4;
      id.data[idx] = r; id.data[idx+1] = g; id.data[idx+2] = b; id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  return makeTexture(canvas);
}

// --- EARTH CLOUDS ---
function generateEarthCloudsTexture() {
  const { canvas, ctx } = makeCanvas(2048);
  const size = 2048;
  const id = ctx.createImageData(size, size);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lat = (y / size - 0.5) * Math.PI;
      const lon = (x / size) * Math.PI * 2;
      const cx = Math.cos(lat) * Math.cos(lon);
      const cy = Math.cos(lat) * Math.sin(lon);
      const cz = Math.sin(lat);
      
      const cloud = fbm(cx * 4 + 1, cy * 4 + 2, 8, 14) * 0.6 + fbm(cx * 8, cy * 8, 5, 20) * 0.4;
      const alpha = Math.max(0, Math.min(255, Math.floor((cloud - 0.45) / 0.3 * 255)));
      
      const idx = (y * size + x) * 4;
      id.data[idx] = 255; id.data[idx+1] = 255; id.data[idx+2] = 255; id.data[idx+3] = alpha;
    }
  }
  ctx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.anisotropy = 16;
  return t;
}

// --- MOON ---
function generateMoonTexture() {
  const { canvas, ctx } = makeCanvas(1024);
  const size = 1024;
  const id = ctx.createImageData(size, size);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 200, y / 200, 8, 19);
      const n2 = fbm(x / 50, y / 50, 5, 23);
      const base = 100 + n * 60 + n2 * 20;
      const idx = (y * size + x) * 4;
      id.data[idx] = Math.floor(base * 0.95);
      id.data[idx+1] = Math.floor(base * 0.93);
      id.data[idx+2] = Math.floor(base * 0.90);
      id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  // Many craters
  drawCraters(ctx, size, 60, [0.3, 0.5]);
  // Mare (dark regions)
  const mare = [
    [400, 350, 150],
    [600, 400, 100],
    [300, 600, 120],
    [700, 300, 80],
  ];
  for (const [mx, my, mr] of mare) {
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
    g.addColorStop(0, 'rgba(50,48,45,0.7)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
  }
  return makeTexture(canvas);
}

// --- MARS ---
function generateMarsTexture() {
  const { canvas, ctx } = makeCanvas(2048);
  const size = 2048;
  const id = ctx.createImageData(size, size);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lat = (y / size - 0.5) * Math.PI;
      const lon = (x / size) * Math.PI * 2;
      const cx = Math.cos(lat) * Math.cos(lon);
      const cy = Math.cos(lat) * Math.sin(lon);
      const cz = Math.sin(lat);
      
      const n = fbm(cx * 4 + 1, cy * 4 + 2, 8, 17);
      const n2 = fbm(cx * 10, cy * 10, 5, 29);
      const elev = n * 0.7 + n2 * 0.3;
      
      let r = Math.floor(180 + elev * 40);
      let g = Math.floor(80 + elev * 20);
      let b = Math.floor(50 + elev * 10);
      
      // Polar ice
      if (Math.abs(lat) > 1.3) {
        const iceB = Math.min(1, (Math.abs(lat) - 1.3) / 0.1);
        r = Math.floor(r + (220 - r) * iceB);
        g = Math.floor(g + (225 - g) * iceB);
        b = Math.floor(b + (240 - b) * iceB);
      }
      
      const idx = (y * size + x) * 4;
      id.data[idx] = Math.min(255, r);
      id.data[idx+1] = Math.min(255, g);
      id.data[idx+2] = Math.min(255, b);
      id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  // Craters
  drawCraters(ctx, size, 20, [0.4, 0.55]);
  // Valles Marineris canyon
  ctx.strokeStyle = 'rgba(120,50,30,0.6)';
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.moveTo(size * 0.3, size * 0.5);
  ctx.bezierCurveTo(size * 0.5, size * 0.52, size * 0.7, size * 0.48, size * 0.8, size * 0.5);
  ctx.stroke();
  return makeTexture(canvas);
}

// --- JUPITER ---
function generateJupiterTexture() {
  const { canvas, ctx } = makeCanvas(2048);
  const size = 2048;
  const id = ctx.createImageData(size, size);
  
  const bands = [
    [0, 0.08, 220, 180, 140],
    [0.08, 0.18, 180, 140, 100],
    [0.18, 0.28, 220, 190, 160],
    [0.28, 0.38, 160, 120, 90],
    [0.38, 0.5, 210, 175, 140],
    [0.5, 0.62, 170, 130, 100],
    [0.62, 0.72, 220, 185, 150],
    [0.72, 0.82, 160, 125, 95],
    [0.82, 0.92, 215, 178, 145],
    [0.92, 1.0, 175, 135, 105],
  ];
  
  for (let y = 0; y < size; y++) {
    const yNorm = y / size;
    let band = bands[0];
    for (const b of bands) {
      if (yNorm >= b[0] && yNorm < b[1]) { band = b; break; }
    }
    
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 400, y / 50, 6, 31 + Math.floor(yNorm * 10));
      const n2 = fbm(x / 100, y / 80, 4, 41);
      const turb = n * 0.7 + n2 * 0.3;
      
      let r = Math.floor(band[2] + turb * 30);
      let g = Math.floor(band[3] + turb * 20);
      let b = Math.floor(band[4] + turb * 15);
      
      const idx = (y * size + x) * 4;
      id.data[idx] = Math.min(255, r);
      id.data[idx+1] = Math.min(255, g);
      id.data[idx+2] = Math.min(255, b);
      id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  
  // Great Red Spot
  const grsX = size * 0.62, grsY = size * 0.57;
  const grsGrad = ctx.createRadialGradient(grsX, grsY, 0, grsX, grsY, 80);
  grsGrad.addColorStop(0, 'rgba(180,60,40,0.9)');
  grsGrad.addColorStop(0.5, 'rgba(160,80,50,0.7)');
  grsGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grsGrad;
  ctx.save();
  ctx.scale(1, 0.6);
  ctx.beginPath();
  ctx.arc(grsX, grsY / 0.6, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  
  return makeTexture(canvas);
}

// --- SATURN ---
function generateSaturnTexture() {
  const { canvas, ctx } = makeCanvas(2048);
  const size = 2048;
  const id = ctx.createImageData(size, size);
  
  for (let y = 0; y < size; y++) {
    const yNorm = y / size;
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 500, y / 40, 5, 43);
      const n2 = fbm(x / 150, y / 60, 3, 47);
      const band = n * 0.6 + n2 * 0.4;
      
      // Warm cream/gold palette
      const r = Math.min(255, Math.floor(210 + band * 30));
      const g = Math.min(255, Math.floor(185 + band * 25));
      const b = Math.min(255, Math.floor(130 + band * 20));
      
      const idx = (y * size + x) * 4;
      id.data[idx] = r; id.data[idx+1] = g; id.data[idx+2] = b; id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  return makeTexture(canvas);
}

// --- SATURN RINGS ---
function generateSaturnRingTexture() {
  const { canvas, ctx } = makeCanvas(1024);
  canvas.height = 64; // 1D texture
  const id = ctx.createImageData(1024, 64);
  
  for (let x = 0; x < 1024; x++) {
    const t = x / 1024;
    
    // Ring structure
    let alpha = 0;
    let r = 220, g = 195, b = 160;
    
    // Inner rings (Cassini division, etc.)
    if (t > 0.25 && t < 0.37) { alpha = 0.3 + smoothNoise(x, 0, 20, 1) * 0.3; }
    else if (t > 0.37 && t < 0.42) { alpha = 0.0; } // Cassini division
    else if (t > 0.42 && t < 0.68) {
      alpha = 0.7 + smoothNoise(x, 0, 30, 2) * 0.3;
      r = 215; g = 190; b = 155;
    }
    else if (t > 0.68 && t < 0.75) {
      alpha = 0.4 + smoothNoise(x, 0, 15, 3) * 0.2;
      r = 200; g = 180; b = 150;
    }
    else if (t > 0.75 && t < 0.92) {
      alpha = 0.15 + smoothNoise(x, 0, 40, 4) * 0.1;
      r = 190; g = 175; b = 148;
    }
    
    // Edge fades
    if (t < 0.25) alpha = 0;
    if (t > 0.92) alpha = 0;
    
    for (let y = 0; y < 64; y++) {
      const idx = (y * 1024 + x) * 4;
      id.data[idx] = r; id.data[idx+1] = g; id.data[idx+2] = b;
      id.data[idx+3] = Math.floor(alpha * 255);
    }
  }
  ctx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(canvas);
  t.anisotropy = 4;
  return t;
}

// --- URANUS ---
function generateUranusTexture() {
  const { canvas, ctx } = makeCanvas(1024);
  const size = 1024;
  const id = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 500, y / 200, 4, 53);
      const r = Math.floor(100 + n * 30);
      const g = Math.floor(190 + n * 30);
      const b = Math.floor(210 + n * 20);
      const idx = (y * size + x) * 4;
      id.data[idx] = Math.min(255, r); id.data[idx+1] = Math.min(255, g);
      id.data[idx+2] = Math.min(255, b); id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  return makeTexture(canvas);
}

// --- NEPTUNE ---
function generateNeptuneTexture() {
  const { canvas, ctx } = makeCanvas(1024);
  const size = 1024;
  const id = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 300, y / 100, 6, 59);
      const n2 = fbm(x / 100, y / 80, 4, 61);
      const storm = n * 0.6 + n2 * 0.4;
      const r = Math.floor(20 + storm * 30);
      const g = Math.floor(60 + storm * 40);
      const b = Math.floor(160 + storm * 60);
      const idx = (y * size + x) * 4;
      id.data[idx] = Math.min(255, r); id.data[idx+1] = Math.min(255, g);
      id.data[idx+2] = Math.min(255, b); id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  // Dark spot
  const grad = ctx.createRadialGradient(size*0.4, size*0.45, 0, size*0.4, size*0.45, 60);
  grad.addColorStop(0, 'rgba(10,20,80,0.7)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(size*0.4, size*0.45, 60, 0, Math.PI*2);
  ctx.fill();
  return makeTexture(canvas);
}

// --- PLUTO ---
function generatePlutoTexture() {
  const { canvas, ctx } = makeCanvas(1024);
  const size = 1024;
  const id = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 200, y / 200, 7, 67);
      const r = Math.floor(160 + n * 60);
      const g = Math.floor(140 + n * 50);
      const b = Math.floor(120 + n * 40);
      const idx = (y * size + x) * 4;
      id.data[idx] = Math.min(255, r); id.data[idx+1] = Math.min(255, g);
      id.data[idx+2] = Math.min(255, b); id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  // Heart feature (Tombaugh Regio)
  ctx.fillStyle = 'rgba(240,235,220,0.6)';
  ctx.beginPath();
  ctx.ellipse(size*0.55, size*0.5, 120, 100, -0.3, 0, Math.PI*2);
  ctx.fill();
  return makeTexture(canvas);
}

// --- IO ---
function generateIoTexture() {
  const { canvas, ctx } = makeCanvas(1024);
  const size = 1024;
  const id = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 100, y / 100, 6, 71);
      const r = Math.min(255, Math.floor(200 + n * 50));
      const g = Math.min(255, Math.floor(160 + n * 50));
      const b = Math.floor(n * 40);
      const idx = (y * size + x) * 4;
      id.data[idx] = r; id.data[idx+1] = g; id.data[idx+2] = b; id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  // Volcanic spots
  for (let i = 0; i < 8; i++) {
    const vx = Math.random() * size, vy = Math.random() * size;
    const g = ctx.createRadialGradient(vx, vy, 0, vx, vy, 30);
    g.addColorStop(0, 'rgba(20,15,5,0.9)');
    g.addColorStop(0.5, 'rgba(80,40,0,0.5)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(vx, vy, 30, 0, Math.PI*2);
    ctx.fill();
  }
  return makeTexture(canvas);
}

// --- EUROPA ---
function generateEuropaTexture() {
  const { canvas, ctx } = makeCanvas(1024);
  const size = 1024;
  const id = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 300, y / 300, 6, 73);
      const base = 180 + n * 40;
      const idx = (y * size + x) * 4;
      id.data[idx] = Math.floor(base * 0.88);
      id.data[idx+1] = Math.floor(base * 0.92);
      id.data[idx+2] = Math.floor(base);
      id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  // Ice cracks
  ctx.strokeStyle = 'rgba(130,100,80,0.6)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 20; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.quadraticCurveTo(Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size);
    ctx.stroke();
  }
  return makeTexture(canvas);
}

// --- GANYMEDE ---
function generateGanymedeTexture() {
  const { canvas, ctx } = makeCanvas(1024);
  const size = 1024;
  const id = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 200, y / 200, 7, 79);
      const base = 100 + n * 60;
      const idx = (y * size + x) * 4;
      id.data[idx] = Math.floor(base * 0.95);
      id.data[idx+1] = Math.floor(base * 0.90);
      id.data[idx+2] = Math.floor(base * 0.85);
      id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  drawCraters(ctx, size, 15, [0.35, 0.5]);
  return makeTexture(canvas);
}

// --- CALLISTO ---
function generateCallistoTexture() {
  const { canvas, ctx } = makeCanvas(1024);
  const size = 1024;
  const id = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 150, y / 150, 8, 83);
      const base = 70 + n * 50;
      const idx = (y * size + x) * 4;
      id.data[idx] = Math.floor(base * 0.8);
      id.data[idx+1] = Math.floor(base * 0.78);
      id.data[idx+2] = Math.floor(base * 0.75);
      id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  drawCraters(ctx, size, 40, [0.3, 0.45]);
  return makeTexture(canvas);
}

// --- TITAN ---
function generateTitanTexture() {
  const { canvas, ctx } = makeCanvas(1024);
  const size = 1024;
  const id = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 200, y / 200, 6, 89);
      const r = Math.min(255, Math.floor(180 + n * 40));
      const g = Math.min(255, Math.floor(130 + n * 40));
      const b = Math.floor(50 + n * 20);
      const idx = (y * size + x) * 4;
      id.data[idx] = r; id.data[idx+1] = g; id.data[idx+2] = b; id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  return makeTexture(canvas);
}

// --- ENCELADUS ---
function generateEnceladusTexture() {
  const { canvas, ctx } = makeCanvas(512);
  const size = 512;
  const id = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 100, y / 100, 5, 97);
      const base = 220 + n * 30;
      const idx = (y * size + x) * 4;
      id.data[idx] = Math.min(255, Math.floor(base));
      id.data[idx+1] = Math.min(255, Math.floor(base));
      id.data[idx+2] = Math.min(255, Math.floor(base * 1.02));
      id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  return makeTexture(canvas);
}

// --- PHOBOS ---
function generatePhobosTexture() {
  const { canvas, ctx } = makeCanvas(512);
  const size = 512;
  const id = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 80, y / 80, 6, 101);
      const base = 90 + n * 50;
      const idx = (y * size + x) * 4;
      id.data[idx] = Math.floor(base * 0.9); id.data[idx+1] = Math.floor(base * 0.85);
      id.data[idx+2] = Math.floor(base * 0.78); id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  drawCraters(ctx, size, 8, [0.35, 0.5]);
  return makeTexture(canvas);
}

// --- DEIMOS ---
function generateDeimosTexture() {
  const { canvas, ctx } = makeCanvas(512);
  const size = 512;
  const id = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x / 80, y / 80, 5, 107);
      const base = 100 + n * 50;
      const idx = (y * size + x) * 4;
      id.data[idx] = Math.floor(base * 0.88); id.data[idx+1] = Math.floor(base * 0.84);
      id.data[idx+2] = Math.floor(base * 0.78); id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  return makeTexture(canvas);
}

// --- MILKY WAY ---
function generateMilkyWayTexture() {
  const { canvas, ctx } = makeCanvas(4096);
  canvas.height = 2048;
  const w = 4096, h = 2048;
  ctx.fillStyle = '#000308';
  ctx.fillRect(0, 0, w, h);
  
  const id = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Milky Way band
      const lat = (y / h - 0.5) * Math.PI;
      const bandFactor = Math.exp(-Math.abs(lat) * 4) * 0.8;
      
      const n1 = fbm(x / 300, y / 150, 6, 113);
      const n2 = fbm(x / 100, y / 60, 4, 127);
      const mw = (n1 * 0.7 + n2 * 0.3) * bandFactor;
      
      let r = Math.floor(mw * 40);
      let g = Math.floor(mw * 30);
      let b = Math.floor(mw * 60);
      
      // Nebula colors
      if (mw > 0.4) {
        const nc = fbm(x / 200, y / 200, 3, 131);
        if (nc > 0.55) { r += 20; b += 30; }
        if (nc < 0.45) { r += 15; g += 10; }
      }
      
      const idx = (y * w + x) * 4;
      id.data[idx] = Math.min(255, r);
      id.data[idx+1] = Math.min(255, g);
      id.data[idx+2] = Math.min(255, b);
      id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  return makeTexture(canvas);
}

// --- DEFAULT ---
function generateDefaultTexture(key) {
  const { canvas, ctx } = makeCanvas(512);
  const id = ctx.createImageData(512, 512);
  const seed = key.length * 7 + 3;
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const n = fbm(x / 150, y / 150, 6, seed);
      const base = 100 + n * 100;
      const idx = (y * 512 + x) * 4;
      id.data[idx] = Math.floor(base); id.data[idx+1] = Math.floor(base * 0.9);
      id.data[idx+2] = Math.floor(base * 0.8); id.data[idx+3] = 255;
    }
  }
  ctx.putImageData(id, 0, 0);
  return makeTexture(canvas);
}

export { TEXTURE_URLS, textureCache };
