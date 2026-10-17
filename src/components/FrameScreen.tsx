import React, { useState } from "react";
import { ArrowLeft, Check, Camera, Image as ImageIcon, Sparkles } from "lucide-react";
import { ALL_FRAME_PRESETS, LAYOUTS } from "../config";
import { getBoxShotIndex } from "../lib/frameLayouts";
import { FrameSlot, PartyConfig, ThemeMode, WeddingConfig } from "../types";
import { soundFx } from "../lib/audio";

interface FrameScreenProps {
  themeMode?: ThemeMode;
  frameSlots: FrameSlot[];
  selectedSlotId: string;
  weddingConfig: WeddingConfig;
  partyConfig?: PartyConfig;
  onSelectSlot: (slot: FrameSlot) => void;
  onBack: () => void;
  onNext: (slot: FrameSlot) => void;
}

const SelectableFrameCard: React.FC<{
  slot: FrameSlot;
  index: number;
  totalCount: number;
  isSelected: boolean;
  themeMode?: ThemeMode;
  weddingConfig: WeddingConfig;
  partyConfig?: PartyConfig;
  onSelect: () => void;
  onConfirm: () => void;
}> = ({ slot, index, totalCount, isSelected, themeMode = "wedding", weddingConfig, partyConfig, onSelect, onConfirm }) => {
  const isParty = themeMode === "party";
  const preset =
    ALL_FRAME_PRESETS.find((p) => p.id === slot.presetThemeId) || ALL_FRAME_PRESETS[0];
  const layout = LAYOUTS.find((l) => l.id === slot.layoutId) || LAYOUTS[3]; // default 3x1

  // 10x15 cm frames (4R format) have an exact aspect ratio of 2/3 (1200x1800)
  const is10x15 = slot.layoutId === "3x2" || slot.layoutId === "2x2" || isParty;
  const defaultRatio = is10x15
    ? 2 / 3
    : layout.cols === 1
    ? slot.layoutId === "2x1"
      ? 1 / 2
      : 1 / 3
    : slot.layoutId === "1x1"
    ? 1
    : 2 / 3;

  const [aspectRatio, setAspectRatio] = useState<number>(defaultRatio);

  // Compute maximum width so all cards fit comfortably within screen width
  const maxCardWidthStyle =
    totalCount <= 5
      ? `calc((100% - ${(totalCount - 1) * 16}px) / ${totalCount})`
      : undefined;

  const displayImage = slot.customImage;

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
      className={`relative h-[50vh] sm:h-[53vh] md:h-[56vh] lg:h-[58vh] max-h-[600px] shrink-0 rounded-2xl cursor-pointer transition-all duration-300 select-none flex flex-col items-center justify-center p-0 overflow-hidden ${
        isSelected
          ? isParty
            ? "ring-4 ring-[#EF5000] shadow-[0_10px_35px_rgba(98,37,153,0.45)] scale-[1.03] z-20"
            : "ring-4 ring-amber-400 shadow-[0_0_35px_rgba(212,175,55,0.6)] scale-[1.03] z-20"
          : isParty
          ? "border-2 border-purple-200/80 hover:border-[#EF5000] hover:scale-[1.01] shadow-md opacity-90 hover:opacity-100 bg-white"
          : "border-2 border-amber-400/30 hover:border-amber-400/70 hover:scale-[1.01] shadow-xl opacity-85 hover:opacity-100"
      }`}
      style={{
        aspectRatio: `${aspectRatio}`,
        maxWidth: maxCardWidthStyle,
      }}
    >
      {/* Frame Visual: 100% filled with NO blank borders */}
      <div
        className="w-full h-full rounded-2xl overflow-hidden relative shadow-inner flex flex-col justify-between bg-white"
        style={
          slot.customImage
            ? {
                backgroundColor: "#ffffff",
              }
            : {
                background: preset.bgColor,
                borderColor: preset.borderColor,
              }
        }
      >
        {slot.customImage ? (
          <img
            src={displayImage}
            alt={slot.name}
            className="w-full h-full object-fill pointer-events-none drop-shadow-sm rounded-2xl"
            onError={(e) => {
              if (slot.customImage && e.currentTarget.src !== slot.customImage) {
                e.currentTarget.src = slot.customImage;
              }
            }}
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
                className="text-[7.5px] tracking-[0.2em] font-bold uppercase"
                style={{ color: preset.secondaryTextColor }}
              >
                {isParty ? (partyConfig?.title || "PHOTOBOOTH PARTY") : "THE WEDDING OF"}
              </div>
              <div
                className={isParty ? "font-bold text-sm sm:text-base leading-tight mt-0.5" : "font-script text-base sm:text-lg leading-tight mt-0.5"}
                style={{ color: preset.textColor }}
              >
                {isParty ? (partyConfig?.eventName || "Party & Celebration") : `${weddingConfig.brideName} & ${weddingConfig.groomName}`}
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
              {isParty ? (partyConfig?.eventDate || "16 Oktober 2026") : weddingConfig.weddingDate}
            </div>
          </div>
        )}
      </div>

      {/* Floating Badges Directly on the Frame */}
      {/* Top Left: Frame Name Pill */}
      <div className={`absolute top-2.5 left-2.5 z-20 px-3 py-1 rounded-full text-[11px] font-bold shadow-md backdrop-blur-md truncate max-w-[70%] ${
        isParty ? "bg-white/95 border border-purple-300 text-[#622599]" : "bg-black/85 border border-amber-400/50 font-cinzel text-amber-200"
      }`}>
        {slot.name || `Desain ${index + 1}`}
      </div>
    </button>
  );
};

