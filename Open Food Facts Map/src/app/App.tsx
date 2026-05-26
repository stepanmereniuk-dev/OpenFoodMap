import { useState, useCallback, useRef, useEffect } from "react";
import { OFFMap } from "./components/OFFMap";
import { SideMenu } from "./components/SideMenu";
import { UserBubble } from "./components/UserBubble";
import type { OFFUser } from "./components/mockData";

type MenuTab = "canaux" | "evenements" | "discussion";

export default function App() {
  const [selectedUser, setSelectedUser] = useState<OFFUser | null>(null);
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<MenuTab | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Compute 16:9 dimensions from viewport
  useEffect(() => {
    function compute() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const byWidth = { w: vw, h: vw * 9 / 16 };
      const byHeight = { w: vh * 16 / 9, h: vh };
      setContainerSize(byHeight.w <= vw ? byHeight : byWidth);
    }
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const handleUserSelect = useCallback((user: OFFUser | null, x: number, y: number) => {
    setSelectedUser(user);
    setBubblePos({ x, y });
  }, []);

  return (
    <div className="size-full flex items-center justify-center bg-gray-900">
      {containerSize.w > 0 && (
        <div
          ref={wrapperRef}
          className="relative overflow-hidden rounded-xl shadow-2xl"
          style={{ width: containerSize.w, height: containerSize.h }}
        >
          {/* Map fills the container absolutely */}
          <OFFMap onUserSelect={handleUserSelect} />

          {/* User bubble overlay */}
          {selectedUser && (
            <div
              className="absolute pointer-events-none"
              style={{ left: bubblePos.x, top: bubblePos.y, zIndex: 500 }}
            >
              <div className="pointer-events-auto">
                <UserBubble user={selectedUser} onClose={() => setSelectedUser(null)} />
              </div>
            </div>
          )}

          {/* Side menu */}
          <SideMenu activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Branding */}
          <div
            className="absolute top-4 right-4 z-[1000] flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg"
            style={{
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-white" style={{ fontSize: 12 }}>🥕</span>
            </div>
            <div>
              <p className="text-xs text-gray-800" style={{ lineHeight: 1.2 }}>Open Food Facts</p>
              <p className="text-gray-400" style={{ fontSize: 10, lineHeight: 1.2 }}>Communauté mondiale</p>
            </div>
          </div>

          {/* Legend */}
          <div
            className="absolute bottom-10 left-4 z-[1000] rounded-xl px-4 py-3 shadow-lg"
            style={{
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          >
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Niveaux</p>
            <div className="space-y-1">
              {[
                ["Explorateur Expert", "#e53935"],
                ["Contributeur Senior", "#f57c00"],
                ["Contributeur", "#388e3c"],
                ["Explorateur", "#1976d2"],
                ["Novice", "#7b1fa2"],
              ].map(([label, color]) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-xs text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
