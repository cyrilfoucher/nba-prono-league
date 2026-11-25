const DEGREE = Math.PI / 180;

const CURVED_SEAM_MIN_RADIUS = 52 * DEGREE;
const CURVED_SEAM_MAX_RADIUS = 78 * DEGREE;
const SEAM_HALF_WIDTH = 1.5 * DEGREE;
const SEAM_EDGE_SOFTNESS = 0.6 * DEGREE;
const GROOVE_HALF_WIDTH = 3 * DEGREE;

const LEATHER_COLOR: Rgb = [196, 86, 28];
const SEAM_COLOR: Rgb = [26, 13, 8];

type Rgb = readonly [number, number, number];

export interface BallSurfaceSample {
  color: Rgb;
  // Hauteur entre 0 (creux) et 1 (bosse), pour la carte de relief.
  height: number;
}

export interface BallTextureCanvases {
  color: HTMLCanvasElement;
  bump: HTMLCanvasElement;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function hash3(x: number, y: number, z: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1440662683)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function valueNoise(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smoothstep(0, 1, x - ix);
  const fy = smoothstep(0, 1, y - iy);
  const fz = smoothstep(0, 1, z - iz);

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const corner = (dx: number, dy: number, dz: number) => hash3(ix + dx, iy + dy, iz + dz);

  return lerp(
    lerp(
      lerp(corner(0, 0, 0), corner(1, 0, 0), fx),
      lerp(corner(0, 1, 0), corner(1, 1, 0), fx),
      fy,
    ),
    lerp(
      lerp(corner(0, 0, 1), corner(1, 0, 1), fx),
      lerp(corner(0, 1, 1), corner(1, 1, 1), fx),
      fy,
    ),
    fz,
  );
}

// Distance angulaire (en radians) entre une direction et la couture la plus proche.
export function distanceToSeams(x: number, y: number, z: number): number {
  const toPlaneX = Math.asin(Math.min(1, Math.abs(x)));
  const toPlaneZ = Math.asin(Math.min(1, Math.abs(z)));

  // Coutures courbes : cercles déformés autour des pôles ±X. Rayon de 52° vers l'avant
  // et l'arrière (±Z), qui monte à 78° vers le haut et le bas (±Y), là où la courbe
  // croise la couture z = 0 et se rapproche de la couture x = 0.
  const angleFromPole = Math.acos(Math.min(1, Math.abs(x)));
  const aroundAxis = y * y + z * z;
  const towardPoles = aroundAxis > 0 ? (y * y) / aroundAxis : 0;
  const radius =
    CURVED_SEAM_MIN_RADIUS +
    (CURVED_SEAM_MAX_RADIUS - CURVED_SEAM_MIN_RADIUS) * Math.pow(towardPoles, 1.4);
  const toCurvedSeam = Math.abs(angleFromPole - radius);

  return Math.min(toPlaneX, toPlaneZ, toCurvedSeam);
}

export function sampleBallSurface(x: number, y: number, z: number): BallSurfaceSample {
  const seamDistance = distanceToSeams(x, y, z);
  const seam = 1 - smoothstep(SEAM_HALF_WIDTH, SEAM_HALF_WIDTH + SEAM_EDGE_SOFTNESS, seamDistance);
  const groove = 1 - smoothstep(0, GROOVE_HALF_WIDTH, seamDistance);

  const pebbles = valueNoise(x * 70, y * 70, z * 70);
  const patches = valueNoise(x * 6, y * 6, z * 6);
  const shade = 0.8 + 0.2 * pebbles + 0.12 * (patches - 0.5);

  const color: Rgb = [
    LEATHER_COLOR[0] * shade * (1 - seam) + SEAM_COLOR[0] * seam,
    LEATHER_COLOR[1] * shade * (1 - seam) + SEAM_COLOR[1] * seam,
    LEATHER_COLOR[2] * shade * (1 - seam) + SEAM_COLOR[2] * seam,
  ];
  const leatherHeight = 0.55 + 0.35 * pebbles;
  const height = leatherHeight * (1 - groove) + 0.05 * groove;

  return { color, height };
}

// Peint la texture équirectangulaire attendue par SphereGeometry de Three.js :
// la colonne donne l'angle autour de l'axe Y, la ligne la hauteur (ligne 0 = pôle +Y).
export function paintBallTextures(width: number, height: number): BallTextureCanvases {
  const colorCanvas = document.createElement("canvas");
  const bumpCanvas = document.createElement("canvas");
  colorCanvas.width = bumpCanvas.width = width;
  colorCanvas.height = bumpCanvas.height = height;

  const colorContext = colorCanvas.getContext("2d");
  const bumpContext = bumpCanvas.getContext("2d");
  if (!colorContext || !bumpContext) {
    throw new Error("Canvas 2D indisponible");
  }

  const colorPixels = colorContext.createImageData(width, height);
  const bumpPixels = bumpContext.createImageData(width, height);

  for (let row = 0; row < height; row++) {
    const theta = (Math.PI * (row + 0.5)) / height;
    const sinTheta = Math.sin(theta);
    const y = Math.cos(theta);

    for (let column = 0; column < width; column++) {
      const phi = (2 * Math.PI * (column + 0.5)) / width;
      const x = -Math.cos(phi) * sinTheta;
      const z = Math.sin(phi) * sinTheta;

      const sample = sampleBallSurface(x, y, z);
      const index = (row * width + column) * 4;
      const level = Math.round(sample.height * 255);

      colorPixels.data[index] = sample.color[0];
      colorPixels.data[index + 1] = sample.color[1];
      colorPixels.data[index + 2] = sample.color[2];
      colorPixels.data[index + 3] = 255;
      bumpPixels.data[index] = level;
      bumpPixels.data[index + 1] = level;
      bumpPixels.data[index + 2] = level;
      bumpPixels.data[index + 3] = 255;
    }
  }

  colorContext.putImageData(colorPixels, 0, 0);
  bumpContext.putImageData(bumpPixels, 0, 0);

  return { color: colorCanvas, bump: bumpCanvas };
}
