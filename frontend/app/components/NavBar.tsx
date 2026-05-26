import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="max-w-4xl mx-auto flex items-center gap-8">
        <Link href="/" className="font-bold text-gray-900 text-lg tracking-tight">
          OpenFoodMap
        </Link>
        <Link href="/events" className="text-sm font-medium text-gray-500 hover:text-green-600 transition">
          Events
        </Link>
        <Link href="/commenters" className="text-sm font-medium text-gray-500 hover:text-blue-600 transition">
          Commenters
        </Link>
      </div>
    </nav>
  );
}
