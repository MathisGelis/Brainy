/**
 * Bruit simplex 3D — webgl-noise, Ian McEwan / Stefan Gustavson (Ashima Arts), licence MIT.
 * https://github.com/ashima/webgl-noise
 */
const SIMPLEX_NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
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
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`

/** Orbe : sphère déformée par deux octaves de bruit ; normales recalculées par différences finies. */
export const orbVertex = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uPulse;
uniform float uSeed;
varying vec3 vNormal;
varying vec3 vViewDir;
varying float vNoise;

${SIMPLEX_NOISE}

float displacement(vec3 p) {
  float t = uTime + uSeed;
  float n = snoise(p * 0.62 + vec3(0.0, t * 0.08, t * 0.05));
  n += 0.18 * snoise(p * 1.45 - vec3(t * 0.07, 0.0, t * 0.04));
  return n * (uAmp + uPulse * 0.16);
}

vec3 displaced(vec3 p) {
  return p + normalize(p) * displacement(p);
}

void main() {
  vec3 n = normalize(position);
  vec3 tangent = normalize(abs(n.y) < 0.99 ? cross(n, vec3(0.0, 1.0, 0.0)) : cross(n, vec3(1.0, 0.0, 0.0)));
  vec3 bitangent = normalize(cross(n, tangent));
  const float eps = 0.012;
  vec3 p0 = displaced(position);
  vec3 p1 = displaced(position + tangent * eps);
  vec3 p2 = displaced(position + bitangent * eps);
  vec3 dn = normalize(cross(p1 - p0, p2 - p0));
  if (dot(dn, n) < 0.0) dn = -dn;

  vNoise = dot(p0 - position, n);
  vec4 mv = modelViewMatrix * vec4(p0, 1.0);
  vViewDir = normalize(-mv.xyz);
  vNormal = normalize(normalMatrix * dn);
  gl_Position = projectionMatrix * mv;
}
`

/** Irisation façon film mince : la teinte dépend de l'angle de vue, du relief et du temps. */
export const orbFragment = /* glsl */ `
uniform float uTime;
uniform float uPulse;
uniform float uDark;
uniform vec3 uTint;
varying vec3 vNormal;
varying vec3 vViewDir;
varying float vNoise;

vec3 iridescence(float t) {
  // bleu toujours présent : nacré (rose, lilas, cyan), jamais de brun
  vec3 a = vec3(0.66, 0.62, 0.86);
  vec3 b = vec3(0.3, 0.28, 0.14);
  vec3 d = vec3(0.0, 0.18, 0.38);
  return a + b * cos(6.28318 * (t + d));
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fresnel = pow(1.0 - ndv, 2.6);

  vec3 irid = iridescence(ndv * 0.85 + vNoise * 1.6 + uTime * 0.025 + uPulse * 0.35);
  vec3 L1 = normalize(vec3(-0.45, 0.85, 0.6));
  vec3 L2 = normalize(vec3(0.75, -0.25, 0.45));
  float diffuse = 0.62 + 0.38 * max(dot(N, L1), 0.0);
  float spec = pow(max(dot(N, normalize(L1 + V)), 0.0), 110.0) * 1.15
             + pow(max(dot(N, normalize(L2 + V)), 0.0), 36.0) * 0.28;

  vec3 light = mix(uTint, irid, 0.78) * diffuse + fresnel * mix(vec3(1.0), irid, 0.45) * 0.75 + spec;
  vec3 dark = mix(uTint, irid, 0.7) * (0.28 + 0.3 * diffuse) + fresnel * irid * 1.15 + spec * 0.85;
  vec3 color = mix(light, dark, uDark);

  gl_FragColor = vec4(color, mix(0.9, 1.0, fresnel));
}
`

/** Fond : aurore douce (taches de couleur mobiles) + grain léger contre les bandes. */
export const auroraVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

export const auroraFragment = /* glsl */ `
uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uBase;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uColor4;
varying vec2 vUv;

float blob(vec2 p, vec2 center, float radius) {
  float f = 1.0 - smoothstep(0.0, radius, length(p - center));
  return f * f;
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = vec2(vUv.x * aspect, vUv.y);
  float t = uTime * 0.045;

  vec3 color = uBase;
  color = mix(color, uColor3, blob(p, vec2(aspect * (0.12 + 0.08 * sin(t * 1.7)), 0.86 + 0.06 * cos(t * 1.3)), 0.95) * 0.9);
  color = mix(color, uColor1, blob(p, vec2(aspect * (0.84 + 0.07 * cos(t * 1.1)), 0.78 + 0.08 * sin(t * 1.5)), 0.9) * 0.9);
  color = mix(color, uColor2, blob(p, vec2(aspect * (0.18 + 0.1 * cos(t * 0.9)), 0.12 + 0.08 * sin(t * 1.2)), 0.85) * 0.85);
  color = mix(color, uColor4, blob(p, vec2(aspect * (0.86 + 0.08 * sin(t * 1.4)), 0.16 + 0.07 * cos(t)), 0.8) * 0.8);

  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  color += (grain - 0.5) * 0.018;
  gl_FragColor = vec4(color, 1.0);
}
`
