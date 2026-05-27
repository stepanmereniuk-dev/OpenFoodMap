"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "../lib/api";
import { setUsername } from "../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/users/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setUsername(data.username);
        router.push("/");
      } else {
        setError(data.error);
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-green-700 font-bold text-xl mb-2">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            OpenFoodMap
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Username</label>
            <input
              name="username"
              placeholder="Your username"
              value={form.username}
              onChange={handleChange}
              required
              className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              name="password"
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={handleChange}
              required
              className="border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white rounded-lg py-2.5 font-semibold hover:bg-green-700 disabled:opacity-50 transition shadow-sm mt-1"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-sm text-center text-gray-500">
            No account?{" "}
            <Link href="/register" className="text-green-600 hover:text-green-700 font-medium">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
