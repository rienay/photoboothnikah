import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, FlipHorizontal, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";
import { LayoutConfig, WeddingConfig, WeddingFramePreset } from "../types";
import { soundFx } from "../lib/audio";

interface ShootScreenProps {
  layout: LayoutConfig;
  filterCss: string;
  countdownDuration: number;
  mirrorCamera: boolean;
  selectedCameraId?: string;
  preset: WeddingFramePreset;
  customOverlayUrl?: string;
  weddingConfig: WeddingConfig;
  onPhotosCaptured: (photos: string[]) => void;
  onBack: () => void;
}

export const ShootScreen: React.FC<ShootScreenProps> = ({
  layout,
  filterCss,
  countdownDuration,
  mirrorCamera: initialMirror,
  selectedCameraId,
  preset,
  customOverlayUrl,
  weddingConfig,
  onPhotosCaptured,
  onBack,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mirror, setMirror] = useState(initialMirror);
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [currentShotIndex, setCurrentShotIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isShooting, setIsShooting] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Initialize camera stream
  useEffect(() => {
    let active = true;

    async function initCamera() {
      try {
        setCameraError(null);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: "user",
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error("Camera access error:", err);
        setCameraError("Kamera tidak dapat diakses. Mohon periksa izin webcam atau koneksi kamera.");
      }
    }

    initCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [selectedCameraId]);

  // Capture single frame from video
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.95);
  }, [mirror]);

  // Trigger Flash effect and Shutter sound
  const triggerShutterFlash = useCallback(() => {
    setIsFlashing(true);
    soundFx.playShutter();
    setTimeout(() => {
      setIsFlashing(false);
    }, 400);
  }, []);

  // Run full multi-shot sequence
  const startShootSequence = useCallback(async () => {
    if (isShooting) return;
    setIsShooting(true);
    setCapturedPhotos([]);
    setCurrentShotIndex(0);

    const photos: string[] = [];

    for (let i = 0; i < layout.totalPhotos; i++) {
      setCurrentShotIndex(i + 1);

      // Countdown loop (e.g. 3, 2, 1)
      for (let sec = countdownDuration; sec > 0; sec--) {
        setCountdown(sec);
        soundFx.playCountdown(sec);
        await new Promise((res) => setTimeout(res, 1000));
      }

      setCountdown(null);

      // Flash & Capture
      triggerShutterFlash();
      const photoData = captureFrame();
      if (photoData) {
        photos.push(photoData);
        setCapturedPhotos([...photos]);
      }

      // Rest interval between shots if not last shot
      if (i < layout.totalPhotos - 1) {
        await new Promise((res) => setTimeout(res, 1500));
      }
    }

    setIsShooting(false);
    // Move to review screen
    soundFx.playFanfare();
    onPhotosCaptured(photos);
  }, [
    isShooting,
    layout.totalPhotos,
    countdownDuration,
    triggerShutterFlash,
    captureFrame,
    onPhotosCaptured,
  ]);

  // Spacebar to trigger shoot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isShooting && !cameraError) {
        e.preventDefault();
        startShootSequence();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isShooting, cameraError, startShootSequence]);

  return (
    <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-2 sm:px-5 py-1 relative h-full max-h-[calc(100vh-115px)] min-h-0">
      {/* Shutter Flash Overlay */}
      {isFlashing && <div className="camera-flash" />}

      {/* 2-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-5 flex-1 items-stretch min-h-0">
        {/* ================= LEFT COLUMN: Camera Feed & Controls ================= */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between min-h-0">
          {/* Left Header */}
          <div className="flex items-center justify-between mb-1.5 px-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="font-cinzel text-xs sm:text-sm tracking-wider text-amber-300 uppercase font-semibold">
                {layout.name}
              </span>
              <span className="text-xs text-stone-400">
                • {isShooting ? `Mengambil Foto ${currentShotIndex} dari ${layout.totalPhotos}` : `${layout.totalPhotos} Jepretan`}
              </span>
            </div>
          </div>

          {/* Main Camera Viewport */}
          <div className="flex-1 min-h-0 max-h-[65vh] xl:max-h-[68vh] rounded-2xl overflow-hidden relative border-2 border-amber-400/30 bg-stone-950 shadow-[0_15px_40px_rgba(0,0,0,0.8)] flex items-center justify-center">
            {cameraError ? (
              <div className="text-center p-6 max-w-md">
                <Camera size={48} className="text-rose-400 mx-auto mb-3 opacity-60" />
                <h3 className="font-serif text-lg text-rose-200 mb-1">Kamera Bermasalah</h3>
                <p className="text-xs text-stone-400 mb-4">{cameraError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="btn-gold-outline px-4 py-2 rounded-full text-xs inline-flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Muat Ulang Halaman
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{
                    filter: filterCss,
                    transform: mirror ? "scaleX(-1)" : "none",
                  }}
                />

                {/* Countdown Overlay */}
                {countdown !== null && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-amber-400/70 flex items-center justify-center bg-stone-900/85 shadow-[0_0_50px_rgba(212,175,55,0.7)] animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]">
                      <span className="font-cinzel text-5xl sm:text-6xl font-bold text-gold-gradient">
                        {countdown}
                      </span>
                    </div>
                    <span className="mt-3 font-script text-2xl sm:text-3xl text-amber-200 drop-shadow">
                      Bersiaplah... Senyum!
                    </span>
                  </div>
                )}

                {/* In-between shot message */}
                {isShooting && countdown === null && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-stone-900/90 border border-amber-400/40 text-amber-200 text-xs font-cinzel tracking-wider flex items-center gap-2 shadow-lg z-20">
                    <Sparkles size={14} className="text-amber-400 animate-spin" />
                    <span>Foto {currentShotIndex} Tersimpan! Bersiap selanjutnya...</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Left Column Bottom Bar: Kembali Button */}
          <div className="flex items-center justify-start mt-2 px-1">
            {!isShooting && (
              <button
                onClick={() => {
                  soundFx.playChime();
                  onBack();
                }}
                className="btn-gold-outline px-5 py-2 rounded-full text-xs cursor-pointer hover:scale-105 transition-transform"
              >
                Kembali
              </button>
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Live Strip Preview & Ambil Foto ================= */}
        <div className="lg:col-span-4 xl:col-span-3 flex flex-col justify-between min-h-0 bg-stone-900/30 border border-amber-400/15 rounded-2xl p-2.5 sm:p-3 backdrop-blur-sm shadow-xl">
          {/* Top Bar of Right Column: Mirror Toggle */}
          <div className="flex items-center justify-end mb-1.5">
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

          {/* Center: Vertical Strip Mockup */}
          <div className="flex-1 flex items-center justify-center min-h-0 py-1">
            <div
              className="w-full max-w-[190px] xl:max-w-[210px] h-full max-h-[46vh] xl:max-h-[50vh] rounded-xl overflow-hidden shadow-2xl relative border flex flex-col items-center justify-between p-2 transition-all"
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

              {/* Decorative inner hairline border if default preset */}
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

              {/* 3 Live Photo Slots */}
              <div className="flex flex-col gap-1.5 w-full px-1 flex-1 justify-center z-10 my-1 min-h-0">
                {Array.from({ length: Math.min(3, layout.totalPhotos) }).map((_, slotIdx) => {
                  const shotPhoto = capturedPhotos[slotIdx];
                  const isCurrentTarget = slotIdx === currentShotIndex - 1 && isShooting;

                  return (
                    <div
                      key={slotIdx}
                      className={`w-full flex-1 rounded-md overflow-hidden relative border transition-all flex items-center justify-center min-h-0 ${
                        shotPhoto
                          ? "border-amber-400/60 shadow-sm"
                          : isCurrentTarget
                          ? "border-amber-400 border-2 bg-amber-400/15 shadow-[0_0_15px_rgba(212,175,55,0.4)] animate-pulse"
                          : "border-white/15 bg-white/5 opacity-70"
                      }`}
                      style={{
                        borderColor: isCurrentTarget ? undefined : preset.borderColor,
                      }}
                    >
                      {shotPhoto ? (
                        <div className="w-full h-full relative">
                          <img
                            src={shotPhoto}
                            alt={`Shot ${slotIdx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-1 right-1 bg-black/60 rounded-full p-0.5">
                            <CheckCircle2 size={12} className="text-amber-400" />
                          </div>
                        </div>
                      ) : isCurrentTarget ? (
                        <div className="flex flex-col items-center gap-0.5 text-amber-300">
                          <Camera size={14} className="animate-bounce" />
                          <span className="text-[8px] font-cinzel uppercase tracking-wider">
                            Jepret #{slotIdx + 1}
                          </span>
                        </div>
                      ) : (
                        <span
                          className="text-[8px] font-mono opacity-50"
                          style={{ color: preset.secondaryTextColor }}
                        >
                          Foto {slotIdx + 1}
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
          </div>

          {/* Bottom Action: Prominent Ambil Foto Button (Matches Red Box at bottom right) */}
          <div className="mt-1.5 pt-1.5 border-t border-amber-400/10">
            <button
              onClick={() => {
                soundFx.playChime();
                startShootSequence();
              }}
              disabled={isShooting || !!cameraError}
              className="w-full btn-gold shimmer-glow py-3 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(212,175,55,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isShooting ? (
                <>
                  <Sparkles size={16} className="animate-spin text-stone-900" />
                  <span>Mengambil Foto...</span>
                </>
              ) : (
                <>
                  <Camera size={16} />
                  <span>AMBIL FOTO SEKARANG</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
