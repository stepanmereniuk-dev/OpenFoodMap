"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import {
  MapSection,
  defaultPeople,
  geocodeLocation,
  itemScopeMatches,
  localPlaces,
  normalizeKey,
  randomInsideCity,
  rankColorForPosition,
  scopeLabel,
  stableEditCount,
  withEditCounts,
} from "./map-section";
import type { Person, SelectedScope, UserProfile } from "./map-section";

type ActiveTab = "events" | "channels" | "discussion";
type MembershipRole = "creator" | "admin" | "member";
type SortMode = "recent" | "name" | "activity";

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

type AuditLog = {
  id: number;
  label: string;
  detail: string;
  createdAt: string;
};

type ExactPersonInputState = {
  candidate: Person | null;
  completion: string | null;
  message: string | null;
};

const colorOptions = ["#256f56", "#d68b2f", "#b94c43", "#385f9f", "#7a559a"];
const listPageSize = 10;
const peopleStorageKey = "open-food-map-people";
const profileStorageKey = "open-food-map-profile";
const channelsStorageKey = "open-food-map-channels";
const threadsStorageKey = "open-food-map-threads";
const eventsStorageKey = "open-food-map-events";
const messagesStorageKey = "open-food-map-messages";
const reportsStorageKey = "open-food-map-reports";
const logsStorageKey = "open-food-map-logs";

const fallbackAuthor = { id: 0, name: "Session" };
let localIdCounter = 200_000;

function createLocalId() {
  localIdCounter += 1;
  return localIdCounter;
}

function textIncludes(value: string, query: string) {
  return normalizeKey(value).includes(normalizeKey(query));
}

function nowIso() {
  return new Date().toISOString();
}

