import React from "react";
import { Maximize2, Minimize2, Settings, Volume2, VolumeX } from "lucide-react";
import { WeddingConfig } from "../types";
import { soundFx } from "../lib/audio";

interface HeaderProps {
  weddingConfig: WeddingConfig;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  weddingConfig,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  onOpenAdmin,
}) => {
  return (
    <header className="w-full px-5 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between z-30 select-none shrink-0">
      {/* Left: Couple Branding */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full border border-amber-400/50 flex items-center justify-center bg-amber-950/30 shadow-[0_0_12px_rgba(212,175,55,0.2)]">
          <span className="font-script text-xl text-amber-300">
            {weddingConfig.brideName.charAt(0)}&{weddingConfig.groomName.charAt(0)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-cinzel tracking-[0.2em] text-[11px] text-amber-200/70 uppercase">
            Wedding Photobooth
          </span>
          <span className="font-script text-xl text-amber-100 leading-tight">
            {weddingConfig.brideName} & {weddingConfig.groomName}
          </span>
        </div>
      </div>

      {/* Right: Quick Controls */}
      <div className="flex items-center gap-2">
        {/* Sound toggle */}
        <button
          onClick={() => {
            soundFx.playChime();
            onToggleSound();
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-amber-200/70 hover:text-amber-100 hover:bg-white/5 border border-amber-400/20 transition-all"
          title={soundEnabled ? "Mute Suara" : "Aktifkan Suara"}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} className="text-stone-500" />}
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={() => {
            soundFx.playChime();
            onToggleFullscreen();
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-amber-200/70 hover:text-amber-100 hover:bg-white/5 border border-amber-400/20 transition-all"
          title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>

        {/* Admin Gear */}
        <button
          onClick={() => {
            soundFx.playChime();
            onOpenAdmin();
          }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-amber-200/70 hover:text-amber-100 hover:bg-white/5 border border-amber-400/20 transition-all"
          title="Pengaturan Admin"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
