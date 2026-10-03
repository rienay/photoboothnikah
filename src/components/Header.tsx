import React from "react";
import { Maximize2, Minimize2, RotateCw, Settings, Volume2, VolumeX } from "lucide-react";
import { WeddingConfig } from "../types";
import { soundFx } from "../lib/audio";

interface HeaderProps {
  weddingConfig: WeddingConfig;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  screenRotation: 0 | 90 | 180 | 270;
  onRotateScreen: () => void;
  onOpenAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  weddingConfig,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
  screenRotation,
  onRotateScreen,
  onOpenAdmin,
}) => {
  return (
    <header className="w-full px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between z-30 select-none shrink-0 gap-2">
      {/* Left: Couple Branding */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
      </div>

      {/* Right: Quick Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Sound toggle */}
        <button
          onClick={() => {
            soundFx.playChime();
            onToggleSound();
          }}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-amber-200/70 hover:text-amber-100 hover:bg-white/5 border border-amber-400/20 transition-all cursor-pointer"
          title={soundEnabled ? "Mute Suara" : "Aktifkan Suara"}
        >
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} className="text-stone-500" />}
        </button>

        {/* Screen Rotation toggle */}
        <button
          onClick={() => {
            soundFx.playChime();
            onRotateScreen();
          }}
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
            screenRotation !== 0
              ? "bg-amber-400/20 border-amber-400/60 text-amber-300 shadow-[0_0_12px_rgba(212,175,55,0.3)]"
              : "text-amber-200/70 hover:text-amber-100 hover:bg-white/5 border-amber-400/20"
          }`}
          title={`Putar Orientasi Layar (Saat ini: ${screenRotation}°). Klik untuk memutar.`}
        >
          <RotateCw size={15} />
        </button>

        {/* Fullscreen toggle */}
        <button
          onClick={() => {
            soundFx.playChime();
            onToggleFullscreen();
          }}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-amber-200/70 hover:text-amber-100 hover:bg-white/5 border border-amber-400/20 transition-all cursor-pointer"
          title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>

        {/* Admin Gear */}
        <button
          onClick={() => {
            soundFx.playChime();
            onOpenAdmin();
          }}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-amber-200/70 hover:text-amber-100 hover:bg-white/5 border border-amber-400/20 transition-all cursor-pointer"
          title="Pengaturan Admin"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
