"use client";

import dynamic from "next/dynamic";

const FoodMap = dynamic(() => import("./food-map"), {
  ssr: false,
  loading: () => (
    <main className="map-shell">
      <section className="loading-panel">Chargement de la carte...</section>
    </main>
  ),
});

export default function MapLoader() {
  return <FoodMap />;
}
