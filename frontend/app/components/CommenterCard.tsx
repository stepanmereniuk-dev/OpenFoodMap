type Commenter = {
  username: string;
  bio: string;
};

export default function CommenterCard({ commenter }: { commenter: Commenter }) {
  return (
    <li className="border border-gray-200 rounded-xl px-5 py-4 flex items-start gap-3 hover:border-blue-300 transition">
      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 font-bold text-sm flex items-center justify-center flex-shrink-0">
        {commenter.username[0]?.toUpperCase()}
      </div>
      <div>
        <p className="font-semibold text-gray-900">{commenter.username}</p>
        {commenter.bio && (
          <p className="text-gray-500 text-sm mt-0.5">{commenter.bio}</p>
        )}
      </div>
    </li>
  );
}
