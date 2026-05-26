"use client";

import { useState, useEffect } from "react";
import { API_BASE } from "../lib/api";
import CommenterForm from "../components/CommenterForm";
import CommenterCard from "../components/CommenterCard";

type Commenter = {
  username: string;
  bio: string;
};

export default function CommentersPage() {
  const [commenters, setCommenters] = useState<Commenter[]>([]);
  const [fetching, setFetching] = useState(true);

  async function fetchCommenters() {
    setFetching(true);
    try {
      const res = await fetch(`${API_BASE}/api/commenters/`);
      const data = await res.json();
      setCommenters(data.commenters ?? []);
    } catch {
      setCommenters([]);
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    fetchCommenters();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">

        <CommenterForm onCreated={fetchCommenters} />

        <section className="bg-white p-8 rounded-2xl shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            All commenters{" "}
            <span className="text-gray-400 font-normal text-base">({commenters.length})</span>
          </h2>
          {fetching ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : commenters.length === 0 ? (
            <p className="text-gray-400 text-sm">No commenters yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {commenters.map((c) => (
                <CommenterCard key={c.username} commenter={c} />
              ))}
            </ul>
          )}
        </section>

      </div>
    </main>
  );
}
