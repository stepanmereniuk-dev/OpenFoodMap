import { useState } from "react";
import {
  Radio,
  Calendar,
  MessageCircle,
  ChevronRight,
  Hash,
  Users,
  Globe,
  Clock,
  MapPin,
  Send,
  Search,
  X,
  Plus,
} from "lucide-react";
import { mockChannels, mockEvents, mockConversations } from "./mockData";

type MenuTab = "canaux" | "evenements" | "discussion";

const eventTypeConfig = {
  scan: { label: "Scan-Party", color: "#4caf50", bg: "#e8f5e9" },
  meetup: { label: "Meetup", color: "#2196f3", bg: "#e3f2fd" },
  hackathon: { label: "Hackathon", color: "#9c27b0", bg: "#f3e5f5" },
  webinar: { label: "Webinaire", color: "#ff9800", bg: "#fff3e0" },
};

interface SideMenuProps {
  activeTab: MenuTab | null;
  onTabChange: (tab: MenuTab | null) => void;
}

export function SideMenu({ activeTab, onTabChange }: SideMenuProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [messageText, setMessageText] = useState("");
  const [activeConv, setActiveConv] = useState<string | null>(null);

  const tabs: { id: MenuTab; label: string; icon: React.ReactNode }[] = [
    { id: "evenements", label: "Évènements", icon: <Calendar size={18} /> },
    { id: "canaux", label: "Canaux", icon: <Radio size={18} /> },
    { id: "discussion", label: "Discussion", icon: <MessageCircle size={18} /> },
];
  const totalUnread = mockChannels.reduce((s, c) => s + c.unread, 0);
  const convUnread = mockConversations.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2 items-start">
      {/* Tab buttons */}
      <div className="flex flex-row gap-1">
        {tabs.map((tab) => {
          const badge =
            tab.id === "canaux" ? totalUnread : tab.id === "discussion" ? convUnread : 0;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(isActive ? null : tab.id)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all shadow-lg"
              style={{
                background: isActive ? "#e53935" : "rgba(255,255,255,0.96)",
                color: isActive ? "white" : "#333",
                backdropFilter: "blur(8px)",
                border: isActive ? "1px solid #e53935" : "1px solid rgba(0,0,0,0.08)",
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {badge > 0 && !isActive && (
                <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                  style={{ fontSize: 10 }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Panel */}
      {activeTab && (
        <div
          className="w-80 rounded-xl overflow-hidden flex flex-col shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(0,0,0,0.08)",
            maxHeight: "calc(100vh - 6rem)",
          }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {activeTab === "canaux" && <Radio size={16} className="text-red-500" />}
              {activeTab === "evenements" && <Calendar size={16} className="text-red-500" />}
              {activeTab === "discussion" && <MessageCircle size={16} className="text-red-500" />}
              <span className="text-sm text-gray-800">
                {activeTab === "canaux" ? "Canaux" : activeTab === "evenements" ? "Évènements" : "Discussion"}
              </span>
            </div>
            <button
              onClick={() => onTabChange(null)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Search (canaux + discussion) */}
          {(activeTab === "canaux" || activeTab === "discussion") && (
            <div className="px-3 py-2 border-b border-gray-50">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
                <Search size={13} className="text-gray-400" />
                <input
                  type="text"
                  placeholder={activeTab === "canaux" ? "Rechercher un canal…" : "Rechercher une conversation…"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {/* CANAUX */}
            {activeTab === "canaux" && (
              <div>
                {(["general", "regional", "topic"] as const).map((cat) => {
                  const catLabel = cat === "general" ? "Général" : cat === "regional" ? "Régional" : "Thématique";
                  const filtered = mockChannels.filter(
                    (c) =>
                      c.category === cat &&
                      (searchQuery === "" || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  );
                  if (filtered.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                        <p className="text-xs text-gray-400 uppercase tracking-wide">{catLabel}</p>
                      </div>
                      {filtered.map((channel) => (
                        <div
                          key={channel.id}
                          className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <Hash size={14} className="mt-0.5 text-gray-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs text-gray-800">{channel.name}</span>
                              {channel.unread > 0 && (
                                <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0"
                                  style={{ fontSize: 9 }}>
                                  {channel.unread}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">{channel.lastMessage}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center gap-1 text-gray-300">
                                <Users size={10} />
                                <span style={{ fontSize: 10 }}>{channel.members.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-300">
                                <Clock size={10} />
                                <span style={{ fontSize: 10 }}>{channel.lastMessageTime}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={12} className="mt-0.5 text-gray-300 shrink-0" />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ÉVÈNEMENTS */}
            {activeTab === "evenements" && (
              <div className="p-3 space-y-3">
                {mockEvents.map((event) => {
                  const cfg = eventTypeConfig[event.type];
                  return (
                    <div
                      key={event.id}
                      className="rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-center justify-between px-3 py-2" style={{ background: cfg.bg }}>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: "white", border: `1px solid ${cfg.color}` }}>
                          {cfg.label}
                        </span>
                        <div className="flex items-center gap-1" style={{ color: cfg.color }}>
                          <Users size={11} />
                          <span style={{ fontSize: 11 }}>{event.attendees} inscrits</span>
                        </div>
                      </div>
                      <div className="px-3 py-2 bg-white">
                        <p className="text-xs text-gray-800 mb-1">{event.title}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-gray-400">
                            <Calendar size={10} />
                            <span style={{ fontSize: 10 }}>{new Date(event.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {event.time}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400 mt-1">
                          <MapPin size={10} />
                          <span style={{ fontSize: 10 }}>{event.location}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{event.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* DISCUSSION */}
            {activeTab === "discussion" && (
              <div>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Conversations</p>
                  <button className="p-1 rounded-md text-red-400 hover:bg-red-50 transition-colors">
                    <Plus size={13} />
                  </button>
                </div>

                <div className="px-3 py-2 border-b border-gray-50">
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500 text-white text-xs hover:bg-red-600 transition-colors">
                      <Globe size={13} />
                      Contacter un utilisateur
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                      <MapPin size={13} />
                      Groupe par zone
                    </button>
                  </div>
                </div>

                {mockConversations
                  .filter(
                    (c) =>
                      searchQuery === "" ||
                      c.with.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setActiveConv(activeConv === conv.id ? null : conv.id)}
                      className="flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-gray-600"
                        style={{ fontSize: 11 }}>
                        {conv.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-xs text-gray-800 truncate">{conv.with}</span>
                            {conv.isGroup && (
                              <span className="shrink-0 px-1 py-0.5 rounded bg-gray-100 text-gray-400" style={{ fontSize: 9 }}>
                                <Users size={9} className="inline" /> {conv.members}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{conv.time}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                        {conv.zone && (
                          <div className="flex items-center gap-1 mt-0.5 text-gray-300">
                            <MapPin size={9} />
                            <span style={{ fontSize: 9 }}>{conv.zone}</span>
                          </div>
                        )}
                      </div>
                      {conv.unread > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0"
                          style={{ fontSize: 9 }}>
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  ))}

                {/* Quick reply if conv selected */}
                {activeConv && (
                  <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
                      <input
                        type="text"
                        placeholder="Votre message…"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        className="flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400 bg-transparent"
                      />
                      <button
                        className="p-1 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                        onClick={() => setMessageText("")}
                      >
                        <Send size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
