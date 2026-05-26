import { useLayoutEffect, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { mockUsers, type OFFUser } from "./mockData";

const rankColors: Record<string, string> = {
  "Explorateur Expert":  "#e53935",
  "Contributeur Senior": "#f57c00",
  "Contributeur":        "#388e3c",
  "Explorateur":         "#1976d2",
  "Novice":              "#7b1fa2",
};

function createUserIcon(user: OFFUser) {
  const color = rankColors[user.rankLabel] ?? "#555";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">
      <path d="M20 1 C10 1 2 9 2 19 C2 32 20 47 20 47 C20 47 38 32 38 19 C38 9 30 1 20 1Z"
        fill="${color}" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3))"/>
      <circle cx="20" cy="19" r="11" fill="white" opacity="0.95"/>
      <text x="20" y="23" text-anchor="middle" font-family="system-ui,sans-serif"
        font-size="9" font-weight="700" fill="${color}">${user.avatar}</text>
    </svg>`;
  return L.divIcon({
    html: `<div style="width:40px;height:48px;cursor:pointer">${svg}</div>`,
    className: "",
    iconSize: [40, 48],
    iconAnchor: [20, 48],
  });
}

// Custom cluster icon: circle with count + color gradient
function createClusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  const size = count >= 20 ? 52 : count >= 10 ? 44 : 36;
  const fontSize = count >= 20 ? 14 : count >= 10 ? 13 : 12;
  return L.divIcon({
    html: `
      <div style="
        width:${size}px; height:${size}px;
        border-radius:50%;
        background: radial-gradient(circle at 35% 35%, #e53935, #c62828);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        display:flex; align-items:center; justify-content:center;
        color:white; font-weight:700; font-size:${fontSize}px;
        font-family:system-ui,sans-serif;
        cursor:pointer;
      ">${count}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface OFFMapProps {
  onUserSelect: (user: OFFUser | null, x: number, y: number) => void;
}

export function OFFMap({ onUserSelect }: OFFMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const callbackRef = useRef(onUserSelect);
  useEffect(() => { callbackRef.current = onUserSelect; });

  useLayoutEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [46.5, 3.5],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    L.control.attribution({ position: "bottomright", prefix: false })
      .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>')
      .addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Cluster group — spiderfy on max zoom, custom icon
    const clusterGroup = L.markerClusterGroup({
      iconCreateFunction: createClusterIcon,
      maxClusterRadius: 60,       // pixels within which markers cluster
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      animate: true,
      animateAddingMarkers: false,
      disableClusteringAtZoom: 12, // individual markers at city-level zoom
    });

    mockUsers.forEach((user) => {
      const marker = L.marker([user.lat, user.lng], {
        icon: createUserIcon(user),
        title: user.name,
      });
      marker.on("click", (e) => {
        const pt = map.latLngToContainerPoint([user.lat, user.lng]);
        callbackRef.current(user, pt.x, pt.y);
        L.DomEvent.stopPropagation(e);
      });
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    map.on("click", () => callbackRef.current(null, 0, 0));

    setTimeout(() => map.invalidateSize(), 0);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
    />
  );
}
