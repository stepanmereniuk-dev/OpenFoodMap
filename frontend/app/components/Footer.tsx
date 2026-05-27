import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 shrink-0">
      <div className="px-8 py-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-500 shrink-0">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <span className="text-sm text-gray-200 font-semibold">OpenFoodMap</span>
          <span className="text-xs hidden sm:inline">— Discover food events near you</span>
        </div>
        <nav className="flex items-center gap-5 text-xs">
          <Link href="/" className="hover:text-gray-200 transition">Map</Link>
          <Link href="/events" className="hover:text-gray-200 transition">Events</Link>
          <Link href="/register" className="hover:text-gray-200 transition">Register</Link>
          <Link href="/login" className="hover:text-gray-200 transition">Sign in</Link>
        </nav>
        <span className="text-xs text-gray-500">© {new Date().getFullYear()} OpenFoodMap</span>
      </div>
    </footer>
  );
}
