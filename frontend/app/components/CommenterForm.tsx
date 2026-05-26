"use client";

import { useState } from "react";
import { API_BASE } from "../lib/api";
import StatusMessage from "./StatusMessage";

type Status = { type: "success" | "error"; message: string } | null;

export default function CommenterForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ username: "", bio: "" });
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
      const res = await fetch(`${API_BASE}/api/commenters/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: "success", message: data.message });
        setForm({ username: "", bio: "" });
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
    "border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full";

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-md flex flex-col gap-4">
      <h2 className="text-xl font-bold text-gray-800">New commenter profile</h2>

      <input
        name="username"
        placeholder="Username * (must exist as a user)"
        value={form.username}
        onChange={handleChange}
        required
        className={field}
      />
      <textarea
        name="bio"
        placeholder="Bio (optional)"
        value={form.bio}
        onChange={handleChange}
        rows={3}
        className={`${field} resize-none`}
      />

      <StatusMessage status={status} />

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white rounded-lg py-2 font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {loading ? "Creating…" : "Create commenter"}
      </button>
    </form>
  );
}
