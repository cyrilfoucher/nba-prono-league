"use client";

import dynamic from "next/dynamic";

import { BallVisual } from "./BallVisual";

// Three.js est chargé à part, après l'affichage de la page : en attendant, et côté
// serveur, on affiche l'image fixe du ballon.
const Ball3D = dynamic(() => import("./Ball3D").then((module) => module.Ball3D), {
  ssr: false,
  loading: () => <BallVisual />,
});

interface MenuBallProps {
  isMenuOpen: boolean;
}

export function MenuBall({ isMenuOpen }: MenuBallProps) {
  return <Ball3D isMenuOpen={isMenuOpen} />;
}
