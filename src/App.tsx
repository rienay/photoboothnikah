import React, { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { HomeScreen } from "./components/HomeScreen";
import { FrameScreen } from "./components/FrameScreen";
import { FilterScreen } from "./components/FilterScreen";
import { ShootScreen } from "./components/ShootScreen";
import { ReviewScreen } from "./components/ReviewScreen";
import { ResultScreen } from "./components/ResultScreen";
import { AdminModal } from "./components/AdminModal";
import {
  BoothSettings,
  DriveConfig,
  FrameSlot,
  Screen,
  WeddingConfig,
} from "./types";
import { DEFAULT_FRAME_SLOTS, LAYOUTS, PHOTO_FILTERS, WEDDING_PRESETS } from "./config";
import { getEffectiveLayout } from "./lib/frameLayouts";
import {
  loadBoothSettings,
  loadDriveConfig,
  loadFrameSlots,
  loadWeddingConfig,
  saveBoothSettings,
  saveDriveConfig,
  saveFrameSlots,
  saveWeddingConfig,
  syncFromServer,
  pushToServer,
  syncChannel,
} from "./lib/storage";
import { fetchFramesFromCloud } from "./lib/cloudSync";
import { soundFx } from "./lib/audio";

export const App: React.FC = () => {
  // Screens state: "home" -> "frame" (langsung pilih bingkai) -> "filter" -> "shoot" -> "review" -> "result"
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");

  // Persistent settings state
  const [weddingConfig, setWeddingConfig] = useState<WeddingConfig>(loadWeddingConfig);
  const [driveConfig, setDriveConfig] = useState<DriveConfig>(loadDriveConfig);
  const [boothSettings, setBoothSettings] = useState<BoothSettings>(loadBoothSettings);
  const [frameSlots, setFrameSlots] = useState<FrameSlot[]>(loadFrameSlots);

  // Active session selection state
  const [selectedSlotId, setSelectedSlotId] = useState<string>(() => frameSlots[0]?.id || "slot_1");
  const [selectedFilterId, setSelectedFilterId] = useState<string>("normal");
  const [photos, setPhotos] = useState<string[]>([]);

  // UI state
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Cross-device sync from server on mount, interval, and window focus
  useEffect(() => {
    let mounted = true;

    const performSync = async () => {
      // 1. Check cloud frames from Supabase first (if configured)
      try {
        const cloud = await fetchFramesFromCloud();
        if (cloud.success && cloud.frames && cloud.frames.length > 0) {
          if (!mounted) return;
          setFrameSlots((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(cloud.frames)) {
              localStorage.setItem("yodha_frame_slots", JSON.stringify(cloud.frames));
              return cloud.frames!;
            }
            return prev;
          });
        }
      } catch (_) {}

      // 2. Local PHP / Dev Server Storage sync (Laragon / Apache / Vite)
      const serverData = await syncFromServer();
      if (!mounted) return;

      if (serverData && Object.keys(serverData).length > 0) {
        if (serverData.frameSlots && Array.isArray(serverData.frameSlots) && serverData.frameSlots.length > 0) {
          setFrameSlots((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(serverData.frameSlots)) {
              localStorage.setItem("yodha_frame_slots", JSON.stringify(serverData.frameSlots));
              return serverData.frameSlots!;
            }
            return prev;
          });
        }
        if (serverData.weddingConfig) {
          setWeddingConfig((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(serverData.weddingConfig)) {
              return serverData.weddingConfig!;
            }
            return prev;
          });
        }
        if (serverData.driveConfig) {
          setDriveConfig((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(serverData.driveConfig)) {
              return serverData.driveConfig!;
            }
            return prev;
          });
        }
        if (serverData.boothSettings) {
          setBoothSettings((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(serverData.boothSettings)) {
              return serverData.boothSettings!;
            }
            return prev;
          });
        }
      } else {
        // If server is currently empty, push current device's configuration to server
        // so other connected devices automatically receive it
        pushToServer({
          frameSlots: loadFrameSlots(),
          weddingConfig: loadWeddingConfig(),
          driveConfig: loadDriveConfig(),
          boothSettings: loadBoothSettings(),
        }).catch(() => {});
      }
    };

    performSync();

    // Background interval to keep frames & config synced across all devices in real-time
    const pollInterval = setInterval(() => {
      if (!mounted) return;
      performSync();
    }, 3500);

    const onFocus = () => {
      performSync();
    };
    window.addEventListener("focus", onFocus);

    // Cross-tab broadcast listener for instant sync
    const handleBroadcast = (e: MessageEvent) => {
      if (!mounted) return;
      if (e.data?.type === "CONFIG_UPDATED" && e.data?.data) {
        const d = e.data.data;
        if (d.frameSlots) setFrameSlots(d.frameSlots);
        if (d.weddingConfig) setWeddingConfig(d.weddingConfig);
        if (d.driveConfig) setDriveConfig(d.driveConfig);
        if (d.boothSettings) setBoothSettings(d.boothSettings);
      }
    };
    syncChannel?.addEventListener("message", handleBroadcast);

    return () => {
      mounted = false;
      clearInterval(pollInterval);
      window.removeEventListener("focus", onFocus);
      syncChannel?.removeEventListener("message", handleBroadcast);
    };
  }, []);

  // Sync sound setting
  useEffect(() => {
    soundFx.enabled = boothSettings.soundEnabled;
  }, [boothSettings.soundEnabled]);

  // Fullscreen listeners
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Find active frame slot, layout, and preset theme
  const fallbackSlot = DEFAULT_FRAME_SLOTS[0];
  const activeSlot = frameSlots.find((s) => s.id === selectedSlotId) || frameSlots[0] || fallbackSlot;
  const currentLayoutConfig = getEffectiveLayout(activeSlot, LAYOUTS);
  const currentPreset =
    (activeSlot?.presetThemeId && WEDDING_PRESETS.find((p) => p.id === activeSlot.presetThemeId)) ||
    WEDDING_PRESETS[0];

  // Find filter CSS
  const activeFilter = PHOTO_FILTERS.find((f) => f.id === selectedFilterId);
  const activeFilterCss = activeFilter ? activeFilter.css : "none";

  // Handlers for settings saves
  const handleSaveWedding = (cfg: WeddingConfig) => {
    setWeddingConfig(cfg);
    saveWeddingConfig(cfg);
  };

  const handleSaveDrive = (cfg: DriveConfig) => {
    setDriveConfig(cfg);
    saveDriveConfig(cfg);
  };

  const handleSaveBooth = (st: BoothSettings) => {
    setBoothSettings(st);
    saveBoothSettings(st);
  };

  const handleSaveSlots = (slots: FrameSlot[]) => {
    setFrameSlots(slots);
    saveFrameSlots(slots);
  };

  const resetToHome = () => {
    setPhotos([]);
    setCurrentScreen("home");
  };

  const screenRot = boothSettings.screenRotation || 0;
  const isRotated90or270 = screenRot === 90 || screenRot === 270;

  const appRotationStyle: React.CSSProperties = isRotated90or270
    ? {
        position: "fixed",
        width: "100vh",
        height: "100vw",
        left: "calc(50vw - 50vh)",
        top: "calc(50vh - 50vw)",
        transform: `rotate(${screenRot}deg)`,
        transformOrigin: "center center",
        overflow: "hidden",
      }
    : screenRot === 180
    ? {
        position: "fixed",
        width: "100vw",
        height: "100vh",
        left: 0,
        top: 0,
        transform: "rotate(180deg)",
        transformOrigin: "center center",
        overflow: "hidden",
      }
    : {};

  return (
    <div
      style={appRotationStyle}
      className="min-h-[100dvh] h-[100dvh] max-h-[100dvh] w-full max-w-full flex flex-col justify-between relative overflow-hidden bg-[#0c0e12]"
    >
      {/* Top Header */}
      <Header
        weddingConfig={weddingConfig}
        soundEnabled={boothSettings.soundEnabled}
        onToggleSound={() =>
          handleSaveBooth({ ...boothSettings, soundEnabled: !boothSettings.soundEnabled })
        }
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        screenRotation={screenRot}
        onRotateScreen={() => {
          const current = boothSettings.screenRotation || 0;
          // Rotate 0 -> 270 (common for vertical screen with ports at bottom) -> 90 -> 180 -> 0
          const next: 0 | 90 | 180 | 270 =
            current === 0 ? 270 : current === 270 ? 90 : current === 90 ? 180 : 0;
          handleSaveBooth({ ...boothSettings, screenRotation: next });
        }}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Main Dynamic Viewport */}
      <main className="flex-1 min-h-0 flex flex-col justify-center relative z-10 overflow-hidden">
        {/* Layar 1: Welcome Home Screen */}
        {currentScreen === "home" && (
          <HomeScreen
            weddingConfig={weddingConfig}
            onStart={() => setCurrentScreen("frame")}
          />
        )}

        {/* Layar 2: Langsung Pilih 1 dari 3 Desain Bingkai */}
        {currentScreen === "frame" && (
          <FrameScreen
            frameSlots={frameSlots}
            selectedSlotId={selectedSlotId}
            weddingConfig={weddingConfig}
            onSelectSlot={(slot) => setSelectedSlotId(slot.id)}
            onBack={() => setCurrentScreen("home")}
            onNext={() => setCurrentScreen("shoot")}
          />
        )}

        {/* Layar 3: Pemotretan Kamera (Langsung Shoot) */}
        {currentScreen === "shoot" && (
          <ShootScreen
            layout={currentLayoutConfig}
            filterCss={activeFilterCss}
            countdownDuration={boothSettings.countdownDuration}
            mirrorCamera={boothSettings.mirrorCamera}
            selectedCameraId={boothSettings.selectedCameraId}
            cameraRotation={boothSettings.cameraRotation || 0}
            onChangeCameraRotation={(r) =>
              handleSaveBooth({ ...boothSettings, cameraRotation: r })
            }
            preset={currentPreset}
            customOverlayUrl={activeSlot.customImage}
            photoBoxes={activeSlot.photoBoxes}
            weddingConfig={weddingConfig}
            onPhotosCaptured={(captured) => {
              setPhotos(captured);
              setCurrentScreen("review");
            }}
            onBack={() => setCurrentScreen("frame")}
          />
        )}

        {/* Layar 5: Tinjau & Foto Ulang Satuan */}
        {currentScreen === "review" && (
          <ReviewScreen
            photos={photos}
            layout={currentLayoutConfig}
            selectedFilterId={selectedFilterId}
            preset={currentPreset}
            customOverlayUrl={activeSlot.customImage}
            photoBoxes={activeSlot.photoBoxes}
            weddingConfig={weddingConfig}
            onChangeFilter={(newFilterId) => setSelectedFilterId(newFilterId)}
            onUpdatePhoto={(index, newPhotoData) => {
              const updated = [...photos];
              updated[index] = newPhotoData;
              setPhotos(updated);
            }}
            onRetakeAll={() => setCurrentScreen("shoot")}
            onConfirm={() => setCurrentScreen("result")}
            mirrorCamera={boothSettings.mirrorCamera}
            selectedCameraId={boothSettings.selectedCameraId}
            cameraRotation={boothSettings.cameraRotation || 0}
            onChangeCameraRotation={(r) =>
              handleSaveBooth({ ...boothSettings, cameraRotation: r })
            }
          />
        )}

        {/* Layar 6: Hasil Cetak & Upload Google Drive */}
        {currentScreen === "result" && (
          <ResultScreen
            photos={photos}
            layout={currentLayoutConfig}
            preset={currentPreset}
            customOverlayUrl={activeSlot.customImage}
            photoBoxes={activeSlot.photoBoxes}
            filterCss={activeFilterCss}
            weddingConfig={weddingConfig}
            driveConfig={driveConfig}
            autoResetDuration={boothSettings.autoResetDuration}
            defaultPrintCopies={boothSettings.defaultPrintCopies}
            autoPrint={boothSettings.autoPrint ?? false}
            printMarginX={boothSettings.printMarginX ?? 5}
            printMarginY={boothSettings.printMarginY ?? 3}
            onHome={resetToHome}
          />
        )}
      </main>

      {/* Footer subtle brand */}
      {/* Footer Info */}
      <footer className="w-full py-2 px-3 sm:px-6 flex items-center justify-between text-[10px] sm:text-[11px] text-amber-200/40 select-none z-10 border-t border-amber-400/5">
        <span className="hidden sm:inline">{weddingConfig.hashtag}</span>
        <span className="font-serif italic text-center truncate mx-auto px-2 max-w-[280px] sm:max-w-none">{weddingConfig.footerText}</span>
        <span className="hidden sm:inline">Yodha Wedding Photobooth</span>
      </footer>

      {/* Admin Settings Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        weddingConfig={weddingConfig}
        onSaveWeddingConfig={handleSaveWedding}
        driveConfig={driveConfig}
        onSaveDriveConfig={handleSaveDrive}
        boothSettings={boothSettings}
        onSaveBoothSettings={handleSaveBooth}
        frameSlots={frameSlots}
        onSaveFrameSlots={handleSaveSlots}
      />
    </div>
  );
};
