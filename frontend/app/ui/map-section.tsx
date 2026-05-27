"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";

export type Person = {
  id: number;
  name: string;
  city: string;
  region: string;
  country: string;
  color: string;
  position: [number, number];
  editCount: number;
};

export type UserProfile = {
  id: number;
  pseudo: string;
  city: string;
  region: string;
  country: string;
  position: [number, number] | null;
  visible: boolean;
  color: string;
};

export type ClusterLevel = "country" | "region" | "city" | "touch";

export type SelectedScope = {
  level: ClusterLevel | "global";
  label: string;
  country?: string;
  region?: string;
  city?: string;
};

type PersonGroup = {
  id: string;
  label: string;
  level: ClusterLevel;
  center: [number, number];
  people: Person[];
};

const clusterDistancePx = 58;
const rankHeatStops = ["#5b21b6", "#7c3aed", "#c026d3", "#e11d48", "#ef4444", "#b91c1c"];

export const localPlaces: Record<string, { city: string; country: string; position: [number, number]; region: string }> = {
  france: { city: "", country: "France", position: [46.8, 2.2], region: "" },
  lyon: { city: "Lyon", country: "France", position: [45.764, 4.8357], region: "Auvergne-Rhone-Alpes" },
  marseille: {
    city: "Marseille",
    country: "France",
    position: [43.2965, 5.3698],
    region: "Provence-Alpes-Cote d'Azur",
  },
  paris: { city: "Paris", country: "France", position: [48.8566, 2.3522], region: "Ile-de-France" },
};

export const defaultPeople: Person[] = [
  {
    id: 101,
    name: "Nora",
    city: "Paris",
    region: "Ile-de-France",
    country: "France",
    color: "#256f56",
    position: [48.8584, 2.2945],
    editCount: stableEditCount(101, "Nora"),
  },
  {
    id: 102,
    name: "Malik",
    city: "Paris",
    region: "Ile-de-France",
    country: "France",
    color: "#d68b2f",
    position: [48.864, 2.333],
    editCount: stableEditCount(102, "Malik"),
  },
  {
    id: 103,
    name: "Claire",
    city: "Lyon",
    region: "Auvergne-Rhone-Alpes",
    country: "France",
    color: "#b94c43",
    position: [45.764, 4.8357],
    editCount: stableEditCount(103, "Claire"),
  },
  {
    id: 104,
    name: "Yanis",
    city: "Marseille",
    region: "Provence-Alpes-Cote d'Azur",
    country: "France",
    color: "#385f9f",
    position: [43.2965, 5.3698],
    editCount: stableEditCount(104, "Yanis"),
  },
];

export function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

export function stableEditCount(id: number, name: string) {
  const source = `${id}:${name}`;
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % 9973;
  }

  return 12 + (hash % 480);
}

export function withEditCounts(items: Person[]) {
  return items.map((person) => ({
    ...person,
    editCount: person.editCount ?? stableEditCount(person.id, person.name),
  }));
}

export function scopeLabel(scope: SelectedScope) {
  return scope.level === "global" ? "Toute la carte" : scope.label;
}

export function rankColorForPosition(rankIndex: number, total: number) {
  if (total <= 1) {
    return rankHeatStops.at(-1) ?? "#ff8714";
  }

  const safeRankIndex = Math.min(Math.max(rankIndex, 0), total - 1);
  const heat = 1 - safeRankIndex / (total - 1);
  const scaledHeat = heat * (rankHeatStops.length - 1);
  const stopIndex = Math.min(Math.floor(scaledHeat), rankHeatStops.length - 2);

  return mixColor(rankHeatStops[stopIndex], rankHeatStops[stopIndex + 1], scaledHeat - stopIndex);
}

export function randomInsideCity(center: [number, number], boundingBox?: [number, number, number, number]) {
  const maxLatOffset = 0.018;
  const maxLngOffset = 0.026;

  if (!boundingBox) {
    return [
      center[0] + (Math.random() - 0.5) * maxLatOffset,
      center[1] + (Math.random() - 0.5) * maxLngOffset,
    ] satisfies [number, number];
  }

  const [south, north, west, east] = boundingBox;
  const latSpread = Math.min(Math.max(north - south, 0.002), maxLatOffset);
  const lngSpread = Math.min(Math.max(east - west, 0.002), maxLngOffset);

  return [
    center[0] + (Math.random() - 0.5) * latSpread,
    center[1] + (Math.random() - 0.5) * lngSpread,
  ] satisfies [number, number];
}

