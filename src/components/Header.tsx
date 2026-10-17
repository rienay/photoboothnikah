import React from "react";
import { Maximize2, Minimize2, Settings, Volume2, VolumeX, Sparkles } from "lucide-react";
import { PartyConfig, ThemeMode, WeddingConfig } from "../types";
import { soundFx } from "../lib/audio";

interface HeaderProps {
  themeMode?: ThemeMode;
  weddingConfig: WeddingConfig;
  partyConfig?: PartyConfig;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  themeMode = "wedding",
  weddingConfig,
  partyConfig,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  onOpenAdmin,
}) => {
  const isParty = themeMode === "party";

  return (
    <header className={`w-full px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between z-30 select-none shrink-0 gap-2 transition-colors ${
      isParty
        ? "bg-white/85 backdrop-blur-md border-b border-purple-200/60 shadow-sm"
        : ""
    }`}>
      {/* Left: Branding */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {isParty ? (
          <>
            <div className="h-8 sm:h-9 px-2 rounded-lg bg-white flex items-center justify-center shadow-sm shrink-0 border border-purple-200">
              <img
                src="/frames/jotajoti/JOTA-JOTI-Logo-Transparent.png"
                alt="JOTA-JOTI"
                className="h-5 sm:h-6 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold tracking-[0.16em] text-[9px] sm:text-[11px] text-[#622599] uppercase truncate">
                JOTA-JOTI 2026 • PHOTOBOOTH
              </span>
              <span className="font-black text-sm sm:text-base text-[#2E0E4C] leading-tight truncate max-w-[140px] sm:max-w-[280px] md:max-w-none">
                {partyConfig?.eventName || "JOTA-JOTI 2026 CILACAP"}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-amber-400/50 flex items-center justify-center bg-amber-950/30 shadow-[0_0_12px_rgba(212,175,55,0.2)] shrink-0">
              <span className="font-script text-lg sm:text-xl text-amber-300">
                {weddingConfig.brideName.charAt(0)}&{weddingConfig.groomName.charAt(0)}
              </span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-cinzel tracking-[0.15em] sm:tracking-[0.2em] text-[9px] sm:text-[11px] text-amber-200/70 uppercase truncate">
                Wedding Photobooth
              </span>
              <span className="font-script text-base sm:text-xl text-amber-100 leading-tight truncate max-w-[140px] sm:max-w-[280px] md:max-w-none">
                {weddingConfig.brideName} & {weddingConfig.groomName}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right: Quick Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Sound toggle */}
        <button
          onClick={() => {
            soundFx.playChime();
            onToggleSound();
          }}
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isParty
              ? "text-purple-900 hover:text-[#622599] bg-white/90 hover:bg-white border border-purple-200 shadow-sm"
              : "text-amber-200/70 hover:text-amber-100 hover:bg-white/5 border border-amber-400/20"
          }`}
          title={soundEnabled ? "Mute Suara" : "Aktifkan Suara"}
        >
          {soundEnabled ? (
            <Volume2 size={16} className={isParty ? "text-[#622599]" : undefined} />
          ) : (
            <VolumeX size={16} className={isParty ? "text-slate-400" : "text-stone-500"} />
          )}
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={() => {
            soundFx.playChime();
            onToggleFullscreen();
          }}
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isParty
              ? "text-purple-900 hover:text-[#622599] bg-white/90 hover:bg-white border border-purple-200 shadow-sm"
              : "text-amber-200/70 hover:text-amber-100 hover:bg-white/5 border border-amber-400/20"
          }`}
          title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
        >
          {isFullscreen ? (
            <Minimize2 size={16} className={isParty ? "text-[#622599]" : undefined} />
          ) : (
            <Maximize2 size={16} className={isParty ? "text-[#622599]" : undefined} />
          )}
        </button>

        {/* Admin Gear */}
        <button
          onClick={() => {
            soundFx.playChime();
            onOpenAdmin();
          }}
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            isParty
              ? "text-purple-900 hover:text-[#622599] bg-white/90 hover:bg-white border border-purple-200 shadow-sm"
              : "text-amber-200/70 hover:text-amber-100 hover:bg-white/5 border border-amber-400/20"
          }`}
          title="Pengaturan Admin"
        >
          <Settings size={16} className={isParty ? "text-[#622599]" : undefined} />
        </button>
      </div>
    </header>
  );
};
