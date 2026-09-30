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
  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 py-4 justify-between">
      {/* Title */}
      <div className="text-center mb-4">
        <h2 className="font-serif text-3xl sm:text-4xl text-gold-gradient font-normal mt-1">
          Pilih Desain Bingkai
        </h2>
      </div>

      {/* 3 Frame Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 flex-1 items-stretch my-auto max-w-4xl mx-auto w-full">
        {frameSlots.slice(0, 3).map((slot, index) => {
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
              className={`relative flex flex-col p-4 sm:p-5 rounded-2xl transition-all duration-300 cursor-pointer text-left h-[440px] sm:h-[480px] ${
                isSelected
                  ? "bg-amber-950/40 border-2 border-amber-400 shadow-[0_0_30px_rgba(212,175,55,0.4)] scale-[1.02]"
                  : "glass-gold-card hover:border-amber-400/50 hover:scale-[1.01]"
              }`}
            >
              {/* Header inside card */}
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-xs font-cinzel tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-semibold">
                  Desain {index + 1}
                </span>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-amber-400 text-stone-900 flex items-center justify-center shadow-md">
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Visual Frame Mockup / Custom Image (Enlarged to fill card) */}
              <div className="flex-1 w-full rounded-xl border border-amber-400/35 bg-stone-950/90 p-3 flex flex-col items-center justify-center relative overflow-hidden shadow-inner mt-1">
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
                    className="w-full h-full rounded-lg border p-3 flex flex-col justify-between items-center relative overflow-hidden"
                    style={{
                      background: preset.bgColor,
                      borderColor: preset.borderColor,
                    }}
                  >
                    <div
                      className="absolute inset-1.5 border rounded pointer-events-none opacity-30"
                      style={{ borderColor: preset.borderColor }}
                    />

                    {/* Header */}
                    <div className="text-center z-10 pt-1">
                      <div
                        className="text-[8px] tracking-[0.2em] font-cinzel uppercase"
                        style={{ color: preset.secondaryTextColor }}
                      >
                        THE WEDDING OF
                      </div>
                      <div
                        className="font-script text-xl leading-tight mt-0.5"
                        style={{ color: preset.textColor }}
                      >
                        {weddingConfig.brideName} & {weddingConfig.groomName}
                      </div>
                    </div>

                    {/* Photo Boxes imitation */}
                    <div className="flex flex-col gap-2 w-full px-5 flex-1 justify-center z-10 my-2">
                      {Array.from({ length: Math.min(3, layout.totalPhotos) }).map((_, bIdx) => (
                        <div
                          key={bIdx}
                          className="w-full flex-1 max-h-20 min-h-12 rounded border opacity-60 flex items-center justify-center"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            borderColor: preset.borderColor,
                          }}
                        >
                          <span className="text-[10px] text-stone-400 font-mono">
                            Foto {bIdx + 1}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div
                      className="text-[8px] font-sans tracking-wider z-10 pb-1"
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
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-amber-400/15">
        <button
          onClick={() => {
            soundFx.playChime();
            onBack();
          }}
          className="btn-gold-outline px-6 py-3 rounded-full flex items-center gap-2 text-sm cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Awal</span>
        </button>

        <button
          onClick={() => {
            soundFx.playChime();
            onNext();
          }}
          className="btn-gold px-8 py-3.5 rounded-full flex items-center gap-2.5 text-sm font-semibold cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          <Camera size={18} />
          <span>Mulai Pemotretan</span>
        </button>
      </div>
    </div>
  );
};