export async function geocodeLocation(place: string) {
  const normalizedPlace = normalizeKey(place);
  const localPlace = localPlaces[normalizedPlace];

  if (localPlace) {
    return {
      ...localPlace,
      position: randomInsideCity(localPlace.position),
    };
  }

  const params = new URLSearchParams({
    addressdetails: "1",
    format: "json",
    limit: "1",
    q: place,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error("geocode_failed");
  }

  const results = (await response.json()) as {
    address?: {
      city?: string;
      country?: string;
      county?: string;
      municipality?: string;
      region?: string;
      state?: string;
      town?: string;
      village?: string;
    };
    boundingbox?: [string, string, string, string];
    lat: string;
    lon: string;
    type?: string;
  }[];
  const firstResult = results[0];

  if (!firstResult) {
    return {
      city: place,
      country: "France",
      position: randomInsideCity(localPlaces.france.position),
      region: "",
    };
  }

  const center = [Number(firstResult.lat), Number(firstResult.lon)] satisfies [number, number];
  const boundingBox = firstResult.boundingbox?.map(Number) as [number, number, number, number] | undefined;
  const address = firstResult.address ?? {};
  const cityName = address.city ?? address.town ?? address.village ?? address.municipality;
  const isCountryOnly = Boolean(address.country && !cityName && firstResult.type === "country");

  return {
    city: cityName ?? "",
    country: address.country ?? "Pays inconnu",
    position: isCountryOnly ? randomInsideCountry(center, boundingBox) : randomInsideCity(center, boundingBox),
    region: address.state ?? address.region ?? address.county ?? "",
  };
}

export function itemScopeMatches(scope: SelectedScope, selectedScope: SelectedScope) {
  if (selectedScope.level === "global" || scope.level === "global") {
    return true;
  }

  if (selectedScope.level === "country") {
    return scope.country === selectedScope.country;
  }

  if (selectedScope.level === "region") {
    return scope.country === selectedScope.country && scope.region === selectedScope.region;
  }

  return scope.country === selectedScope.country && scope.region === selectedScope.region && scope.city === selectedScope.city;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");

  return {
    b: Number.parseInt(normalized.slice(4, 6), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    r: Number.parseInt(normalized.slice(0, 2), 16),
  };
}

function rgbToHex({ b, g, r }: { b: number; g: number; r: number }) {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function mixColor(from: string, to: string, amount: number) {
  const start = hexToRgb(from);
  const end = hexToRgb(to);

  return rgbToHex({
    b: start.b + (end.b - start.b) * amount,
    g: start.g + (end.g - start.g) * amount,
    r: start.r + (end.r - start.r) * amount,
  });
}

function transparentHexColor(hex: string, alpha: number) {
  const { b, g, r } = hexToRgb(hex);

  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function randomInsideCountry(center: [number, number], boundingBox?: [number, number, number, number]) {
  if (!boundingBox) {
    return center;
  }

  const [south, north, west, east] = boundingBox;

  return [
    south + Math.random() * Math.max(north - south, 0),
    west + Math.random() * Math.max(east - west, 0),
  ] satisfies [number, number];
}

function personIcon(person: Person, expanded: boolean, rankColor: string, offset?: { x: number; y: number }) {
  const rankGlow = transparentHexColor(rankColor, .34);
  const safeName = escapeHtml(person.name);

  return L.divIcon({
    className: expanded ? "person-marker person-marker-expanded" : "person-marker",
    html: `
      <span
        class="person-stack"
        style="--person-x:${offset?.x ?? 0}px; --person-y:${offset?.y ?? 0}px;"
      >
        <span class="person-pin" style="--pin-color:${rankColor}; --pin-glow:${rankGlow}">
          <span class="person-head"></span>
          <span class="person-body"></span>
        </span>
        <strong>${safeName}</strong>
      </span>
    `,
    iconSize: [86, 62],
    iconAnchor: [43, 31],
  });
}

function groupIcon(group: PersonGroup, expanded: boolean) {
  const safeLabel = escapeHtml(group.label);

  return L.divIcon({
    className: expanded
      ? `city-cluster city-cluster-open city-cluster-${group.level}`
      : `city-cluster city-cluster-${group.level}`,
    html: `
      <span class="cluster-stack">
        <span class="cluster-count">${group.people.length}</span>
        <strong>${safeLabel}</strong>
      </span>
    `,
    iconSize: [260, 78],
    iconAnchor: [130, 39],
  });
}

function selectedScopeFromGroup(group: PersonGroup): SelectedScope {
  const firstPerson = group.people[0];

  if (group.level === "country") {
    return { level: "country", label: firstPerson.country, country: firstPerson.country };
  }

  if (group.level === "region") {
    return {
      level: "region",
      label: firstPerson.region,
      country: firstPerson.country,
      region: firstPerson.region,
    };
  }

  return {
    level: group.level,
    label: group.level === "touch" ? group.label : firstPerson.city,
    city: firstPerson.city,
    country: firstPerson.country,
    region: firstPerson.region,
  };
}

function distanceBetweenLatLng(first: [number, number], second: [number, number]) {
  return Math.hypot(first[0] - second[0], first[1] - second[1]);
}

function closestGroupToCenter(groups: PersonGroup[], center: [number, number]) {
  return groups.reduce<PersonGroup | null>((closestGroup, group) => {
    if (!closestGroup) {
      return group;
    }

    return distanceBetweenLatLng(group.center, center) < distanceBetweenLatLng(closestGroup.center, center)
      ? group
      : closestGroup;
  }, null);
}

function mostLikelyGroup(groups: PersonGroup[], target: [number, number]) {
  return groups.reduce<PersonGroup | null>((bestGroup, group) => {
    if (!bestGroup) {
      return group;
    }

    if (group.people.length !== bestGroup.people.length) {
      return group.people.length > bestGroup.people.length ? group : bestGroup;
    }

    return distanceBetweenLatLng(group.center, target) < distanceBetweenLatLng(bestGroup.center, target)
      ? group
      : bestGroup;
  }, null);
}

function zoomTargetFromGroup(group: PersonGroup) {
  if (group.level === "country") {
    const targetGroup = mostLikelyGroup(groupByLevel(group.people, "region"), group.center);

    return {
      bounds: boundsForPeople(group.people),
      center: targetGroup?.center ?? group.center,
      scope: targetGroup ? selectedScopeFromGroup(targetGroup) : selectedScopeFromGroup(group),
      zoom: nextZoomForLevel(group.level),
    };
  }

  if (group.level === "region") {
    const targetGroup = mostLikelyGroup(groupByLevel(group.people, "city"), group.center);

    return {
      bounds: boundsForPeople(group.people),
      center: targetGroup?.center ?? group.center,
      scope: targetGroup ? selectedScopeFromGroup(targetGroup) : selectedScopeFromGroup(group),
      zoom: nextZoomForLevel(group.level),
    };
  }

  if (group.level === "city") {
    const targetPerson = group.people.reduce<Person | null>((bestPerson, person) => {
      if (!bestPerson) {
        return person;
      }

      return distanceBetweenLatLng(person.position, group.center) < distanceBetweenLatLng(bestPerson.position, group.center)
        ? person
        : bestPerson;
    }, null);

    return {
      bounds: boundsForPeople(group.people),
      center: targetPerson?.position ?? group.center,
      scope: selectedScopeFromGroup(group),
      zoom: nextZoomForLevel(group.level),
    };
  }

  return {
    bounds: boundsForPeople(group.people),
    center: group.center,
    scope: selectedScopeFromGroup(group),
    zoom: nextZoomForLevel(group.level),
  };
}

function scopeForMapCenter(groups: PersonGroup[], map: L.Map): SelectedScope {
  const closestGroup = closestGroupToCenter(groups, [map.getCenter().lat, map.getCenter().lng]);

  if (!closestGroup) {
    return { level: "global", label: "Toute la carte" };
  }

  if (closestGroup.level === "touch") {
    const cityGroup = groupByLevel(closestGroup.people, "city")[0];

    return selectedScopeFromGroup(cityGroup ?? closestGroup);
  }

  return selectedScopeFromGroup(closestGroup);
}

function distanceBetweenPoints(first: L.Point, second: L.Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function averagePosition(items: Person[]) {
  const center = items.reduce<[number, number]>(
    (acc, person) => [acc[0] + person.position[0], acc[1] + person.position[1]],
    [0, 0],
  );

  return [center[0] / items.length, center[1] / items.length] satisfies [number, number];
}

function boundsForPeople(items: Person[]) {
  return L.latLngBounds(items.map((person) => person.position));
}

function groupTouchingPeople(items: Person[], map: L.Map) {
  const groups: Person[][] = [];

  for (const person of items) {
    const personPoint = map.latLngToContainerPoint(person.position);
    const touchingGroup = groups.find((group) =>
      group.some((groupPerson) =>
        distanceBetweenPoints(personPoint, map.latLngToContainerPoint(groupPerson.position)) < clusterDistancePx,
      ),
    );

    if (touchingGroup) {
      touchingGroup.push(person);
    } else {
      groups.push([person]);
    }
  }

  return groups.map<PersonGroup>((group) => ({
    id: touchGroupId(group),
    label: group.every((person) => normalizeKey(person.city) === normalizeKey(group[0].city))
      ? group[0].city
      : "Groupe",
    level: "touch",
    center: averagePosition(group),
    people: group,
  }));
}

function groupByLevel(items: Person[], level: Exclude<ClusterLevel, "touch">) {
  const grouped = new Map<string, Person[]>();

  for (const person of items) {
    const keyParts =
      level === "country"
        ? [person.country]
        : level === "region"
          ? [person.country, person.region]
          : [person.country, person.region, person.city];
    const key = keyParts.map(normalizeKey).join("|");

    grouped.set(key, [...(grouped.get(key) ?? []), person]);
  }

  return Array.from(grouped.entries()).map<PersonGroup>(([key, group]) => ({
    id: `${level}-${key}`,
    label: level === "country" ? group[0].country : level === "region" ? group[0].region : group[0].city,
    level,
    center: averagePosition(group),
    people: group,
  }));
}

function clusterLevelForZoom(zoom: number): ClusterLevel {
  if (zoom <= 4) {
    return "country";
  }

  if (zoom <= 6) {
    return "region";
  }

  if (zoom <= 9) {
    return "city";
  }

  return "touch";
}

function nextZoomForLevel(level: ClusterLevel) {
  if (level === "country") {
    return 5;
  }

  if (level === "region") {
    return 7;
  }

  if (level === "city") {
    return 10;
  }

  return 12;
}

function touchGroupId(items: Person[]) {
  return `touch-${items.map((person) => person.id).sort((a, b) => a - b).join("-")}`;
}

function groupContainsPendingOpen(group: PersonGroup, pendingOpenIds: number[] | null) {
  if (!pendingOpenIds) {
    return false;
  }

  const groupIds = group.people.map((person) => person.id).sort((a, b) => a - b).join("-");
  const pendingIds = [...pendingOpenIds].sort((a, b) => a - b).join("-");

  return groupIds === pendingIds;
}

function spiralOffset(index: number, total: number) {
  const angle = index * 1.9 - Math.PI / 2;
  const radius = 34 + index * 18 + Math.min(total, 6) * 2;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

function PersonMarkers({
  expandedGroupId,
  onPersonSelect,
  onScopeSelect,
  people,
  pendingOpenIds,
  setExpandedGroupId,
  setPendingOpenIds,
}: {
  expandedGroupId: string | null;
  onPersonSelect: (person: Person) => void;
  onScopeSelect: (scope: SelectedScope) => void;
  people: Person[];
  pendingOpenIds: number[] | null;
  setExpandedGroupId: (groupId: string | null) => void;
  setPendingOpenIds: (ids: number[] | null) => void;
}) {
  const map = useMap();
  const [mapVersion, setMapVersion] = useState(0);

  useMapEvents({
    moveend: () => setMapVersion((version) => version + 1),
    zoomend: () => setMapVersion((version) => version + 1),
  });

  const groups = useMemo(() => {
    void mapVersion;
    const level = clusterLevelForZoom(map.getZoom());

    if (level === "touch") {
      return groupTouchingPeople(people, map);
    }

    return groupByLevel(people, level);
  }, [map, mapVersion, people]);
  const rankColors = useMemo(() => {
    const rankedIds = [...people]
      .sort((first, second) => second.editCount - first.editCount)
      .map((person) => person.id);

    return new Map(rankedIds.map((id, index) => [id, rankColorForPosition(index, rankedIds.length)]));
  }, [people]);

  useEffect(() => {
    if (map.getZoom() <= 4) {
      onScopeSelect({ level: "global", label: "Toute la carte" });
      return;
    }

    onScopeSelect(scopeForMapCenter(groups, map));
  }, [groups, map, onScopeSelect]);

  useEffect(() => {
    if (expandedGroupId && !groups.some((group) => group.id === expandedGroupId)) {
      setExpandedGroupId(null);
    }
  }, [expandedGroupId, groups, setExpandedGroupId]);

  useEffect(() => {
    if (!pendingOpenIds) {
      return;
    }

    const targetGroup = groups.find((group) => groupContainsPendingOpen(group, pendingOpenIds));

    if (targetGroup?.level === "touch") {
      setExpandedGroupId(targetGroup.id);
      setPendingOpenIds(null);
    }
  }, [groups, pendingOpenIds, setExpandedGroupId, setPendingOpenIds]);

  return (
    <>
      {groups.map((group) => {
        const isExpanded = expandedGroupId === group.id;
        const showGroupMarker = !(group.level === "touch" && isExpanded);

        if (group.level === "touch" && group.people.length === 1) {
          const person = group.people[0];

          return (
            <Marker
              eventHandlers={{ click: () => onPersonSelect(person) }}
              icon={personIcon(person, false, rankColors.get(person.id) ?? person.color)}
              key={person.id}
              position={person.position}
            />
          );
        }

        return (
          <Fragment key={group.id}>
            {showGroupMarker && (
              <Marker
                eventHandlers={{
                  click: () => {
                    const target = zoomTargetFromGroup(group);
                    const targetZoom = Math.max(map.getZoom() + 1, target.zoom);

                    map.stop();
                    onScopeSelect(target.scope);

                    if (target.bounds.isValid()) {
                      map.fitBounds(target.bounds, {
                        animate: true,
                        maxZoom: targetZoom,
                        padding: [80, 80],
                      });
                    } else {
                      map.setView(target.center, targetZoom, { animate: true });
                    }

                    if (group.level === "touch") {
                      setExpandedGroupId(isExpanded ? null : group.id);
                      return;
                    }

                    if (group.level === "city") {
                      setPendingOpenIds(group.people.map((person) => person.id));
                      setExpandedGroupId(touchGroupId(group.people));
                      return;
                    }

                    setExpandedGroupId(null);
                  },
                }}
                icon={groupIcon(group, isExpanded)}
                position={group.center}
              />
            )}
            {isExpanded &&
              group.people.map((person, index) => {
                const offset = spiralOffset(index, group.people.length);

                return (
                  <Marker
                    eventHandlers={{ click: () => onPersonSelect(person) }}
                    icon={personIcon(person, true, rankColors.get(person.id) ?? person.color, offset)}
                    key={person.id}
                    position={group.center}
                    zIndexOffset={1000 + index}
                  />
                );
              })}
          </Fragment>
        );
      })}
    </>
  );
}

export function MapSection({
  expandedGroupId,
  onPersonSelect,
  onScopeSelect,
  pendingOpenIds,
  people,
  setExpandedGroupId,
  setPendingOpenIds,
}: {
  expandedGroupId: string | null;
  onPersonSelect: (person: Person) => void;
  onScopeSelect: (scope: SelectedScope) => void;
  pendingOpenIds: number[] | null;
  people: Person[];
  setExpandedGroupId: (groupId: string | null) => void;
  setPendingOpenIds: (ids: number[] | null) => void;
}) {
  return (
    <MapContainer center={[46.8, 2.2]} zoom={5} zoomControl={false} scrollWheelZoom className="leaflet-map">
      <ZoomControl position="topright" />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PersonMarkers
        expandedGroupId={expandedGroupId}
        onPersonSelect={onPersonSelect}
        onScopeSelect={onScopeSelect}
        pendingOpenIds={pendingOpenIds}
        people={people}
        setExpandedGroupId={setExpandedGroupId}
        setPendingOpenIds={setPendingOpenIds}
      />
    </MapContainer>
  );
}
