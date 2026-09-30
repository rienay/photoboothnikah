import React, { useState, useRef, useEffect, useCallback } from "react";
import { Check, Camera, RefreshCw } from "lucide-react";
import { PHOTO_FILTERS } from "../config";
import { CameraFilter, LayoutConfig, WeddingConfig, WeddingFramePreset } from "../types";
import { soundFx } from "../lib/audio";

interface ReviewScreenProps {
  photos: string[];
  layout: LayoutConfig;
  selectedFilterId: string;
  preset: WeddingFramePreset;
  customOverlayUrl?: string;
  weddingConfig: WeddingConfig;
  onChangeFilter: (filterId: string) => void;
  onUpdatePhoto: (index: number, newPhotoData: string) => void;
  onRetakeAll: () => void;
  onConfirm: () => void;
  mirrorCamera: boolean;
  selectedCameraId?: string;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  photos,
  layout,
  selectedFilterId,
  preset,
  customOverlayUrl,
  weddingConfig,
  onChangeFilter,
  onUpdatePhoto,
  onConfirm,
  mirrorCamera,
  selectedCameraId,
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [retakeIdx, setRetakeIdx] = useState<number | null>(null);
  const [retakeCountdown, setRetakeCountdown] = useState<number | null>(null);
  const [isRetakeFlashing, setIsRetakeFlashing] = useState(false);
  const singleVideoRef = useRef<HTMLVideoElement | null>(null);
  const singleStreamRef = useRef<MediaStream | null>(null);

