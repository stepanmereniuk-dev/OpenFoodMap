"use client";

import { useState } from "react";
import { API_BASE } from "../lib/api";
import StatusMessage from "./StatusMessage";

type Status = { type: "success" | "error"; message: string } | null;

type Props = {
  username: string;
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateEventModal({ username, onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    start_date: "",
    end_date: "",
    organizer: username,
    lat: "",
    lng: "",
  });
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        location: form.location,
        start_date: form.start_date,
        end_date: form.end_date,
        organizer: form.organizer,
      };
      if (form.lat && form.lng) {
        payload.lat = parseFloat(form.lat);
        payload.lng = parseFloat(form.lng);
      }
      const res = await fetch(`${API_BASE}/api/events/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated();
        onClose();
      } else {
        setStatus({ type: "error", message: data.error });
      }
    } catch {
      setStatus({ type: "error", message: "Could not reach the server." });
    } finally {
      setLoading(false);
    }
  }

  const field =
    "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 w-full";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold text-gray-800">New event</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-3">
          <input name="title" placeholder="Title *" value={form.title} onChange={handleChange} required className={field} />
          <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} rows={2} className={`${field} resize-none`} />
          <input name="location" placeholder="Location label (e.g. Paris, France)" value={form.location} onChange={handleChange} className={field} />

          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500 font-medium">Start *</label>
              <input name="start_date" type="datetime-local" value={form.start_date} onChange={handleChange} required className={field} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500 font-medium">End</label>
              <input name="end_date" type="datetime-local" value={form.end_date} onChange={handleChange} className={field} />
            </div>
          </div>

          <div className="border border-dashed border-gray-300 rounded-lg p-3 flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-500">Map coordinates (optional)</p>
            <div className="flex gap-2">
              <input name="lat" placeholder="Latitude  e.g. 48.8566" value={form.lat} onChange={handleChange} className={field} />
              <input name="lng" placeholder="Longitude  e.g. 2.3522" value={form.lng} onChange={handleChange} className={field} />
            </div>
            <p className="text-xs text-gray-400">
              Find coords:{" "}
              <a href="https://www.openstreetmap.org" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                openstreetmap.org
              </a>{" "}
              → right-click a location → "Show address"
            </p>
          </div>

          <StatusMessage status={status} />

          <button type="submit" disabled={loading} className="bg-green-600 text-white rounded-lg py-2 font-semibold hover:bg-green-700 disabled:opacity-50 transition mt-1">
            {loading ? "Creating…" : "Create event"}
          </button>
        </form>
      </div>
    </div>
  );
}
