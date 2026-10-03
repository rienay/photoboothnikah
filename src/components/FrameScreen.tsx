import React, { useState } from "react";
import { ArrowLeft, Check, Camera, Image as ImageIcon } from "lucide-react";
import { WEDDING_PRESETS, LAYOUTS } from "../config";
import { getBoxShotIndex } from "../lib/frameLayouts";
import { FrameSlot, WeddingConfig } from "../types";
import { soundFx } from "../lib/audio";

interface FrameScreenProps {
  frameSlots: FrameSlot[];
  selectedSlotId: string;
  weddingConfig: WeddingConfig;
  onSelectSlot: (slot: FrameSlot) => void;
  onBack: () => void;
  onNext: (slot: FrameSlot) => void;
}

const SelectableFrameCard: React.FC<{
  slot: FrameSlot;
  index: number;
  isSelected: boolean;
  weddingConfig: WeddingConfig;
  onSelect: () => void;
  onConfirm: () => void;
}> = ({ slot, index, isSelected, weddingConfig, onSelect, onConfirm }) => {
  const preset =
    WEDDING_PRESETS.find((p) => p.id === slot.presetThemeId) || WEDDING_PRESETS[0];
  const layout = LAYOUTS.find((l) => l.id === slot.layoutId) || LAYOUTS[3]; // default 3x1

  // Default initial aspect ratio based on layout
  const defaultRatio =
    layout.cols === 1
      ? slot.layoutId === "2x1"
        ? 1 / 2
        : 1 / 3
      : slot.layoutId === "1x1"
      ? 1
      : 2 / 3;

  const [aspectRatio, setAspectRatio] = useState<number>(defaultRatio);

  return (
    <button
      type="button"
      onClick={() => {
        soundFx.playChime();
        if (isSelected) {
          onConfirm();
        } else {
          onSelect();
        }
      }}
      className={`relative h-[290px] sm:h-[330px] md:h-[370px] lg:h-[46vh] xl:h-[50vh] 2xl:h-[53vh] max-h-[55vh] shrink-0 rounded-2xl cursor-pointer transition-all duration-300 select-none flex flex-col items-center justify-center p-0 overflow-hidden ${
        isSelected
          ? "ring-4 ring-amber-400 shadow-[0_0_35px_rgba(212,175,55,0.6)] scale-[1.03] z-20"
          : "border-2 border-amber-400/30 hover:border-amber-400/70 hover:scale-[1.015] shadow-xl opacity-85 hover:opacity-100"
      }`}
      style={{
        aspectRatio: `${aspectRatio}`,
      }}
    >
      {/* Frame Visual: Takes 100% of the card with NO outer dark box */}
      <div
        className="w-full h-full rounded-2xl overflow-hidden relative shadow-inner flex flex-col justify-between"
        style={
          slot.customImage
            ? {
                backgroundImage:
                  "linear-gradient(45deg, #181c24 25%, transparent 25%), linear-gradient(-45deg, #181c24 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #181c24 75%), linear-gradient(-45deg, transparent 75%, #181c24 75%)",
                backgroundSize: "14px 14px",
                backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0px",
              }
            : {
                background: preset.bgColor,
                borderColor: preset.borderColor,
              }
        }
      >
        {slot.customImage ? (
          <img
            src={slot.customImage}
            alt={slot.name}
            className="w-full h-full object-contain pointer-events-none drop-shadow-md"
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) {
                setAspectRatio(img.naturalWidth / img.naturalHeight);
              }
            }}
          />
        ) : (
          /* Preset Elegant Theme */
          <div
            className="w-full h-full p-2.5 sm:p-3 flex flex-col justify-between items-center relative overflow-hidden"
            style={{
              background: preset.bgColor,
              borderColor: preset.borderColor,
            }}
          >
            <div
              className="absolute inset-1.5 border rounded-lg pointer-events-none opacity-30"
              style={{ borderColor: preset.borderColor }}
            />

            {/* Header */}
            <div className="text-center z-10 pt-7 shrink-0">
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

            {/* Photo Boxes imitation adapting to cols/rows */}
            <div
              className="w-full px-2 flex-1 justify-center z-10 my-1 grid gap-1 items-center"
              style={{
                gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: layout.totalBoxes || (layout.rows * layout.cols) }).map((_, bIdx) => {
                const shotIdx = getBoxShotIndex(bIdx, [], layout);
                return (
                  <div
                    key={bIdx}
                    className="w-full h-full min-h-5 rounded border opacity-60 flex items-center justify-center"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      borderColor: preset.borderColor,
                    }}
                  >
                    <span className="text-[8px] text-stone-400 font-mono">
                      #{shotIdx + 1}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div
              className="text-[7.5px] font-sans tracking-wider z-10 pb-1 shrink-0"
              style={{ color: preset.secondaryTextColor }}
            >
              {weddingConfig.weddingDate}
            </div>
          </div>
        )}
      </div>

      {/* Floating Badges Directly on the Frame */}
      {/* Top Left: Frame Name Pill */}
      <div className="absolute top-2.5 left-2.5 z-20 px-3 py-1 rounded-full bg-black/85 border border-amber-400/50 text-[11px] font-cinzel text-amber-200 font-semibold shadow-lg backdrop-blur-md truncate max-w-[70%]">
        {slot.name || `Desain ${index + 1}`}
      </div>

      {/* Top Right: Selected Checkmark */}
      {isSelected && (
        <div className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center shadow-lg font-bold animate-in zoom-in-75 duration-200">
          <Check size={14} strokeWidth={3} />
        </div>
      )}

      {/* Bottom Left: Layout & Photo Count Badge */}
      <div className="absolute bottom-2.5 left-2.5 z-20 px-2.5 py-0.5 rounded-full bg-black/85 border border-amber-400/40 text-[10px] font-mono text-amber-300 font-bold shadow-md">
        {slot.layoutId.toUpperCase()} • {layout.totalPhotos} Foto{layout.isMirrored ? " (Mirror)" : ""}
      </div>

      {/* Bottom Right: Quick action when selected */}
      {isSelected && (
        <div className="absolute bottom-2.5 right-2.5 z-20">
          <span className="btn-gold py-1 px-3 rounded-full text-[11px] font-bold shadow-lg flex items-center gap-1 animate-pulse">
            <Camera size={12} />
            <span>Mulai Foto</span>
          </span>
        </div>
      )}
    </button>
  );
};

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

  // Selected slot or fallback to first
  const currentSelectedSlot =
    displaySlots.find((s) => s.id === selectedSlotId) || displaySlots[0];

  return (
    <div className="flex-1 flex flex-col max-w-[98vw] 2xl:max-w-[1850px] mx-auto w-full px-2 sm:px-4 py-1.5 sm:py-2.5 justify-between min-h-0 h-full overflow-hidden">
      {/* Title */}
      <div className="text-center mb-1.5 sm:mb-2 shrink-0">
        <h2 className="font-serif text-2xl sm:text-3xl text-gold-gradient font-normal mt-0">
          Pilih Desain Bingkai
        </h2>
      </div>

      {/* Frame Slots: Clean flex row with no artificial outer box */}
      <div className="flex flex-nowrap items-center justify-center gap-2.5 sm:gap-3.5 md:gap-4 lg:gap-5 flex-1 min-h-0 mx-auto w-full my-auto py-1 px-1 overflow-x-auto overflow-y-hidden scrollbar-none">
        {displaySlots.map((slot, index) => (
          <SelectableFrameCard
            key={slot.id}
            slot={slot}
            index={index}
            isSelected={currentSelectedSlot?.id === slot.id}
            weddingConfig={weddingConfig}
            onSelect={() => onSelectSlot(slot)}
            onConfirm={() => onNext(slot)}
          />
        ))}
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
            if (currentSelectedSlot) {
              onNext(currentSelectedSlot);
            }
          }}
          className="btn-gold px-7 py-2.5 rounded-full flex items-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          <Camera size={16} />
          <span>Mulai Pemotretan ({currentSelectedSlot?.name || "Pilih Bingkai"})</span>
        </button>
      </div>
    </div>
  );
};
