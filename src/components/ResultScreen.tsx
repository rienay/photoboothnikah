import React, { useEffect, useRef, useState, useCallback } from "react";
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
import { DriveConfig, LayoutConfig, PartyConfig, PhotoBox, SavedSession, ThemeMode, WeddingConfig, WeddingFramePreset } from "../types";
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
  themeMode?: ThemeMode;
  weddingConfig: WeddingConfig;
  partyConfig?: PartyConfig;
  driveConfig: DriveConfig;
  autoResetDuration: number;
  defaultPrintCopies: number;
  autoPrint?: boolean;
  printMarginX?: number;
  printMarginY?: number;
  onHome: () => void;
}

// Convert base64 data URL to Blob URL to ensure fast loading/rendering
function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  photos,
  layout,
  preset,
  customOverlayUrl,
  photoBoxes,
  filterCss,
  themeMode = "wedding",
  weddingConfig,
  partyConfig,
  driveConfig,
  autoResetDuration,
  defaultPrintCopies,
  autoPrint = false,
  printMarginX = 5,
  printMarginY = 3,
  onHome,
}) => {
  const isParty = themeMode === "party";
  const [renderedStrip, setRenderedStrip] = useState<string | null>(null);
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
          themeMode,
          weddingConfig,
          partyConfig,
          filterCss,
        });

        if (!active) return;
        setRenderedStrip(stripUrl);

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
  }, [photos, layout, preset, customOverlayUrl, photoBoxes, themeMode, weddingConfig, partyConfig, filterCss]);

  // 2. Generate Google Drive QR Code
  useEffect(() => {
    if (!driveConfig.driveFolderUrl) return;
    generateDriveQRCode(driveConfig.driveFolderUrl).then((url) => {
      setQrCodeDataUrl(url);
    });
  }, [driveConfig.driveFolderUrl]);

  // 3. Automatic upload to Google Drive via Apps Script
  const performDriveUpload = async (stripBase64: string) => {
    if (!driveConfig.autoUpload || !driveConfig.appsScriptUrl) {
      setUploadStatus("idle");
      return;
    }

    setUploadStatus("uploading");
    setUploadMessage("Mengunggah foto ke Google Drive...");

    const isParty = themeMode === "party";
    const timestampDescending = 9999999999999 - Date.now();
    
    // Generate safe filename following current event
    const eventSlug = isParty
      ? (partyConfig?.eventName || partyConfig?.title || "jota-joti-2026")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
      : `${weddingConfig.brideName}-${weddingConfig.groomName}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");

    const safeFilename = `${eventSlug}-${timestampDescending}.jpg`;

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
    const isParty = themeMode === "party";
    const eventNameSlug = isParty
      ? (partyConfig?.eventName || partyConfig?.title || "JOTA-JOTI-2026")
          .replace(/[^a-zA-Z0-9_-]+/g, "_")
      : `${weddingConfig.brideName}-${weddingConfig.groomName}`.replace(/[^a-zA-Z0-9_-]+/g, "_");

    const a = document.createElement("a");
    a.href = renderedStrip;
    a.download = `${isParty ? "Event" : "Wedding"}-${eventNameSlug}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 6. Direct Print with exact physical 4R dimensions (10x15 cm)
  const printPhoto = useCallback(async () => {
    if (!renderedStrip) return;
    soundFx.playChime();

    const isStrip = layout.cols === 1 || layout.id === "3x1" || layout.id === "2x1";
    const sheetWidth = 10;
    const sheetHeight = 15;

    // For strips: create dual-strip 10x15cm canvas so 1 image fills 100% of 10x15cm 4R paper
    let printImageUrl = renderedStrip;
    if (isStrip) {
      try {
        printImageUrl = await createDualStripCanvas(renderedStrip);
      } catch (err) {
        console.warn("Failed creating dual strip canvas, using renderedStrip:", err);
      }
    }

    // Convert base64 data URL to Blob URL to ensure fast loading/rendering
    const blob = dataURLtoBlob(printImageUrl);
    const blobUrl = URL.createObjectURL(blob);

    let pagesContent = "";
    // Total 10x15cm sheets: for strip layout, 1 sheet contains 2 strips.
    const totalSheets = isStrip ? Math.max(1, Math.ceil(printCopies / 2)) : printCopies;

    for (let s = 0; s < totalSheets; s++) {
      pagesContent += `
        <div class="page">
          <div class="print-container">
            <img src="${blobUrl}" class="print-sheet-img" />
          </div>
        </div>
      `;
    }

    // Create container element in the main document for printing
    const printDiv = document.createElement("div");
    printDiv.id = "yodha-print-section";
    printDiv.innerHTML = pagesContent;
    document.body.appendChild(printDiv);

    // Inject print styles dynamically
    const printStyle = document.createElement("style");
    printStyle.id = "yodha-print-style";
    printStyle.innerHTML = `
      @media print {
        *, *:before, *:after {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box !important;
        }
        body > *:not(#yodha-print-section) {
          display: none !important;
        }
        html, body {
          background: white !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
          overflow: hidden !important;
        }
        #yodha-print-section {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        @page {
          size: 4in 6in;
          margin: 0 !important;
        }
        .page {
          width: 100% !important;
          height: 100% !important;
          position: relative !important;
          page-break-after: always !important;
          break-after: page !important;
          display: block !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          overflow: hidden !important;
        }
        .page:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        .print-container {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .print-sheet-img {
          width: 100% !important;
          height: 100% !important;
          display: block !important;
          object-fit: fill !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      }
    `;
    document.head.appendChild(printStyle);

    // Function to cleanup print elements and styles
    const cleanup = () => {
      if (document.getElementById("yodha-print-section")) {
        document.body.removeChild(printDiv);
      }
      if (document.getElementById("yodha-print-style")) {
        document.head.removeChild(printStyle);
      }
      URL.revokeObjectURL(blobUrl);
    };

    // Wait for the images to decode and yield thread before printing
    const imgs = Array.from(printDiv.querySelectorAll("img"));
    if (imgs.length === 0) {
      window.print();
      cleanup();
    } else {
      let loadedCount = 0;
      const triggerPrint = () => {
        loadedCount++;
        if (loadedCount === imgs.length) {
          Promise.all(
            imgs.map((img) => {
              if (img.decode) {
                return img.decode().catch(() => {});
              }
              return Promise.resolve();
            })
          ).then(() => {
            // Give 500ms for browser to render
            setTimeout(() => {
              window.print();
              cleanup();
            }, 500);
          });
        }
      };

      imgs.forEach((img) => {
        if (img.complete) {
          triggerPrint();
        } else {
          img.onload = triggerPrint;
          img.onerror = triggerPrint;
        }
      });
    }
  }, [renderedStrip, layout, printCopies, printMarginX, printMarginY]);

  // Restore fullscreen on afterprint
  useEffect(() => {
    const handleAfterPrint = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {
          const restore = () => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            }
            window.removeEventListener("click", restore);
            window.removeEventListener("touchstart", restore);
          };
          window.addEventListener("click", restore, { passive: true });
          window.addEventListener("touchstart", restore, { passive: true });
        });
      }
    };

    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-3 sm:px-4 py-2 sm:py-3 overflow-y-auto lg:overflow-hidden min-h-0">
      {/* Screen Title */}
      <div className="text-center mb-2 sm:mb-4 shrink-0">
        <h2 className={isParty ? "text-2xl sm:text-4xl text-party-gradient font-black mt-0.5 tracking-tight" : "font-serif text-2xl sm:text-4xl text-gold-gradient font-normal mt-0.5"}>
          {isParty ? "Hasil Foto JOTA-JOTI 2026" : "Hasil Foto Pernikahan"}
        </h2>
      </div>

      {/* Main Content: Left Strip Preview, Right Google Drive & Print Actions */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center">
        {/* Left: Rendered Strip Preview */}
        <div className="md:col-span-5 flex flex-col items-center justify-center">
          <div className={`relative p-2.5 rounded-2xl ${isParty ? "glass-party-card border border-purple-200/80 shadow-[0_15px_35px_rgba(98,37,153,0.12)]" : "glass-gold-card border border-amber-400/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"} max-h-[44vh] md:max-h-[65vh] flex items-center justify-center overflow-hidden`}>
            {isComposing || !renderedStrip ? (
              <div className={`w-48 sm:w-64 h-72 sm:h-96 flex flex-col items-center justify-center ${isParty ? "text-purple-800" : "text-amber-200/80"} gap-3`}>
                <RotateCw size={36} className={`animate-spin ${isParty ? "text-purple-600" : "text-amber-400"}`} />
                <span className="font-medium text-xs tracking-wider">{isParty ? "Menyusun Foto JOTA-JOTI..." : "Menyusun Foto Elegan..."}</span>
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
          <div className={`${isParty ? "glass-party-card border border-purple-200/80 shadow-md" : "glass-gold-card border border-amber-400/30"} p-5 rounded-2xl flex flex-col items-center justify-center min-h-[220px]`}>
            {driveConfig.autoUpload && (uploadStatus === "uploading" || uploadStatus === "idle") ? (
              /* Loading State: Uploading to Google Drive (Clean, No Text) */
              <div className="flex flex-col items-center justify-center py-6 px-6 text-center gap-4">
                <div className="relative flex items-center justify-center w-20 h-20">
                  <div className={`w-16 h-16 rounded-full border-2 ${isParty ? "border-purple-300 bg-purple-50" : "border-amber-400/30 bg-amber-400/10"} flex items-center justify-center`}>
                    <CloudUpload size={30} className={isParty ? "text-purple-600 animate-bounce" : "text-amber-400 animate-bounce"} />
                  </div>
                  <RotateCw size={80} className={`absolute inset-0 ${isParty ? "text-purple-400/60" : "text-amber-400/60"} animate-spin`} />
                </div>

                {/* Shimmer loading bar */}
                <div className="w-44 h-2 rounded-full bg-white/20 overflow-hidden mt-1">
                  <div className={`h-full ${isParty ? "bg-gradient-to-r from-purple-600 via-amber-400 to-cyan-400" : "bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500"} w-full animate-pulse`} />
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
                    className={`${isParty ? "btn-party-outline" : "btn-gold-outline"} px-4 py-1.5 rounded-full text-xs flex items-center gap-1.5 cursor-pointer`}
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
              <div className={`p-3 rounded-2xl bg-white shadow-xl flex items-center justify-center border ${isParty ? "border-purple-200" : "border-amber-400/20"}`}>
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
          <div className={`${isParty ? "glass-party-card border border-purple-200/80 shadow-md" : "glass-gold-card border border-amber-400/30"} p-5 rounded-2xl flex flex-col gap-4`}>
            <div className="flex items-center justify-end">
              {/* Copies Counter */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isParty ? "bg-purple-50 text-purple-900 border-purple-200 shadow-sm" : "bg-stone-900/80 text-amber-300 border-amber-400/30"}`}>
                <span className={`text-xs ${isParty ? "text-purple-700 font-medium" : "text-stone-400"}`}>Salinan:</span>
                <button
                  onClick={() => setPrintCopies(Math.max(1, printCopies - 1))}
                  className={`w-6 h-6 rounded ${isParty ? "bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold" : "bg-white/10 hover:bg-white/20 text-stone-200"} flex items-center justify-center text-sm`}
                >
                  -
                </button>
                <span className={`text-sm font-semibold ${isParty ? "text-purple-900 font-bold" : "text-amber-300"} px-1`}>{printCopies}</span>
                <button
                  onClick={() => setPrintCopies(Math.min(5, printCopies + 1))}
                  className={`w-6 h-6 rounded ${isParty ? "bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold" : "bg-white/10 hover:bg-white/20 text-stone-200"} flex items-center justify-center text-sm`}
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                onClick={printPhoto}
                disabled={isComposing || !renderedStrip}
                className={`${isParty ? "btn-party shadow-[0_8px_25px_rgba(98,37,153,0.35)]" : "btn-gold shimmer-glow shadow-lg"} py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer`}
              >
                <Printer size={18} />
                <span>Cetak Foto</span>
              </button>

              <button
                onClick={handleDownload}
                disabled={isComposing || !renderedStrip}
                className={`${isParty ? "btn-party-outline" : "btn-gold-outline"} py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer`}
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
              className={`${isParty ? "btn-party-outline text-purple-900" : "btn-gold-outline text-amber-200"} px-4 py-2 rounded-full flex items-center gap-1.5 text-xs hover:text-white cursor-pointer`}
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
