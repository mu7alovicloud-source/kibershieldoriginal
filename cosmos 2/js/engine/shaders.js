/**
 * COSMOS X — Shader Library
 * Custom GLSL shaders for all celestial bodies
 */

// =============================================
// SUN PLASMA SHADER
// =============================================
export const SunShader = {
  uniforms: {
    time: { value: 0 },
    sunColor1: { value: null }, // set at runtime
    sunColor2: { value: null },
    sunColor3: { value: null },
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float time;

    // Simple noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      
      // Animated surface displacement
      float noise1 = snoise(position * 0.8 + vec3(time * 0.05, 0.0, time * 0.03));
      float noise2 = snoise(position * 2.0 + vec3(time * 0.08, time * 0.06, 0.0));
      float displacement = (noise1 * 0.04 + noise2 * 0.02);
      
      vec3 newPos = position + normal * displacement;
      vPosition = newPos;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
  `,

  fragmentShader: `
    uniform float time;
    uniform vec3 sunColor1;
    uniform vec3 sunColor2;
    uniform vec3 sunColor3;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vec3 pos = vPosition * 1.5;
      
      // Multi-octave plasma noise
      float n1 = snoise(pos + vec3(time * 0.08, time * 0.05, 0.0)) * 0.5 + 0.5;
      float n2 = snoise(pos * 2.2 + vec3(0.0, time * 0.12, time * 0.07)) * 0.5 + 0.5;
      float n3 = snoise(pos * 5.0 + vec3(time * 0.15, 0.0, time * 0.1)) * 0.5 + 0.5;
      float n4 = snoise(pos * 10.0 + vec3(time * 0.2, time * 0.18, 0.0)) * 0.5 + 0.5;
      
      float plasma = n1 * 0.4 + n2 * 0.3 + n3 * 0.2 + n4 * 0.1;
      
      // Color gradient based on plasma intensity
      vec3 color;
      if (plasma < 0.4) {
        color = mix(sunColor3, sunColor2, plasma / 0.4);
      } else if (plasma < 0.7) {
        color = mix(sunColor2, sunColor1, (plasma - 0.4) / 0.3);
      } else {
        color = mix(sunColor1, vec3(1.0, 1.0, 0.9), (plasma - 0.7) / 0.3);
      }
      
      // Granulation effect
      float gran = snoise(pos * 20.0 + vec3(time * 0.3)) * 0.5 + 0.5;
      color *= 0.85 + gran * 0.15;
      
      // Limb darkening
      float limb = dot(vNormal, normalize(vec3(0.0, 0.0, 1.0)));
      limb = pow(abs(limb), 0.4);
      color *= 0.6 + 0.4 * limb;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

// =============================================
// ATMOSPHERE SHADER (Scattering)
// =============================================
export const AtmosphereShader = {
  uniforms: {
    sunDirection: { value: null },
    atmosphereColor: { value: null },
    atmosphereDensity: { value: 0.3 },
    cameraPosition: { value: null },
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform vec3 sunDirection;
    uniform vec3 atmosphereColor;
    uniform float atmosphereDensity;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    
    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float rimFactor = 1.0 - max(0.0, dot(vNormal, viewDir));
      rimFactor = pow(rimFactor, 3.0);
      
      float sunDot = max(0.0, dot(vNormal, normalize(sunDirection)));
      float scatterFactor = pow(rimFactor, 1.5) * atmosphereDensity;
      
      // Day side brighter
      vec3 dayColor = atmosphereColor * (0.8 + sunDot * 0.2);
      // Night side dimmer
      vec3 nightColor = atmosphereColor * 0.1;
      vec3 finalColor = mix(nightColor, dayColor, sunDot * 0.7 + 0.3);
      
      gl_FragColor = vec4(finalColor, scatterFactor * rimFactor);
    }
  `,
};

// =============================================
// EARTH NIGHT LIGHTS SHADER
// =============================================
export const EarthNightShader = {
  uniforms: {
    dayTexture: { value: null },
    nightTexture: { value: null },
    cloudTexture: { value: null },
    normalTexture: { value: null },
    specularTexture: { value: null },
    sunDirection: { value: null },
    time: { value: 0 },
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vTangent;
    varying vec3 vWorldPosition;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform sampler2D cloudTexture;
    uniform sampler2D normalTexture;
    uniform sampler2D specularTexture;
    uniform vec3 sunDirection;
    uniform float time;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    
    void main() {
      // Day/Night blend
      float sunDot = dot(normalize(vNormal), normalize(sunDirection));
      float blend = smoothstep(-0.1, 0.3, sunDot);
      
      vec4 dayColor = texture2D(dayTexture, vUv);
      vec4 nightColor = texture2D(nightTexture, vUv);
      
      // Cloud layer
      vec2 cloudUv = vUv + vec2(time * 0.0003, 0.0);
      vec4 cloudColor = texture2D(cloudTexture, cloudUv);
      
      // Specular (ocean)
      vec4 specMap = texture2D(specularTexture, vUv);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 halfDir = normalize(normalize(sunDirection) + viewDir);
      float specular = pow(max(0.0, dot(normalize(vNormal), halfDir)), 64.0) * specMap.r;
      
      // Combine day + clouds
      vec3 daySide = mix(dayColor.rgb, vec3(1.0), cloudColor.r * 0.8);
      daySide += vec3(specular) * 0.5;
      
      // Night side with city lights
      vec3 nightSide = nightColor.rgb * 1.5;
      nightSide = mix(nightSide, vec3(1.0, 0.9, 0.6), cloudColor.r * 0.3);
      
      // Final color
      vec3 finalColor = mix(nightSide, daySide, blend);
      
      // Terminator gradient
      float terminator = smoothstep(-0.05, 0.1, sunDot);
      finalColor = mix(finalColor * 0.3, finalColor, terminator);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};

// =============================================
// BLACK HOLE SHADER
// =============================================
export const BlackHoleShader = {
  uniforms: {
    time: { value: 0 },
    accretionColor: { value: null },
    diskIntensity: { value: 1.0 },
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform float time;
    uniform vec3 accretionColor;
    uniform float diskIntensity;
    varying vec2 vUv;
    varying vec3 vNormal;
    
    void main() {
      vec2 center = vUv - 0.5;
      float dist = length(center);
      
      // Event horizon - pure black
      if (dist < 0.15) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
      
      // Accretion ring glow
      float ring = smoothstep(0.15, 0.25, dist) * smoothstep(0.5, 0.2, dist);
      float angle = atan(center.y, center.x) + time * 2.0;
      float spin = sin(angle * 4.0 + dist * 20.0 - time * 3.0) * 0.5 + 0.5;
      
      vec3 color = accretionColor * ring * spin * diskIntensity;
      float alpha = ring * 0.9;
      
      gl_FragColor = vec4(color, alpha);
    }
  `,
};

// =============================================
// SATURN RING SHADER
// =============================================
export const RingShader = {
  uniforms: {
    ringTexture: { value: null },
    sunDirection: { value: null },
    planetPosition: { value: null },
    innerRadius: { value: 1.0 },
    outerRadius: { value: 2.5 },
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main() {
      vUv = uv;
      vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D ringTexture;
    uniform vec3 sunDirection;
    uniform float innerRadius;
    uniform float outerRadius;
    varying vec2 vUv;
    varying vec3 vWorldPos;
    
    void main() {
      vec4 ringColor = texture2D(ringTexture, vec2(vUv.x, 0.5));
      
      // Sunlight effect
      float sunFactor = max(0.0, dot(normalize(vec3(0,1,0)), normalize(sunDirection)));
      ringColor.rgb *= 0.7 + sunFactor * 0.3;
      
      // Edge fade
      float edgeFade = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
      
      gl_FragColor = vec4(ringColor.rgb, ringColor.a * edgeFade);
    }
  `,
};

// =============================================
// GALAXY PARTICLE SHADER
// =============================================
export const GalaxyShader = {
  uniforms: {
    time: { value: 0 },
    pixelRatio: { value: 1.0 },
  },

  vertexShader: `
    attribute float size;
    attribute vec3 color;
    attribute float brightness;
    varying vec3 vColor;
    varying float vBrightness;
    uniform float time;
    
    void main() {
      vColor = color;
      vBrightness = brightness;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: `
    varying vec3 vColor;
    varying float vBrightness;
    
    void main() {
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      if (dist > 0.5) discard;
      
      float alpha = smoothstep(0.5, 0.0, dist) * vBrightness;
      gl_FragColor = vec4(vColor, alpha);
    }
  `,
};

// =============================================
// COMET TAIL SHADER
// =============================================
export const CometTailShader = {
  uniforms: {
    time: { value: 0 },
    color: { value: null },
    opacity: { value: 1.0 },
  },

  vertexShader: `
    attribute float tailProgress;
    varying float vProgress;
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      vProgress = tailProgress;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    varying float vProgress;
    varying vec2 vUv;
    
    void main() {
      float alpha = (1.0 - vProgress) * smoothstep(0.5, 0.0, abs(vUv.y - 0.5));
      alpha *= opacity;
      vec3 finalColor = mix(vec3(1.0), color, vProgress);
      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
};

// =============================================
// STARFIELD SHADER
// =============================================
export const StarfieldShader = {
  uniforms: {
    time: { value: 0 },
  },

  vertexShader: `
    attribute float starSize;
    attribute vec3 starColor;
    attribute float twinkle;
    varying vec3 vColor;
    varying float vTwinkle;
    uniform float time;
    
    void main() {
      vColor = starColor;
      vTwinkle = twinkle;
      
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      float twinkleSize = starSize * (0.7 + 0.3 * sin(time * twinkle * 3.0 + twinkle * 6.28));
      gl_PointSize = twinkleSize * (400.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: `
    varying vec3 vColor;
    varying float vTwinkle;
    
    void main() {
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      if (dist > 0.5) discard;
      
      // Star glow effect
      float core = smoothstep(0.5, 0.1, dist);
      float halo = smoothstep(0.5, 0.0, dist) * 0.3;
      float alpha = core + halo;
      
      // Cross diffraction spikes for bright stars
      float spike = 0.0;
      if (vTwinkle > 0.8) {
        float sx = smoothstep(0.5, 0.0, abs(center.x)) * smoothstep(0.1, 0.0, abs(center.y));
        float sy = smoothstep(0.5, 0.0, abs(center.y)) * smoothstep(0.1, 0.0, abs(center.x));
        spike = (sx + sy) * 0.15;
      }
      
      gl_FragColor = vec4(vColor, min(1.0, alpha + spike));
    }
  `,
};
