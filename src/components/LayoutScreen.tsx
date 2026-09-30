import React from "react";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { LAYOUTS } from "../config";
import { LayoutConfig, LayoutId } from "../types";
import { soundFx } from "../lib/audio";

interface LayoutScreenProps {
  selectedLayoutId: LayoutId;
  onSelectLayout: (id: LayoutId) => void;
  onBack: () => void;
  onNext: () => void;
}

export const LayoutScreen: React.FC<LayoutScreenProps> = ({
  selectedLayoutId,
  onSelectLayout,
  onBack,
  onNext,
}) => {
  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-4">
      {/* Title */}
      <div className="text-center mb-6">
        <span className="font-cinzel tracking-[0.25em] text-xs text-amber-300/80 uppercase">
          Langkah 1 dari 4
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl text-gold-gradient font-normal mt-1">
          Pilih Format Foto
        </h2>
        <p className="text-xs sm:text-sm text-stone-400 mt-1">
          Tentukan jumlah foto dan gaya layout yang diinginkan
        </p>
      </div>

      {/* Grid of Layouts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 flex-1 items-center">
        {LAYOUTS.map((item: LayoutConfig) => {
          const isSelected = selectedLayoutId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                soundFx.playChime();
                onSelectLayout(item.id);
              }}
              className={`relative flex flex-col items-center justify-between p-4 sm:p-5 rounded-2xl transition-all duration-200 cursor-pointer text-left ${
                isSelected
                  ? "bg-amber-950/40 border-2 border-amber-400 shadow-[0_0_25px_rgba(212,175,55,0.35)] scale-[1.02]"
                  : "glass-gold-card hover:border-amber-400/50"
              }`}
            >
              {/* Badge */}
              <div className="w-full flex items-center justify-between mb-3">
                <span className="text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/5 border border-amber-400/20 text-amber-200/80">
                  {item.badge}
                </span>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-stone-900 flex items-center justify-center">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Layout Mini Visual Representation */}
              <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-lg bg-stone-900/90 border border-amber-400/30 p-2 flex flex-col justify-center items-center shadow-inner my-2">
                <div
                  className="w-full h-full grid gap-1.5 p-1"
                  style={{
                    gridTemplateColumns: `repeat(${item.cols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${item.rows}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: item.totalPhotos }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`rounded-sm border flex items-center justify-center ${
                        isSelected
                          ? "bg-amber-400/20 border-amber-400/60 text-amber-200"
                          : "bg-white/5 border-white/10 text-stone-500"
                      }`}
                    >
                      <span className="text-[9px] font-mono font-medium">{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info text */}
              <div className="w-full text-center mt-2">
                <h3 className="font-serif text-base sm:text-lg text-amber-100 font-medium">
                  {item.name}
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">{item.subtitle}</p>
                <div className="mt-2 text-[10px] text-amber-300/80 font-medium tracking-wide">
                  {item.paperSizeLabel}
                </div>
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
          <span>Lanjut ke Desain Frame</span>
          <Sparkles size={16} />
        </button>
      </div>
    </div>
  );
};
