"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "../lib/api";
import EventForm from "../components/EventForm";
import EventCard from "../components/EventCard";

type Event = {
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  organizer: string;
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [fetching, setFetching] = useState(true);

  async function fetchEvents() {
    setFetching(true);
    try {
      const res = await fetch(`${API_BASE}/api/events/`);
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch {
      setEvents([]);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    // This page is a legacy API view; fetching once on mount is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        <EventForm onCreated={fetchEvents} />

        <section className="bg-white p-8 rounded-2xl shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            All events{" "}
            <span className="text-gray-400 font-normal text-base">({events.length})</span>
          </h2>
          {fetching ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : events.length === 0 ? (
            <p className="text-gray-400 text-sm">No events yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {events.map((ev, i) => (
                <EventCard key={i} ev={ev} />
              ))}
            </ul>
          )}
        </section>

      </div>
    </main>
  );
}
