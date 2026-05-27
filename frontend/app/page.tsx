"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { API_BASE } from "./lib/api";
import { getUsername } from "./lib/auth";
import CreateEventModal from "./components/CreateEventModal";

const EventMap = dynamic(() => import("./components/EventMap"), { ssr: false });

type Event = {
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

type Comment = {
  event_id: string;
  username: string;
  text: string;
  created_at: string;
};

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState<Event | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [username, setUsernameState] = useState<string | null>(null);

  useEffect(() => {
    setUsernameState(getUsername());
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const res = await fetch(`${API_BASE}/api/events/`);
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch {
      setEvents([]);
    }
  }

  async function selectEvent(ev: Event) {
    setSelected(ev);
    setComments([]);
    setCommentText("");
    if (!ev.id) return;
    setLoadingComments(true);
    try {
      const res = await fetch(`${API_BASE}/api/comments/?event_id=${ev.id}`);
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch {
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!selected?.id || !username || !commentText.trim()) return;
    setPostingComment(true);
    try {
      const res = await fetch(`${API_BASE}/api/comments/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: selected.id, username, text: commentText.trim() }),
      });
      if (res.ok) {
        setCommentText("");
        const r = await fetch(`${API_BASE}/api/comments/?event_id=${selected.id}`);
        const d = await r.json();
        setComments(d.comments ?? []);
      }
    } finally {
      setPostingComment(false);
    }
  }

  const hasCoords = (ev: Event) => ev.lat != null && ev.lng != null;

  return (
    <div className="flex-1 flex overflow-hidden">

      {/* ── Left panel ── */}
      <div className="w-72 xl:w-80 flex flex-col border-r border-slate-200 bg-white shadow-sm overflow-hidden shrink-0">

        {/* Panel header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div>
            <h2 className="font-semibold text-sm text-gray-900">Events</h2>
            <p className="text-xs text-gray-400">{events.length} total</p>
          </div>
          {username ? (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition font-medium shadow-sm"
            >
              + New event
            </button>
          ) : (
            <Link href="/login" className="text-xs text-green-600 hover:text-green-700 font-medium transition">
              Sign in to create
            </Link>
          )}
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
          {events.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 font-medium">No events yet</p>
              {!username ? (
                <Link href="/register" className="text-xs text-green-600 hover:underline mt-1 block">
                  Register to create one
                </Link>
              ) : (
                <button onClick={() => setShowModal(true)} className="text-xs text-green-600 hover:underline mt-1">
                  Create the first event
                </button>
              )}
            </div>
          ) : (
            events.map((ev, i) => {
              const isSelected = selected?.id === ev.id || selected?.title === ev.title;
              return (
                <button
                  key={ev.id ?? i}
                  onClick={() => selectEvent(ev)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors group ${
                    isSelected ? "bg-green-50 border-l-[3px] border-l-green-500" : "border-l-[3px] border-l-transparent"
                  }`}
                >
                  <p className={`font-medium text-sm truncate leading-snug ${isSelected ? "text-green-800" : "text-gray-900"}`}>
                    {ev.title}
                  </p>
                  {ev.location && (
                    <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full border ${
                      isSelected ? "text-green-700 bg-green-100 border-green-200" : "text-gray-500 bg-slate-50 border-slate-200"
                    }`}>
                      {ev.location}
                    </span>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-gray-400">
                      {ev.start_date.replace("T", " ").slice(0, 16)}
                    </p>
                    {hasCoords(ev) && (
                      <span className="text-xs text-green-500 font-medium">on map</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Comments panel */}
        {selected && (
          <div className="border-t border-slate-200 flex flex-col shrink-0" style={{ height: 280 }}>

            {/* Comments header */}
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-700">Comments</p>
                <p className="text-xs text-gray-400 truncate">{selected.title}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="ml-2 shrink-0 w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-slate-100 transition text-sm"
              >
                ×
              </button>
            </div>

            {/* Comment list */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 min-h-0">
              {loadingComments && (
                <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
              )}
              {!loadingComments && comments.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-400">No comments yet.</p>
                  {username && <p className="text-xs text-gray-400 mt-0.5">Be the first!</p>}
                </div>
              )}
              {comments.map((c, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {c.username[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-slate-50 rounded-lg rounded-tl-none px-3 py-2 border border-slate-200">
                      <p className="text-xs font-semibold text-gray-700">{c.username}</p>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{c.text}</p>
                    </div>
                    <p className="text-xs text-gray-300 mt-0.5 px-1">
                      {c.created_at.slice(0, 16).replace("T", " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Comment input */}
            {username ? (
              <form
                onSubmit={postComment}
                className="px-3 py-2.5 border-t border-slate-200 bg-white flex gap-2 items-center shrink-0"
              >
                <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {username[0]?.toUpperCase()}
                </div>
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment…"
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-400 focus:bg-white transition"
                />
                <button
                  type="submit"
                  disabled={postingComment || !commentText.trim()}
                  className="text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-40 transition font-medium shrink-0"
                >
                  Send
                </button>
              </form>
            ) : (
              <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 text-center shrink-0">
                <Link href="/login" className="text-xs text-green-600 hover:underline font-medium">
                  Sign in to comment
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Map ── */}
      <div className="flex-1 relative min-w-0">
        <EventMap events={events} selected={selected} onSelect={selectEvent} />
        {events.filter(hasCoords).length === 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm text-xs text-gray-500 px-4 py-2 rounded-full shadow-lg border border-slate-200 pointer-events-none whitespace-nowrap">
            Add lat/lng when creating events to see them on the map
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && username && (
        <CreateEventModal
          username={username}
          onClose={() => setShowModal(false)}
          onCreated={fetchEvents}
        />
      )}
    </div>
  );
}
