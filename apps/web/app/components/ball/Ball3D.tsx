"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./Ball3D.module.css";
import { mountBallScene, type BallScene } from "./ball-scene";
import { BallVisual } from "./BallVisual";

interface Ball3DProps {
  isMenuOpen: boolean;
}

export function Ball3D({ isMenuOpen }: Ball3DProps) {
  const sceneRef = useRef<BallScene | null>(null);
  const previousMenuStateRef = useRef(isMenuOpen);
  const [isWebGLAvailable, setIsWebGLAvailable] = useState(true);

  // La scène vit tant que le conteneur est dans la page : React appelle la
  // fonction renvoyée quand il le retire. On en renvoie toujours une, sinon React
  // rappellerait cette fonction avec null.
  const containerRef = useCallback((container: HTMLSpanElement | null) => {
    if (container === null) {
      return;
    }

    const scene = mountBallScene(container);
    if (!scene) {
      setIsWebGLAvailable(false);
      return () => {};
    }
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (previousMenuStateRef.current !== isMenuOpen) {
      previousMenuStateRef.current = isMenuOpen;
      sceneRef.current?.spin();
    }
  }, [isMenuOpen]);

  if (!isWebGLAvailable) {
    return <BallVisual />;
  }

  return <span ref={containerRef} className={styles.container} />;
}
