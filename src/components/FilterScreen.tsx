import React from "react";
import { ArrowLeft, Check, Camera } from "lucide-react";
import { PHOTO_FILTERS } from "../config";
import { CameraFilter } from "../types";
import { soundFx } from "../lib/audio";

interface FilterScreenProps {
  selectedFilterId: string;
  onSelectFilter: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

export const FilterScreen: React.FC<FilterScreenProps> = ({
  selectedFilterId,
  onSelectFilter,
  onBack,
  onNext,
}) => {
  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-4">
      {/* Title */}
      <div className="text-center mb-6">
        <span className="font-cinzel tracking-[0.25em] text-xs text-amber-300/80 uppercase">
          Langkah 2 dari 3
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl text-gold-gradient font-normal mt-1">
          Pilih Filter Foto
        </h2>
        <p className="text-xs sm:text-sm text-stone-400 mt-1">
          Pilih tone warna yang paling cocok untuk foto pernikahan Anda
        </p>
      </div>

      {/* Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 flex-1 items-stretch">
        {PHOTO_FILTERS.map((f: CameraFilter) => {
          const isSelected = selectedFilterId === f.id;
          return (
            <button
              key={f.id}
              onClick={() => {
                soundFx.playChime();
                onSelectFilter(f.id);
              }}
              className={`relative flex flex-col justify-between p-4 rounded-2xl transition-all duration-200 cursor-pointer text-left ${
                isSelected
                  ? "bg-amber-950/40 border-2 border-amber-400 shadow-[0_0_22px_rgba(212,175,55,0.35)] scale-[1.02]"
                  : "glass-gold-card hover:border-amber-400/50"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-lg">{f.emoji}</span>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-amber-400 text-stone-900 flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Sample Visual Box */}
              <div className="w-full h-24 rounded-lg bg-stone-900 border border-amber-400/20 overflow-hidden relative my-1 flex items-center justify-center">
                <div
                  className="w-full h-full flex flex-col items-center justify-center text-center p-2 bg-gradient-to-tr from-amber-950/60 via-stone-800 to-rose-950/50"
                  style={{ filter: f.css }}
                >
                  <span className="font-script text-2xl text-amber-200">Isna & Fadel</span>
                  <span className="text-[9px] font-sans tracking-widest text-amber-100/70">
                    PREVIEW
                  </span>
                </div>
              </div>

              {/* Filter Name & Desc */}
              <div className="mt-2">
                <h3 className="font-serif text-sm sm:text-base text-amber-100 font-medium">
                  {f.name}
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-2">{f.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-amber-400/15">
        <button
          onClick={() => {
            soundFx.playChime();
            onBack();
          }}
          className="btn-gold-outline px-6 py-3 rounded-full flex items-center gap-2 text-sm cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Kembali</span>
        </button>

        <button
          onClick={() => {
            soundFx.playChime();
            onNext();
          }}
          className="btn-gold px-8 py-3 rounded-full flex items-center gap-2 text-sm font-semibold cursor-pointer"
        >
          <span>Mulai Pemotretan</span>
          <Camera size={16} />
        </button>
      </div>
    </div>
  );
};
