import { useState } from "react";
import { Package, Edit, Trophy, X, ExternalLink } from "lucide-react";
import type { OFFUser } from "./mockData";

interface UserBubbleProps {
  user: OFFUser;
  onClose: () => void;
}

const rankColors: Record<string, string> = {
  "Explorateur Expert": "#e53935",
  "Contributeur Senior": "#f57c00",
  "Contributeur": "#388e3c",
  "Explorateur": "#1976d2",
  "Novice": "#7b1fa2",
};

export function UserBubble({ user, onClose }: UserBubbleProps) {
  const color = rankColors[user.rankLabel] ?? "#555";

  return (
    <div
      className="absolute z-50 bg-white rounded-xl shadow-2xl border border-gray-200 w-72"
      style={{ transform: "translate(-50%, -110%)", pointerEvents: "all" }}
    >
      {/* Arrow */}
      <div
        className="absolute left-1/2 -bottom-2 w-4 h-4 bg-white border-r border-b border-gray-200 rotate-45"
        style={{ transform: "translateX(-50%) rotate(45deg)" }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3 border-b border-gray-100">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: color }}
        >
          <span className="text-sm">{user.avatar}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-sm text-gray-900 truncate">{user.name}</p>
            <span className="text-xs text-gray-400">{user.city}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Trophy size={11} style={{ color }} />
            <span className="text-xs" style={{ color }}>
              #{user.rank} · {user.rankLabel}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-0 px-4 py-3 border-b border-gray-100">
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 mb-0.5">
            <Package size={12} />
            <span className="text-xs">Créés</span>
          </div>
          <p className="text-sm text-gray-900">{user.productsCreated.toLocaleString()}</p>
        </div>
        <div className="w-px bg-gray-100" />
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 mb-0.5">
            <Edit size={12} />
            <span className="text-xs">Modifiés</span>
          </div>
          <p className="text-sm text-gray-900">{user.productsModified.toLocaleString()}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-4 py-3">
        <p className="text-xs text-gray-400 mb-2">Activité récente</p>
        <div className="space-y-2">
          {user.recentActivity.slice(0, 3).map((activity, i) => (
            <div key={i} className="flex items-start gap-2">
              <span
                className="mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center text-white"
                style={{ backgroundColor: activity.action === "created" ? "#388e3c" : "#1976d2", fontSize: 9 }}
              >
                {activity.action === "created" ? "+" : "✎"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-700 truncate">{activity.product}</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400 font-mono">{activity.barcode}</span>
                  <a
                    href={`https://world.openfoodfacts.org/product/${activity.barcode}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
              <span className="text-xs text-gray-300 shrink-0">{activity.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
