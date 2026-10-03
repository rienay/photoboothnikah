import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Check, Camera, RefreshCw, RotateCw, FlipHorizontal, CheckCircle2 } from "lucide-react";
import { PHOTO_FILTERS } from "../config";
import { CameraFilter, LayoutConfig, PhotoBox, WeddingConfig, WeddingFramePreset } from "../types";
import { soundFx } from "../lib/audio";
import { calculateTargetPhotoRatio, getDefaultBoxesForLayout, getBoxShotIndex } from "../lib/frameLayouts";

interface ReviewScreenProps {
  photos: string[];
  layout: LayoutConfig;
  selectedFilterId: string;
  preset: WeddingFramePreset;
  customOverlayUrl?: string;
  photoBoxes?: PhotoBox[];
  weddingConfig: WeddingConfig;
  onChangeFilter: (filterId: string) => void;
  onUpdatePhoto: (index: number, newPhotoData: string) => void;
  onRetakeAll: () => void;
  onConfirm: () => void;
  mirrorCamera: boolean;
  selectedCameraId?: string;
  cameraRotation?: 0 | 90 | 180 | 270;
  onChangeCameraRotation?: (r: 0 | 90 | 180 | 270) => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  photos,
  layout,
  selectedFilterId,
  preset,
  customOverlayUrl,
  photoBoxes,
  weddingConfig,
  onChangeFilter,
  onUpdatePhoto,
  onConfirm,
  mirrorCamera,
  selectedCameraId,
  cameraRotation = 0,
  onChangeCameraRotation,
}) => {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [retakeIdx, setRetakeIdx] = useState<number | null>(null);
  const [retakeCountdown, setRetakeCountdown] = useState<number | null>(null);
  const [isRetakeFlashing, setIsRetakeFlashing] = useState(false);
  const [mirror, setMirror] = useState(mirrorCamera);
  const [frameNaturalRatio, setFrameNaturalRatio] = useState<number | null>(null);
  const singleVideoRef = useRef<HTMLVideoElement | null>(null);
  const singleStreamRef = useRef<MediaStream | null>(null);

  // Measure custom overlay aspect ratio if present
  useEffect(() => {
    if (!customOverlayUrl) {
      setFrameNaturalRatio(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setFrameNaturalRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = customOverlayUrl;
    if (img.complete && img.naturalWidth) {
      setFrameNaturalRatio(img.naturalWidth / img.naturalHeight);
    }
  }, [customOverlayUrl]);

  // Frame aspect ratio
  const effectiveFrameRatio = frameNaturalRatio || (layout.cols === 1 ? 1 / 2.8 : 2 / 3);

  // Target photo box for retake
  const activeBoxes = photoBoxes && photoBoxes.length > 0 ? photoBoxes : getDefaultBoxesForLayout(layout.id);
  const retakeTargetBox =
    retakeIdx !== null
      ? activeBoxes.find((_, idx) => getBoxShotIndex(idx, activeBoxes, layout) === retakeIdx) ||
        activeBoxes[retakeIdx] ||
        activeBoxes[0]
      : activeBoxes[0];

  // Viewfinder and capture aspect ratio for retake
  const targetPhotoRatio = useMemo(() => {
    return calculateTargetPhotoRatio(retakeTargetBox, effectiveFrameRatio, layout.aspectRatio);
  }, [retakeTargetBox, effectiveFrameRatio, layout.aspectRatio]);

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

  // Capture single shot in retake cropped to match targetPhotoRatio
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
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const isRot90or270 = cameraRotation === 90 || cameraRotation === 270;

      const effW = isRot90or270 ? vh : vw;
      const effH = isRot90or270 ? vw : vh;
      const effRatio = effW / effH;

      let cropEffW = effW;
      let cropEffH = effH;

      if (effRatio > targetPhotoRatio) {
        cropEffW = effH * targetPhotoRatio;
      } else {
        cropEffH = effW / targetPhotoRatio;
      }

      const cropSrcW = isRot90or270 ? cropEffH : cropEffW;
      const cropSrcH = isRot90or270 ? cropEffW : cropEffH;
      const cropX = (vw - cropSrcW) / 2;
      const cropY = (vh - cropSrcH) / 2;

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(cropEffW);
      canvas.height = Math.round(cropEffH);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        if (mirror) {
          ctx.scale(-1, 1);
        }
        if (cameraRotation !== 0) {
          ctx.rotate((cameraRotation * Math.PI) / 180);
        }
        ctx.drawImage(
          video,
          cropX,
          cropY,
          cropSrcW,
          cropSrcH,
          -cropSrcW / 2,
          -cropSrcH / 2,
          cropSrcW,
          cropSrcH
        );
        ctx.restore();

        const newPhotoData = canvas.toDataURL("image/jpeg", 0.95);
        onUpdatePhoto(retakeIdx, newPhotoData);
      }
    }

    // Close retake
    setRetakeIdx(null);
  }, [retakeIdx, retakeCountdown, mirror, targetPhotoRatio, onUpdatePhoto, cameraRotation]);

  const currentFilterObj = PHOTO_FILTERS.find((f) => f.id === selectedFilterId);

  // ================= FULL-SCREEN RETAKE VIEW (Matches ShootScreen) =================
  if (retakeIdx !== null) {
    return (
      <div className="flex-1 flex flex-col max-w-[1750px] mx-auto w-full px-2 sm:px-6 py-1 relative h-full overflow-y-auto lg:overflow-hidden min-h-0">
        {/* Shutter Flash Overlay */}
        {isRetakeFlashing && <div className="camera-flash" />}

        {/* 2-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-5 flex-1 items-stretch min-h-0">
          {/* ================= LEFT COLUMN: Camera Feed & Controls ================= */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between min-h-0">
            {/* Left Header */}
            <div className="flex items-center justify-between mb-1.5 px-1 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    soundFx.playChime();
                    setRetakeIdx(null);
                  }}
                  disabled={retakeCountdown !== null}
                  className="btn-gold-outline px-3 py-1 rounded-full text-xs cursor-pointer hover:scale-105 transition-transform flex items-center gap-1 font-medium"
                >
                  <span>←</span>
                  <span>Batal</span>
                </button>
                <span className="font-cinzel text-xs sm:text-sm tracking-wider text-amber-300 uppercase font-semibold">
                  Foto Ulang: Foto #{retakeIdx + 1}
                </span>
                <span className="text-xs text-stone-400 hidden sm:inline">
                  • Posisikan diri Anda, lalu tekan tombol Ambil Foto Ulang
                </span>
              </div>
            </div>

            {/* Main Camera Viewport Area */}
            <div className="flex-1 min-h-0 flex items-center justify-center p-0.5 sm:p-1 relative w-full overflow-hidden">
              <div
                className="h-full w-auto max-h-[48vh] sm:max-h-[58vh] lg:max-h-[78vh] xl:max-h-[82vh] 2xl:max-h-[85vh] max-w-full rounded-2xl overflow-hidden relative border-2 border-amber-400/40 bg-stone-950 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex items-center justify-center transition-all duration-300"
                style={{
                  aspectRatio: `${targetPhotoRatio}`,
                }}
              >
                <video
                  ref={singleVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transition-transform duration-300"
                  style={{
                    filter: currentFilterObj?.css || "none",
                    transform: `${mirror ? "scaleX(-1)" : ""} ${cameraRotation ? `rotate(${cameraRotation}deg)` : ""}`.trim() || undefined,
                    ...(cameraRotation === 90 || cameraRotation === 270
                      ? {
                          position: "absolute",
                          width: "180%",
                          height: "180%",
                          objectFit: "cover",
                        }
                      : {}),
                  }}
                />

                {/* Corner Golden Framing Brackets */}
                <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-amber-400/70 pointer-events-none z-10" />
                <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-amber-400/70 pointer-events-none z-10" />
                <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-amber-400/70 pointer-events-none z-10" />
                <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-amber-400/70 pointer-events-none z-10" />

                {/* Countdown Overlay */}
                {retakeCountdown !== null && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-amber-400/70 flex items-center justify-center bg-stone-900/85 shadow-[0_0_50px_rgba(212,175,55,0.7)] animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]">
                      <span className="font-cinzel text-5xl sm:text-6xl font-bold text-gold-gradient">
                        {retakeCountdown}
                      </span>
                    </div>
                    <span className="mt-3 font-script text-2xl sm:text-3xl text-amber-200 drop-shadow">
                      Bersiaplah... Senyum!
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Left Column Bottom Bar: Batal Button */}
            <div className="flex items-center justify-start mt-2 px-1">
              <button
                onClick={() => {
                  soundFx.playChime();
                  setRetakeIdx(null);
                }}
                disabled={retakeCountdown !== null}
                className="btn-gold-outline px-5 py-2 rounded-full text-xs cursor-pointer hover:scale-105 transition-transform"
              >
                Batal
              </button>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: Live Strip Preview & Ambil Foto ================= */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col justify-between min-h-0 bg-stone-900/30 border border-amber-400/15 rounded-2xl p-2.5 sm:p-3 backdrop-blur-sm shadow-xl">
            {/* Top Bar of Right Column: Camera Rotate Toggle & Mirror Toggle */}
            <div className="flex items-center justify-end gap-2 mb-1.5">
              {onChangeCameraRotation && (
                <button
                  onClick={() => {
                    soundFx.playChime();
                    const next = (cameraRotation === 0 ? 90 : cameraRotation === 90 ? 180 : cameraRotation === 180 ? 270 : 0) as 0 | 90 | 180 | 270;
                    onChangeCameraRotation(next);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all cursor-pointer ${
                    cameraRotation !== 0
                      ? "bg-amber-400/20 border-amber-400/50 text-amber-200 shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                      : "bg-white/5 border-white/10 text-stone-400 hover:text-stone-200"
                  }`}
                  title="Putar Orientasi Kamera (0° / 90° / 180° / 270°)"
                >
                  <RotateCw size={13} />
                  <span>Rotasi {cameraRotation}°</span>
                </button>
              )}

              <button
                onClick={() => {
                  soundFx.playChime();
                  setMirror(!mirror);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all cursor-pointer ${
                  mirror
                    ? "bg-amber-400/20 border-amber-400/50 text-amber-200 shadow-[0_0_10px_rgba(212,175,55,0.2)]"
                    : "bg-white/5 border-white/10 text-stone-400 hover:text-stone-200"
                }`}
                title="Cermin / Flip Kamera"
              >
                <FlipHorizontal size={14} />
                <span>Mirror {mirror ? "ON" : "OFF"}</span>
              </button>
            </div>

            {/* Center: Live Frame / Strip Mockup for Retake */}
            <div className="flex-1 flex items-center justify-center min-h-0 py-1">
              {customOverlayUrl ? (
                /* Custom Uploaded Frame Overlay Mockup */
                <div className="relative h-full max-h-[46vh] xl:max-h-[50vh] w-fit rounded-xl overflow-hidden border border-amber-400/40 shadow-2xl select-none mx-auto flex items-center justify-center bg-stone-950">
                  {/* Photo Boxes beneath custom overlay */}
                  <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                    {(photoBoxes && photoBoxes.length > 0
                      ? photoBoxes
                      : getDefaultBoxesForLayout(layout.id)
                    ).map((box, slotIdx) => {
                      const shotIdx = getBoxShotIndex(slotIdx, activeBoxes, layout);
                      const isRetakeTarget = shotIdx === retakeIdx;
                      const photoSrc = photos[shotIdx];

                      return (
                        <div
                          key={box.id || slotIdx}
                          className={`absolute rounded overflow-hidden flex items-center justify-center transition-all ${
                            isRetakeTarget
                              ? "bg-amber-400/20 border-2 border-amber-400 animate-pulse z-10"
                              : photoSrc
                              ? "bg-black"
                              : "bg-stone-800 border border-stone-700"
                          }`}
                          style={{
                            left: `${box.x}%`,
                            top: `${box.y}%`,
                            width: `${box.w}%`,
                            height: `${box.h}%`,
                          }}
                        >
                          {isRetakeTarget ? (
                            <div className="flex flex-col items-center gap-0.5 text-amber-300">
                              <Camera size={14} className="animate-bounce text-amber-400" />
                              <span className="text-[8px] font-bold text-amber-300 uppercase">
                                Ulang #{shotIdx + 1}
                              </span>
                            </div>
                          ) : photoSrc ? (
                            <div className="w-full h-full relative">
                              <img
                                src={photoSrc}
                                alt={`Foto ${shotIdx + 1}`}
                                className="w-full h-full object-cover"
                                style={{ filter: currentFilterObj?.css || "none" }}
                              />
                              <div className="absolute bottom-1 right-1 bg-black/60 rounded-full p-0.5">
                                <CheckCircle2 size={11} className="text-amber-400" />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[8px] font-mono text-stone-400 font-bold">
                              #{shotIdx + 1}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom Overlay sits on top so photos peek cleanly through transparent holes */}
                  <img
                    src={customOverlayUrl}
                    alt="Bingkai Kustom"
                    className="h-full w-auto max-h-[46vh] xl:max-h-[50vh] block pointer-events-none z-20 drop-shadow"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      if (img.naturalWidth && img.naturalHeight) {
                        setFrameNaturalRatio(img.naturalWidth / img.naturalHeight);
                      }
                    }}
                  />
                </div>
              ) : (
                /* Built-in Preset Theme Mockup */
                <div
                  className={`w-full ${
                    layout.cols === 1 ? "max-w-[190px] xl:max-w-[210px]" : "max-w-[230px] xl:max-w-[260px]"
                  } h-full max-h-[46vh] xl:max-h-[50vh] rounded-xl overflow-hidden shadow-2xl relative border flex flex-col items-center justify-between p-2 transition-all select-none`}
                  style={{
                    aspectRatio: layout.cols === 1 ? "1 / 2.7" : "2 / 3",
                    background: preset.bgColor,
                    borderColor: preset.borderColor,
                  }}
                >
                  <div
                    className="absolute inset-1.5 border rounded-lg pointer-events-none opacity-25"
                    style={{ borderColor: preset.borderColor }}
                  />

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

                  {/* Photo Slots Grid */}
                  <div
                    className="w-full px-1 flex-1 min-h-0 z-10 my-1 grid gap-1.5 items-center justify-center"
                    style={{
                      gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
                    }}
                  >
                    {Array.from({ length: layout.totalBoxes || (layout.rows * layout.cols) }).map((_, slotIdx) => {
                      const shotIdx = getBoxShotIndex(slotIdx, [], layout);
                      const isRetakeTarget = shotIdx === retakeIdx;
                      const photoSrc = photos[shotIdx];

                      return (
                        <div
                          key={slotIdx}
                          className={`w-full h-full rounded overflow-hidden relative border transition-all flex items-center justify-center min-h-0 ${
                            isRetakeTarget
                              ? "border-amber-400 border-2 bg-amber-400/15 shadow-[0_0_15px_rgba(212,175,55,0.4)] animate-pulse"
                              : photoSrc
                              ? "border-amber-400/60 shadow-sm"
                              : "border-white/15 bg-white/5 opacity-70"
                          }`}
                          style={{
                            borderColor: isRetakeTarget ? undefined : preset.borderColor,
                          }}
                        >
                          {isRetakeTarget ? (
                            <div className="flex flex-col items-center gap-0.5 text-amber-300">
                              <Camera size={14} className="animate-bounce" />
                              <span className="text-[8px] font-cinzel uppercase tracking-wider font-semibold">
                                Ulang #{shotIdx + 1}
                              </span>
                            </div>
                          ) : photoSrc ? (
                            <div className="w-full h-full relative">
                              <img
                                src={photoSrc}
                                alt={`Foto ${shotIdx + 1}`}
                                className="w-full h-full object-cover"
                                style={{
                                  filter: currentFilterObj?.css || "none",
                                }}
                              />
                              <div className="absolute bottom-1 right-1 bg-black/60 rounded-full p-0.5">
                                <CheckCircle2 size={11} className="text-amber-400" />
                              </div>
                            </div>
                          ) : (
                            <span
                              className="text-[8px] font-mono opacity-50"
                              style={{ color: preset.secondaryTextColor }}
                            >
                              Foto {shotIdx + 1}
                            </span>
                          )}
                        </div>
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
              )}
            </div>

            {/* Bottom Action: Prominent Ambil Foto Ulang Button */}
            <div className="mt-2">
              <button
                onClick={captureSingleShot}
                disabled={retakeCountdown !== null}
                className="btn-gold w-full py-3 sm:py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-bold tracking-wider uppercase cursor-pointer shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Camera size={18} />
                <span>Ambil Foto Ulang</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full px-2 sm:px-4 py-1 relative h-full overflow-y-auto lg:overflow-hidden min-h-0">
      {/* Centered Main 2-Column Split */}
      <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 flex-1 min-h-0 max-h-none lg:max-h-[520px]">
        {/* ================= LEFT: Live Frame / Strip Mockup ================= */}
        {customOverlayUrl ? (
          /* Custom Uploaded Frame Overlay Mockup */
          <div className="relative h-full max-h-[240px] sm:max-h-[340px] lg:max-h-[480px] w-fit rounded-xl overflow-hidden border border-amber-400/40 shadow-2xl select-none mx-auto flex items-center justify-center bg-stone-950 shrink-0">
            {/* Interactive Photo Boxes beneath custom overlay */}
            <div className="absolute inset-0 w-full h-full z-10 pointer-events-auto">
              {(photoBoxes && photoBoxes.length > 0
                ? photoBoxes
                : getDefaultBoxesForLayout(layout.id)
              ).map((box, slotIdx) => {
                const shotIdx = getBoxShotIndex(slotIdx, activeBoxes, layout);
                const photoUrl = photos[shotIdx];
                const isSelected = activePhotoIdx === shotIdx;

                return (
                  <button
                    key={box.id || slotIdx}
                    type="button"
                    onClick={() => {
                      soundFx.playChime();
                      setActivePhotoIdx(shotIdx);
                    }}
                    className={`absolute rounded overflow-hidden flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-amber-400 z-10 shadow-lg scale-[1.01]"
                        : "opacity-90 hover:opacity-100"
                    }`}
                    style={{
                      left: `${box.x}%`,
                      top: `${box.y}%`,
                      width: `${box.w}%`,
                      height: `${box.h}%`,
                    }}
                    title={`Klik untuk meninjau Foto #${slotIdx + 1}`}
                  >
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={`Foto ${slotIdx + 1}`}
                        className="w-full h-full object-cover"
                        style={{ filter: currentFilterObj?.css || "none" }}
                      />
                    ) : (
                      <span className="text-[9px] font-mono text-slate-400 font-bold">#{shotIdx + 1}</span>
                    )}
                    <div className="absolute top-1 left-1 bg-black/70 px-1 py-0.2 rounded text-[8px] font-mono text-amber-300">
                      #{shotIdx + 1}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Overlay sits on top so photos peek cleanly through transparent holes */}
            <img
              src={customOverlayUrl}
              alt="Bingkai Kustom"
              className="h-full w-auto max-h-[240px] sm:max-h-[340px] lg:max-h-[480px] block pointer-events-none z-20 drop-shadow"
              onLoad={(e) => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setFrameNaturalRatio(img.naturalWidth / img.naturalHeight);
                }
              }}
            />
          </div>
        ) : (
          /* Built-in Preset Theme Mockup */
          <div
            className={`w-full ${
              layout.cols === 1 ? "max-w-[150px] sm:max-w-[190px] xl:max-w-[210px]" : "max-w-[190px] sm:max-w-[230px] xl:max-w-[260px]"
            } h-full max-h-[240px] sm:max-h-[340px] lg:max-h-[480px] rounded-xl overflow-hidden shadow-2xl relative border flex flex-col items-center justify-between p-2.5 transition-all shrink-0 select-none`}
            style={{
              aspectRatio: layout.cols === 1 ? "1 / 2.7" : "2 / 3",
              background: preset.bgColor,
              borderColor: preset.borderColor,
            }}
          >
            <div
              className="absolute inset-1.5 border rounded-lg pointer-events-none opacity-25"
              style={{ borderColor: preset.borderColor }}
            />

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

            {/* Interactive Photo Slots Grid */}
            <div
              className="w-full px-1 flex-1 min-h-0 z-10 my-1 grid gap-1.5 items-center justify-center"
              style={{
                gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
              }}
            >
              {photos.map((photoUrl, slotIdx) => {
                const isSelected = activePhotoIdx === slotIdx;

                return (
                  <button
                    key={slotIdx}
                    type="button"
                    onClick={() => {
                      soundFx.playChime();
                      setActivePhotoIdx(slotIdx);
                    }}
                    className={`w-full h-full rounded overflow-hidden relative border transition-all cursor-pointer ${
                      isSelected
                        ? "border-amber-400 border-2 shadow-[0_0_12px_rgba(212,175,55,0.5)] scale-[1.02] z-10"
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
        )}

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
    </div>
  );
};
