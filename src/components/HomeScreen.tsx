import React, { useEffect } from "react";
import { Camera, Heart, Sparkles, PartyPopper } from "lucide-react";
import { PartyConfig, ThemeMode, WeddingConfig } from "../types";
import { soundFx } from "../lib/audio";

interface HomeScreenProps {
  themeMode?: ThemeMode;
  weddingConfig: WeddingConfig;
  partyConfig?: PartyConfig;
  onStart: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  themeMode = "wedding",
  weddingConfig,
  partyConfig,
  onStart,
}) => {
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

  const handleStartClick = () => {
    soundFx.playChime();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    onStart();
  };

  // ----------------------------------------------------
  // TEMA BEBAS / COLORFUL PARTY
  // ----------------------------------------------------
  if (themeMode === "party") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative text-center">
        {/* Colorful Animated Background Rings */}
        <div className="absolute w-[500px] h-[500px] rounded-full border border-pink-500/20 pointer-events-none animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute w-[680px] h-[680px] rounded-full border border-cyan-400/15 pointer-events-none" />
        <div className="absolute w-[360px] h-[360px] rounded-full bg-gradient-to-tr from-purple-600/10 via-pink-600/10 to-cyan-500/10 blur-3xl pointer-events-none" />

        {/* JOTA-JOTI / Party Badge Seal */}
        <div className="relative mb-6">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-[3px] bg-gradient-to-tr from-amber-400 via-purple-600 to-cyan-400 shadow-[0_0_45px_rgba(98,37,153,0.55)]">
            <div className="w-full h-full rounded-full bg-white p-2 flex items-center justify-center overflow-hidden border border-white/40 shadow-inner">
              <img
                src="/frames/jotajoti/JOTA-JOTI-2026_Badge-To-Pablo.png"
                alt="JOTA-JOTI 2026 Official Badge"
                className="w-full h-full object-contain hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#2E0E4C] px-3.5 py-0.5 rounded-full border border-amber-400 flex items-center gap-1.5 shadow-[0_0_15px_rgba(249,183,8,0.5)]">
            <Sparkles size={12} className="text-amber-300 animate-spin" />
            <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">JOTA-JOTI 2026</span>
          </div>
        </div>

        {/* Subtitle with Colorful Glow */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-pink-500" />
          <span className="px-4 py-1 rounded-full bg-pink-500/15 border border-pink-500/40 text-pink-300 font-bold tracking-[0.22em] text-xs sm:text-sm uppercase shadow-[0_0_15px_rgba(255,0,127,0.25)]">
            {partyConfig?.subtitle || "STRIKE A POSE & HAVE FUN!"}
          </span>
          <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-pink-500" />
        </div>

        {/* Event Name */}
        <h1 className="font-sans font-extrabold text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-party-gradient py-2 px-6 my-1 drop-shadow-[0_4px_24px_rgba(255,0,127,0.4)] overflow-visible leading-tight tracking-tight">
          {partyConfig?.eventName || "Party & Celebration"}
        </h1>

        {/* Date & Hashtag */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm tracking-wider font-semibold text-stone-300 mt-2 mb-10">
          <span className="px-3.5 py-1 rounded-full bg-cyan-950/50 border border-cyan-400/40 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.25)]">
            {partyConfig?.eventDate || "16 Oktober 2026"}
          </span>
          <span className="text-stone-500">•</span>
          <span className="px-3.5 py-1 rounded-full bg-purple-950/50 border border-purple-400/40 text-purple-300 shadow-[0_0_12px_rgba(157,78,221,0.25)]">
            {partyConfig?.hashtag || "#PartyVibes"}
          </span>
        </div>

        {/* Colorful Party Button */}
        <button
          onClick={handleStartClick}
          className="btn-party px-12 py-5 sm:px-16 sm:py-6 rounded-full flex items-center justify-center gap-3 text-base sm:text-lg group cursor-pointer shadow-[0_4px_35px_rgba(255,0,127,0.5)]"
        >
          <Camera size={26} className="text-white group-hover:scale-115 transition-transform drop-shadow" />
          <span>Sentuh Layar untuk Mulai</span>
        </button>
      </div>
    );
  }

  // ----------------------------------------------------
  // TEMA WEDDING (ELEGAN & EMAS)
  // ----------------------------------------------------
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
      <h1 className="font-script text-6xl sm:text-7xl md:text-8xl text-gold-gradient py-3 px-6 my-1 drop-shadow-[0_4px_16px_rgba(212,175,55,0.3)] overflow-visible leading-tight inline-block">
        <span>{weddingConfig.brideName}</span>{" "}
        <span className="font-serif text-4xl sm:text-5xl text-amber-300/80 font-normal align-middle mx-1">&</span>{" "}
        <span className="inline-block pr-4">{weddingConfig.groomName}</span>
      </h1>

      {/* Date */}
      <p className="font-sans text-sm sm:text-base tracking-[0.18em] text-stone-300 font-light mt-2 mb-10 flex items-center justify-center">
        <span>{weddingConfig.weddingDate}</span>
      </p>

      {/* Big Start Button */}
      <button
        onClick={handleStartClick}
        className="btn-gold shimmer-glow px-12 py-5 sm:px-16 sm:py-6 rounded-full flex items-center justify-center gap-3 text-base sm:text-lg group cursor-pointer shadow-[0_4px_30px_rgba(212,175,55,0.4)]"
      >
        <Camera size={24} className="text-stone-900 group-hover:scale-110 transition-transform" />
        <span>Sentuh Layar untuk Mulai</span>
      </button>
    </div>
  );
};
