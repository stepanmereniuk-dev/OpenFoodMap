"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getUsername, clearUsername } from "../lib/auth";

export default function NavBar() {
  const [username, setUsernameState] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setUsernameState(getUsername());
  }, [pathname]);

  function handleLogout() {
    clearUsername();
    setUsernameState(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 flex items-center h-14 shrink-0 shadow-sm z-10">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 font-bold text-green-700 text-base mr-8">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        OpenFoodMap
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1 flex-1">
        <Link href="/" className="px-3 py-1.5 text-sm text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition font-medium">
          Map
        </Link>
        <Link href="/events" className="px-3 py-1.5 text-sm text-gray-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition font-medium">
          All events
        </Link>
      </nav>

      {/* Auth */}
      <div className="flex items-center gap-2">
        {username ? (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
              <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {username[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-gray-700 font-medium">{username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-red-500 transition px-2 py-1.5 rounded-lg hover:bg-red-50"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition font-medium">
              Sign in
            </Link>
            <Link href="/register" className="text-sm bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 transition font-medium shadow-sm">
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