  // Initialize camera for single retake
  useEffect(() => {
    if (retakeIdx === null) return;
    let active = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: "user",
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        singleStreamRef.current = stream;
        if (singleVideoRef.current) {
          singleVideoRef.current.srcObject = stream;
          singleVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error("Failed to start retake camera:", err);
      }
    }

    startCamera();

    return () => {
      active = false;
      if (singleStreamRef.current) {
        singleStreamRef.current.getTracks().forEach((t) => t.stop());
        singleStreamRef.current = null;
      }
    };
  }, [retakeIdx, selectedCameraId]);

  // Capture single shot in retake modal
  const captureSingleShot = useCallback(async () => {
    if (retakeIdx === null || retakeCountdown !== null) return;

    for (let c = 3; c > 0; c--) {
      setRetakeCountdown(c);
      soundFx.playCountdown(c);
      await new Promise((res) => setTimeout(res, 1000));
    }
    setRetakeCountdown(null);

    // Flash & Shutter
    setIsRetakeFlashing(true);
    soundFx.playShutter();
    setTimeout(() => setIsRetakeFlashing(false), 400);

    const video = singleVideoRef.current;
    if (video && video.videoWidth > 0) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (mirrorCamera) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const newPhotoData = canvas.toDataURL("image/jpeg", 0.95);
        onUpdatePhoto(retakeIdx, newPhotoData);
      }
    }

    // Close retake modal
    setRetakeIdx(null);
  }, [retakeIdx, retakeCountdown, mirrorCamera, onUpdatePhoto]);

  const currentFilterObj = PHOTO_FILTERS.find((f) => f.id === selectedFilterId);

  return (
    <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-3 py-1 relative h-full max-h-[calc(100vh-115px)] min-h-0">
      {/* Centered Main 2-Column Split */}
      <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-5 lg:gap-8 flex-1 min-h-0 max-h-[520px]">
        {/* ================= LEFT: Vertical Strip Mockup ================= */}
        <div
          className="w-full max-w-[190px] xl:max-w-[210px] h-full max-h-[480px] rounded-xl overflow-hidden shadow-2xl relative border flex flex-col items-center justify-between p-2.5 transition-all shrink-0"
          style={{
            aspectRatio: "1 / 2.7",
            background: preset.bgColor,
            borderColor: preset.borderColor,
          }}
        >
          {/* Optional Custom Frame Overlay */}
          {customOverlayUrl && (
            <img
              src={customOverlayUrl}
              alt="Bingkai Kustom"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
            />
          )}

          {/* Decorative hairline border if preset */}
          {!customOverlayUrl && (
            <div
              className="absolute inset-1.5 border rounded-lg pointer-events-none opacity-25"
              style={{ borderColor: preset.borderColor }}
            />
          )}

          {/* Strip Header: Couple Names */}
          <div className="text-center z-10 pt-0.5">
            <div
              className="text-[7px] sm:text-[8px] tracking-[0.2em] font-cinzel uppercase"
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

          {/* 3 Interactive Photo Slots */}
          <div className="flex flex-col gap-1.5 w-full px-1 flex-1 justify-center z-10 my-1 min-h-0">
            {photos.map((photoUrl, slotIdx) => {
              const isSelected = activePhotoIdx === slotIdx;

              return (
                <button
                  key={slotIdx}
                  onClick={() => {
                    soundFx.playChime();
                    setActivePhotoIdx(slotIdx);
                  }}
                  className={`w-full flex-1 rounded-md overflow-hidden relative border transition-all cursor-pointer ${
                    isSelected
                      ? "border-amber-400 border-2 shadow-[0_0_12px_rgba(212,175,55,0.5)] scale-[1.02]"
                      : "border-white/20 opacity-80 hover:opacity-100"
                  }`}
                  style={{
                    borderColor: isSelected ? undefined : preset.borderColor,
                  }}
                  title={`Klik untuk meninjau Foto #${slotIdx + 1}`}
                >
                  <img
                    src={photoUrl}
                    alt={`Foto ${slotIdx + 1}`}
                    className="w-full h-full object-cover"
                    style={{ filter: currentFilterObj?.css || "none" }}
                  />
                  <div className="absolute top-1 left-1 bg-black/70 px-1 py-0.2 rounded text-[8px] font-mono text-amber-300">
                    #{slotIdx + 1}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Strip Footer: Date */}
          <div
            className="text-[7px] sm:text-[8px] font-sans tracking-wider z-10 pb-0.5"
            style={{ color: preset.secondaryTextColor }}
          >
            {weddingConfig.weddingDate}
          </div>
        </div>

        {/* ================= RIGHT: Photo Review, 6 Filters & Buttons ================= */}
        <div className="flex-1 max-w-lg w-full flex flex-col justify-between h-full max-h-[480px] bg-stone-900/40 border border-amber-400/15 rounded-2xl p-3.5 backdrop-blur-sm shadow-xl min-h-0">
          {/* Header Row: Title & Photo Switcher Pills */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-serif text-base sm:text-lg text-gold-gradient font-normal">
                Tinjau Hasil Foto
              </h3>
              <p className="text-[10px] text-stone-400">
                Pilih filter tone & klik foto jika ingin mengulang
              </p>
            </div>

            {/* Photo Tabs 1, 2, 3 */}
            <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10">
              {photos.map((_, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => {
                    soundFx.playChime();
                    setActivePhotoIdx(pIdx);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-cinzel transition-all cursor-pointer ${
                    activePhotoIdx === pIdx
                      ? "bg-amber-400 text-stone-950 font-bold shadow"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  Foto {pIdx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Top 6 Filters Grid (3 columns x 2 rows, matching user screenshot) */}
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            {PHOTO_FILTERS.slice(0, 6).map((f: CameraFilter) => {
              const isSelected = selectedFilterId === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    soundFx.playChime();
                    onChangeFilter(f.id);
                  }}
                  className={`py-1 px-1.5 rounded-lg text-[11px] transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                    isSelected
                      ? "bg-amber-400/25 border-amber-400 text-amber-200 font-semibold shadow-[0_0_10px_rgba(212,175,55,0.25)]"
                      : "bg-white/5 border-white/10 text-stone-400 hover:bg-white/10 hover:text-stone-200"
                  }`}
                >
                  <span className="text-xs">{f.emoji}</span>
                  <span className="truncate">{f.name.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Center: Big Active Photo Display */}
          <div className="flex-1 min-h-0 rounded-xl overflow-hidden relative border-2 border-amber-400/30 bg-stone-950 shadow-inner flex items-center justify-center mb-2.5">
            <img
              src={photos[activePhotoIdx]}
              alt={`Foto ${activePhotoIdx + 1}`}
              className="w-full h-full object-cover transition-all"
              style={{ filter: currentFilterObj?.css || "none" }}
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-amber-300 border border-white/10">
              Foto #{activePhotoIdx + 1}
            </div>
          </div>

          {/* Bottom Row: 2 Action Buttons (matching the 2 red boxes in user screenshot) */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-400/10">
            {/* Left Button: Ulang Foto Ini */}
            <button
              onClick={() => {
                soundFx.playChime();
                setRetakeIdx(activePhotoIdx);
              }}
              className="btn-gold-outline py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <Camera size={14} />
              <span>Ulang Foto #{activePhotoIdx + 1}</span>
            </button>

            {/* Right Button: Lanjut ke Cetak */}
            <button
              onClick={() => {
                soundFx.playChime();
                onConfirm();
              }}
              className="btn-gold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Lanjut ke Cetak</span>
              <Check size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Retake Single Photo Modal */}
      {retakeIdx !== null && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          {isRetakeFlashing && <div className="camera-flash" />}

          <div className="max-w-xl w-full rounded-2xl border-2 border-amber-400/50 bg-stone-900 p-5 flex flex-col items-center shadow-[0_0_50px_rgba(0,0,0,0.9)] relative">
            <h3 className="font-serif text-lg text-gold-gradient mb-1">
              Foto Ulang: Foto #{retakeIdx + 1}
            </h3>
            <p className="text-xs text-stone-400 mb-3">
              Posisikan diri Anda, lalu tekan tombol ambil foto
            </p>

            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-black border border-amber-400/30 relative">
              <video
                ref={singleVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{
                  filter: currentFilterObj?.css || "none",
                  transform: mirrorCamera ? "scaleX(-1)" : "none",
                }}
              />

              {retakeCountdown !== null && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="font-cinzel text-7xl font-bold text-amber-300 animate-ping">
                    {retakeCountdown}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={() => setRetakeIdx(null)}
                className="btn-gold-outline px-5 py-2.5 rounded-full text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={captureSingleShot}
                disabled={retakeCountdown !== null}
                className="btn-gold px-7 py-2.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Camera size={16} />
                <span>Ambil Foto Ulang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
