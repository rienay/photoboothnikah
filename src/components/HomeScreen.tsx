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
        {/* Soft Colorful Animated Background Ambient Rings */}
        <div className="absolute w-[520px] h-[520px] rounded-full border border-purple-300/40 pointer-events-none animate-[pulse_4s_ease-in-out_infinite]" />
        <div className="absolute w-[700px] h-[700px] rounded-full border border-cyan-300/30 pointer-events-none" />
        <div className="absolute w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-purple-400/10 via-amber-300/10 to-cyan-400/10 blur-3xl pointer-events-none" />

        {/* JOTA-JOTI Official Badge Seal */}
        <div className="relative mb-6">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-[3px] bg-gradient-to-tr from-[#F9B708] via-[#622599] to-[#0094B4] shadow-[0_10px_35px_rgba(98,37,153,0.3)] hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-white p-2.5 flex items-center justify-center overflow-hidden border border-white/60 shadow-inner">
              <img
                src="/frames/jotajoti/JOTA-JOTI-2026_Badge-To-Pablo.png"
                alt="JOTA-JOTI 2026 Official Badge"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          </div>
          <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-[#2E0E4C] px-3.5 py-0.5 rounded-full border-2 border-[#F9B708] flex items-center gap-1.5 shadow-md">
            <Sparkles size={12} className="text-[#F9B708] animate-spin" />
            <span className="text-[10px] font-black tracking-widest text-[#F9B708] uppercase">JOTA-JOTI 2026</span>
          </div>
        </div>

        {/* Subtitle with Bright Scout Pill */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-[2px] bg-gradient-to-r from-transparent to-[#EF5000]" />
          <span className="px-5 py-1.5 rounded-full bg-white border-2 border-purple-200 text-[#622599] font-black tracking-[0.2em] text-xs sm:text-sm uppercase shadow-sm">
            {partyConfig?.subtitle || "KWARTIR CABANG CILACAP • YH2ABJ"}
          </span>
          <div className="w-12 h-[2px] bg-gradient-to-l from-transparent to-[#EF5000]" />
        </div>

        {/* Event Name */}
        <h1 className="font-sans font-black text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-party-gradient py-2 px-6 my-1 drop-shadow-sm overflow-visible leading-tight tracking-tight">
          {partyConfig?.eventName || "JOTA-JOTI 2026 CILACAP"}
        </h1>

        {/* Date & Hashtag */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm tracking-wider font-bold text-slate-700 mt-2 mb-10">
          <span className="px-4 py-1.5 rounded-full bg-white border border-[#0094B4]/40 text-[#0094B4] shadow-sm">
            {partyConfig?.eventDate || "16 - 18 Oktober 2026"}
          </span>
          <span className="text-slate-400">•</span>
          <span className="px-4 py-1.5 rounded-full bg-white border border-[#622599]/40 text-[#622599] shadow-sm">
            {partyConfig?.hashtag || "#JOTAJOTI2026 #YH2ABJ"}
          </span>
        </div>

        {/* Bright JOTA-JOTI Button */}
        <button
          onClick={handleStartClick}
          className="btn-party px-12 py-5 sm:px-16 sm:py-6 rounded-full flex items-center justify-center gap-3 text-base sm:text-lg group cursor-pointer shadow-[0_8px_30px_rgba(98,37,153,0.35)]"
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
