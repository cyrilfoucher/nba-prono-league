import {
  AmbientLight,
  CanvasTexture,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";

import { paintBallTextures } from "./ball-texture";

const TEXTURE_WIDTH = 512;
const TEXTURE_HEIGHT = 256;
const MAX_PIXEL_RATIO = 2;

// Vitesses de rotation en radians par seconde.
const BASE_SPEED = 0.6;
const SPIN_BOOST = 9;
// Plus ces valeurs sont grandes, plus le changement de vitesse est rapide.
const BOOST_DECAY = 1.8;
const SPEED_RESPONSE = 6;
const MAX_FRAME_SECONDS = 0.1;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export interface BallScene {
  spin: () => void;
  dispose: () => void;
}

// Three.js lève une erreur quand le navigateur ne peut pas créer de contexte WebGL.
function createRenderer(): WebGLRenderer | null {
  try {
    return new WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return null;
  }
}

// Installe le ballon 3D dans le conteneur. Renvoie null si WebGL est indisponible ou
// si la scène ne peut pas être construite : l'image fixe prend alors le relais.
export function mountBallScene(container: HTMLElement): BallScene | null {
  const renderer = createRenderer();
  if (!renderer) {
    return null;
  }

  try {
    return createBallScene(container, renderer);
  } catch {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    return null;
  }
}

function createBallScene(container: HTMLElement, renderer: WebGLRenderer): BallScene {
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 10);
  camera.position.set(0, 0, 4);

  const textures = paintBallTextures(TEXTURE_WIDTH, TEXTURE_HEIGHT);
  const colorMap = new CanvasTexture(textures.color);
  colorMap.colorSpace = SRGBColorSpace;
  const bumpMap = new CanvasTexture(textures.bump);

  const geometry = new SphereGeometry(1, 48, 32);
  const material = new MeshStandardMaterial({
    map: colorMap,
    bumpMap,
    bumpScale: 2,
    roughness: 0.75,
    metalness: 0,
  });
  const ball = new Mesh(geometry, material);

  // Le groupe incline l'axe de rotation pour donner du relief au mouvement.
  const tilt = new Group();
  tilt.rotation.set(0.25, 0, -0.35);
  tilt.add(ball);
  scene.add(tilt);

  const keyLight = new DirectionalLight(0xffffff, 2.6);
  keyLight.position.set(-2, 2.5, 3);
  const rimLight = new DirectionalLight(0xff8a3d, 1.6);
  rimLight.position.set(2, -1, -3);
  scene.add(keyLight, rimLight, new AmbientLight(0xffffff, 0.35));

  let frameId: number | null = null;
  let lastTime: number | null = null;
  let speed = BASE_SPEED;
  let boost = 0;
  let isVisible = true;
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);

  function render() {
    renderer.render(scene, camera);
  }

  function resize() {
    const size = container.clientWidth;
    if (size > 0) {
      renderer.setSize(size, size, false);
    }
  }

  function animate(time: number) {
    const seconds = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, MAX_FRAME_SECONDS);
    lastTime = time;

    boost *= Math.exp(-BOOST_DECAY * seconds);
    const targetSpeed = BASE_SPEED + boost;
    speed += (targetSpeed - speed) * (1 - Math.exp(-SPEED_RESPONSE * seconds));
    ball.rotation.y += speed * seconds;

    render();
    frameId = requestAnimationFrame(animate);
  }

  function stop() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    lastTime = null;
  }

  function updateAnimation() {
    if (reducedMotion.matches) {
      stop();
      boost = 0;
      speed = BASE_SPEED;
      render();
    } else if (isVisible) {
      frameId ??= requestAnimationFrame(animate);
    } else {
      stop();
    }
  }

  const intersectionObserver = new IntersectionObserver((entries) => {
    isVisible = entries.some((entry) => entry.isIntersecting);
    updateAnimation();
  });
  intersectionObserver.observe(container);

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (frameId === null) {
      render();
    }
  });
  resizeObserver.observe(container);

  reducedMotion.addEventListener("change", updateAnimation);
  resize();
  updateAnimation();

  return {
    spin() {
      if (!reducedMotion.matches) {
        boost = SPIN_BOOST;
      }
    },
    dispose() {
      stop();
      reducedMotion.removeEventListener("change", updateAnimation);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      colorMap.dispose();
      bumpMap.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
