import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Save,
  CloudUpload,
  RefreshCw,
  Plus,
  Copy,
  Trash2,
  Image as ImageIcon,
  Type,
  MousePointerClick,
  Palette,
  Cloud,
  Sparkles,
  Camera,
  Heart,
  ArrowRight,
  Monitor,
  Tablet,
  CheckCircle2,
  ExternalLink,
  Sliders,
  Eye,
} from "lucide-react";
import { CustomHomeDesign, DriveConfig } from "../types";
import { DEFAULT_CUSTOM_DESIGNS } from "../config";
import {
  saveCustomDesigns,
  loadCustomDesigns,
  setActiveCustomDesignId,
  pushToServer,
} from "../lib/storage";
import {
  saveDesignsToGoogleDrive,
  fetchDesignsFromGoogleDrive,
} from "../lib/googleDrive";
import { soundFx } from "../lib/audio";

interface ThemeStudioProps {
  onBackToKiosk: () => void;
  driveConfig: DriveConfig;
}

type StudioTab = "background" | "logo" | "typography" | "button" | "cloud" | "designs";

export const ThemeStudio: React.FC<ThemeStudioProps> = ({
  onBackToKiosk,
  driveConfig,
}) => {
  const [designs, setDesigns] = useState<CustomHomeDesign[]>(() => loadCustomDesigns());
  const [activeId, setActiveId] = useState<string>(() => {
    const list = loadCustomDesigns();
    const active = list.find((d) => d.isActive) || list[0] || DEFAULT_CUSTOM_DESIGNS[0];
    return active.id;
  });

  const [activeTab, setActiveTab] = useState<StudioTab>("background");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet">("desktop");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isPulling, setIsPulling] = useState<boolean>(false);

  const currentDesign = designs.find((d) => d.id === activeId) || designs[0] || DEFAULT_CUSTOM_DESIGNS[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Update a field on the current design
  const updateCurrentDesign = (patch: Partial<CustomHomeDesign>) => {
    setDesigns((prev) => {
      const updated = prev.map((item) =>
        item.id === currentDesign.id
          ? { ...item, ...patch, updatedAt: Date.now() }
          : item
      );
      saveCustomDesigns(updated);
      pushToServer({ customDesigns: updated, activeDesignId: activeId }).catch(() => {});
      return updated;
    });
  };

  // Activate / Publish this design as the live photobooth display
  const handleSetActive = (targetId: string) => {
    setActiveId(targetId);
    setActiveCustomDesignId(targetId);
    setDesigns((prev) => {
      const updated = prev.map((d) => ({
        ...d,
        isActive: d.id === targetId,
      }));
      saveCustomDesigns(updated);
      pushToServer({ customDesigns: updated, activeDesignId: targetId }).catch(() => {});
      return updated;
    });
    soundFx.playChime();
    showToast(`✓ Desain "${designs.find((d) => d.id === targetId)?.name}" kini AKTIF di Photobooth!`);
  };

  // Create a new design
  const handleCreateNewDesign = () => {
    const newId = "design_" + Date.now();
    const newDesign: CustomHomeDesign = {
      ...currentDesign,
      id: newId,
      name: `Desain Event Baru #${designs.length + 1}`,
      isActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [...designs, newDesign];
    setDesigns(updated);
    setActiveId(newId);
    saveCustomDesigns(updated);
    showToast("Desain baru berhasil dibuat!");
  };

  // Duplicate current design
  const handleDuplicate = () => {
    const newId = "design_" + Date.now();
    const dup: CustomHomeDesign = {
      ...currentDesign,
      id: newId,
      name: `${currentDesign.name} (Salinan)`,
      isActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const updated = [...designs, dup];
    setDesigns(updated);
    setActiveId(newId);
    saveCustomDesigns(updated);
    showToast("Desain berhasil diduplikasi!");
  };

  // Delete current design
  const handleDeleteDesign = (idToDelete: string) => {
    if (designs.length <= 1) {
      alert("Minimal harus ada 1 desain tersimpan!");
      return;
    }
    if (!confirm("Yakin ingin menghapus desain ini?")) return;
    const remaining = designs.filter((d) => d.id !== idToDelete);
    setDesigns(remaining);
    setActiveId(remaining[0].id);
    setActiveCustomDesignId(remaining[0].id);
    saveCustomDesigns(remaining);
    showToast("Desain berhasil dihapus.");
  };

  // Publish to Google Drive / Apps Script
  const handlePublishToGoogleDrive = async () => {
    if (!driveConfig.appsScriptUrl) {
      alert("URL Google Apps Script belum diisi di tab Google Drive!");
      return;
    }
    setIsPublishing(true);
    soundFx.playChime();
    try {
      const res = await saveDesignsToGoogleDrive(
        driveConfig.appsScriptUrl,
        designs,
        activeId,
        currentDesign
      );
      if (res.success) {
        showToast("✓ Sukses! Desain berhasil dipublikasikan online ke Google Drive.");
      } else {
        alert("Gagal menyimpan ke Google Drive: " + res.message);
      }
    } catch (e: any) {
      alert("Error publish ke Google Drive: " + e.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Pull / Sync from Google Drive
  const handlePullFromGoogleDrive = async () => {
    if (!driveConfig.appsScriptUrl) {
      alert("URL Google Apps Script belum diisi!");
      return;
    }
    setIsPulling(true);
    try {
      const res = await fetchDesignsFromGoogleDrive(driveConfig.appsScriptUrl);
      if (res.success && res.designs && res.designs.length > 0) {
        setDesigns(res.designs);
        saveCustomDesigns(res.designs);
        if (res.activeDesignId) {
          setActiveId(res.activeDesignId);
          setActiveCustomDesignId(res.activeDesignId);
        }
        showToast("✓ Berhasil menyinkronkan desain dari Google Drive!");
      } else {
        alert(res.message || "Belum ada desain tersimpan di Google Drive.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsPulling(false);
    }
  };

  // Handle local image file upload (Background or Logo)
  const handleImageUpload = (
    field: "bgImageUrl" | "logoUrl",
    file: File | null
  ) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 5MB!");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        if (field === "bgImageUrl") {
          updateCurrentDesign({ bgType: "image", bgImageUrl: base64 });
        } else {
          updateCurrentDesign({ logoUrl: base64, showLogo: true });
        }
        showToast("Gambar berhasil dimuat!");
      }
    };
    reader.readAsDataURL(file);
  };

  // RENDER LIVE PREVIEW CANVAS
  const renderLivePreview = () => {
    const d = currentDesign;
    const getFontFamilyClass = () => {
      if (d.titleFontFamily === "script") return "font-script";
      if (d.titleFontFamily === "cinzel") return "font-cinzel";
      if (d.titleFontFamily === "serif") return "font-serif";
      if (d.titleFontFamily === "mono") return "font-mono";
      return "font-sans";
    };

    const getTitleSizeClass = () => {
      if (d.titleFontSize === "normal") return "text-3xl sm:text-4xl md:text-5xl";
      if (d.titleFontSize === "xlarge") return "text-5xl sm:text-6xl md:text-7xl lg:text-8xl";
      return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl";
    };

    const renderIcon = () => {
      if (d.buttonIcon === "sparkles") return <Sparkles size={20} className="drop-shadow" />;
      if (d.buttonIcon === "heart") return <Heart size={20} className="drop-shadow" />;
      if (d.buttonIcon === "arrow") return <ArrowRight size={20} className="drop-shadow" />;
      if (d.buttonIcon === "none") return null;
      return <Camera size={22} className="drop-shadow" />;
    };

    const getButtonShapeClass = () => {
      if (d.buttonShape === "box") return "rounded-xl";
      if (d.buttonShape === "rounded") return "rounded-2xl";
      return "rounded-full";
    };

    const bgStyle: React.CSSProperties = {};
    if (d.bgType === "image" && d.bgImageUrl) {
      bgStyle.backgroundImage = `url(${d.bgImageUrl})`;
      bgStyle.backgroundSize = "cover";
      bgStyle.backgroundPosition = "center";
      bgStyle.backgroundRepeat = "no-repeat";
    } else if (d.bgType === "gradient" && d.bgGradient) {
      bgStyle.background = d.bgGradient;
    } else if (d.bgColor) {
      bgStyle.backgroundColor = d.bgColor;
    }

    return (
      <div
        className="w-full h-full min-h-[480px] sm:min-h-[580px] flex flex-col justify-between items-center relative overflow-hidden select-none transition-all shadow-2xl rounded-2xl border border-white/20"
        style={bgStyle}
      >
        {/* Background Overlay */}
        {d.bgType === "image" && (d.bgOverlayOpacity ?? 0) > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: d.bgOverlayColor || "#000000",
              opacity: (d.bgOverlayOpacity || 0) / 100,
            }}
          />
        )}

        {/* Ambient Animated Rings */}
        {d.showAmbientRings && (
          <>
            <div
              className="absolute w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] rounded-full border pointer-events-none animate-[pulse_4s_ease-in-out_infinite]"
              style={{ borderColor: d.ambientRingColor || "rgba(98,37,153,0.3)" }}
            />
            <div
              className="absolute w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] rounded-full border pointer-events-none"
              style={{ borderColor: d.ambientRingColor || "rgba(0,148,180,0.2)" }}
            />
          </>
        )}

        {/* Mock Top Header Bar */}
        <div className="w-full px-4 py-2.5 flex items-center justify-between border-b border-white/10 bg-black/10 backdrop-blur-sm z-20 shrink-0">
          <div className="flex items-center gap-2">
            {d.showLogo && d.logoUrl ? (
              <img src={d.logoUrl} alt="Logo" className="h-6 w-6 object-contain rounded bg-white/80 p-0.5" />
            ) : (
              <Sparkles size={16} className="text-amber-400" />
            )}
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700/80">
                {d.headerBrandText || "RAICAB BANJAR V • PHOTOBOOTH"}
              </span>
              <span className="text-xs font-bold text-slate-900 truncate max-w-[200px]">
                {d.headerSubtitleText || d.titleText}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 opacity-60">
            <div className="w-6 h-6 rounded-full bg-white/40 border border-white/20 flex items-center justify-center text-[10px]">🔊</div>
            <div className="w-6 h-6 rounded-full bg-white/40 border border-white/20 flex items-center justify-center text-[10px]">⛶</div>
            <div className="w-6 h-6 rounded-full bg-white/40 border border-white/20 flex items-center justify-center text-[10px]">⚙️</div>
          </div>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 text-center z-10 w-full max-w-4xl">
          {/* Logo / Badge */}
          {d.showLogo && (
            <div className="relative mb-4 z-10">
              <div
                className={`overflow-hidden flex items-center justify-center shadow-lg transition-transform hover:scale-105 ${
                  d.logoShape === "circle"
                    ? "rounded-full"
                    : d.logoShape === "rounded"
                    ? "rounded-2xl"
                    : d.logoShape === "square"
                    ? "rounded-none"
                    : ""
                }`}
                style={{
                  width: `${d.logoSize || 110}px`,
                  height: `${d.logoSize || 110}px`,
                  border: d.logoBorderWidth
                    ? `${d.logoBorderWidth}px solid ${d.logoBorderColor || "#ffffff"}`
                    : undefined,
                  backgroundColor: "#ffffff",
                }}
              >
                {d.logoUrl ? (
                  <img
                    src={d.logoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <Sparkles size={36} className="text-amber-500" />
                )}
              </div>

              {/* Logo Badge Underneath */}
              {d.logoBadgeText && (
                <div
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full flex items-center gap-1 shadow-md border whitespace-nowrap"
                  style={{
                    backgroundColor: d.logoBadgeBgColor || "#2E0E4C",
                    borderColor: d.logoBorderColor || "#F9B708",
                    color: d.logoBadgeTextColor || "#F9B708",
                  }}
                >
                  <Sparkles size={10} className="animate-spin text-current" />
                  <span className="text-[9px] font-black tracking-widest uppercase">
                    {d.logoBadgeText}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Subtitle Pill */}
          {d.showSubtitle && d.subtitleText && (
            <div className="flex items-center gap-2 mb-2 z-10 max-w-full">
              <div
                className="w-6 sm:w-10 h-[2px]"
                style={{
                  background: `linear-gradient(to right, transparent, ${d.subtitleTextColor || "#622599"})`,
                }}
              />
              <span
                className="px-4 py-1 rounded-full font-black tracking-[0.16em] text-[11px] sm:text-xs uppercase shadow-sm border truncate max-w-[80vw]"
                style={{
                  backgroundColor: d.subtitleBgColor || "#ffffff",
                  color: d.subtitleTextColor || "#622599",
                  borderColor: d.subtitleBorderColor || "rgba(98,37,153,0.3)",
                }}
              >
                {d.subtitleText}
              </span>
              <div
                className="w-6 sm:w-10 h-[2px]"
                style={{
                  background: `linear-gradient(to left, transparent, ${d.subtitleTextColor || "#622599"})`,
                }}
              />
            </div>
          )}

          {/* Main Title Heading */}
          <h1
            className={`${getFontFamilyClass()} ${getTitleSizeClass()} font-black py-1 px-4 my-1 drop-shadow-sm leading-tight tracking-tight z-10 max-w-full overflow-visible break-words`}
            style={
              d.titleColorType === "gradient" && d.titleGradient
                ? {
                    background: d.titleGradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }
                : {
                    color: d.titleColor || "#1e293b",
                  }
            }
          >
            {d.titleText}
          </h1>

          {/* Date & Hashtag Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs tracking-wider font-bold mt-2 mb-8 z-10">
            {d.showDateTag && d.dateText && (
              <span
                className="px-3.5 py-1 rounded-full border shadow-sm"
                style={{
                  backgroundColor: d.dateBgColor || "#ffffff",
                  color: d.dateTextColor || "#0094B4",
                  borderColor: d.dateBorderColor || "rgba(0,148,180,0.4)",
                }}
              >
                {d.dateText}
              </span>
            )}
            {d.showDateTag && d.showHashtagTag && (
              <span className="text-slate-400 font-bold">•</span>
            )}
            {d.showHashtagTag && d.hashtagText && (
              <span
                className="px-3.5 py-1 rounded-full border shadow-sm"
                style={{
                  backgroundColor: d.hashtagBgColor || "#ffffff",
                  color: d.hashtagTextColor || "#622599",
                  borderColor: d.hashtagBorderColor || "rgba(98,37,153,0.4)",
                }}
              >
                {d.hashtagText}
              </span>
            )}
          </div>

          {/* Start CTA Button */}
          <button
            onClick={() => soundFx.playChime()}
            className={`px-8 py-3.5 sm:px-12 sm:py-4 flex items-center justify-center gap-2.5 text-base font-bold group cursor-pointer transition-transform hover:scale-105 active:scale-95 z-10 ${getButtonShapeClass()}`}
            style={{
              background:
                d.buttonBgType === "gradient" && d.buttonBgGradient
                  ? d.buttonBgGradient
                  : d.buttonBgColor || "#EF5000",
              color: d.buttonTextColor || "#ffffff",
              boxShadow: d.buttonShadow
                ? `0 8px 25px ${d.buttonShadowColor || "rgba(0,0,0,0.3)"}`
                : undefined,
            }}
          >
            {renderIcon()}
            <span>{d.buttonText || "Sentuh Layar untuk Mulai"}</span>
          </button>
        </div>

        {/* Mock Bottom Footer Bar */}
        <div className="w-full px-4 py-2 flex items-center justify-between text-[10px] text-slate-500 font-bold border-t border-white/10 bg-black/5 z-10 shrink-0">
          <span>{d.hashtagText || "#PHOTOBOOTH"}</span>
          <span className="uppercase tracking-wider">{d.footerText || "YODHA PHOTOBOOTH"}</span>
          <span>Powered by Yodha</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-screen bg-stone-950 text-white flex flex-col overflow-hidden font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-bounce text-sm font-bold border border-emerald-400">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Main Navigation Bar */}
      <header className="h-16 px-4 sm:px-6 bg-stone-900 border-b border-white/10 flex items-center justify-between z-30 shrink-0 gap-3">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToKiosk}
            className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer border border-white/10"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Photobooth</span>
          </button>
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span>DIY Theme Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                  Visual Builder
                </span>
              </h1>
              <p className="text-[11px] text-stone-400 hidden sm:block">
                Edit tampilan web, background, tombol & teks secara online
              </p>
            </div>
          </div>
        </div>

        {/* Center: Design Selector */}
        <div className="flex items-center gap-2 max-w-xs sm:max-w-md">
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-stone-800 border border-white/15 text-xs text-amber-200 font-semibold focus:outline-none focus:border-amber-400"
          >
            {designs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.isActive ? "🟢 (Aktif di Kiosk)" : ""}
              </option>
            ))}
          </select>

          <button
            onClick={handleCreateNewDesign}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs border border-white/10 cursor-pointer"
            title="Buat Desain Baru"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Right: Actions (Set Active, Publish to Drive) */}
        <div className="flex items-center gap-2">
          {currentDesign.id !== activeId || !currentDesign.isActive ? (
            <button
              onClick={() => handleSetActive(currentDesign.id)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Jadikan desain ini tampilan aktif di photobooth"
            >
              <CheckCircle2 size={15} />
              <span>Jadikan Aktif (Publish)</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Sedang Aktif di Kiosk</span>
            </span>
          )}

          <button
            onClick={handlePublishToGoogleDrive}
            disabled={isPublishing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-900/30 transition-all cursor-pointer disabled:opacity-50"
            title="Simpan & Sinkronkan ke Google Drive permanen"
          >
            <CloudUpload size={15} className={isPublishing ? "animate-bounce" : ""} />
            <span>{isPublishing ? "Menyimpan..." : "Publish Online (Drive)"}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: 2-Column Split View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT COLUMN: Controls & Editing Tabs */}
        <div className="w-full md:w-[440px] lg:w-[480px] bg-stone-900/95 border-r border-white/10 flex flex-col shrink-0 overflow-hidden">
          {/* Tabs Selector Bar */}
          <div className="flex items-center border-b border-white/10 bg-stone-950/60 px-2 pt-2 gap-1 overflow-x-auto text-xs shrink-0">
            <button
              onClick={() => setActiveTab("background")}
              className={`px-3 py-2 rounded-t-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "background"
                  ? "bg-stone-900 text-amber-300 border-t-2 border-amber-400"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Palette size={14} />
              <span>Background</span>
            </button>

            <button
              onClick={() => setActiveTab("logo")}
              className={`px-3 py-2 rounded-t-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "logo"
                  ? "bg-stone-900 text-amber-300 border-t-2 border-amber-400"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <ImageIcon size={14} />
              <span>Logo & Badge</span>
            </button>

            <button
              onClick={() => setActiveTab("typography")}
              className={`px-3 py-2 rounded-t-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "typography"
                  ? "bg-stone-900 text-amber-300 border-t-2 border-amber-400"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Type size={14} />
              <span>Teks</span>
            </button>

            <button
              onClick={() => setActiveTab("button")}
              className={`px-3 py-2 rounded-t-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "button"
                  ? "bg-stone-900 text-amber-300 border-t-2 border-amber-400"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <MousePointerClick size={14} />
              <span>Tombol</span>
            </button>

            <button
              onClick={() => setActiveTab("designs")}
              className={`px-3 py-2 rounded-t-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "designs"
                  ? "bg-stone-900 text-amber-300 border-t-2 border-amber-400"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Sliders size={14} />
              <span>Koleksi</span>
            </button>

            <button
              onClick={() => setActiveTab("cloud")}
              className={`px-3 py-2 rounded-t-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === "cloud"
                  ? "bg-stone-900 text-amber-300 border-t-2 border-amber-400"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Cloud size={14} />
              <span>Drive</span>
            </button>
          </div>

          {/* Tab Content Panels (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* TAB 1: BACKGROUND */}
            {activeTab === "background" && (
              <div className="space-y-5 text-xs">
                <div>
                  <label className="block text-stone-300 font-bold mb-2">Tipe Latar Belakang</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "gradient", label: "Gradien Warna" },
                      { id: "image", label: "Foto / Gambar" },
                      { id: "color", label: "Warna Solid" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => updateCurrentDesign({ bgType: t.id as any })}
                        className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer transition-all ${
                          currentDesign.bgType === t.id
                            ? "bg-amber-400/20 border-amber-400 text-amber-300"
                            : "bg-stone-800/80 border-white/10 text-stone-400 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upload Image Background */}
                {currentDesign.bgType === "image" && (
                  <div className="p-4 rounded-2xl bg-stone-950/60 border border-white/10 space-y-4">
                    <label className="block text-stone-200 font-bold">Upload Foto Background</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload("bgImageUrl", e.target.files?.[0] || null)}
                      className="block w-full text-xs text-stone-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                    />

                    {currentDesign.bgImageUrl && (
                      <div className="relative rounded-xl overflow-hidden border border-white/20 h-28">
                        <img
                          src={currentDesign.bgImageUrl}
                          alt="Background"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => updateCurrentDesign({ bgImageUrl: undefined })}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white cursor-pointer"
                          title="Hapus foto background"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}

                    {/* Dark/Light Overlay for readability */}
                    <div>
                      <div className="flex justify-between text-stone-300 font-medium mb-1">
                        <span>Lapisan Redup (Overlay):</span>
                        <span>{currentDesign.bgOverlayOpacity ?? 0}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        value={currentDesign.bgOverlayOpacity ?? 0}
                        onChange={(e) =>
                          updateCurrentDesign({ bgOverlayOpacity: parseInt(e.target.value) })
                        }
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Gradient Presets */}
                {currentDesign.bgType === "gradient" && (
                  <div className="space-y-3">
                    <label className="block text-stone-300 font-bold">Pilihan Gradien Populer</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          name: "Scout Oranye-Biru (RAICAB)",
                          val: "linear-gradient(135deg, #FF7A00 0%, #00A3E0 100%)",
                        },
                        {
                          name: "Scout Putih Elegan",
                          val: "linear-gradient(180deg, #ffffff 0%, #f0f9ff 50%, #fff7ed 100%)",
                        },
                        {
                          name: "Royal Wedding Dark",
                          val: "linear-gradient(135deg, #0c0e12 0%, #171410 50%, #0f0c08 100%)",
                        },
                        {
                          name: "Cyber Neon Party",
                          val: "linear-gradient(135deg, #18052e 0%, #0d0221 100%)",
                        },
                        {
                          name: "Sunset Peach Warm",
                          val: "linear-gradient(135deg, #fff1eb 0%, #ace0f9 100%)",
                        },
                        {
                          name: "Deep Midnight Blue",
                          val: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
                        },
                        {
                          name: "Clean Ivory White",
                          val: "linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)",
                        },
                      ].map((g, idx) => (
                        <button
                          key={idx}
                          onClick={() => updateCurrentDesign({ bgGradient: g.val })}
                          className="p-3 rounded-xl border border-white/10 hover:border-amber-400/60 text-left font-semibold cursor-pointer transition-all flex items-center gap-2 bg-stone-800"
                        >
                          <span
                            className="w-5 h-5 rounded-full border border-white/30 shrink-0"
                            style={{ background: g.val }}
                          />
                          <span className="truncate text-stone-200">{g.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Solid Color */}
                {currentDesign.bgType === "color" && (
                  <div>
                    <label className="block text-stone-300 font-bold mb-1">Pilih Warna Background</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={currentDesign.bgColor || "#ffffff"}
                        onChange={(e) => updateCurrentDesign({ bgColor: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                      />
                      <input
                        type="text"
                        value={currentDesign.bgColor || "#ffffff"}
                        onChange={(e) => updateCurrentDesign({ bgColor: e.target.value })}
                        className="px-3 py-1.5 rounded-lg bg-stone-800 border border-white/20 text-white font-mono text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Ambient Decorative Rings */}
                <div className="p-4 rounded-2xl bg-stone-950/60 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-200 block">Cincin Lingkaran Animasi</span>
                      <span className="text-[11px] text-stone-400">Efek cincin berdenyut di belakang layar</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={currentDesign.showAmbientRings ?? true}
                      onChange={(e) => updateCurrentDesign({ showAmbientRings: e.target.checked })}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LOGO & BADGE */}
            {activeTab === "logo" && (
              <div className="space-y-5 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-950/60 border border-white/10">
                  <span className="font-bold text-stone-200">Tampilkan Logo / Gambar Utama</span>
                  <input
                    type="checkbox"
                    checked={currentDesign.showLogo ?? true}
                    onChange={(e) => updateCurrentDesign({ showLogo: e.target.checked })}
                    className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                  />
                </div>

                {currentDesign.showLogo && (
                  <>
                    {/* Logo File Upload */}
                    <div className="p-4 rounded-2xl bg-stone-950/60 border border-white/10 space-y-3">
                      <label className="block text-stone-200 font-bold">Upload Logo / Maskot (PNG/JPG)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload("logoUrl", e.target.files?.[0] || null)}
                        className="block w-full text-xs text-stone-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                      />

                      {currentDesign.logoUrl && (
                        <div className="flex items-center gap-3 pt-2">
                          <img
                            src={currentDesign.logoUrl}
                            alt="Logo"
                            className="w-14 h-14 object-contain rounded-lg bg-white p-1 border border-white/20"
                          />
                          <button
                            onClick={() => updateCurrentDesign({ logoUrl: undefined })}
                            className="px-3 py-1 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs cursor-pointer"
                          >
                            Hapus Logo
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Logo Size Slider */}
                    <div>
                      <div className="flex justify-between text-stone-300 font-medium mb-1">
                        <span>Ukuran Logo:</span>
                        <span>{currentDesign.logoSize || 110}px</span>
                      </div>
                      <input
                        type="range"
                        min={60}
                        max={200}
                        value={currentDesign.logoSize || 110}
                        onChange={(e) => updateCurrentDesign({ logoSize: parseInt(e.target.value) })}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                    </div>

                    {/* Logo Shape */}
                    <div>
                      <label className="block text-stone-300 font-bold mb-2">Bentuk Bingkai Logo</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "circle", label: "Lingkaran" },
                          { id: "rounded", label: "Membulat" },
                          { id: "square", label: "Kotak" },
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => updateCurrentDesign({ logoShape: s.id as any })}
                            className={`p-2 rounded-xl border font-bold cursor-pointer ${
                              currentDesign.logoShape === s.id
                                ? "bg-amber-400/20 border-amber-400 text-amber-300"
                                : "bg-stone-800 border-white/10 text-stone-400"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Badge Underneath Logo */}
                    <div className="p-4 rounded-2xl bg-stone-950/60 border border-white/10 space-y-3">
                      <label className="block text-stone-200 font-bold">Pill Badge Bawah Logo</label>
                      <input
                        type="text"
                        value={currentDesign.logoBadgeText || ""}
                        onChange={(e) => updateCurrentDesign({ logoBadgeText: e.target.value })}
                        placeholder="Contoh: RAICAB V 2026 atau SPECIAL EVENT"
                        className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/20 text-white text-xs"
                      />
                      <div className="flex items-center gap-4 pt-1">
                        <div>
                          <span className="block text-[11px] text-stone-400 mb-1">Warna Latar Badge</span>
                          <input
                            type="color"
                            value={currentDesign.logoBadgeBgColor || "#2E0E4C"}
                            onChange={(e) => updateCurrentDesign({ logoBadgeBgColor: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer bg-transparent"
                          />
                        </div>
                        <div>
                          <span className="block text-[11px] text-stone-400 mb-1">Warna Teks Badge</span>
                          <input
                            type="color"
                            value={currentDesign.logoBadgeTextColor || "#F9B708"}
                            onChange={(e) => updateCurrentDesign({ logoBadgeTextColor: e.target.value })}
                            className="w-8 h-8 rounded cursor-pointer bg-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 3: TYPOGRAPHY & TEXTS */}
            {activeTab === "typography" && (
              <div className="space-y-5 text-xs">
                {/* Main Event Title */}
                <div className="p-4 rounded-2xl bg-stone-950/60 border border-white/10 space-y-3">
                  <label className="block text-amber-300 font-bold">Judul Acara Utama (Heading)</label>
                  <input
                    type="text"
                    value={currentDesign.titleText}
                    onChange={(e) => updateCurrentDesign({ titleText: e.target.value })}
                    placeholder="Contoh: RAIMUNA CABANG V BANJARNEGARA"
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/20 text-white text-sm font-bold"
                  />

                  {/* Font Family */}
                  <div>
                    <label className="block text-stone-300 font-bold mb-1">Gaya Font (Tipografi)</label>
                    <select
                      value={currentDesign.titleFontFamily || "sans"}
                      onChange={(e) => updateCurrentDesign({ titleFontFamily: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/20 text-white text-xs font-semibold cursor-pointer"
                    >
                      <option value="sans">Modern Sans-Serif (Tegas & Rapi)</option>
                      <option value="script">Luxury Script / Kaligrafi (Wedding / Elegan)</option>
                      <option value="cinzel">Royal Serif / Cinzel (Klasik Premium)</option>
                      <option value="serif">Classic Serif</option>
                      <option value="mono">Cyber Monospace (Futuristik)</option>
                    </select>
                  </div>

                  {/* Font Color Mode */}
                  <div>
                    <label className="block text-stone-300 font-bold mb-1">Warna Tulisan Judul</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <button
                        onClick={() => updateCurrentDesign({ titleColorType: "gradient" })}
                        className={`p-2 rounded-xl border text-xs font-bold cursor-pointer ${
                          currentDesign.titleColorType === "gradient"
                            ? "bg-amber-400/20 border-amber-400 text-amber-300"
                            : "bg-stone-800 border-white/10 text-stone-400"
                        }`}
                      >
                        Gradien Warna-Warni
                      </button>
                      <button
                        onClick={() => updateCurrentDesign({ titleColorType: "solid" })}
                        className={`p-2 rounded-xl border text-xs font-bold cursor-pointer ${
                          currentDesign.titleColorType === "solid"
                            ? "bg-amber-400/20 border-amber-400 text-amber-300"
                            : "bg-stone-800 border-white/10 text-stone-400"
                        }`}
                      >
                        Warna Solid
                      </button>
                    </div>

                    {currentDesign.titleColorType === "solid" ? (
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={currentDesign.titleColor || "#1e293b"}
                          onChange={(e) => updateCurrentDesign({ titleColor: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer bg-transparent"
                        />
                        <span className="font-mono text-stone-300">{currentDesign.titleColor || "#1e293b"}</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {[
                          { name: "Scout Ungu-Cyan", val: "linear-gradient(135deg, #2E0E4C 0%, #622599 50%, #0094B4 100%)" },
                          { name: "Emas Kilau Gold", val: "linear-gradient(135deg, #FFF7D6 0%, #D4AF37 50%, #AA771C 100%)" },
                          { name: "Pink Magenta Cyan", val: "linear-gradient(90deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)" },
                          { name: "Oranye Sunset Fire", val: "linear-gradient(90deg, #f97316 0%, #ef4444 100%)" },
                        ].map((gr, idx) => (
                          <button
                            key={idx}
                            onClick={() => updateCurrentDesign({ titleGradient: gr.val })}
                            className="p-2 rounded-lg bg-stone-800 border border-white/10 text-[11px] font-bold text-stone-300 hover:text-white truncate cursor-pointer"
                          >
                            {gr.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtitle Pill */}
                <div className="p-4 rounded-2xl bg-stone-950/60 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-stone-200 font-bold">Subtitle / Kategori Acara</label>
                    <input
                      type="checkbox"
                      checked={currentDesign.showSubtitle ?? true}
                      onChange={(e) => updateCurrentDesign({ showSubtitle: e.target.checked })}
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                  </div>
                  {currentDesign.showSubtitle && (
                    <input
                      type="text"
                      value={currentDesign.subtitleText || ""}
                      onChange={(e) => updateCurrentDesign({ subtitleText: e.target.value })}
                      placeholder="Contoh: KWARTIR CABANG BANJARNEGARA"
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/20 text-white text-xs"
                    />
                  )}
                </div>

                {/* Date & Hashtag */}
                <div className="p-4 rounded-2xl bg-stone-950/60 border border-white/10 space-y-3">
                  <label className="block text-stone-200 font-bold">Tag Tanggal & Hashtag</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={currentDesign.dateText || ""}
                      onChange={(e) => updateCurrentDesign({ dateText: e.target.value, showDateTag: true })}
                      placeholder="Tanggal (Contoh: Tahun 2026)"
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/20 text-white text-xs"
                    />
                    <input
                      type="text"
                      value={currentDesign.hashtagText || ""}
                      onChange={(e) => updateCurrentDesign({ hashtagText: e.target.value, showHashtagTag: true })}
                      placeholder="Hashtag (Contoh: #RaicabBanjarV #PramukaBanjarnegara)"
                      className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/20 text-white text-xs"
                    />
                  </div>
                </div>

                {/* Header & Footer Custom Text */}
                <div className="p-4 rounded-2xl bg-stone-950/60 border border-white/10 space-y-3">
                  <label className="block text-stone-200 font-bold">Teks Header & Footer Kiosk</label>
                  <input
                    type="text"
                    value={currentDesign.headerBrandText || ""}
                    onChange={(e) => updateCurrentDesign({ headerBrandText: e.target.value })}
                    placeholder="Header Atas (Contoh: RAICAB BANJAR V • PHOTOBOOTH)"
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/20 text-white text-xs"
                  />
                  <input
                    type="text"
                    value={currentDesign.footerText || ""}
                    onChange={(e) => updateCurrentDesign({ footerText: e.target.value })}
                    placeholder="Footer Bawah (Contoh: RAIMUNA CABANG V BANJARNEGARA • YODHA PHOTOBOOTH)"
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/20 text-white text-xs"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: BUTTON CUSTOMIZER */}
            {activeTab === "button" && (
              <div className="space-y-5 text-xs">
                {/* Button Text */}
                <div>
                  <label className="block text-stone-300 font-bold mb-1">Teks Tombol Mulai</label>
                  <input
                    type="text"
                    value={currentDesign.buttonText || ""}
                    onChange={(e) => updateCurrentDesign({ buttonText: e.target.value })}
                    placeholder="Contoh: Sentuh Layar untuk Mulai"
                    className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-white/20 text-white text-xs font-semibold"
                  />
                </div>

                {/* Button Icon */}
                <div>
                  <label className="block text-stone-300 font-bold mb-2">Ikon Tombol</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "camera", label: "Kamera" },
                      { id: "sparkles", label: "Bintang" },
                      { id: "heart", label: "Hati" },
                      { id: "arrow", label: "Panah" },
                    ].map((ic) => (
                      <button
                        key={ic.id}
                        onClick={() => updateCurrentDesign({ buttonIcon: ic.id as any })}
                        className={`p-2.5 rounded-xl border text-center font-bold cursor-pointer ${
                          currentDesign.buttonIcon === ic.id
                            ? "bg-amber-400/20 border-amber-400 text-amber-300"
                            : "bg-stone-800 border-white/10 text-stone-400"
                        }`}
                      >
                        {ic.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Button Shape */}
                <div>
                  <label className="block text-stone-300 font-bold mb-2">Bentuk Tombol</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "pill", label: "Kapsul (Pill)" },
                      { id: "rounded", label: "Membulat" },
                      { id: "box", label: "Kotak" },
                    ].map((sh) => (
                      <button
                        key={sh.id}
                        onClick={() => updateCurrentDesign({ buttonShape: sh.id as any })}
                        className={`p-2 rounded-xl border text-center font-bold cursor-pointer ${
                          currentDesign.buttonShape === sh.id
                            ? "bg-amber-400/20 border-amber-400 text-amber-300"
                            : "bg-stone-800 border-white/10 text-stone-400"
                        }`}
                      >
                        {sh.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Button Color Presets */}
                <div>
                  <label className="block text-stone-300 font-bold mb-2">Warna & Gradien Tombol</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: "Scout Ungu-Oranye", val: "linear-gradient(90deg, #622599 0%, #EF5000 100%)" },
                      { name: "Emas Mewah Gold", val: "linear-gradient(135deg, #D4AF37 0%, #AA771C 100%)" },
                      { name: "Neon Cyber Magenta", val: "linear-gradient(90deg, #ec4899 0%, #a855f7 100%)" },
                      { name: "Ocean Cyan Blue", val: "linear-gradient(90deg, #06b6d4 0%, #3b82f6 100%)" },
                    ].map((btn, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          updateCurrentDesign({
                            buttonBgType: "gradient",
                            buttonBgGradient: btn.val,
                          })
                        }
                        className="p-3 rounded-xl border border-white/10 hover:border-amber-400 font-semibold cursor-pointer text-left flex items-center gap-2 bg-stone-800"
                      >
                        <span className="w-4 h-4 rounded-full shrink-0" style={{ background: btn.val }} />
                        <span className="truncate text-stone-200">{btn.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: DESIGNS COLLECTION */}
            {activeTab === "designs" && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-200">Koleksi Desain Tersimpan ({designs.length})</span>
                  <button
                    onClick={handleCreateNewDesign}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 text-stone-900 font-bold flex items-center gap-1 cursor-pointer hover:bg-amber-300"
                  >
                    <Plus size={14} />
                    <span>Buat Baru</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {designs.map((des) => (
                    <div
                      key={des.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        des.id === activeId
                          ? "bg-amber-400/10 border-amber-400 shadow-md"
                          : "bg-stone-950/60 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div
                        onClick={() => setActiveId(des.id)}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate">{des.name}</span>
                          {des.isActive && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              Aktif di Kiosk
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-stone-400 truncate block">
                          Judul: {des.titleText}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleSetActive(des.id)}
                          className="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white cursor-pointer"
                          title="Aktifkan ke Photobooth"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                        <button
                          onClick={handleDuplicate}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer"
                          title="Duplikasi"
                        >
                          <Copy size={14} />
                        </button>
                        {designs.length > 1 && (
                          <button
                            onClick={() => handleDeleteDesign(des.id)}
                            className="p-1.5 rounded-lg bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: GOOGLE DRIVE ONLINE SYNC */}
            {activeTab === "cloud" && (
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-200 leading-relaxed">
                  💡 <strong>Google Drive / Sheets Sync:</strong> Tidak pernah di-pause atau dihapus! Semua desain dan gambar yang kamu edit di sini bisa kamu simpan secara online ke Google Drive akunmu.
                </div>

                <div className="p-4 rounded-2xl bg-stone-950/60 border border-white/10 space-y-3">
                  <span className="font-bold text-stone-200 block">Status Koneksi Apps Script</span>
                  <div className="text-[11px] text-stone-400 font-mono break-all bg-stone-900 p-2.5 rounded-xl border border-white/5">
                    {driveConfig.appsScriptUrl || "Belum ada URL Apps Script"}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      onClick={handlePublishToGoogleDrive}
                      disabled={isPublishing}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      <CloudUpload size={15} />
                      <span>{isPublishing ? "Menyimpan..." : "Publish ke Drive Sekarang"}</span>
                    </button>

                    <button
                      onClick={handlePullFromGoogleDrive}
                      disabled={isPulling}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold flex items-center justify-center gap-2 cursor-pointer border border-white/10 disabled:opacity-50"
                    >
                      <RefreshCw size={15} className={isPulling ? "animate-spin" : ""} />
                      <span>{isPulling ? "Menarik..." : "Tarik dari Drive"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Live Kiosk Preview */}
        <div className="flex-1 bg-stone-950 p-4 sm:p-8 flex flex-col items-center justify-center overflow-auto relative">
          {/* Preview Device Controls */}
          <div className="absolute top-4 left-6 z-20 flex items-center gap-2 bg-stone-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg text-xs">
            <span className="text-stone-400 font-semibold flex items-center gap-1.5">
              <Eye size={14} className="text-amber-400" />
              <span>Live Preview</span>
            </span>
            <div className="h-4 w-px bg-white/20" />
            <button
              onClick={() => setPreviewDevice("desktop")}
              className={`p-1 rounded-lg cursor-pointer ${
                previewDevice === "desktop" ? "bg-amber-400/20 text-amber-300" : "text-stone-400"
              }`}
              title="Layar Penuh Desktop (16:9)"
            >
              <Monitor size={15} />
            </button>
            <button
              onClick={() => setPreviewDevice("tablet")}
              className={`p-1 rounded-lg cursor-pointer ${
                previewDevice === "tablet" ? "bg-amber-400/20 text-amber-300" : "text-stone-400"
              }`}
              title="Layar Tablet / Stand Portrait"
            >
              <Tablet size={15} />
            </button>
          </div>

          {/* Canvas Wrapper */}
          <div
            className={`transition-all duration-300 w-full flex items-center justify-center ${
              previewDevice === "tablet" ? "max-w-[540px]" : "max-w-5xl"
            }`}
          >
            {renderLivePreview()}
          </div>
        </div>
      </div>
    </div>
  );
};

