"use client";

import { useState } from "react";
import { API_BASE } from "../lib/api";
import StatusMessage from "./StatusMessage";

type Status = { type: "success" | "error"; message: string } | null;

export default function EventForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    start_date: "",
    end_date: "",
    organizer: "",
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
      const res = await fetch(`${API_BASE}/api/events/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: "success", message: data.message });
        setForm({ title: "", description: "", location: "", start_date: "", end_date: "", organizer: "" });
        onCreated();
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
    "border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 w-full";

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-md flex flex-col gap-4">
      <h2 className="text-xl font-bold text-gray-800">New event</h2>

      <input
        name="title"
        placeholder="Title *"
        value={form.title}
        onChange={handleChange}
        required
        className={field}
      />
      <textarea
        name="description"
        placeholder="Description (optional)"
        value={form.description}
        onChange={handleChange}
        rows={3}
        className={`${field} resize-none`}
      />
      <input
        name="location"
        placeholder="Location (optional)"
        value={form.location}
        onChange={handleChange}
        className={field}
      />
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-gray-500">Start date *</label>
          <input
            name="start_date"
            type="datetime-local"
            value={form.start_date}
            onChange={handleChange}
            required
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-xs font-medium text-gray-500">End date</label>
          <input
            name="end_date"
            type="datetime-local"
            value={form.end_date}
            onChange={handleChange}
            className={field}
          />
        </div>
      </div>
      <input
        name="organizer"
        placeholder="Organizer username (optional)"
        value={form.organizer}
        onChange={handleChange}
        className={field}
      />

      <StatusMessage status={status} />

      <button
        type="submit"
        disabled={loading}
        className="bg-green-600 text-white rounded-lg py-2 font-semibold hover:bg-green-700 disabled:opacity-50 transition"
      >
        {loading ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}
