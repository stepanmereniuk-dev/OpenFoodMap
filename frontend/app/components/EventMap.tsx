"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon paths broken by webpack
const pinIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedPinIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type MapEvent = {
  id?: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  organizer: string;
  lat?: number;
  lng?: number;
};

function FlyTo({ event }: { event: MapEvent | null }) {
  const map = useMap();
  useEffect(() => {
    if (event?.lat != null && event?.lng != null) {
      map.flyTo([event.lat, event.lng], 13, { duration: 1.2 });
    }
  }, [event?.id, event?.lat, event?.lng, event?.title, map]);
  return null;
}

type Props = {
  events: MapEvent[];
  selected: MapEvent | null;
  onSelect: (event: MapEvent) => void;
};

export default function EventMap({ events, selected, onSelect }: Props) {
  const mapped = events.filter((ev) => ev.lat != null && ev.lng != null);

  return (
    <MapContainer
      center={[46.5, 2.3]}
      zoom={5}
      className="w-full h-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo event={selected} />
      {mapped.map((ev, i) => (
        <Marker
          key={ev.id ?? i}
          position={[ev.lat!, ev.lng!]}
          icon={selected?.id === ev.id || selected?.title === ev.title ? selectedPinIcon : pinIcon}
          eventHandlers={{ click: () => onSelect(ev) }}
        >
          <Popup>
            <strong className="block mb-1">{ev.title}</strong>
            {ev.description && <span className="block text-sm text-gray-600">{ev.description}</span>}
            {ev.location && <span className="block text-xs text-gray-400 mt-1">📍 {ev.location}</span>}
            <span className="block text-xs text-gray-400">🗓 {ev.start_date}</span>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
