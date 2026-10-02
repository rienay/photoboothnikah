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
import { LAYOUTS, PHOTO_FILTERS, WEDDING_PRESETS } from "./config";
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
} from "./lib/storage";
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

  // Cross-device sync from server on mount and window focus
  useEffect(() => {
    let mounted = true;

    const performSync = async () => {
      const serverData = await syncFromServer();
      if (!mounted) return;

      if (serverData && Object.keys(serverData).length > 0) {
        if (serverData.frameSlots && Array.isArray(serverData.frameSlots) && serverData.frameSlots.length > 0) {
          setFrameSlots(serverData.frameSlots);
        }
        if (serverData.weddingConfig) {
          setWeddingConfig(serverData.weddingConfig);
        }
        if (serverData.driveConfig) {
          setDriveConfig(serverData.driveConfig);
        }
        if (serverData.boothSettings) {
          setBoothSettings(serverData.boothSettings);
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

    const onFocus = () => {
      performSync();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
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
  const activeSlot = frameSlots.find((s) => s.id === selectedSlotId) || frameSlots[0];
  const currentLayoutConfig = getEffectiveLayout(activeSlot, LAYOUTS);
  const currentPreset =
    WEDDING_PRESETS.find((p) => p.id === activeSlot.presetThemeId) || WEDDING_PRESETS[0];

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

  return (
    <div className="h-screen max-h-screen w-screen flex flex-col justify-between relative overflow-hidden bg-[#0c0e12]">
      {/* Top Header */}
      <Header
        weddingConfig={weddingConfig}
        soundEnabled={boothSettings.soundEnabled}
        onToggleSound={() =>
          handleSaveBooth({ ...boothSettings, soundEnabled: !boothSettings.soundEnabled })
        }
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
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
            onHome={resetToHome}
          />
        )}
      </main>

      {/* Footer subtle brand */}
      <footer className="w-full py-2.5 px-6 flex items-center justify-between text-[11px] text-amber-200/40 select-none z-10 border-t border-amber-400/5">
        <span>{weddingConfig.hashtag}</span>
        <span className="font-serif italic">{weddingConfig.footerText}</span>
        <span>Yodha Wedding Photobooth</span>
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
