"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

type Person = {
  id: number;
  name: string;
  city: string;
  region: string;
  country: string;
  color: string;
  position: [number, number];
  editCount: number;
};

type UserProfile = {
  id: number;
  pseudo: string;
  city: string;
  region: string;
  country: string;
  position: [number, number] | null;
  visible: boolean;
  color: string;
};

type ClusterLevel = "country" | "region" | "city" | "touch";
type ActiveTab = "events" | "channels" | "discussion";
type MembershipRole = "creator" | "admin" | "member";
type SortMode = "recent" | "name" | "activity";

type SelectedScope = {
  level: ClusterLevel | "global";
  label: string;
  country?: string;
  region?: string;
  city?: string;
};

type Message = {
  id: number;
  targetType: "event" | "channel" | "thread";
  targetId: number;
  authorId: number;
  authorName: string;
  body: string;
  createdAt: string;
};

type Channel = {
  id: number;
  title: string;
  scope: SelectedScope;
  creatorId: number;
  admins: number[];
  createdAt: string;
};

type PrivateThread = {
  id: number;
  title: string;
  memberIds: number[];
  roles: Record<number, MembershipRole>;
  createdAt: string;
};

type MapEvent = {
  id: number;
  title: string;
  date: string;
  scope: SelectedScope;
  creatorId: number;
  admins: number[];
  participantIds: number[];
  createdAt: string;
};

type Report = {
  id: number;
  personId: number;
  reporterId: number;
  createdAt: string;
};

type PersonGroup = {
  id: string;
  label: string;
  level: ClusterLevel;
  center: [number, number];
  people: Person[];
};

const colorOptions = ["#256f56", "#d68b2f", "#b94c43", "#385f9f", "#7a559a"];
const clusterDistancePx = 58;
const peopleStorageKey = "open-food-map-people";
const profileStorageKey = "open-food-map-profile";
const channelsStorageKey = "open-food-map-channels";
const threadsStorageKey = "open-food-map-threads";
const eventsStorageKey = "open-food-map-events";
const messagesStorageKey = "open-food-map-messages";
const reportsStorageKey = "open-food-map-reports";

const fallbackAuthor = { id: 0, name: "Session locale" };
let localIdCounter = 200_000;

function createLocalId() {
  localIdCounter += 1;
  return localIdCounter;
}

