import React, { useEffect, useRef, useState } from "react";
import {
  Download,
  Printer,
  Home,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  QrCode,
  Sparkles,
  CloudUpload,
} from "lucide-react";
import { fireWeddingConfetti } from "../lib/confetti";
import { DriveConfig, LayoutConfig, PhotoBox, SavedSession, WeddingConfig, WeddingFramePreset } from "../types";
import { composeWeddingStrip, createDualStripCanvas } from "../lib/canvasComposer";
import { generateDriveQRCode, uploadToGoogleDrive } from "../lib/googleDrive";
import { saveSessionHistory } from "../lib/storage";
import { soundFx } from "../lib/audio";

interface ResultScreenProps {
  photos: string[];
  layout: LayoutConfig;
  preset: WeddingFramePreset;
  customOverlayUrl?: string;
  photoBoxes?: PhotoBox[];
  filterCss?: string;
  weddingConfig: WeddingConfig;
  driveConfig: DriveConfig;
  autoResetDuration: number;
  defaultPrintCopies: number;
  autoPrint?: boolean;
  onHome: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  photos,
  layout,
  preset,
  customOverlayUrl,
  photoBoxes,
  filterCss,
  weddingConfig,
  driveConfig,
  autoResetDuration,
  defaultPrintCopies,
  autoPrint = true,
  onHome,
}) => {
  const [renderedStrip, setRenderedStrip] = useState<string | null>(null);
  const [printImageSrc, setPrintImageSrc] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">(
    "idle"
  );
  const [uploadMessage, setUploadMessage] = useState<string>("");
  const [resetTimer, setResetTimer] = useState(autoResetDuration);
  const [printCopies, setPrintCopies] = useState(defaultPrintCopies);
  const [isComposing, setIsComposing] = useState(true);

  const uploadAttemptedRef = useRef(false);
  const autoPrintTriggeredRef = useRef(false);

  // 1. Compose the high resolution wedding strip
  useEffect(() => {
    let active = true;

    async function render() {
      setIsComposing(true);
      try {
        const stripUrl = await composeWeddingStrip({
          photos,
          layout,
          preset,
          customOverlayUrl,
          photoBoxes,
          weddingConfig,
          filterCss,
        });

        if (!active) return;
        setRenderedStrip(stripUrl);

        // Check the natural aspect ratio of the composed strip:
        // A single vertical strip has aspect ratio < 0.48 (e.g. 5x15cm, ratio ~0.33).
        // If it's a single narrow strip, duplicate side-by-side onto 4R (10x15cm) paper.
        // If it's ALREADY 10x15cm (ratio >= 0.5, e.g. 2:3 or 10:15), print directly 1:1 on 10x15cm!
        const checkImg = new Image();
        checkImg.src = stripUrl;
        await new Promise((res) => {
          if (checkImg.complete && checkImg.naturalWidth) return res(null);
          checkImg.onload = () => res(null);
          checkImg.onerror = () => res(null);
        });

        const imgRatio =
          checkImg.naturalWidth && checkImg.naturalHeight
            ? checkImg.naturalWidth / checkImg.naturalHeight
            : layout.cols === 1
            ? 0.33
            : 0.67;

        if (imgRatio < 0.48 && layout.cols === 1) {
          const dualUrl = await createDualStripCanvas(stripUrl);
          if (active) setPrintImageSrc(dualUrl);
        } else {
          if (active) setPrintImageSrc(stripUrl);
        }

        // Fire celebratory wedding confetti!
        fireWeddingConfetti();

        // Save session locally
        const sessionRecord: SavedSession = {
          id: `session_${Date.now()}`,
          timestamp: Date.now(),
          dateStr: new Date().toLocaleString("id-ID"),
          layout: layout.id,
          frameTheme: preset.name,
          stripDataUrl: stripUrl,
          driveUploadStatus: "pending",
        };
        saveSessionHistory(sessionRecord);
      } catch (err) {
        console.error("Failed to compose strip:", err);
      } finally {
        if (active) setIsComposing(false);
      }
    }

    render();
    return () => {
      active = false;
    };
  }, [photos, layout, preset, customOverlayUrl, photoBoxes, weddingConfig, filterCss]);


  // 2. Generate Google Drive QR Code
  useEffect(() => {
    if (!driveConfig.driveFolderUrl) return;
    generateDriveQRCode(driveConfig.driveFolderUrl).then((url) => {
      setQrCodeDataUrl(url);
    });
  }, [driveConfig.driveFolderUrl]);

  // 3. Automatic upload to Google Drive via Apps Script (as in booth)
  const performDriveUpload = async (stripBase64: string) => {
    if (!driveConfig.autoUpload || !driveConfig.appsScriptUrl) {
      setUploadStatus("idle");
      return;
    }

    setUploadStatus("uploading");
    setUploadMessage("Mengunggah foto ke Google Drive...");

    const timestampDescending = 9999999999999 - Date.now();
    const safeFilename = `wedding-${weddingConfig.brideName.toLowerCase()}-${weddingConfig.groomName.toLowerCase()}-${timestampDescending}.jpg`;

    const folderIdMatch = driveConfig.driveFolderUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
    const targetFolderId = folderIdMatch ? folderIdMatch[1] : undefined;

    const res = await uploadToGoogleDrive(driveConfig.appsScriptUrl, stripBase64, safeFilename, targetFolderId);

    if (res.success) {
      setUploadStatus("success");
      setUploadMessage("Foto berhasil disimpan di Google Drive!");
    } else {
      setUploadStatus("error");
      setUploadMessage(res.message || "Gagal mengunggah foto ke Drive");
    }
  };

  useEffect(() => {
    if (renderedStrip && !uploadAttemptedRef.current) {
      uploadAttemptedRef.current = true;
      performDriveUpload(renderedStrip);
    }
  }, [renderedStrip]);

  // 4. Auto Reset Countdown Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setResetTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onHome]);

  // 5. Download Direct PNG
  const handleDownload = () => {
    if (!renderedStrip) return;
    soundFx.playChime();
    const a = document.createElement("a");
    a.href = renderedStrip;
    a.download = `Wedding-${weddingConfig.brideName}-${weddingConfig.groomName}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 6. Direct Print
  const handlePrint = () => {
    soundFx.playChime();
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-3 sm:px-4 py-2 sm:py-3 overflow-y-auto lg:overflow-hidden min-h-0">
      {/* Hidden Print Target for CSS @media print */}
      <div id="print-target" className="hidden">
        {printImageSrc && (
          <div className="w-full flex items-center justify-center p-0 m-0">
            {Array.from({ length: printCopies }).map((_, cIdx) => (
              <img
                key={cIdx}
                src={printImageSrc}
                alt="Print Photobooth"
                style={{
                  width: "100%",
                  maxHeight: "100vh",
                  objectFit: "contain",
                  pageBreakAfter: cIdx < printCopies - 1 ? "always" : "auto",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Screen Title */}
      <div className="text-center mb-2 sm:mb-4 shrink-0">
        <h2 className="font-serif text-2xl sm:text-4xl text-gold-gradient font-normal mt-0.5">
          Hasil Foto Pernikahan
        </h2>
      </div>

      {/* Main Content: Left Strip Preview, Right Google Drive & Print Actions */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center">
        {/* Left: Rendered Strip Preview */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className="relative p-2.5 rounded-2xl glass-gold-card shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-amber-400/40 max-h-[44vh] md:max-h-[65vh] flex items-center justify-center overflow-hidden">
            {isComposing || !renderedStrip ? (
              <div className="w-48 sm:w-64 h-72 sm:h-96 flex flex-col items-center justify-center text-amber-200/80 gap-3">
                <RotateCw size={36} className="animate-spin text-amber-400" />
                <span className="font-cinzel text-xs tracking-wider">Menyusun Foto Elegan...</span>
              </div>
            ) : (
              <img
                src={renderedStrip}
                alt="Wedding Strip"
                className="max-h-[40vh] md:max-h-[60vh] w-auto object-contain rounded-lg shadow-lg"
              />
            )}
          </div>
        </div>

        {/* Right: Google Drive QR Code, Upload Status, and Action Controls */}
        <div className="md:col-span-7 flex flex-col gap-4">
          {/* Card: Google Drive Storage & QR Code */}
          <div className="glass-gold-card p-5 rounded-2xl border border-amber-400/30 flex flex-col items-center justify-center min-h-[220px]">
            {driveConfig.autoUpload && (uploadStatus === "uploading" || uploadStatus === "idle") ? (
              /* Loading State: Uploading to Google Drive (Clean, No Text) */
              <div className="flex flex-col items-center justify-center py-6 px-6 text-center gap-4">
                <div className="relative flex items-center justify-center w-20 h-20">
                  <div className="w-16 h-16 rounded-full border-2 border-amber-400/30 flex items-center justify-center bg-amber-400/10">
                    <CloudUpload size={30} className="text-amber-400 animate-bounce" />
                  </div>
                  <RotateCw size={80} className="absolute inset-0 text-amber-400/60 animate-spin" />
                </div>

                {/* Shimmer loading bar */}
                <div className="w-44 h-2 rounded-full bg-white/10 overflow-hidden mt-1">
                  <div className="h-full bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500 w-full animate-pulse" />
                </div>
              </div>
            ) : driveConfig.autoUpload && uploadStatus === "error" ? (
              /* Error State with retry */
              <div className="flex flex-col items-center justify-center py-3 px-4 text-center gap-2">
                <AlertTriangle size={32} className="text-rose-400" />
                <span className="font-serif text-sm text-rose-200">
                  Gagal Mengunggah ke Drive
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => {
                      if (renderedStrip) performDriveUpload(renderedStrip);
                    }}
                    className="btn-gold-outline px-4 py-1.5 rounded-full text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw size={12} />
                    <span>Coba Lagi</span>
                  </button>
                  <button
                    onClick={() => setUploadStatus("success")}
                    className="px-3 py-1.5 rounded-full text-[11px] text-stone-400 hover:text-stone-200 cursor-pointer"
                  >
                    Buka QR Folder
                  </button>
                </div>
              </div>
            ) : (
              /* Success State: Show Clean QR Code */
              <div className="p-3 rounded-2xl bg-white shadow-xl flex items-center justify-center border border-amber-400/20">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code Google Drive"
                    className="w-40 h-40 sm:w-44 sm:h-44 object-contain"
                  />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-stone-400">
                    <QrCode size={48} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card: Printing and Action Buttons */}
          <div className="glass-gold-card p-5 rounded-2xl border border-amber-400/30 flex flex-col gap-4">
            <div className="flex items-center justify-end">
              {/* Copies Counter */}
              <div className="flex items-center gap-2 bg-stone-900/80 px-3 py-1.5 rounded-xl border border-amber-400/30">
                <span className="text-xs text-stone-400">Salinan:</span>
                <button
                  onClick={() => setPrintCopies(Math.max(1, printCopies - 1))}
                  className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-amber-200 flex items-center justify-center font-bold text-sm"
                >
                  -
                </button>
                <span className="text-sm font-semibold text-amber-300 px-1">{printCopies}</span>
                <button
                  onClick={() => setPrintCopies(Math.min(5, printCopies + 1))}
                  className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-amber-200 flex items-center justify-center font-bold text-sm"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                onClick={handlePrint}
                disabled={isComposing || !renderedStrip}
                className="btn-gold shimmer-glow py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer shadow-lg"
              >
                <Printer size={18} />
                <span>Cetak Foto</span>
              </button>

              <button
                onClick={handleDownload}
                disabled={isComposing || !renderedStrip}
                className="btn-gold-outline py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer"
              >
                <Download size={18} />
                <span>Unduh File PNG</span>
              </button>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="flex items-center justify-end px-2 pt-2">
            <button
              onClick={() => {
                soundFx.playChime();
                onHome();
              }}
              className="btn-gold-outline px-4 py-2 rounded-full flex items-center gap-1.5 text-xs text-amber-200 hover:text-white"
            >
              <Home size={14} />
              <span>Selesai / Sesi Baru</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
