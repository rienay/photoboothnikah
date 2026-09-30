import React from "react";
import { ArrowLeft, Check, Camera, Image as ImageIcon } from "lucide-react";
import { WEDDING_PRESETS, LAYOUTS } from "../config";
import { FrameSlot, WeddingConfig } from "../types";
import { soundFx } from "../lib/audio";

interface FrameScreenProps {
  frameSlots: FrameSlot[];
  selectedSlotId: string;
  weddingConfig: WeddingConfig;
  onSelectSlot: (slot: FrameSlot) => void;
  onBack: () => void;
  onNext: () => void;
}

export const FrameScreen: React.FC<FrameScreenProps> = ({
  frameSlots,
  selectedSlotId,
  weddingConfig,
  onSelectSlot,
  onBack,
  onNext,
}) => {
  const activeSlots = frameSlots.filter((s) => s.enabled !== false);
  const displaySlots = activeSlots.length > 0 ? activeSlots : frameSlots;

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-2 sm:py-3 justify-between min-h-0 h-full overflow-hidden">
      {/* Title */}
      <div className="text-center mb-1.5 sm:mb-2 shrink-0">
        <h2 className="font-serif text-2xl sm:text-3xl text-gold-gradient font-normal mt-0">
          Pilih Desain Bingkai
        </h2>
      </div>

      {/* Frame Slots Grid */}
      <div
        className={`grid gap-3.5 sm:gap-5 flex-1 min-h-0 items-center mx-auto w-full my-auto overflow-y-auto px-1 ${
          displaySlots.length <= 1
            ? "max-w-sm grid-cols-1"
            : displaySlots.length === 2
            ? "max-w-2xl grid-cols-2"
            : displaySlots.length === 3
            ? "max-w-4xl grid-cols-3"
            : displaySlots.length === 4
            ? "max-w-5xl grid-cols-2 sm:grid-cols-4"
            : "max-w-5xl grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
        }`}
      >
        {displaySlots.map((slot, index) => {
          const isSelected = selectedSlotId === slot.id;
          const preset =
            WEDDING_PRESETS.find((p) => p.id === slot.presetThemeId) || WEDDING_PRESETS[0];
          const layout = LAYOUTS.find((l) => l.id === slot.layoutId) || LAYOUTS[3]; // default 3x1

          return (
            <button
              key={slot.id}
              onClick={() => {
                soundFx.playChime();
                onSelectSlot(slot);
              }}
              className={`relative flex flex-col p-3 sm:p-3.5 rounded-2xl transition-all duration-300 cursor-pointer text-left h-[330px] sm:h-[370px] md:h-[400px] max-h-[52vh] ${
                isSelected
                  ? "bg-amber-950/40 border-2 border-amber-400 shadow-[0_0_25px_rgba(212,175,55,0.4)] scale-[1.02]"
                  : "glass-gold-card hover:border-amber-400/50 hover:scale-[1.01]"
              }`}
            >
              {/* Header inside card */}
              <div className="flex items-center justify-between w-full mb-1.5 shrink-0">
                <span className="text-[11px] font-cinzel tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-semibold truncate max-w-[80%]">
                  {slot.name || `Desain ${index + 1}`}
                </span>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-amber-400 text-stone-900 flex items-center justify-center shadow-md shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Visual Frame Mockup / Custom Image (Enlarged to fill card) */}
              <div className="flex-1 w-full min-h-0 rounded-xl border border-amber-400/35 bg-stone-950/90 p-2 sm:p-2.5 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                {slot.customImage ? (
                  /* Custom PNG uploaded by user */
                  <img
                    src={slot.customImage}
                    alt={slot.name}
                    className="h-full w-full object-contain drop-shadow-md"
                  />
                ) : (
                  /* Elegant Wedding Preset Preview scaled to full height */
                  <div
                    className="w-full h-full rounded-lg border p-2 sm:p-2.5 flex flex-col justify-between items-center relative overflow-hidden"
                    style={{
                      background: preset.bgColor,
                      borderColor: preset.borderColor,
                    }}
                  >
                    <div
                      className="absolute inset-1 border rounded pointer-events-none opacity-30"
                      style={{ borderColor: preset.borderColor }}
                    />

                    {/* Header */}
                    <div className="text-center z-10 pt-0.5 shrink-0">
                      <div
                        className="text-[7.5px] tracking-[0.2em] font-cinzel uppercase"
                        style={{ color: preset.secondaryTextColor }}
                      >
                        THE WEDDING OF
                      </div>
                      <div
                        className="font-script text-base sm:text-lg leading-tight mt-0.5"
                        style={{ color: preset.textColor }}
                      >
                        {weddingConfig.brideName} & {weddingConfig.groomName}
                      </div>
                    </div>

                    {/* Photo Boxes imitation */}
                    <div className="flex flex-col gap-1.5 w-full px-3 flex-1 justify-center z-10 my-1">
                      {Array.from({ length: Math.min(3, layout.totalPhotos) }).map((_, bIdx) => (
                        <div
                          key={bIdx}
                          className="w-full flex-1 max-h-16 min-h-7 rounded border opacity-60 flex items-center justify-center"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            borderColor: preset.borderColor,
                          }}
                        >
                          <span className="text-[9px] text-stone-400 font-mono">
                            Foto {bIdx + 1}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div
                      className="text-[7.5px] font-sans tracking-wider z-10 pb-0.5 shrink-0"
                      style={{ color: preset.secondaryTextColor }}
                    >
                      {weddingConfig.weddingDate}
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-2 sm:mt-3 pt-2.5 border-t border-amber-400/15 shrink-0">
        <button
          onClick={() => {
            soundFx.playChime();
            onBack();
          }}
          className="btn-gold-outline px-5 py-2.5 rounded-full flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>Kembali ke Awal</span>
        </button>

        <button
          onClick={() => {
            soundFx.playChime();
            onNext();
          }}
          className="btn-gold px-7 py-2.5 rounded-full flex items-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          <Camera size={16} />
          <span>Mulai Pemotretan</span>
        </button>
      </div>
    </div>
  );
};
