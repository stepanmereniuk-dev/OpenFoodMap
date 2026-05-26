"use client";

import { useState } from "react";

export default function Home() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/users/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus({ type: "success", message: data.message });
        setForm({ username: "", email: "", password: "" });
      } else {
        setStatus({ type: "error", message: data.error });
      }
    } catch {
      setStatus({ type: "error", message: "Could not reach the server." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-md w-full max-w-sm flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold text-gray-800">Create account</h1>

        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          required
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
          className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {status && (
          <p className={status.type === "success" ? "text-green-600 text-sm" : "text-red-500 text-sm"}>
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded-lg py-2 font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? "Creating..." : "Create user"}
        </button>
      </form>
    </main>
  );
}
