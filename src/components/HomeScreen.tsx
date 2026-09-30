import React, { useEffect } from "react";
import { Camera, Heart } from "lucide-react";
import { WeddingConfig } from "../types";
import { soundFx } from "../lib/audio";

interface HomeScreenProps {
  weddingConfig: WeddingConfig;
  onStart: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ weddingConfig, onStart }) => {
  // Listen for Spacebar key to start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        soundFx.playChime();
        onStart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onStart]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative text-center">
      {/* Background Decorative Rings */}
      <div className="absolute w-[500px] h-[500px] rounded-full border border-amber-400/10 pointer-events-none animate-[pulse_6s_ease-in-out_infinite]" />
      <div className="absolute w-[680px] h-[680px] rounded-full border border-amber-400/5 pointer-events-none" />

      {/* Wedding Monogram Seal */}
      <div className="relative mb-6">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-amber-400/40 p-1 flex items-center justify-center bg-gradient-to-b from-amber-950/40 to-stone-900/60 shadow-[0_0_35px_rgba(212,175,55,0.25)]">
          <div className="w-full h-full rounded-full border border-amber-400/30 flex items-center justify-center">
            <span className="font-script text-4xl sm:text-5xl text-amber-200">
              {weddingConfig.brideName.charAt(0)}
              <span className="text-2xl text-amber-400/80 mx-1">&</span>
              {weddingConfig.groomName.charAt(0)}
            </span>
          </div>
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#0c0e12] px-3 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1">
          <Heart size={12} className="text-rose-400 fill-rose-400/80" />
        </div>
      </div>

      {/* Subtitle */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-amber-400/50" />
        <span className="font-cinzel tracking-[0.28em] text-xs sm:text-sm text-amber-300/80 uppercase">
          The Wedding Celebration
        </span>
        <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-amber-400/50" />
      </div>

      {/* Couple Names: Bride first then Groom */}
      <h1 className="font-script text-6xl sm:text-7xl md:text-8xl text-gold-gradient py-2 my-1 drop-shadow-[0_4px_16px_rgba(212,175,55,0.3)]">
        {weddingConfig.brideName} <span className="font-serif text-4xl sm:text-5xl text-amber-300/80 font-normal">&</span> {weddingConfig.groomName}
      </h1>

      {/* Date */}
      <p className="font-sans text-sm sm:text-base tracking-[0.18em] text-stone-300 font-light mt-2 mb-10 flex items-center justify-center">
        <span>{weddingConfig.weddingDate}</span>
      </p>

      {/* Big Start Button */}
      <button
        onClick={() => {
          soundFx.playChime();
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          onStart();
        }}
        className="btn-gold shimmer-glow px-12 py-5 sm:px-16 sm:py-6 rounded-full flex items-center justify-center gap-3 text-base sm:text-lg group cursor-pointer shadow-[0_4px_30px_rgba(212,175,55,0.4)]"
      >
        <Camera size={24} className="text-stone-900 group-hover:scale-110 transition-transform" />
        <span>Sentuh Layar untuk Mulai</span>
      </button>
    </div>
  );
};