export const FrameScreen: React.FC<FrameScreenProps> = ({
  themeMode = "wedding",
  frameSlots,
  selectedSlotId,
  weddingConfig,
  partyConfig,
  onSelectSlot,
  onBack,
  onNext,
}) => {
  const isParty = themeMode === "party";
  const activeSlots = frameSlots.filter((s) => s.enabled !== false);
  const displaySlots = activeSlots.length > 0 ? activeSlots : frameSlots;

  // Selected slot or fallback to first
  const currentSelectedSlot =
    displaySlots.find((s) => s.id === selectedSlotId) || displaySlots[0];

  return (
    <div className="flex-1 flex flex-col max-w-full mx-auto w-full px-2 sm:px-4 md:px-6 py-1 sm:py-2 justify-between min-h-0 h-full overflow-hidden">
      {/* Title */}
      <div className="text-center mb-1 sm:mb-2 shrink-0">
        <h2 className={`text-2xl sm:text-3xl mt-0 ${isParty ? "font-sans font-black bg-gradient-to-r from-[#2E0E4C] via-[#622599] to-[#EF5000] bg-clip-text text-transparent drop-shadow-sm" : "font-serif text-gold-gradient font-normal"}`}>
          {isParty ? "Pilih Bingkai JOTA-JOTI 2026" : "Pilih Desain Bingkai"}
        </h2>
      </div>

      {/* Frame Slots: Clean flex row centered */}
      <div className="flex flex-nowrap items-center justify-center gap-3 sm:gap-4 md:gap-5 flex-1 min-h-0 mx-auto w-full my-auto py-3 px-3 overflow-x-auto overflow-y-hidden scrollbar-none">
        {displaySlots.map((slot, index) => (
          <SelectableFrameCard
            key={slot.id}
            slot={slot}
            index={index}
            totalCount={displaySlots.length}
            isSelected={currentSelectedSlot?.id === slot.id}
            themeMode={themeMode}
            weddingConfig={weddingConfig}
            partyConfig={partyConfig}
            onSelect={() => onSelectSlot(slot)}
            onConfirm={() => onNext(slot)}
          />
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className={`flex items-center justify-between mt-2 sm:mt-3 pt-2.5 border-t shrink-0 ${isParty ? "border-purple-200/60" : "border-amber-400/15"}`}>
        <button
          onClick={() => {
            soundFx.playChime();
            onBack();
          }}
          className={`${isParty ? "btn-party-outline" : "btn-gold-outline"} px-5 py-2.5 rounded-full flex items-center gap-2 text-xs sm:text-sm cursor-pointer`}
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
          className={`${isParty ? "btn-party shadow-[0_0_25px_rgba(255,0,127,0.4)]" : "btn-gold shadow-[0_0_20px_rgba(212,175,55,0.3)]"} px-7 py-2.5 rounded-full flex items-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer`}
        >
          <Camera size={16} />
          <span>Mulai Pemotretan ({currentSelectedSlot?.name || "Pilih Bingkai"})</span>
        </button>
      </div>
    </div>
  );
};