function stableProfileId(profile: Partial<UserProfile> | null) {
  if (profile?.id) {
    return profile.id;
  }

  return 50_000 + stableEditCount(profile?.position?.[0] ? Math.round(profile.position[0] * 1000) : 0, profile?.pseudo ?? "local");
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

function writeLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can fail in private browsing or when quota is full; keep the in-memory session usable.
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

function targetKey(targetType: Message["targetType"], targetId: number) {
  return `${targetType}-${targetId}`;
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
  const [logs, setLogs] = useState<AuditLog[]>(() => readLocal<AuditLog[]>(logsStorageKey, []));
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
  const [visibleLimits, setVisibleLimits] = useState<Record<ActiveTab, number>>({
    channels: listPageSize,
    discussion: listPageSize,
    events: listPageSize,
  });
  const [form, setForm] = useState({ invisible: false, place: "", pseudo: "" });
  const [eventForm, setEventForm] = useState({ date: "", title: "" });
  const [channelTitle, setChannelTitle] = useState("");
  const [threadForm, setThreadForm] = useState({ memberQuery: "", title: "" });
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [addAdminQuery, setAddAdminQuery] = useState("");
  const [addMemberQuery, setAddMemberQuery] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isParticipantListOpen, setIsParticipantListOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasProfile = profile !== null;
  const currentUser = profile ? { id: profile.id, name: profile.pseudo } : fallbackAuthor;
  const selectedPerson = selectedPersonId ? people.find((person) => person.id === selectedPersonId) ?? null : null;
  const rankedPeople = useMemo(
    () => [...people].sort((first, second) => second.editCount - first.editCount),
    [people],
  );
  const selectedPersonRankIndex = selectedPerson
    ? rankedPeople.findIndex((person) => person.id === selectedPerson.id)
    : -1;
  const knownPeople = useMemo(() => {
    if (!profile || people.some((person) => person.id === profile.id)) {
      return people;
    }

    return [
      ...people,
      {
        id: profile.id,
        name: profile.pseudo,
        city: profile.city || profile.country,
        region: profile.region || profile.country,
        country: profile.country,
        color: profile.color,
        position: profile.position ?? localPlaces.france.position,
        editCount: stableEditCount(profile.id, profile.pseudo),
      },
    ];
  }, [people, profile]);
  const messageStats = useMemo(() => {
    const activity = new Map<string, number>();
    const counts = new Map<string, number>();
    const searchText = new Map<string, string[]>();

    for (const message of messages) {
      const key = targetKey(message.targetType, message.targetId);

      activity.set(key, Date.parse(message.createdAt));
      counts.set(key, (counts.get(key) ?? 0) + 1);
      searchText.set(key, [...(searchText.get(key) ?? []), message.body]);
    }

    return {
      activity,
      counts,
      searchText: new Map(Array.from(searchText.entries()).map(([key, bodies]) => [key, bodies.join(" ")])),
    };
  }, [messages]);

  useEffect(() => {
    if (hasProfile) {
      return;
    }

    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.touchAction = bodyTouchAction;
    };
  }, [hasProfile]);

  const visibleEvents = useMemo(() => {
    const filtered = events.filter((eventItem) => {
      const itemMessages = messageStats.searchText.get(targetKey("event", eventItem.id)) ?? "";
      const matchesSearch = [eventItem.title, scopeLabel(eventItem.scope), eventItem.date, itemMessages].some((value) =>
        textIncludes(value, search),
      );

      return itemScopeMatches(eventItem.scope, selectedScope) && matchesSearch;
    });

    return sortByMode(filtered, sortMode, (eventItem) => messageStats.activity.get(targetKey("event", eventItem.id)) ?? 0);
  }, [events, messageStats, search, selectedScope, sortMode]);

  const visibleChannels = useMemo(() => {
    const filtered = channels.filter((channel) => {
      const itemMessages = messageStats.searchText.get(targetKey("channel", channel.id)) ?? "";

      return (
        itemScopeMatches(channel.scope, selectedScope) &&
        [channel.title, scopeLabel(channel.scope), itemMessages].some((value) => textIncludes(value, search))
      );
    });

    return sortByMode(filtered, sortMode, (channel) => messageStats.activity.get(targetKey("channel", channel.id)) ?? 0);
  }, [channels, messageStats, search, selectedScope, sortMode]);

  const visibleThreads = useMemo(() => {
    const filtered = threads.filter((thread) => {
      const names = thread.memberIds
        .map((memberId) => people.find((person) => person.id === memberId)?.name ?? profile?.pseudo ?? "")
        .join(" ");
      const itemMessages = messageStats.searchText.get(targetKey("thread", thread.id)) ?? "";

      return [thread.title, names, itemMessages].some((value) => textIncludes(value, search));
    });

    return sortByMode(filtered, sortMode, (thread) => messageStats.activity.get(targetKey("thread", thread.id)) ?? 0);
  }, [messageStats, people, profile?.pseudo, search, sortMode, threads]);
  const displayedEvents = visibleEvents.slice(0, visibleLimits.events);
  const displayedChannels = visibleChannels.slice(0, visibleLimits.channels);
  const displayedThreads = visibleThreads.slice(0, visibleLimits.discussion);
  const openedEvent = activeTab === "events" && selectedEventId ? events.find((eventItem) => eventItem.id === selectedEventId) ?? null : null;
  const openedChannel =
    activeTab === "channels" && selectedChannelId
      ? channels.find((channel) => channel.id === selectedChannelId) ?? null
      : null;
  const openedThread =
    activeTab === "discussion" && selectedThreadId
      ? threads.find((thread) => thread.id === selectedThreadId) ?? null
      : null;
  useEffect(() => {
    writeLocal(peopleStorageKey, people);
  }, [people]);

  useEffect(() => {
    if (profile) {
      writeLocal(profileStorageKey, profile);
    }
  }, [profile]);

  useEffect(() => {
    writeLocal(channelsStorageKey, channels);
  }, [channels]);

  useEffect(() => {
    writeLocal(threadsStorageKey, threads);
  }, [threads]);

  useEffect(() => {
    writeLocal(eventsStorageKey, events);
  }, [events]);

  useEffect(() => {
    writeLocal(messagesStorageKey, messages);
  }, [messages]);

  useEffect(() => {
    writeLocal(reportsStorageKey, reports);
  }, [reports]);

  useEffect(() => {
    writeLocal(logsStorageKey, logs);
  }, [logs]);

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
          region: "",
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
    const member = exactPersonInputState(threadForm.memberQuery, [currentUser.id]).candidate;

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
    setThreadForm({ memberQuery: "", title: "" });
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
              title: thread.title.startsWith("Discussion avec") ? "Groupe OFF" : thread.title,
            }
          : thread,
      ),
    );
    setAddMemberQuery("");
  }

  function leaveThread(threadId: number) {
    const thread = threads.find((currentThread) => currentThread.id === threadId);

    if (!thread || thread.roles[currentUser.id] === "creator") {
      return;
    }

    setThreads((currentThreads) =>
      currentThreads.map((currentThread) => {
        if (currentThread.id !== threadId) {
          return currentThread;
        }

        const nextRoles = { ...currentThread.roles };
        delete nextRoles[currentUser.id];

        return {
          ...currentThread,
          memberIds: currentThread.memberIds.filter((memberId) => memberId !== currentUser.id),
          roles: nextRoles,
        };
      }),
    );
    setStatus("Discussion quittée.");
    closeChat();
  }

  function removeMemberFromThread(threadId: number, personId: number) {
    setThreads((currentThreads) =>
      currentThreads.map((thread) => {
        if (thread.id !== threadId || thread.roles[personId] === "creator") {
          return thread;
        }

        const nextRoles = { ...thread.roles };
        delete nextRoles[personId];

        return {
          ...thread,
          memberIds: thread.memberIds.filter((memberId) => memberId !== personId),
          roles: nextRoles,
        };
      }),
    );
  }

  function personName(personId: number) {
    if (personId === currentUser.id) {
      return currentUser.name;
    }

    return knownPeople.find((person) => person.id === personId)?.name ?? `Utilisateur ${personId}`;
  }

  function exactPersonInputState(query: string, excludedIds: number[] = []): ExactPersonInputState {
    const normalizedQuery = normalizeKey(query);
    const excluded = new Set(excludedIds);
    const admissiblePeople = knownPeople.filter((person) => !excluded.has(person.id));
    const candidate = normalizedQuery
      ? admissiblePeople.find((person) => normalizeKey(person.name) === normalizedQuery) ?? null
      : null;
    const completion = normalizedQuery
      ? admissiblePeople.find((person) => normalizeKey(person.name).startsWith(normalizedQuery))?.name ?? null
      : null;

    if (!normalizedQuery) {
      return { candidate: null, completion: null, message: null };
    }

    if (candidate) {
      return { candidate, completion: candidate.name, message: `${candidate.name} reconnu` };
    }

    if (knownPeople.some((person) => normalizeKey(person.name) === normalizedQuery)) {
      return { candidate: null, completion: null, message: "Déjà ajouté" };
    }

    return { candidate: null, completion, message: "Pseudo introuvable" };
  }

  function addLog(label: string, detail: string) {
    setLogs((currentLogs) => [
      { id: createLocalId(), label, detail, createdAt: nowIso() },
      ...currentLogs,
    ]);
    setIsLogModalOpen(true);
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
    setAddAdminQuery("");
  }

  function removeAdminFromEvent(eventId: number, personId: number) {
    setEvents((currentEvents) =>
      currentEvents.map((eventItem) =>
        eventItem.id === eventId && eventItem.creatorId !== personId
          ? { ...eventItem, admins: (eventItem.admins ?? [eventItem.creatorId]).filter((adminId) => adminId !== personId) }
          : eventItem,
      ),
    );
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
    setAddAdminQuery("");
  }

  function removeAdminFromChannel(channelId: number, personId: number) {
    setChannels((currentChannels) =>
      currentChannels.map((channel) =>
        channel.id === channelId && channel.creatorId !== personId
          ? { ...channel, admins: (channel.admins ?? [channel.creatorId]).filter((adminId) => adminId !== personId) }
          : channel,
      ),
    );
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
    setAddAdminQuery("");
  }

  function demoteThreadAdmin(threadId: number, personId: number) {
    setThreads((currentThreads) =>
      currentThreads.map((thread) =>
        thread.id === threadId && thread.roles[personId] !== "creator"
          ? { ...thread, roles: { ...thread.roles, [personId]: "member" } }
          : thread,
      ),
    );
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
    addLog("Signalement", `${personName(personId)} signalé par ${currentUser.name}`);
    setStatus("Signalement enregistré.");
  }

  function handlePersonSelect(person: Person) {
    setSelectedPersonId(person.id);
  }

  const resetVisibleLists = useCallback(() => {
    setVisibleLimits({
      channels: listPageSize,
      discussion: listPageSize,
      events: listPageSize,
    });
  }, []);

  const handleScopeSelect = useCallback((scope: SelectedScope) => {
    setSelectedScope((currentScope) =>
      currentScope.level === scope.level &&
      currentScope.label === scope.label &&
      currentScope.country === scope.country &&
      currentScope.region === scope.region &&
      currentScope.city === scope.city
        ? currentScope
        : scope,
    );
    resetVisibleLists();
  }, [resetVisibleLists]);

  function renderTools() {
    return (
      <div className="social-tools">
        <input
          aria-label="Recherche"
          onChange={(event) => {
            setSearch(event.target.value);
            resetVisibleLists();
          }}
          placeholder="Rechercher"
          value={search}
        />
        <select
          aria-label="Tri"
          onChange={(event) => {
            setSortMode(event.target.value as SortMode);
            resetVisibleLists();
          }}
          value={sortMode}
        >
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
    setIsParticipantListOpen(false);
  }

  function selectTab(tab: ActiveTab) {
    setActiveTab(tab);
    resetVisibleLists();
    closeChat();
    setSelectedPersonId(null);
  }

  function showMore(tab: ActiveTab) {
    setVisibleLimits((currentLimits) => ({
      ...currentLimits,
      [tab]: currentLimits[tab] + listPageSize,
    }));
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

  function renderExactPersonInput({
    actionLabel,
    excludedIds = [],
    label,
    onPick,
    query,
    setQuery,
  }: {
    actionLabel?: string;
    excludedIds?: number[];
    label: string;
    onPick?: (person: Person) => void;
    query: string;
    setQuery: (query: string) => void;
  }) {
    const state = exactPersonInputState(query, excludedIds);
    const completionSuffix =
      state.completion && normalizeKey(state.completion).startsWith(normalizeKey(query))
        ? state.completion.slice(query.length)
        : "";

    return (
      <div className={actionLabel ? "exact-picker" : "exact-picker exact-picker-single"}>
        <div className="exact-input-wrap">
          <input
            aria-label={label}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={label}
            value={query}
          />
          {query && completionSuffix && (
            <span aria-hidden="true" className="exact-completion">
              <span className="exact-completion-prefix">{query}</span>
              {completionSuffix}
            </span>
          )}
        </div>
        {actionLabel && (
          <button
            disabled={!state.candidate}
            onClick={() => {
              if (state.candidate && onPick) {
                onPick(state.candidate);
                setQuery("");
              }
            }}
            type="button"
          >
            {actionLabel}
          </button>
        )}
        {state.message && <small>{state.message}</small>}
      </div>
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
          </div>
          <div className="management-block">
            <h3>Admins</h3>
            <div className="member-list">
              {admins.map((adminId) => (
                <div key={adminId}>
                  <span>{personName(adminId)}</span>
                  {adminId !== openedEvent.creatorId && (
                    <button onClick={() => removeAdminFromEvent(openedEvent.id, adminId)} type="button">
                      Supprimer
                    </button>
                  )}
                </div>
              ))}
            </div>
            {renderExactPersonInput({
              actionLabel: "Ajouter",
              excludedIds: admins,
              label: "Pseudo exact admin",
              onPick: (person) => addAdminToEvent(openedEvent.id, person.id),
              query: addAdminQuery,
              setQuery: setAddAdminQuery,
            })}
          </div>
          <button
            className="ghost-button"
            onClick={() => addLog("Évènement", `Action de modération sur ${openedEvent.title}`)}
            type="button"
          >
            Ouvrir le journal
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
          </div>
          <div className="management-block">
            <h3>Admins</h3>
            <div className="member-list">
              {admins.map((adminId) => (
                <div key={adminId}>
                  <span>{personName(adminId)}</span>
                  {adminId !== openedChannel.creatorId && (
                    <button onClick={() => removeAdminFromChannel(openedChannel.id, adminId)} type="button">
                      Supprimer
                    </button>
                  )}
                </div>
              ))}
            </div>
            {renderExactPersonInput({
              actionLabel: "Ajouter",
              excludedIds: admins,
              label: "Pseudo exact admin",
              onPick: (person) => addAdminToChannel(openedChannel.id, person.id),
              query: addAdminQuery,
              setQuery: setAddAdminQuery,
            })}
          </div>
          <button
            className="ghost-button"
            onClick={() => addLog("Canal", `Action de modération sur ${openedChannel.title}`)}
            type="button"
          >
            Ouvrir le journal
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
          </div>
          <div className="management-block">
            <h3>Membres</h3>
            <div className="member-list">
              {openedThread.memberIds.map((memberId) => (
                <div key={memberId}>
                  <span>{personName(memberId)}</span>
                  <small>{openedThread.roles[memberId] === "creator" ? "Créateur" : openedThread.roles[memberId] === "admin" ? "Admin" : "Membre"}</small>
                  {openedThread.roles[memberId] !== "creator" && (
                    <button onClick={() => removeMemberFromThread(openedThread.id, memberId)} type="button">
                      Supprimer
                    </button>
                  )}
                </div>
              ))}
            </div>
            {renderExactPersonInput({
              actionLabel: "Ajouter",
              excludedIds: openedThread.memberIds,
              label: "Pseudo exact membre",
              onPick: (person) => addMemberToThread(openedThread.id, person.id),
              query: addMemberQuery,
              setQuery: setAddMemberQuery,
            })}
          </div>
          <div className="management-block">
            <h3>Admins</h3>
            <div className="member-list">
              {openedThread.memberIds
                .filter((memberId) => openedThread.roles[memberId] === "creator" || openedThread.roles[memberId] === "admin")
                .map((memberId) => (
                  <div key={memberId}>
                    <span>{personName(memberId)}</span>
                    <small>{openedThread.roles[memberId] === "creator" ? "Créateur" : "Admin"}</small>
                    {openedThread.roles[memberId] !== "creator" && (
                      <button onClick={() => demoteThreadAdmin(openedThread.id, memberId)} type="button">
                        Retirer admin
                      </button>
                    )}
                  </div>
                ))}
            </div>
            {renderExactPersonInput({
              actionLabel: "Promouvoir",
              excludedIds: openedThread.memberIds.filter(
                (memberId) => openedThread.roles[memberId] === "creator" || openedThread.roles[memberId] === "admin",
              ),
              label: "Pseudo exact admin",
              onPick: (person) => promoteThreadAdmin(openedThread.id, person.id),
              query: addAdminQuery,
              setQuery: setAddAdminQuery,
            })}
          </div>
          <button
            className="ghost-button"
            onClick={() => addLog("Discussion", `Action de modération sur ${openedThread.title}`)}
            type="button"
          >
            Ouvrir le journal
          </button>
        </section>
      );
    }

    return null;
  }

  function renderChatView({
    actions,
    afterConfigActions,
    beforeMessages,
    meta,
    targetId,
    targetType,
    title,
  }: {
    afterConfigActions?: ReactNode;
    actions?: ReactNode;
    beforeMessages?: ReactNode;
    meta: string;
    targetId: number;
    targetType: Message["targetType"];
    title: string;
  }) {
    const itemMessages = messages.filter((message) => message.targetType === targetType && message.targetId === targetId);

    return (
      <article className={isConfigOpen ? "chat-view chat-view-config-open" : "chat-view"}>
        <header className="chat-header">
          <button aria-label="Retour à la liste" className="chat-back" onClick={closeChat} type="button">‹</button>
          <div>
            <p className="eyebrow">{meta}</p>
            <h2>{title}</h2>
          </div>
        </header>
        <div className="chat-actions">
          <button
            aria-label="Configuration"
            aria-pressed={isConfigOpen}
            className="chat-config-button"
            onClick={() => setIsConfigOpen((isOpen) => !isOpen)}
            type="button"
          >
            <span className="material-icons chat-config-icon" aria-hidden="true">settings</span>
          </button>
          {actions}
          {afterConfigActions}
        </div>
        {isConfigOpen && renderConfigPanel()}
        {beforeMessages}
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
      <MapSection
        expandedGroupId={expandedGroupId}
        onPersonSelect={handlePersonSelect}
        onScopeSelect={handleScopeSelect}
        pendingOpenIds={pendingOpenIds}
        people={people}
        setExpandedGroupId={setExpandedGroupId}
        setPendingOpenIds={setPendingOpenIds}
      />

      <section
        className={isMobileMenuOpen ? "off-menu off-menu-mobile-open" : "off-menu"}
        aria-label="Menu OFF"
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
            <span className="material-icons off-tab-icon" aria-hidden="true">event</span>
            Évènements
          </button>
          <button
            aria-selected={activeTab === "channels"}
            onClick={() => selectTab("channels")}
            role="tab"
            type="button"
          >
            <span className="material-icons off-tab-icon" aria-hidden="true">forum</span>
            Canaux
          </button>
          <button
            aria-selected={activeTab === "discussion"}
            onClick={() => selectTab("discussion")}
            role="tab"
            type="button"
          >
            <span className="material-icons off-tab-icon" aria-hidden="true">chat</span>
            Discussion
          </button>
        </div>

        <div className="off-panel">
          {status && <strong className="form-status social-status">{status}</strong>}

          {openedEvent &&
            renderChatView({
              actions: (
                <>
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
                  <button
                    className="ghost-button"
                    onClick={() => setIsParticipantListOpen((isOpen) => !isOpen)}
                    type="button"
                  >
                    Participants
                  </button>
                </>
              ),
              beforeMessages: isParticipantListOpen ? (
                <section className="participant-panel" aria-label="Participants">
                  {openedEvent.participantIds.length > 0 ? (
                    <ul>
                      {openedEvent.participantIds.map((participantId) => (
                        <li key={participantId}>{personName(participantId)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="off-empty">Aucun participant.</p>
                  )}
                </section>
              ) : null,
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
                  onClick={() => {
                    addLog("Signalement", `Canal signalé : ${openedChannel.title}`);
                    setStatus("Signalement du canal enregistré.");
                  }}
                  type="button"
                >
                  Signaler canal
                </button>
              ),
              meta: `Canal public · ${scopeLabel(openedChannel.scope)} · ${messageStats.counts.get(targetKey("channel", openedChannel.id)) ?? 0} message(s)`,
              targetId: openedChannel.id,
              targetType: "channel",
              title: openedChannel.title,
            })}

          {openedThread &&
            renderChatView({
              actions: (
                <button
                  className="ghost-button"
                  onClick={() => {
                    addLog("Signalement", `Discussion signalée : ${openedThread.title}`);
                    setStatus("Signalement de la discussion enregistré.");
                  }}
                  type="button"
                >
                  Signaler discussion
                </button>
              ),
              afterConfigActions:
                openedThread.roles[currentUser.id] !== "creator" ? (
                  <button className="ghost-button" onClick={() => leaveThread(openedThread.id)} type="button">
                    Quitter
                  </button>
                ) : null,
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
              {renderTools()}
              <div className="event-list">
                {visibleEvents.length > 0 ? (
                  displayedEvents.map((eventItem) => (
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
              {visibleEvents.length > displayedEvents.length && (
                <button className="load-more-button" onClick={() => showMore("events")} type="button">
                  Voir plus
                </button>
              )}
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
              {renderTools()}
              <div className="event-list">
                {visibleChannels.length > 0 ? (
                  displayedChannels.map((channel) => (
                      <article className="event-card social-card" key={channel.id}>
                        <button className="card-select" onClick={() => setSelectedChannelId(channel.id)} type="button">
                          <time>
                            <span className="event-dot" aria-hidden="true" />
                            Canal public
                          </time>
                          <h2>{channel.title}</h2>
                          <p>
                            <span className="event-location-dot" aria-hidden="true" />
                            {scopeLabel(channel.scope)} · {messageStats.counts.get(targetKey("channel", channel.id)) ?? 0} message(s)
                          </p>
                        </button>
                      </article>
                    ))
                ) : (
                  <p className="off-empty">Aucun canal.</p>
                )}
              </div>
              {visibleChannels.length > displayedChannels.length && (
                <button className="load-more-button" onClick={() => showMore("channels")} type="button">
                  Voir plus
                </button>
              )}
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
                {renderExactPersonInput({
                  excludedIds: [currentUser.id],
                  label: "Pseudo exact membre",
                  query: threadForm.memberQuery,
                  setQuery: (memberQuery) => setThreadForm({ ...threadForm, memberQuery }),
                })}
                <button disabled={!exactPersonInputState(threadForm.memberQuery, [currentUser.id]).candidate} type="submit">
                  Créer
                </button>
              </form>
              {renderTools()}
              <div className="event-list">
                {visibleThreads.length > 0 ? (
                  displayedThreads.map((thread) => (
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
                  <p className="off-empty">Aucune discussion.</p>
                )}
              </div>
              {visibleThreads.length > displayedThreads.length && (
                <button className="load-more-button" onClick={() => showMore("discussion")} type="button">
                  Voir plus
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {selectedPerson && (
        <div className="map-modal-backdrop profile-modal-backdrop" role="presentation">
          <section aria-label="Profil" aria-modal="true" className="profile-modal" role="dialog">
            <button
              aria-label="Fermer le profil"
              className="modal-close profile-modal-close profile-modal-close-desktop"
              onClick={() => setSelectedPersonId(null)}
              type="button"
            >
              ×
            </button>
            <button
              aria-label="Fermer le profil"
              className="off-menu-slider off-menu-slider-open profile-modal-close-mobile"
              onClick={() => setSelectedPersonId(null)}
              type="button"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <div className="profile-modal-heading">
              <p className="eyebrow">Profil</p>
              <h2>{selectedPerson.name}</h2>
              <p>{[selectedPerson.city, selectedPerson.region, selectedPerson.country].filter(Boolean).join(", ")}</p>
            </div>
            <dl>
              <div>
                <dt>Éditions</dt>
                <dd>{selectedPerson.editCount}</dd>
              </div>
              <div>
                <dt>Rang</dt>
                <dd
                  className="profile-rank-value"
                  style={{ "--rank-color": rankColorForPosition(selectedPersonRankIndex, rankedPeople.length) } as CSSProperties}
                >
                  #{selectedPersonRankIndex + 1}
                </dd>
              </div>
            </dl>
            <div className="modal-actions">
              <button
                onClick={() => {
                  openPrivateThread(selectedPerson);
                  setSelectedPersonId(null);
                  setIsMobileMenuOpen(true);
                }}
                type="button"
              >
                Message privé
              </button>
              <button className="ghost-button" onClick={() => reportPerson(selectedPerson.id)} type="button">
                Signaler
              </button>
            </div>
            <div className="management-block">
              <h3>Historique</h3>
            </div>
          </section>
        </div>
      )}

      {isLogModalOpen && (
        <div className="map-modal-backdrop" role="presentation">
          <section aria-label="Journal" aria-modal="true" className="log-modal" role="dialog">
            <button
              aria-label="Fermer le journal"
              className="modal-close"
              onClick={() => setIsLogModalOpen(false)}
              type="button"
            >
              ×
            </button>
            <p className="eyebrow">Journal</p>
            <h2>Actions</h2>
            <div className="log-list">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <article key={log.id}>
                    <time>{new Date(log.createdAt).toLocaleString("fr-FR")}</time>
                    <strong>{log.label}</strong>
                    <p>{log.detail}</p>
                  </article>
                ))
              ) : (
                <p className="off-empty">Aucune action enregistrée.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {hasProfile && !selectedPerson && (
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
            aria-label="Connexion"
            role="dialog"
            aria-modal="true"
          >
            <div className="login-modal-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logos/logo-variants/CMJN-ICON_WHITE_BG_OFF.svg" alt="" aria-hidden="true" />
              <p>Open Food Facts</p>
            </div>
            <h1>Connexion</h1>

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
