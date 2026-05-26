type Event = {
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  organizer: string;
};

export default function EventCard({ ev }: { ev: Event }) {
  return (
    <li className="border border-gray-200 rounded-xl px-5 py-4 hover:border-green-300 transition">
      <p className="font-semibold text-gray-900">{ev.title}</p>
      {ev.description && (
        <p className="text-gray-500 text-sm mt-1">{ev.description}</p>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        {ev.location && (
          <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5">
            📍 {ev.location}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-full px-2.5 py-0.5">
          🗓 {ev.start_date}
          {ev.end_date ? ` → ${ev.end_date}` : ""}
        </span>
        {ev.organizer && (
          <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-full px-2.5 py-0.5">
            👤 {ev.organizer}
          </span>
        )}
      </div>
    </li>
  );
}
