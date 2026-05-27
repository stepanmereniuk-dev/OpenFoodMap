"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import {
  MapSection,
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
import { createOffItem, getOffMessages, getOffProfiles, getOffState, updateOffItem } from "../lib/api";

type ActiveTab = "events" | "channels" | "discussion";
type MembershipRole = "creator" | "admin" | "member";
type SortMode = "recent" | "name" | "activity";

type Message = {
  id: string;
  targetType: "event" | "channel" | "thread";
  targetId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

type Channel = {
  id: string;
  title: string;
  scope: SelectedScope;
  creatorId: string;
  admins: string[];
  createdAt: string;
};

type PrivateThread = {
  id: string;
  title: string;
  memberIds: string[];
  roles: Record<string, MembershipRole>;
  createdAt: string;
};

type MapEvent = {
  id: string;
  title: string;
  date: string;
  scope: SelectedScope;
  creatorId: string;
  admins: string[];
  participantIds: string[];
  createdAt: string;
};

type Report = {
  id: string;
  personId: string;
  reporterId: string;
  createdAt: string;
};

type AuditLog = {
  id: string;
  label: string;
  detail: string;
  createdAt: string;
};

type OffState = {
  audit_logs?: AuditLog[];
  channels?: Channel[];
  events?: MapEvent[];
  messages?: Message[];
  profiles?: UserProfile[];
  reports?: Report[];
  threads?: PrivateThread[];
};

type ExactPersonInputState = {
  candidate: Person | null;
  completion: string | null;
  message: string | null;
};

const colorOptions = ["#256f56", "#d68b2f", "#b94c43", "#385f9f", "#7a559a"];
const listPageSize = 10;
const profileIdStorageKey = "open-food-map-profile-id";

const fallbackAuthor = { id: "session", name: "Session" };

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function textIncludes(value: string, query: string) {
  return normalizeKey(value).includes(normalizeKey(query));
}

function nowIso() {
  return new Date().toISOString();
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

function targetKey(targetType: Message["targetType"], targetId: string) {
  return `${targetType}-${targetId}`;
}

function profileToPerson(profile: UserProfile): Person {
  return {
    id: profile.id,
    name: profile.pseudo,
    city: profile.city || profile.country,
    region: profile.region || profile.country,
    country: profile.country,
    color: profile.color,
    position: profile.position ?? localPlaces.france.position,
    editCount: stableEditCount(profile.id, profile.pseudo),
  };
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function normalizeScope(scope: SelectedScope | undefined): SelectedScope {
  return scope?.level ? scope : { level: "global", label: "Toute la carte" };
}

function normalizeEvent(eventItem: Partial<MapEvent> & { start_date?: string }): MapEvent {
  const creatorId = String(eventItem.creatorId ?? fallbackAuthor.id);

  return {
    id: String(eventItem.id ?? createLocalId()),
    title: eventItem.title ?? "Évènement",
    date: eventItem.date ?? eventItem.start_date?.slice(0, 10) ?? "",
    scope: normalizeScope(eventItem.scope),
    creatorId,
    admins: (eventItem.admins ?? [creatorId]).map(String),
    participantIds: (eventItem.participantIds ?? []).map(String),
    createdAt: eventItem.createdAt ?? nowIso(),
  };
}

function normalizeChannel(channel: Partial<Channel>): Channel {
  const creatorId = String(channel.creatorId ?? fallbackAuthor.id);

  return {
    id: String(channel.id ?? createLocalId()),
    title: channel.title ?? "Canal",
    scope: normalizeScope(channel.scope),
    creatorId,
    admins: (channel.admins ?? [creatorId]).map(String),
    createdAt: channel.createdAt ?? nowIso(),
  };
}

function normalizeThread(thread: Partial<PrivateThread>): PrivateThread {
  return {
    id: String(thread.id ?? createLocalId()),
    title: thread.title ?? "Discussion",
    memberIds: (thread.memberIds ?? []).map(String),
    roles: Object.fromEntries(Object.entries(thread.roles ?? {}).map(([key, value]) => [String(key), value])),
    createdAt: thread.createdAt ?? nowIso(),
  };
}

function normalizeMessage(message: Partial<Message>): Message {
  return {
    id: String(message.id ?? createLocalId()),
    targetType: message.targetType ?? "event",
    targetId: String(message.targetId ?? ""),
    authorId: String(message.authorId ?? fallbackAuthor.id),
    authorName: message.authorName ?? fallbackAuthor.name,
    body: message.body ?? "",
    createdAt: message.createdAt ?? nowIso(),
  };
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const exists = items.some((currentItem) => currentItem.id === item.id);

  if (!exists) {
    return [...items, item];
  }

  return items.map((currentItem) => (currentItem.id === item.id ? item : currentItem));
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
  const [profileId, setProfileId] = useState<string | null>(() => readLocal<string | null>(profileIdStorageKey, null));
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [threads, setThreads] = useState<PrivateThread[]>([]);
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [, setReports] = useState<Report[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [pendingOpenIds, setPendingOpenIds] = useState<string[] | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("events");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedScope, setSelectedScope] = useState<SelectedScope>({
    level: "global",
    label: "Toute la carte",
  });
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
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
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
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
  const activeChatTarget = useMemo(() =>
    openedEvent
      ? { targetId: openedEvent.id, targetType: "event" as const }
      : openedChannel
        ? { targetId: openedChannel.id, targetType: "channel" as const }
        : openedThread
          ? { targetId: openedThread.id, targetType: "thread" as const }
          : null,
    [openedChannel, openedEvent, openedThread],
  );
  const activeChatMessageCount = useMemo(() => {
    if (!activeChatTarget) {
      return 0;
    }

    return messages.filter(
      (message) =>
        message.targetType === activeChatTarget.targetType &&
        message.targetId === activeChatTarget.targetId,
    ).length;
  }, [activeChatTarget, messages]);
  const applyProfiles = useCallback((profileItems: UserProfile[]) => {
    const profiles = uniqueById(profileItems.map((currentProfile) => ({ ...currentProfile, id: String(currentProfile.id) })));

    setPeople(withEditCounts(profiles.filter((item) => item.visible && item.position).map(profileToPerson)));

    if (profileId) {
      setProfile(profiles.find((item) => item.id === profileId) ?? null);
    }
  }, [profileId]);
  const refreshOffState = useCallback(async (showError = false) => {
    try {
      const state = await getOffState<OffState>();

      applyProfiles(state.profiles ?? []);
      setChannels(uniqueById((state.channels ?? []).map(normalizeChannel)));
      setThreads(uniqueById((state.threads ?? []).map(normalizeThread)));
      setEvents(uniqueById((state.events ?? []).map(normalizeEvent)));
      setMessages(uniqueById((state.messages ?? []).map(normalizeMessage)));
      setReports(uniqueById((state.reports ?? []).map((report) => ({ ...report, id: String(report.id) }))));
      setLogs(uniqueById((state.audit_logs ?? []).map((log) => ({ ...log, id: String(log.id) }))));
    } catch {
      if (showError) {
        setStatus("Connexion serveur impossible. Les données Mongo ne sont pas disponibles.");
      }
    }
  }, [applyProfiles]);
  const refreshProfiles = useCallback(async () => {
    try {
      const data = await getOffProfiles<UserProfile>();

      applyProfiles(data.profiles ?? []);
    } catch {
      // The map keeps the last known players if a background refresh fails.
    }
  }, [applyProfiles]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshOffState(true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshOffState]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshProfiles();
    }, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refreshProfiles]);

  useEffect(() => {
    if (!activeChatTarget) {
      return;
    }

    let isMounted = true;
    const { targetId, targetType } = activeChatTarget;

    async function refreshChatMessages() {
      try {
        const data = await getOffMessages<Message>(targetType, targetId);

        if (!isMounted) {
          return;
        }

        const nextMessages = uniqueById(data.messages.map(normalizeMessage));
        setMessages((currentMessages) => [
          ...currentMessages.filter(
            (message) =>
              message.targetType !== targetType ||
              message.targetId !== targetId,
          ),
          ...nextMessages,
        ]);
      } catch {
        // Keep the current chat usable if a background refresh fails.
      }
    }

    void refreshChatMessages();
    const intervalId = window.setInterval(() => {
      void refreshChatMessages();
    }, 2000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [activeChatTarget]);

  useEffect(() => {
    const messageList = chatMessagesRef.current;

    if (!messageList) {
      return;
    }

    messageList.scrollTop = messageList.scrollHeight;
  }, [activeChatMessageCount, activeChatTarget]);

  useEffect(() => {
    if (profileId) {
      writeLocal(profileIdStorageKey, profileId);
    }
  }, [profileId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSaving(true);

    try {
      const formData = new FormData(event.currentTarget);
      const pseudo = String(formData.get("pseudo") ?? form.pseudo).trim();
      const place = String(formData.get("place") ?? form.place).trim();
      const visible = !formData.has("invisible");
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
      const nextProfile = await createOffItem<UserProfile>("profiles", {
        id: profileId,
        pseudo,
        city: location.city,
        region: location.region,
        country: location.country,
        position: visible ? location.position : null,
        visible,
        color: colorOptions[0],
      });

      setProfile(nextProfile);
      setProfileId(nextProfile.id);

      if (visible) {
        setPeople((currentPeople) => [...currentPeople, profileToPerson(nextProfile)]);
      }
    } catch {
      setStatus("Profil non enregistré: MongoDB est indisponible.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addMessage(targetType: Message["targetType"], targetId: string) {
    const key = `${targetType}-${targetId}`;
    const body = messageDrafts[key]?.trim();

    if (!body) {
      return;
    }

    try {
      const message = await createOffItem<Message>("messages", {
        id: createLocalId(),
        targetType,
        targetId,
        authorId: currentUser.id,
        authorName: currentUser.name,
        body,
        createdAt: nowIso(),
      });
      setMessages((currentMessages) => upsertById(currentMessages, message));
      setMessageDrafts((drafts) => ({ ...drafts, [key]: "" }));
    } catch {
      setStatus("Message non envoyé: MongoDB est indisponible.");
    }
  }

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = eventForm.title.trim();

    if (!title || !eventForm.date) {
      return;
    }

    const id = createLocalId();
    try {
      const createdEvent = await createOffItem<MapEvent>("events", {
        id,
        title,
        date: eventForm.date,
        scope: selectedScope,
        creatorId: currentUser.id,
        admins: [currentUser.id],
        participantIds: [currentUser.id],
        createdAt: nowIso(),
      });
      setEvents((currentEvents) => [...currentEvents, createdEvent]);
      setSelectedEventId(createdEvent.id);
      setEventForm({ date: "", title: "" });
    } catch {
      setStatus("Évènement non créé: MongoDB est indisponible.");
    }
  }

  async function createChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = channelTitle.trim();

    if (!title) {
      return;
    }

    const id = createLocalId();
    try {
      const channel = await createOffItem<Channel>("channels", {
        id,
        title,
        scope: selectedScope,
        creatorId: currentUser.id,
        admins: [currentUser.id],
        createdAt: nowIso(),
      });
      setChannels((currentChannels) => [...currentChannels, channel]);
      setSelectedChannelId(channel.id);
      setChannelTitle("");
    } catch {
      setStatus("Canal non créé: MongoDB est indisponible.");
    }
  }

  async function createThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const member = exactPersonInputState(threadForm.memberQuery, [currentUser.id]).candidate;

    if (!member) {
      return;
    }

    const id = createLocalId();
    try {
      const thread = await createOffItem<PrivateThread>("threads", {
        id,
        title: threadForm.title.trim() || `Discussion avec ${member.name}`,
        memberIds: Array.from(new Set([currentUser.id, member.id])),
        roles: { [currentUser.id]: "creator", [member.id]: "member" },
        createdAt: nowIso(),
      });
      setThreads((currentThreads) => [...currentThreads, thread]);
      setSelectedThreadId(thread.id);
      setThreadForm({ memberQuery: "", title: "" });
    } catch {
      setStatus("Discussion non créée: MongoDB est indisponible.");
    }
  }

  async function openPrivateThread(person: Person) {
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
      try {
        const thread = await createOffItem<PrivateThread>("threads", {
          id,
          title: `Discussion avec ${person.name}`,
          memberIds: Array.from(new Set([currentUser.id, person.id])),
          roles: { [currentUser.id]: "creator", [person.id]: "member" },
          createdAt: nowIso(),
        });
        setThreads((currentThreads) => [...currentThreads, thread]);
        setSelectedThreadId(thread.id);
      } catch {
        setStatus("Discussion non créée: MongoDB est indisponible.");
        return;
      }
    }

    setActiveTab("discussion");
  }

  async function addMemberToThread(threadId: string, personId: string) {
    if (!personId) {
      return;
    }

    const thread = threads.find((item) => item.id === threadId);
    if (!thread) {
      return;
    }

    try {
      const savedThread = await updateOffItem<PrivateThread>("threads", {
        ...thread,
        memberIds: Array.from(new Set([...thread.memberIds, personId])),
        roles: { ...thread.roles, [personId]: thread.roles[personId] ?? "member" },
        title: thread.title.startsWith("Discussion avec") ? "Groupe OFF" : thread.title,
      });
      setThreads((currentThreads) => currentThreads.map((item) => (item.id === threadId ? savedThread : item)));
      setAddMemberQuery("");
    } catch {
      setStatus("Membre non ajouté: MongoDB est indisponible.");
    }
  }

  async function leaveThread(threadId: string) {
    const thread = threads.find((currentThread) => currentThread.id === threadId);

    if (!thread || thread.roles[currentUser.id] === "creator") {
      return;
    }

    const nextRoles = { ...thread.roles };
    delete nextRoles[currentUser.id];

    try {
      const savedThread = await updateOffItem<PrivateThread>("threads", {
        ...thread,
        memberIds: thread.memberIds.filter((memberId) => memberId !== currentUser.id),
        roles: nextRoles,
      });
      setThreads((currentThreads) => currentThreads.map((item) => (item.id === threadId ? savedThread : item)));
      setStatus("Discussion quittée.");
      closeChat();
    } catch {
      setStatus("Discussion non quittée: MongoDB est indisponible.");
    }
  }

  async function removeMemberFromThread(threadId: string, personId: string) {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread || thread.roles[personId] === "creator") {
      return;
    }

    const nextRoles = { ...thread.roles };
    delete nextRoles[personId];

    try {
      const savedThread = await updateOffItem<PrivateThread>("threads", {
        ...thread,
        memberIds: thread.memberIds.filter((memberId) => memberId !== personId),
        roles: nextRoles,
      });
      setThreads((currentThreads) => currentThreads.map((item) => (item.id === threadId ? savedThread : item)));
    } catch {
      setStatus("Membre non supprimé: MongoDB est indisponible.");
    }
  }

  function personName(personId: string) {
    if (personId === currentUser.id) {
      return currentUser.name;
    }

    return knownPeople.find((person) => person.id === personId)?.name ?? `Utilisateur ${personId}`;
  }

  function exactPersonInputState(query: string, excludedIds: string[] = []): ExactPersonInputState {
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

  async function addLog(label: string, detail: string) {
    try {
      const log = await createOffItem<AuditLog>("audit_logs", { id: createLocalId(), label, detail, createdAt: nowIso() });
      setLogs((currentLogs) => [log, ...currentLogs]);
      setIsLogModalOpen(true);
    } catch {
      setStatus("Journal non enregistré: MongoDB est indisponible.");
    }
  }

  async function addAdminToEvent(eventId: string, personId: string) {
    if (!personId) {
      return;
    }

    const eventItem = events.find((item) => item.id === eventId);
    if (!eventItem) {
      return;
    }

    try {
      const savedEvent = await updateOffItem<MapEvent>("events", {
        ...eventItem,
        admins: Array.from(new Set([...(eventItem.admins ?? [eventItem.creatorId]), personId])),
      });
      setEvents((currentEvents) => currentEvents.map((item) => (item.id === eventId ? savedEvent : item)));
      setAddAdminQuery("");
    } catch {
      setStatus("Admin non ajouté: MongoDB est indisponible.");
    }
  }

  async function removeAdminFromEvent(eventId: string, personId: string) {
    const eventItem = events.find((item) => item.id === eventId);
    if (!eventItem || eventItem.creatorId === personId) {
      return;
    }

    try {
      const savedEvent = await updateOffItem<MapEvent>("events", {
        ...eventItem,
        admins: (eventItem.admins ?? [eventItem.creatorId]).filter((adminId) => adminId !== personId),
      });
      setEvents((currentEvents) => currentEvents.map((item) => (item.id === eventId ? savedEvent : item)));
    } catch {
      setStatus("Admin non supprimé: MongoDB est indisponible.");
    }
  }

  async function addAdminToChannel(channelId: string, personId: string) {
    if (!personId) {
      return;
    }

    const channel = channels.find((item) => item.id === channelId);
    if (!channel) {
      return;
    }

    try {
      const savedChannel = await updateOffItem<Channel>("channels", {
        ...channel,
        admins: Array.from(new Set([...(channel.admins ?? [channel.creatorId]), personId])),
      });
      setChannels((currentChannels) => currentChannels.map((item) => (item.id === channelId ? savedChannel : item)));
      setAddAdminQuery("");
    } catch {
      setStatus("Admin non ajouté: MongoDB est indisponible.");
    }
  }

  async function removeAdminFromChannel(channelId: string, personId: string) {
    const channel = channels.find((item) => item.id === channelId);
    if (!channel || channel.creatorId === personId) {
      return;
    }

    try {
      const savedChannel = await updateOffItem<Channel>("channels", {
        ...channel,
        admins: (channel.admins ?? [channel.creatorId]).filter((adminId) => adminId !== personId),
      });
      setChannels((currentChannels) => currentChannels.map((item) => (item.id === channelId ? savedChannel : item)));
    } catch {
      setStatus("Admin non supprimé: MongoDB est indisponible.");
    }
  }

  async function promoteThreadAdmin(threadId: string, personId: string) {
    if (!personId) {
      return;
    }

    const thread = threads.find((item) => item.id === threadId);
    if (!thread) {
      return;
    }

    try {
      const savedThread = await updateOffItem<PrivateThread>("threads", {
        ...thread,
        memberIds: Array.from(new Set([...thread.memberIds, personId])),
        roles: { ...thread.roles, [personId]: "admin" },
      });
      setThreads((currentThreads) => currentThreads.map((item) => (item.id === threadId ? savedThread : item)));
      setAddAdminQuery("");
    } catch {
      setStatus("Admin non promu: MongoDB est indisponible.");
    }
  }

  async function demoteThreadAdmin(threadId: string, personId: string) {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread || thread.roles[personId] === "creator") {
      return;
    }

    try {
      const savedThread = await updateOffItem<PrivateThread>("threads", {
        ...thread,
        roles: { ...thread.roles, [personId]: "member" },
      });
      setThreads((currentThreads) => currentThreads.map((item) => (item.id === threadId ? savedThread : item)));
    } catch {
      setStatus("Admin non retiré: MongoDB est indisponible.");
    }
  }

  async function updateEventConfig(eventId: string, updates: Partial<Pick<MapEvent, "date" | "title">>) {
    const eventItem = events.find((item) => item.id === eventId);
    if (!eventItem) {
      return;
    }

    try {
      const savedEvent = await updateOffItem<MapEvent>("events", { ...eventItem, ...updates });
      setEvents((currentEvents) => currentEvents.map((item) => (item.id === eventId ? savedEvent : item)));
    } catch {
      setStatus("Configuration non enregistrée: MongoDB est indisponible.");
    }
  }

  async function updateChannelConfig(channelId: string, updates: Partial<Pick<Channel, "title">>) {
    const channel = channels.find((item) => item.id === channelId);
    if (!channel) {
      return;
    }

    try {
      const savedChannel = await updateOffItem<Channel>("channels", { ...channel, ...updates });
      setChannels((currentChannels) => currentChannels.map((item) => (item.id === channelId ? savedChannel : item)));
    } catch {
      setStatus("Configuration non enregistrée: MongoDB est indisponible.");
    }
  }

  async function updateThreadConfig(threadId: string, updates: Partial<Pick<PrivateThread, "title">>) {
    const thread = threads.find((item) => item.id === threadId);
    if (!thread) {
      return;
    }

    try {
      const savedThread = await updateOffItem<PrivateThread>("threads", { ...thread, ...updates });
      setThreads((currentThreads) => currentThreads.map((item) => (item.id === threadId ? savedThread : item)));
    } catch {
      setStatus("Configuration non enregistrée: MongoDB est indisponible.");
    }
  }

  async function reportPerson(personId: string) {
    try {
      const report = await createOffItem<Report>("reports", { id: createLocalId(), personId, reporterId: currentUser.id, createdAt: nowIso() });
      setReports((currentReports) => [...currentReports, report]);
      void addLog("Signalement", `${personName(personId)} signalé par ${currentUser.name}`);
      setStatus("Signalement enregistré.");
    } catch {
      setStatus("Signalement non enregistré: MongoDB est indisponible.");
    }
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

  function renderComposer(targetType: Message["targetType"], targetId: string) {
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
          enterKeyHint="send"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              addMessage(targetType, targetId);
            }
          }}
          onChange={(event) => setMessageDrafts((drafts) => ({ ...drafts, [key]: event.target.value }))}
          placeholder="Écrire un message"
          type="text"
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
    excludedIds?: string[];
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
            onClick={() => void addLog("Évènement", `Action de modération sur ${openedEvent.title}`)}
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
            onClick={() => void addLog("Canal", `Action de modération sur ${openedChannel.title}`)}
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
            onClick={() => void addLog("Discussion", `Action de modération sur ${openedThread.title}`)}
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
    targetId: string;
    targetType: Message["targetType"];
    title: string;
  }) {
    const itemMessages = messages
      .filter((message) => message.targetType === targetType && message.targetId === targetId)
      .sort((first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt));

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
        <div className="message-list chat-messages" ref={chatMessagesRef}>
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
                    onClick={async () => {
                      const participantIds = openedEvent.participantIds.includes(currentUser.id)
                        ? openedEvent.participantIds.filter((id) => id !== currentUser.id)
                        : [...openedEvent.participantIds, currentUser.id];

                      try {
                        const savedEvent = await updateOffItem<MapEvent>("events", { ...openedEvent, participantIds });
                        setEvents((currentEvents) =>
                          currentEvents.map((currentEvent) => (currentEvent.id === openedEvent.id ? savedEvent : currentEvent)),
                        );
                      } catch {
                        setStatus("Participation non enregistrée: MongoDB est indisponible.");
                      }
                    }}
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
                    void addLog("Signalement", `Canal signalé : ${openedChannel.title}`);
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
                    void addLog("Signalement", `Discussion signalée : ${openedThread.title}`);
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
                  name="pseudo"
                  onChange={(event) => setForm({ ...form, pseudo: event.target.value })}
                  placeholder="Ex: Nora"
                  required
                  value={form.pseudo}
                />
              </label>

              <label>
                Lieu
                <input
                  name="place"
                  onChange={(event) => setForm({ ...form, place: event.target.value })}
                  placeholder="Ville ou pays"
                  required
                  value={form.place}
                />
              </label>

              <label className="visibility-row">
                <input
                  checked={form.invisible}
                  name="invisible"
                  onChange={(event) => setForm({ ...form, invisible: event.target.checked })}
                  type="checkbox"
                />
                <span>
                  Ne pas être visible sur la carte
                  <small>Ton profil reste utilisable, mais aucun point n&apos;est ajouté.</small>
                </span>
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