const defaultPeople: Person[] = [
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

const localPlaces: Record<string, { city: string; country: string; position: [number, number]; region: string }> = {
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

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function textIncludes(value: string, query: string) {
  return normalizeKey(value).includes(normalizeKey(query));
}

function nowIso() {
  return new Date().toISOString();
}

function stableEditCount(id: number, name: string) {
  const source = `${id}:${name}`;
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % 9973;
  }

  return 12 + (hash % 480);
}

function stableProfileId(profile: Partial<UserProfile> | null) {
  if (profile?.id) {
    return profile.id;
  }

  return 50_000 + stableEditCount(profile?.position?.[0] ? Math.round(profile.position[0] * 1000) : 0, profile?.pseudo ?? "local");
}

function withEditCounts(items: Person[]) {
  return items.map((person) => ({
    ...person,
    editCount: person.editCount ?? stableEditCount(person.id, person.name),
  }));
}

function readLocal<T>(key: string, fallback: T) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const saved = window.localStorage.getItem(key);

  if (!saved) {
    return fallback;
  }

  try {
    return JSON.parse(saved) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function readProfile() {
  const savedProfile = readLocal<Partial<UserProfile> | null>(profileStorageKey, null);

  if (!savedProfile) {
    return null;
  }

  return {
    ...savedProfile,
    id: stableProfileId(savedProfile),
  } as UserProfile;
}

function withEventAdmins(items: MapEvent[]) {
  return items.map((eventItem) => ({
    ...eventItem,
    admins: eventItem.admins?.length ? eventItem.admins : [eventItem.creatorId],
  }));
}

function withChannelAdmins(items: Channel[]) {
  return items.map((channel) => ({
    ...channel,
    admins: channel.admins?.length ? channel.admins : [channel.creatorId],
  }));
}

function scopeLabel(scope: SelectedScope) {
  return scope.level === "global" ? "Toute la carte" : scope.label;
}

function itemActivity(messages: Message[], targetType: Message["targetType"], targetId: number) {
  const itemMessages = messages.filter((message) => message.targetType === targetType && message.targetId === targetId);
  const lastMessage = itemMessages.at(-1);

  return lastMessage ? Date.parse(lastMessage.createdAt) : 0;
}

function sortByMode<T extends { title: string; createdAt: string }>(
  items: T[],
  sortMode: SortMode,
  activityForItem: (item: T) => number,
) {
  return [...items].sort((first, second) => {
    if (sortMode === "name") {
      return first.title.localeCompare(second.title, "fr");
    }

    if (sortMode === "activity") {
      return activityForItem(second) - activityForItem(first);
    }

    return Date.parse(second.createdAt) - Date.parse(first.createdAt);
  });
}

function eventMatchesScope(eventItem: MapEvent, scope: SelectedScope) {
  if (scope.level === "global" || eventItem.scope.level === "global") {
    return true;
  }

  if (scope.level === "country") {
    return eventItem.scope.country === scope.country;
  }

  if (scope.level === "region") {
    return eventItem.scope.country === scope.country && eventItem.scope.region === scope.region;
  }

  return (
    eventItem.scope.country === scope.country &&
    eventItem.scope.region === scope.region &&
    eventItem.scope.city === scope.city
  );
}

function randomInsideCity(center: [number, number], boundingBox?: [number, number, number, number]) {
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

function personIcon(person: Person, expanded: boolean, offset?: { x: number; y: number }) {
  return L.divIcon({
    className: expanded ? "person-marker person-marker-expanded" : "person-marker",
    html: `
      <span
        class="person-stack"
        style="--person-x:${offset?.x ?? 0}px; --person-y:${offset?.y ?? 0}px;"
      >
        <span class="person-pin" style="--pin-color:${person.color}">
          <span class="person-head"></span>
          <span class="person-body"></span>
        </span>
        <strong>${person.name}</strong>
      </span>
    `,
    iconSize: [86, 62],
    iconAnchor: [43, 31],
  });
}

function groupIcon(group: PersonGroup, expanded: boolean) {
  return L.divIcon({
    className: expanded
      ? `city-cluster city-cluster-open city-cluster-${group.level}`
      : `city-cluster city-cluster-${group.level}`,
    html: `
      <span class="cluster-stack">
        <span class="cluster-count">${group.people.length}</span>
        <strong>${group.label}</strong>
      </span>
    `,
    iconSize: [260, 78],
    iconAnchor: [130, 39],
  });
}

async function geocodeLocation(place: string) {
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
      region: "Local",
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
      center: targetGroup?.center ?? group.center,
      scope: targetGroup ? selectedScopeFromGroup(targetGroup) : selectedScopeFromGroup(group),
      zoom: nextZoomForLevel(group.level),
    };
  }

  if (group.level === "region") {
    const targetGroup = mostLikelyGroup(groupByLevel(group.people, "city"), group.center);

    return {
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
      center: targetPerson?.position ?? group.center,
      scope: selectedScopeFromGroup(group),
      zoom: nextZoomForLevel(group.level),
    };
  }

  return {
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
  if (zoom <= 8) {
    return "country";
  }

  if (zoom <= 9) {
    return "region";
  }

  if (zoom <= 12) {
    return "city";
  }

  return "touch";
}

function nextZoomForLevel(level: ClusterLevel) {
  if (level === "country") {
    return 9;
  }

  if (level === "region") {
    return 10;
  }

  if (level === "city") {
    return 13;
  }

  return 15;
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

        if (group.people.length === 1) {
          const person = group.people[0];

          return (
            <Marker
              eventHandlers={{ click: () => onPersonSelect(person) }}
              icon={personIcon(person, false)}
              key={person.id}
              position={person.position}
            />
          );
        }

        return (
          <Fragment key={group.id}>
            <Marker
              eventHandlers={{
                click: () => {
                  const target = zoomTargetFromGroup(group);
                  const targetZoom = Math.max(map.getZoom() + 1, target.zoom);

                  map.stop();
                  onScopeSelect(target.scope);
                  map.setView(target.center, targetZoom, { animate: true });

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
            {isExpanded &&
              group.people.map((person, index) => {
                const offset = spiralOffset(index, group.people.length);

                return (
                  <Marker
                    eventHandlers={{ click: () => onPersonSelect(person) }}
                    icon={personIcon(person, true, offset)}
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

export default function FoodMap() {
  const [profile, setProfile] = useState<UserProfile | null>(() => readProfile());
  const [people, setPeople] = useState<Person[]>(() => withEditCounts(readLocal<Person[]>(peopleStorageKey, defaultPeople)));
  const [channels, setChannels] = useState<Channel[]>(() => withChannelAdmins(readLocal<Channel[]>(channelsStorageKey, [])));
  const [threads, setThreads] = useState<PrivateThread[]>(() => readLocal<PrivateThread[]>(threadsStorageKey, []));
  const [events, setEvents] = useState<MapEvent[]>(() =>
    withEventAdmins(readLocal<MapEvent[]>(eventsStorageKey, [
      {
        id: 1,
        title: "Table ouverte des producteurs",
        date: "2026-05-28",
        scope: { level: "city", label: "Paris", country: "France", region: "Ile-de-France", city: "Paris" },
        creatorId: 101,
        admins: [101],
        participantIds: [101],
        createdAt: "2026-05-20T10:00:00.000Z",
      },
      {
        id: 2,
        title: "Cuisine de quartier",
        date: "2026-05-30",
        scope: {
          level: "city",
          label: "Marseille",
          country: "France",
          region: "Provence-Alpes-Cote d'Azur",
          city: "Marseille",
        },
        creatorId: 104,
        admins: [104],
        participantIds: [104],
        createdAt: "2026-05-21T10:00:00.000Z",
      },
      {
        id: 3,
        title: "Cartographie des initiatives OFF",
        date: "2026-06-02",
        scope: { level: "global", label: "Toute la carte" },
        creatorId: 101,
        admins: [101],
        participantIds: [101, 102],
        createdAt: "2026-05-22T10:00:00.000Z",
      },
    ])),
  );
  const [messages, setMessages] = useState<Message[]>(() => readLocal<Message[]>(messagesStorageKey, []));
  const [reports, setReports] = useState<Report[]>(() => readLocal<Report[]>(reportsStorageKey, []));
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [pendingOpenIds, setPendingOpenIds] = useState<number[] | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("events");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState<SelectedScope>({
    level: "global",
    label: "Toute la carte",
  });
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [form, setForm] = useState({ invisible: false, place: "", pseudo: "" });
  const [eventForm, setEventForm] = useState({ date: "", title: "" });
  const [channelTitle, setChannelTitle] = useState("");
  const [threadForm, setThreadForm] = useState({ memberId: "", title: "" });
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [addAdminId, setAddAdminId] = useState("");
  const [addMemberId, setAddMemberId] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasProfile = profile !== null;
  const currentUser = profile ? { id: profile.id, name: profile.pseudo } : fallbackAuthor;
  const selectedPerson = selectedPersonId ? people.find((person) => person.id === selectedPersonId) ?? null : null;
  const rankedPeople = useMemo(
    () => [...people].sort((first, second) => second.editCount - first.editCount),
    [people],
  );

  const visibleEvents = useMemo(() => {
    const filtered = events.filter((eventItem) => {
      const itemMessages = messages
        .filter((message) => message.targetType === "event" && message.targetId === eventItem.id)
        .map((message) => message.body)
        .join(" ");
      const matchesSearch = [eventItem.title, scopeLabel(eventItem.scope), eventItem.date, itemMessages].some((value) =>
        textIncludes(value, search),
      );

      return eventMatchesScope(eventItem, selectedScope) && matchesSearch;
    });

    return sortByMode(filtered, sortMode, (eventItem) => itemActivity(messages, "event", eventItem.id));
  }, [events, messages, search, selectedScope, sortMode]);

  const visibleChannels = useMemo(() => {
    const filtered = channels.filter((channel) => {
      const itemMessages = messages
        .filter((message) => message.targetType === "channel" && message.targetId === channel.id)
        .map((message) => message.body)
        .join(" ");

      return [channel.title, scopeLabel(channel.scope), itemMessages].some((value) => textIncludes(value, search));
    });

    return sortByMode(filtered, sortMode, (channel) => itemActivity(messages, "channel", channel.id));
  }, [channels, messages, search, sortMode]);

  const visibleThreads = useMemo(() => {
    const filtered = threads.filter((thread) => {
      const names = thread.memberIds
        .map((memberId) => people.find((person) => person.id === memberId)?.name ?? profile?.pseudo ?? "")
        .join(" ");
      const itemMessages = messages
        .filter((message) => message.targetType === "thread" && message.targetId === thread.id)
        .map((message) => message.body)
        .join(" ");

      return [thread.title, names, itemMessages].some((value) => textIncludes(value, search));
    });

    return sortByMode(filtered, sortMode, (thread) => itemActivity(messages, "thread", thread.id));
  }, [messages, people, profile?.pseudo, search, sortMode, threads]);
  const openedEvent = activeTab === "events" && selectedEventId ? events.find((eventItem) => eventItem.id === selectedEventId) ?? null : null;
  const openedChannel =
    activeTab === "channels" && selectedChannelId
      ? channels.find((channel) => channel.id === selectedChannelId) ?? null
      : null;
  const openedThread =
    activeTab === "discussion" && selectedThreadId
      ? threads.find((thread) => thread.id === selectedThreadId) ?? null
      : null;
  const isChatOpen = Boolean(openedEvent || openedChannel || openedThread);

  useEffect(() => {
    window.localStorage.setItem(peopleStorageKey, JSON.stringify(people));
  }, [people]);

  useEffect(() => {
    if (profile) {
      window.localStorage.setItem(profileStorageKey, JSON.stringify(profile));
    }
  }, [profile]);

  useEffect(() => {
    window.localStorage.setItem(channelsStorageKey, JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    window.localStorage.setItem(threadsStorageKey, JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    window.localStorage.setItem(eventsStorageKey, JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    window.localStorage.setItem(messagesStorageKey, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    window.localStorage.setItem(reportsStorageKey, JSON.stringify(reports));
  }, [reports]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSaving(true);

    try {
      const pseudo = form.pseudo.trim();
      const place = form.place.trim();
      const visible = !form.invisible;
      let location: Awaited<ReturnType<typeof geocodeLocation>>;

      try {
        location = await geocodeLocation(place);
      } catch {
        location = {
          city: place,
          country: "France",
          position: randomInsideCity(localPlaces.france.position),
          region: "Local",
        };
      }
      const profileId = createLocalId();
      const nextProfile: UserProfile = {
        id: profileId,
        pseudo,
        city: location.city,
        region: location.region,
        country: location.country,
        position: visible ? location.position : null,
        visible,
        color: colorOptions[0],
      };

      setProfile(nextProfile);

      if (visible) {
        setPeople((currentPeople) => [
          ...currentPeople,
          {
            id: profileId,
            name: pseudo,
            city: location.city || location.country,
            region: location.region || location.country,
            country: location.country,
            color: colorOptions[0],
            position: location.position,
            editCount: stableEditCount(profileId, pseudo),
          },
        ]);
      }
    } catch {
      setStatus("Lieu introuvable. Essaie avec une ville ou un pays plus précis.");
    } finally {
      setIsSaving(false);
    }
  }

  function addMessage(targetType: Message["targetType"], targetId: number) {
    const key = `${targetType}-${targetId}`;
    const body = messageDrafts[key]?.trim();

    if (!body) {
      return;
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createLocalId(),
        targetType,
        targetId,
        authorId: currentUser.id,
        authorName: currentUser.name,
        body,
        createdAt: nowIso(),
      },
    ]);
    setMessageDrafts((drafts) => ({ ...drafts, [key]: "" }));
  }

  function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = eventForm.title.trim();

    if (!title || !eventForm.date) {
      return;
    }

    const id = createLocalId();
    setEvents((currentEvents) => [
      ...currentEvents,
      {
        id,
        title,
        date: eventForm.date,
        scope: selectedScope,
        creatorId: currentUser.id,
        admins: [currentUser.id],
        participantIds: [currentUser.id],
        createdAt: nowIso(),
      },
    ]);
    setSelectedEventId(id);
    setEventForm({ date: "", title: "" });
  }

  function createChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = channelTitle.trim();

    if (!title) {
      return;
    }

    const id = createLocalId();
    setChannels((currentChannels) => [
      ...currentChannels,
      {
        id,
        title,
        scope: selectedScope,
        creatorId: currentUser.id,
        admins: [currentUser.id],
        createdAt: nowIso(),
      },
    ]);
    setSelectedChannelId(id);
    setChannelTitle("");
  }

  function createThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const memberId = Number(threadForm.memberId);
    const member = people.find((person) => person.id === memberId);

    if (!member) {
      return;
    }

    const id = createLocalId();
    setThreads((currentThreads) => [
      ...currentThreads,
      {
        id,
        title: threadForm.title.trim() || `Discussion avec ${member.name}`,
        memberIds: Array.from(new Set([currentUser.id, member.id])),
        roles: { [currentUser.id]: "creator", [member.id]: "member" },
        createdAt: nowIso(),
      },
    ]);
    setSelectedThreadId(id);
    setThreadForm({ memberId: "", title: "" });
  }

  function openPrivateThread(person: Person) {
    const existing = threads.find(
      (thread) =>
        thread.memberIds.includes(currentUser.id) &&
        thread.memberIds.includes(person.id) &&
        thread.memberIds.length === 2,
    );

    if (existing) {
      setSelectedThreadId(existing.id);
    } else {
      const id = createLocalId();
      setThreads((currentThreads) => [
        ...currentThreads,
        {
          id,
          title: `Discussion avec ${person.name}`,
          memberIds: Array.from(new Set([currentUser.id, person.id])),
          roles: { [currentUser.id]: "creator", [person.id]: "member" },
          createdAt: nowIso(),
        },
      ]);
      setSelectedThreadId(id);
    }

    setActiveTab("discussion");
  }

  function addMemberToThread(threadId: number, personId: number) {
    if (!personId) {
      return;
    }

    setThreads((currentThreads) =>
      currentThreads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              memberIds: Array.from(new Set([...thread.memberIds, personId])),
              roles: { ...thread.roles, [personId]: thread.roles[personId] ?? "member" },
              title: thread.title.startsWith("Discussion avec") ? "Groupe local OFF" : thread.title,
            }
          : thread,
      ),
    );
    setAddMemberId("");
  }

  function personName(personId: number) {
    if (personId === currentUser.id) {
      return currentUser.name;
    }

    return people.find((person) => person.id === personId)?.name ?? `Utilisateur ${personId}`;
  }

  function addAdminToEvent(eventId: number, personId: number) {
    if (!personId) {
      return;
    }

    setEvents((currentEvents) =>
      currentEvents.map((eventItem) =>
        eventItem.id === eventId
          ? { ...eventItem, admins: Array.from(new Set([...(eventItem.admins ?? [eventItem.creatorId]), personId])) }
          : eventItem,
      ),
    );
    setAddAdminId("");
  }

  function addAdminToChannel(channelId: number, personId: number) {
    if (!personId) {
      return;
    }

    setChannels((currentChannels) =>
      currentChannels.map((channel) =>
        channel.id === channelId
          ? { ...channel, admins: Array.from(new Set([...(channel.admins ?? [channel.creatorId]), personId])) }
          : channel,
      ),
    );
    setAddAdminId("");
  }

  function promoteThreadAdmin(threadId: number, personId: number) {
    if (!personId) {
      return;
    }

    setThreads((currentThreads) =>
      currentThreads.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              memberIds: Array.from(new Set([...thread.memberIds, personId])),
              roles: { ...thread.roles, [personId]: "admin" },
            }
          : thread,
      ),
    );
    setAddAdminId("");
  }

  function updateEventConfig(eventId: number, updates: Partial<Pick<MapEvent, "date" | "title">>) {
    setEvents((currentEvents) =>
      currentEvents.map((eventItem) => (eventItem.id === eventId ? { ...eventItem, ...updates } : eventItem)),
    );
  }

  function updateChannelConfig(channelId: number, updates: Partial<Pick<Channel, "title">>) {
    setChannels((currentChannels) =>
      currentChannels.map((channel) => (channel.id === channelId ? { ...channel, ...updates } : channel)),
    );
  }

  function updateThreadConfig(threadId: number, updates: Partial<Pick<PrivateThread, "title">>) {
    setThreads((currentThreads) =>
      currentThreads.map((thread) => (thread.id === threadId ? { ...thread, ...updates } : thread)),
    );
  }

  function reportPerson(personId: number) {
    setReports((currentReports) => [
      ...currentReports,
      { id: createLocalId(), personId, reporterId: currentUser.id, createdAt: nowIso() },
    ]);
    setStatus("Signalement enregistré localement.");
  }

  function handlePersonSelect(person: Person) {
    setSelectedPersonId(person.id);
    setIsMobileMenuOpen(true);
  }

  function renderTools() {
    return (
      <div className="social-tools">
        <input
          aria-label="Recherche"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher"
          value={search}
        />
        <select aria-label="Tri" onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}>
          <option value="recent">Récent</option>
          <option value="name">Nom</option>
          <option value="activity">Activité</option>
        </select>
      </div>
    );
  }

  function closeChat() {
    setSelectedChannelId(null);
    setSelectedEventId(null);
    setSelectedThreadId(null);
    setIsConfigOpen(false);
  }

  function selectTab(tab: ActiveTab) {
    setActiveTab(tab);
    closeChat();
    setSelectedPersonId(null);
  }

  function renderComposer(targetType: Message["targetType"], targetId: number) {
    const key = `${targetType}-${targetId}`;
    return (
      <form
        className="chat-composer"
        onSubmit={(event) => {
          event.preventDefault();
          addMessage(targetType, targetId);
        }}
      >
        <input
          aria-label="Message"
          onChange={(event) => setMessageDrafts((drafts) => ({ ...drafts, [key]: event.target.value }))}
          placeholder="Écrire un message"
          value={messageDrafts[key] ?? ""}
        />
        <button type="submit">Envoyer</button>
      </form>
    );
  }

  function renderAdminPicker(label: string, value: string, onChange: (value: string) => void) {
    return (
      <select aria-label={label} onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">{label}</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>{person.name}</option>
        ))}
        {profile && !people.some((person) => person.id === profile.id) && (
          <option value={profile.id}>{profile.pseudo}</option>
        )}
      </select>
    );
  }

  function renderConfigPanel() {
    if (openedEvent) {
      const admins = openedEvent.admins ?? [openedEvent.creatorId];
      const canConfigure = openedEvent.creatorId === currentUser.id || admins.includes(currentUser.id);

      if (!canConfigure) {
        return <p className="config-note">Configuration réservée aux admins de l&apos;évènement.</p>;
      }

      return (
        <section className="config-panel" aria-label="Configuration évènement">
          <label>
            Titre
            <input
              onChange={(event) => updateEventConfig(openedEvent.id, { title: event.target.value })}
              value={openedEvent.title}
            />
          </label>
          <label>
            Date
            <input
              onChange={(event) => updateEventConfig(openedEvent.id, { date: event.target.value })}
              type="date"
              value={openedEvent.date}
            />
          </label>
          <div className="config-grid">
            <span>Portée</span>
            <strong>{scopeLabel(openedEvent.scope)}</strong>
            <span>Créateur</span>
            <strong>{personName(openedEvent.creatorId)}</strong>
            <span>Admins</span>
            <strong>{admins.map(personName).join(", ")}</strong>
          </div>
          <div className="config-row">
            {renderAdminPicker("Ajouter admin évènement", addAdminId, setAddAdminId)}
            <button onClick={() => addAdminToEvent(openedEvent.id, Number(addAdminId))} type="button">
              Ajouter admin
            </button>
          </div>
          <button
            className="ghost-button"
            onClick={() => setStatus("Action de modération évènement enregistrée localement.")}
            type="button"
          >
            Journaliser modération
          </button>
        </section>
      );
    }

    if (openedChannel) {
      const admins = openedChannel.admins ?? [openedChannel.creatorId];
      const canConfigure = openedChannel.creatorId === currentUser.id || admins.includes(currentUser.id);

      if (!canConfigure) {
        return <p className="config-note">Configuration réservée aux admins du canal.</p>;
      }

      return (
        <section className="config-panel" aria-label="Configuration canal">
          <label>
            Nom du canal
            <input
              onChange={(event) => updateChannelConfig(openedChannel.id, { title: event.target.value })}
              value={openedChannel.title}
            />
          </label>
          <div className="config-grid">
            <span>Portée</span>
            <strong>{scopeLabel(openedChannel.scope)}</strong>
            <span>Créateur</span>
            <strong>{personName(openedChannel.creatorId)}</strong>
            <span>Admins</span>
            <strong>{admins.map(personName).join(", ")}</strong>
          </div>
          <div className="config-row">
            {renderAdminPicker("Ajouter admin canal", addAdminId, setAddAdminId)}
            <button onClick={() => addAdminToChannel(openedChannel.id, Number(addAdminId))} type="button">
              Ajouter admin
            </button>
          </div>
          <button
            className="ghost-button"
            onClick={() => setStatus("Action de modération canal enregistrée localement.")}
            type="button"
          >
            Journaliser modération
          </button>
        </section>
      );
    }

    if (openedThread) {
      const canConfigure = openedThread.roles[currentUser.id] === "creator" || openedThread.roles[currentUser.id] === "admin";

      if (!canConfigure) {
        return <p className="config-note">Configuration réservée aux admins de la discussion.</p>;
      }

      return (
        <section className="config-panel" aria-label="Configuration discussion">
          <label>
            Nom de la discussion
            <input
              onChange={(event) => updateThreadConfig(openedThread.id, { title: event.target.value })}
              value={openedThread.title}
            />
          </label>
          <div className="config-grid">
            <span>Type</span>
            <strong>{openedThread.memberIds.length > 2 ? "Groupe" : "Privé"}</strong>
            <span>Membres</span>
            <strong>{openedThread.memberIds.map(personName).join(", ")}</strong>
            <span>Admins</span>
            <strong>
              {openedThread.memberIds
                .filter((memberId) => openedThread.roles[memberId] === "creator" || openedThread.roles[memberId] === "admin")
                .map(personName)
                .join(", ")}
            </strong>
          </div>
          <div className="config-row">
            {renderAdminPicker("Ajouter membre", addMemberId, setAddMemberId)}
            <button onClick={() => addMemberToThread(openedThread.id, Number(addMemberId))} type="button">
              Ajouter membre
            </button>
          </div>
          <div className="config-row">
            {renderAdminPicker("Promouvoir admin", addAdminId, setAddAdminId)}
            <button onClick={() => promoteThreadAdmin(openedThread.id, Number(addAdminId))} type="button">
              Promouvoir
            </button>
          </div>
          <button
            className="ghost-button"
            onClick={() => setStatus("Action de modération discussion enregistrée localement.")}
            type="button"
          >
            Journaliser modération
          </button>
        </section>
      );
    }

    return null;
  }

  function renderChatView({
    actions,
    meta,
    targetId,
    targetType,
    title,
  }: {
    actions?: ReactNode;
    meta: string;
    targetId: number;
    targetType: Message["targetType"];
    title: string;
  }) {
    const itemMessages = messages.filter((message) => message.targetType === targetType && message.targetId === targetId);

    return (
      <article className="chat-view">
        <header className="chat-header">
          <button aria-label="Retour à la liste" className="chat-back" onClick={closeChat} type="button">‹</button>
          <div>
            <p className="eyebrow">{meta}</p>
            <h2>{title}</h2>
          </div>
          <button
            aria-pressed={isConfigOpen}
            className="chat-config-button"
            onClick={() => setIsConfigOpen((isOpen) => !isOpen)}
            type="button"
          >
            Config
          </button>
        </header>
        {actions && <div className="chat-actions">{actions}</div>}
        {isConfigOpen && renderConfigPanel()}
        <div className="message-list chat-messages">
          {itemMessages.length > 0 ? (
            itemMessages.map((message) => (
              <p className="message-bubble" key={message.id}>
                <strong>{message.authorName}</strong>
                {message.body}
              </p>
            ))
          ) : (
            <p className="off-empty">Aucun message pour l&apos;instant.</p>
          )}
        </div>
        {renderComposer(targetType, targetId)}
      </article>
    );
  }

  return (
    <main className={hasProfile ? "map-shell" : "map-shell map-shell-login-open"}>
      <MapContainer center={[46.8, 2.2]} zoom={5} scrollWheelZoom className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <PersonMarkers
          expandedGroupId={expandedGroupId}
          onPersonSelect={handlePersonSelect}
          onScopeSelect={setSelectedScope}
          pendingOpenIds={pendingOpenIds}
          people={people}
          setExpandedGroupId={setExpandedGroupId}
          setPendingOpenIds={setPendingOpenIds}
        />
      </MapContainer>

      <section
        className={isMobileMenuOpen ? "off-menu off-menu-mobile-open" : "off-menu"}
        aria-label="Menu OFF"
        onClickCapture={(event) => {
          if (isMobileMenuOpen) {
            event.stopPropagation();
          }
        }}
        onPointerDownCapture={(event) => {
          if (isMobileMenuOpen) {
            event.stopPropagation();
          }
        }}
        onTouchMoveCapture={(event) => {
          if (isMobileMenuOpen) {
            event.stopPropagation();
          }
        }}
        onWheelCapture={(event) => {
          if (isMobileMenuOpen) {
            event.stopPropagation();
          }
        }}
      >
        <div className="off-menu-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logos/logo-variants/CMJN-ICON_WHITE_BG_OFF.svg" alt="" aria-hidden="true" />
          <p>Open Food Facts</p>
          <strong>{selectedScope.label}</strong>
        </div>

        <div className="off-tabs" role="tablist" aria-label="Rubriques OFF">
          <button
            aria-selected={activeTab === "events"}
            onClick={() => selectTab("events")}
            role="tab"
            type="button"
          >
            <span className="off-tab-icon" aria-hidden="true">●</span>
            Évènements
          </button>
          <button
            aria-selected={activeTab === "channels"}
            onClick={() => selectTab("channels")}
            role="tab"
            type="button"
          >
            <span className="off-tab-icon" aria-hidden="true">●</span>
            Canaux
          </button>
          <button
            aria-selected={activeTab === "discussion"}
            onClick={() => selectTab("discussion")}
            role="tab"
            type="button"
          >
            <span className="off-tab-icon" aria-hidden="true">●</span>
            Discussion
          </button>
        </div>

        <div className="off-panel">
          {selectedPerson && !isChatOpen && (
            <article className="profile-card">
              <div>
                <p className="eyebrow">Profil local</p>
                <h2>{selectedPerson.name}</h2>
                <p>
                  {selectedPerson.city}, {selectedPerson.region}, {selectedPerson.country}
                </p>
              </div>
              <dl>
                <div>
                  <dt>Éditions</dt>
                  <dd>{selectedPerson.editCount}</dd>
                </div>
                <div>
                  <dt>Rang local</dt>
                  <dd>#{rankedPeople.findIndex((person) => person.id === selectedPerson.id) + 1}</dd>
                </div>
              </dl>
              <div className="action-row">
                <button onClick={() => openPrivateThread(selectedPerson)} type="button">Message privé</button>
                <select
                  aria-label="Ajouter à une discussion"
                  onChange={(event) => {
                    const threadId = Number(event.target.value);
                    if (threadId) {
                      addMemberToThread(threadId, selectedPerson.id);
                    }
                    event.target.value = "";
                  }}
                >
                  <option value="">Ajouter à une discussion</option>
                  {threads.map((thread) => (
                    <option key={thread.id} value={thread.id}>{thread.title}</option>
                  ))}
                </select>
                <button className="ghost-button" onClick={() => reportPerson(selectedPerson.id)} type="button">
                  Signaler
                </button>
              </div>
            </article>
          )}

          {status && <strong className="form-status social-status">{status}</strong>}
          {!isChatOpen && renderTools()}

          {openedEvent &&
            renderChatView({
              actions: (
                <button
                  onClick={() =>
                    setEvents((currentEvents) =>
                      currentEvents.map((currentEvent) =>
                        currentEvent.id === openedEvent.id
                          ? {
                              ...currentEvent,
                              participantIds: openedEvent.participantIds.includes(currentUser.id)
                                ? currentEvent.participantIds.filter((id) => id !== currentUser.id)
                                : [...currentEvent.participantIds, currentUser.id],
                            }
                          : currentEvent,
                      ),
                    )
                  }
                  type="button"
                >
                  {openedEvent.participantIds.includes(currentUser.id) ? "Annuler participation" : "Participer"}
                </button>
              ),
              meta: `${openedEvent.date} · ${scopeLabel(openedEvent.scope)} · ${openedEvent.participantIds.length} participant(s)`,
              targetId: openedEvent.id,
              targetType: "event",
              title: openedEvent.title,
            })}

          {openedChannel &&
            renderChatView({
              actions: (
                <button
                  className="ghost-button"
                  onClick={() => setStatus("Signalement du canal enregistré localement.")}
                  type="button"
                >
                  Signaler canal
                </button>
              ),
              meta: `Canal public · ${scopeLabel(openedChannel.scope)} · ${openedChannel.admins.length} admin(s)`,
              targetId: openedChannel.id,
              targetType: "channel",
              title: openedChannel.title,
            })}

          {openedThread &&
            renderChatView({
              actions: (
                <button
                  className="ghost-button"
                  onClick={() => setStatus("Signalement de la discussion enregistré localement.")}
                  type="button"
                >
                  Signaler discussion
                </button>
              ),
              meta: `${openedThread.memberIds.length > 2 ? "Groupe" : "Privé"} · ${openedThread.memberIds.length} membre(s)`,
              targetId: openedThread.id,
              targetType: "thread",
              title: openedThread.title,
            })}

          {activeTab === "events" && !openedEvent && (
            <div className="social-section">
              <form className="inline-form" onSubmit={createEvent}>
                <input
                  aria-label="Titre événement"
                  onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })}
                  placeholder="Nouvel événement"
                  value={eventForm.title}
                />
                <input
                  aria-label="Date événement"
                  onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })}
                  type="date"
                  value={eventForm.date}
                />
                <button type="submit">Créer</button>
              </form>
              <div className="event-list">
                {visibleEvents.length > 0 ? (
                  visibleEvents.map((eventItem) => (
                      <article className="event-card social-card" key={eventItem.id}>
                        <button className="card-select" onClick={() => setSelectedEventId(eventItem.id)} type="button">
                          <time>
                            <span className="event-dot" aria-hidden="true" />
                            {eventItem.date}
                          </time>
                          <h2>{eventItem.title}</h2>
                          <p>
                            <span className="event-location-dot" aria-hidden="true" />
                            {scopeLabel(eventItem.scope)} · {eventItem.participantIds.length} participant(s)
                          </p>
                        </button>
                      </article>
                    ))
                ) : (
                  <p className="off-empty">Aucun évènement pour ce niveau.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "channels" && !openedChannel && (
            <div className="social-section">
              <form className="inline-form inline-form-row" onSubmit={createChannel}>
                <input
                  aria-label="Nom canal"
                  onChange={(event) => setChannelTitle(event.target.value)}
                  placeholder={`Canal public · ${selectedScope.label}`}
                  value={channelTitle}
                />
                <button type="submit">Créer</button>
              </form>
              <div className="event-list">
                {visibleChannels.length > 0 ? (
                  visibleChannels.map((channel) => (
                      <article className="event-card social-card" key={channel.id}>
                        <button className="card-select" onClick={() => setSelectedChannelId(channel.id)} type="button">
                          <time>
                            <span className="event-dot" aria-hidden="true" />
                            Canal public
                          </time>
                          <h2>{channel.title}</h2>
                          <p>
                            <span className="event-location-dot" aria-hidden="true" />
                            {scopeLabel(channel.scope)} · {channel.admins.length} admin(s)
                          </p>
                        </button>
                      </article>
                    ))
                ) : (
                  <p className="off-empty">Aucun canal local.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "discussion" && !openedThread && (
            <div className="social-section">
              <form className="inline-form" onSubmit={createThread}>
                <input
                  aria-label="Nom discussion"
                  onChange={(event) => setThreadForm({ ...threadForm, title: event.target.value })}
                  placeholder="Nom de discussion"
                  value={threadForm.title}
                />
                <select
                  aria-label="Membre"
                  onChange={(event) => setThreadForm({ ...threadForm, memberId: event.target.value })}
                  required
                  value={threadForm.memberId}
                >
                  <option value="">Membre</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
                <button type="submit">Créer</button>
              </form>
              <div className="event-list">
                {visibleThreads.length > 0 ? (
                  visibleThreads.map((thread) => (
                      <article className="event-card social-card" key={thread.id}>
                        <button className="card-select" onClick={() => setSelectedThreadId(thread.id)} type="button">
                          <time>
                            <span className="event-dot" aria-hidden="true" />
                            {thread.memberIds.length > 2 ? "Groupe" : "Privé"}
                          </time>
                          <h2>{thread.title}</h2>
                          <p>
                            <span className="event-location-dot" aria-hidden="true" />
                            {thread.memberIds.length} membre(s)
                          </p>
                        </button>
                      </article>
                    ))
                ) : (
                  <p className="off-empty">Aucune discussion locale.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {hasProfile && (
        <button
          aria-label={isMobileMenuOpen ? "Masquer le menu" : "Afficher le menu"}
          className={isMobileMenuOpen ? "off-menu-slider off-menu-slider-open" : "off-menu-slider"}
          onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
          type="button"
        >
          <span aria-hidden="true">{isMobileMenuOpen ? "‹" : "›"}</span>
        </button>
      )}

      {!hasProfile && (
        <div className="login-backdrop" role="presentation">
          <section
            className="login-modal"
            aria-label="Connexion locale"
            role="dialog"
            aria-modal="true"
          >
            <div className="login-modal-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logos/logo-variants/CMJN-ICON_WHITE_BG_OFF.svg" alt="" aria-hidden="true" />
              <p>Open Food Facts</p>
            </div>
            <h1>Connexion locale</h1>

            <form className="login-form" onSubmit={handleSubmit}>
              <label>
                Pseudo
                <input
                  autoFocus
                  onChange={(event) => setForm({ ...form, pseudo: event.target.value })}
                  placeholder="Ex: Nora"
                  required
                  value={form.pseudo}
                />
              </label>

              <label>
                Lieu
                <input
                  onChange={(event) => setForm({ ...form, place: event.target.value })}
                  placeholder="Ville ou pays"
                  required
                  value={form.place}
                />
              </label>

              <label className="visibility-row">
                <input
                  checked={form.invisible}
                  onChange={(event) => setForm({ ...form, invisible: event.target.checked })}
                  type="checkbox"
                />
                Ne pas être visible sur la carte
              </label>

              <button className="submit-person" disabled={isSaving} type="submit">
                <span className="submit-person-icon" aria-hidden="true" />
                {isSaving ? "Connexion..." : "Entrer"}
              </button>
            </form>

            {status && <strong className="form-status">{status}</strong>}
          </section>
        </div>
      )}
    </main>
  );
}
