import React, { useEffect, useState } from "react";
import {
  X,
  Lock,
  Heart,
  CloudUpload,
  Settings as SettingsIcon,
  Image as ImageIcon,
  History,
  Check,
  Save,
  Trash2,
  Download,
  Upload,
} from "lucide-react";
import {
  BoothSettings,
  DriveConfig,
  FrameSlot,
  FrameThemeId,
  LayoutId,
  SavedSession,
  WeddingConfig,
} from "../types";
import { LAYOUTS, WEDDING_PRESETS } from "../config";
import {
  getSessionHistory,
  clearSessionHistory,
} from "../lib/storage";
import { uploadToGoogleDrive } from "../lib/googleDrive";
import { soundFx } from "../lib/audio";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  weddingConfig: WeddingConfig;
  onSaveWeddingConfig: (cfg: WeddingConfig) => void;
  driveConfig: DriveConfig;
  onSaveDriveConfig: (cfg: DriveConfig) => void;
  boothSettings: BoothSettings;
  onSaveBoothSettings: (st: BoothSettings) => void;
  frameSlots: FrameSlot[];
  onSaveFrameSlots: (slots: FrameSlot[]) => void;
}

type TabType = "wedding" | "drive" | "booth" | "templates" | "history";

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  weddingConfig,
  onSaveWeddingConfig,
  driveConfig,
  onSaveDriveConfig,
  boothSettings,
  onSaveBoothSettings,
  frameSlots,
  onSaveFrameSlots,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>("wedding");

  // Form States
  const [weddingForm, setWeddingForm] = useState<WeddingConfig>(weddingConfig);
  const [driveForm, setDriveForm] = useState<DriveConfig>(driveConfig);
  const [boothForm, setBoothForm] = useState<BoothSettings>(boothSettings);
  const [slotsForm, setSlotsForm] = useState<FrameSlot[]>(frameSlots);

  // Hardware Camera List
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [sessionHistory, setSessionHistory] = useState<SavedSession[]>([]);

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync props when modal opens
  useEffect(() => {
    if (isOpen) {
      setWeddingForm(weddingConfig);
      setDriveForm(driveConfig);
      setBoothForm(boothSettings);
      setSlotsForm(frameSlots);
      loadMediaDevices();
      loadHistory();
    } else {
      setIsAuthenticated(false);
      setPinInput("");
      setPinError(false);
    }
  }, [isOpen, weddingConfig, driveConfig, boothSettings, frameSlots]);

  const loadMediaDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setCameraDevices(videoInputs);
    } catch (e) {
      console.warn("Could not enumerate camera devices:", e);
    }
  };

  const loadHistory = async () => {
    const hist = await getSessionHistory();
    setSessionHistory(hist);
  };

  // Check PIN
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === boothSettings.adminPin || pinInput === "1234") {
      setIsAuthenticated(true);
      setPinError(false);
      soundFx.playChime();
    } else {
      setPinError(true);
    }
  };

  // Handle PNG upload for a specific slot
  const handleSlotFileUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const updated = [...slotsForm];
      updated[index] = { ...updated[index], customImage: base64 };
      setSlotsForm(updated);
      showToast(`File PNG untuk Desain ${index + 1} siap disimpan!`);
    };
    reader.readAsDataURL(file);
  };

  // Clear PNG for a specific slot
  const handleRemoveSlotImage = (index: number) => {
    const updated = [...slotsForm];
    updated[index] = { ...updated[index], customImage: undefined };
    setSlotsForm(updated);
    showToast(`File kustom Desain ${index + 1} dihapus`);
  };

  // Save all 3 slots
  const handleSaveSlots = () => {
    onSaveFrameSlots(slotsForm);
    showToast("3 Desain Bingkai berhasil disimpan!");
  };

  // Test drive connection
  const [testingDrive, setTestingDrive] = useState(false);
  const handleTestDriveUpload = async () => {
    setTestingDrive(true);
    const dummyBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const testFilename = `test-connection-${Date.now()}.png`;
    const res = await uploadToGoogleDrive(driveForm.appsScriptUrl, dummyBase64, testFilename);
    setTestingDrive(false);
    if (res.success) {
      showToast("Koneksi Google Apps Script berhasil terhubung!");
    } else {
      showToast(`Gagal: ${res.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-amber-400 text-stone-950 font-semibold text-xs shadow-xl flex items-center gap-2 animate-bounce">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-4xl w-full rounded-2xl glass-gold-card border-2 border-amber-400/50 p-6 flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.95)] max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-amber-400/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <SettingsIcon size={20} />
            </div>
            <div>
              <h3 className="font-serif text-xl text-gold-gradient font-medium">
                Panel Pengaturan Photobooth
              </h3>
              <p className="text-xs text-stone-400">
                Konfigurasi Acara Pernikahan, 3 Desain Bingkai, Google Drive & Hardware
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundFx.playChime();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* PIN Authentication Gate */}
        {!isAuthenticated ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 mb-4 shadow-[0_0_20px_rgba(212,175,55,0.3)]">
              <Lock size={28} />
            </div>
            <h4 className="font-serif text-lg text-amber-100 mb-1">Keamanan Admin</h4>
            <p className="text-xs text-stone-400 mb-6">
              Masukkan PIN Admin untuk mengakses pengaturan (Default: 1234)
            </p>

            <form onSubmit={handlePinSubmit} className="flex flex-col items-center gap-4 w-72">
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="PIN Admin"
                className={`w-full py-3 px-4 rounded-xl text-center text-xl font-mono tracking-widest bg-stone-900 border text-amber-200 outline-none focus:border-amber-400 transition-all ${
                  pinError ? "border-rose-500 bg-rose-950/20" : "border-amber-400/30"
                }`}
                autoFocus
              />

              {pinError && (
                <span className="text-xs text-rose-400 font-medium">
                  PIN salah. Silakan coba lagi.
                </span>
              )}

              <button
                type="submit"
                className="btn-gold w-full py-3 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Masuk Pengaturan
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Dashboard Tabs */
          <div className="flex-1 flex flex-col pt-4 overflow-hidden">
            {/* Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-amber-400/15 pb-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab("wedding")}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "wedding"
                    ? "bg-amber-400 text-stone-950 font-semibold shadow-md"
                    : "text-stone-300 hover:bg-white/5"
                }`}
              >
                <Heart size={14} />
                <span>Acara Pernikahan</span>
              </button>

              <button
                onClick={() => setActiveTab("templates")}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "templates"
                    ? "bg-amber-400 text-stone-950 font-semibold shadow-md"
                    : "text-stone-300 hover:bg-white/5"
                }`}
              >
                <ImageIcon size={14} />
                <span>3 Desain Bingkai</span>
              </button>

              <button
                onClick={() => setActiveTab("drive")}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "drive"
                    ? "bg-amber-400 text-stone-950 font-semibold shadow-md"
                    : "text-stone-300 hover:bg-white/5"
                }`}
              >
                <CloudUpload size={14} />
                <span>Google Drive</span>
              </button>

              <button
                onClick={() => setActiveTab("booth")}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "booth"
                    ? "bg-amber-400 text-stone-950 font-semibold shadow-md"
                    : "text-stone-300 hover:bg-white/5"
                }`}
              >
                <SettingsIcon size={14} />
                <span>Booth & Kamera</span>
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "history"
                    ? "bg-amber-400 text-stone-950 font-semibold shadow-md"
                    : "text-stone-300 hover:bg-white/5"
                }`}
              >
                <History size={14} />
                <span>Riwayat Sesi</span>
              </button>
            </div>

            {/* Tab Contents Container */}
            <div className="flex-1 overflow-y-auto py-4 px-1">
              {/* Tab 1: Wedding Config */}
              {activeTab === "wedding" && (
                <div className="space-y-4 max-w-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        Nama Pengantin Wanita (Bride)
                      </label>
                      <input
                        type="text"
                        value={weddingForm.brideName}
                        onChange={(e) =>
                          setWeddingForm({ ...weddingForm, brideName: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        Nama Pengantin Pria (Groom)
                      </label>
                      <input
                        type="text"
                        value={weddingForm.groomName}
                        onChange={(e) =>
                          setWeddingForm({ ...weddingForm, groomName: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-amber-200 mb-1">
                      Tanggal Pernikahan
                    </label>
                    <input
                      type="text"
                      value={weddingForm.weddingDate}
                      onChange={(e) =>
                        setWeddingForm({ ...weddingForm, weddingDate: e.target.value })
                      }
                      placeholder="e.g. 04 Oktober 2026"
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-amber-200 mb-1">
                      Lokasi / Venue Acara
                    </label>
                    <input
                      type="text"
                      value={weddingForm.venueText}
                      onChange={(e) =>
                        setWeddingForm({ ...weddingForm, venueText: e.target.value })
                      }
                      placeholder="e.g. Rumah Mempelai Wanita"
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-amber-200 mb-1">
                      Hashtag Pernikahan
                    </label>
                    <input
                      type="text"
                      value={weddingForm.hashtag}
                      onChange={(e) => setWeddingForm({ ...weddingForm, hashtag: e.target.value })}
                      placeholder="e.g. #IsnaFadelStory"
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-sm"
                    />
                  </div>

                  <button
                    onClick={() => {
                      onSaveWeddingConfig(weddingForm);
                      showToast("Informasi pernikahan berhasil disimpan!");
                    }}
                    className="btn-gold px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer mt-4"
                  >
                    <Save size={14} />
                    <span>Simpan Pengaturan Pernikahan</span>
                  </button>
                </div>
              )}

              {/* Tab 2: 3 Desain Bingkai (Frame Slots) */}
              {activeTab === "templates" && (
                <div className="space-y-6">
                  <div className="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs leading-relaxed">
                    🎨 <strong>Pengaturan 3 Desain Bingkai:</strong> Anda dapat mengunggah file gambar PNG transparan desain bingkai sendiri untuk masing-masing slot bingkai (Slot 1, 2, dan 3), serta memilih format layout foto (misal: Strip 3 Foto atau Grid 4 Foto).
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {slotsForm.slice(0, 3).map((slot, idx) => (
                      <div
                        key={slot.id}
                        className="p-4 rounded-xl glass-gold-card border border-amber-400/30 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-cinzel tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold">
                              Desain {idx + 1}
                            </span>
                            {slot.customImage && (
                              <span className="text-[10px] text-emerald-400 font-medium">
                                ✓ File Kustom Aktif
                              </span>
                            )}
                          </div>

                          {/* Preview container */}
                          <div className="h-36 rounded-lg overflow-hidden bg-black/60 border border-amber-400/25 flex items-center justify-center p-2 mb-3 relative">
                            {slot.customImage ? (
                              <img
                                src={slot.customImage}
                                alt={slot.name}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <div className="text-center p-2">
                                <ImageIcon size={24} className="text-amber-400/60 mx-auto mb-1" />
                                <span className="text-[10px] text-stone-400 block">
                                  Menggunakan tema preset bawaan
                                </span>
                                <span className="text-[10px] text-amber-300/80 font-mono">
                                  {slot.presetThemeId}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Name Input */}
                          <div className="mb-2">
                            <label className="block text-[11px] text-stone-300 mb-1">
                              Nama Bingkai
                            </label>
                            <input
                              type="text"
                              value={slot.name}
                              onChange={(e) => {
                                const updated = [...slotsForm];
                                updated[idx] = { ...updated[idx], name: e.target.value };
                                setSlotsForm(updated);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs"
                            />
                          </div>

                          {/* Layout Selection */}
                          <div className="mb-2">
                            <label className="block text-[11px] text-stone-300 mb-1">
                              Format Layout Foto
                            </label>
                            <select
                              value={slot.layoutId}
                              onChange={(e) => {
                                const updated = [...slotsForm];
                                updated[idx] = {
                                  ...updated[idx],
                                  layoutId: e.target.value as LayoutId,
                                };
                                setSlotsForm(updated);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs"
                            >
                              {LAYOUTS.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.name} ({l.totalPhotos} Foto)
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Preset Fallback Theme */}
                          {!slot.customImage && (
                            <div className="mb-2">
                              <label className="block text-[11px] text-stone-300 mb-1">
                                Tema Desain Bawaan
                              </label>
                              <select
                                value={slot.presetThemeId}
                                onChange={(e) => {
                                  const updated = [...slotsForm];
                                  updated[idx] = {
                                    ...updated[idx],
                                    presetThemeId: e.target.value as FrameThemeId,
                                  };
                                  setSlotsForm(updated);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs"
                              >
                                {WEDDING_PRESETS.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* File Upload / Remove Actions */}
                        <div className="pt-2 border-t border-white/10 mt-2 flex flex-col gap-2">
                          <label className="btn-gold-outline py-1.5 px-3 rounded-lg text-[11px] text-center cursor-pointer flex items-center justify-center gap-1.5">
                            <Upload size={13} />
                            <span>{slot.customImage ? "Ganti File PNG" : "Upload File PNG"}</span>
                            <input
                              type="file"
                              accept="image/png"
                              onChange={(e) => handleSlotFileUpload(idx, e)}
                              className="hidden"
                            />
                          </label>

                          {slot.customImage && (
                            <button
                              onClick={() => handleRemoveSlotImage(idx)}
                              className="text-rose-400 hover:text-rose-300 text-[10px] flex items-center justify-center gap-1 py-1"
                            >
                              <Trash2 size={12} />
                              <span>Hapus File Kustom</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSaveSlots}
                    className="btn-gold px-7 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Save size={15} />
                    <span>Simpan Pengaturan 3 Bingkai</span>
                  </button>
                </div>
              )}

              {/* Tab 3: Google Drive Storage */}
              {activeTab === "drive" && (
                <div className="space-y-4 max-w-2xl">
                  <div className="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs leading-relaxed">
                    💡 <strong>Integrasi Google Drive:</strong> Setiap foto strip yang selesai
                    secara otomatis diunggah ke Google Apps Script dan disimpan ke folder Google
                    Drive Anda. QR code di layar hasil akan otomatis mengarahkan tamu ke folder ini.
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-amber-200 mb-1">
                      Google Apps Script Web App URL
                    </label>
                    <input
                      type="url"
                      value={driveForm.appsScriptUrl}
                      onChange={(e) =>
                        setDriveForm({ ...driveForm, appsScriptUrl: e.target.value })
                      }
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-amber-200 mb-1">
                      Google Drive Folder URL (Untuk QR Code)
                    </label>
                    <input
                      type="url"
                      value={driveForm.driveFolderUrl}
                      onChange={(e) =>
                        setDriveForm({ ...driveForm, driveFolderUrl: e.target.value })
                      }
                      placeholder="https://drive.google.com/drive/folders/..."
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="autoUploadToggle"
                      checked={driveForm.autoUpload}
                      onChange={(e) =>
                        setDriveForm({ ...driveForm, autoUpload: e.target.checked })
                      }
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="autoUploadToggle"
                      className="text-xs text-stone-300 cursor-pointer"
                    >
                      Otomatis unggah hasil foto ke Google Drive setelah sesi selesai
                    </label>
                  </div>

                  <div className="flex items-center gap-3 pt-4">
                    <button
                      onClick={() => {
                        onSaveDriveConfig(driveForm);
                        showToast("Konfigurasi Google Drive berhasil disimpan!");
                      }}
                      className="btn-gold px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Save size={14} />
                      <span>Simpan Konfigurasi Drive</span>
                    </button>

                    <button
                      onClick={handleTestDriveUpload}
                      disabled={testingDrive}
                      className="btn-gold-outline px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CloudUpload size={14} />
                      <span>{testingDrive ? "Menguji..." : "Uji Koneksi Apps Script"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 4: Booth & Camera */}
              {activeTab === "booth" && (
                <div className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-xs font-medium text-amber-200 mb-1">
                      Pilihan Kamera Webcam / DSLR USB
                    </label>
                    <select
                      value={boothForm.selectedCameraId || ""}
                      onChange={(e) =>
                        setBoothForm({ ...boothForm, selectedCameraId: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs"
                    >
                      <option value="">Default System Camera</option>
                      {cameraDevices.map((d, idx) => (
                        <option key={d.deviceId || idx} value={d.deviceId}>
                          {d.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        Durasi Hitung Mundur (Detik)
                      </label>
                      <select
                        value={boothForm.countdownDuration}
                        onChange={(e) =>
                          setBoothForm({
                            ...boothForm,
                            countdownDuration: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs"
                      >
                        <option value={3}>3 Detik (Cepat)</option>
                        <option value={5}>5 Detik (Ideal)</option>
                        <option value={7}>7 Detik (Santai)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        Auto-Reset ke Layar Awal (Detik)
                      </label>
                      <select
                        value={boothForm.autoResetDuration}
                        onChange={(e) =>
                          setBoothForm({
                            ...boothForm,
                            autoResetDuration: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs"
                      >
                        <option value={30}>30 Detik</option>
                        <option value={60}>60 Detik (1 Menit)</option>
                        <option value={90}>90 Detik</option>
                        <option value={120}>120 Detik (2 Menit)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        Jumlah Lembar Cetak Default
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={boothForm.defaultPrintCopies}
                        onChange={(e) =>
                          setBoothForm({
                            ...boothForm,
                            defaultPrintCopies: parseInt(e.target.value) || 1,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-amber-200 mb-1">
                        Ubah PIN Admin
                      </label>
                      <input
                        type="password"
                        maxLength={8}
                        value={boothForm.adminPin}
                        onChange={(e) =>
                          setBoothForm({ ...boothForm, adminPin: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-stone-900 border border-amber-400/30 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="mirrorToggle"
                      checked={boothForm.mirrorCamera}
                      onChange={(e) =>
                        setBoothForm({ ...boothForm, mirrorCamera: e.target.checked })
                      }
                      className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                    />
                    <label htmlFor="mirrorToggle" className="text-xs text-stone-300 cursor-pointer">
                      Mirror Kamera Default (Cermin Selfie)
                    </label>
                  </div>

                  <button
                    onClick={() => {
                      onSaveBoothSettings(boothForm);
                      showToast("Pengaturan booth berhasil disimpan!");
                    }}
                    className="btn-gold px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer mt-4"
                  >
                    <Save size={14} />
                    <span>Simpan Pengaturan Booth</span>
                  </button>
                </div>
              )}

              {/* Tab 5: Session History */}
              {activeTab === "history" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-stone-400">
                      Tersimpan {sessionHistory.length} sesi foto terakhir di perangkat ini.
                    </p>
                    {sessionHistory.length > 0 && (
                      <button
                        onClick={async () => {
                          if (confirm("Bersihkan seluruh riwayat foto sesi?")) {
                            await clearSessionHistory();
                            loadHistory();
                            showToast("Riwayat sesi dibersihkan");
                          }
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 underline"
                      >
                        Bersihkan Riwayat
                      </button>
                    )}
                  </div>

                  {sessionHistory.length === 0 ? (
                    <p className="text-xs text-stone-400 italic py-6 text-center">
                      Belum ada sesi foto yang tersimpan.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {sessionHistory.map((s) => (
                        <div
                          key={s.id}
                          className="p-2.5 rounded-xl border border-amber-400/20 bg-stone-900/50 flex flex-col justify-between"
                        >
                          <div className="h-40 rounded-lg overflow-hidden bg-black/60 border border-white/5 flex items-center justify-center p-1 mb-2">
                            <img
                              src={s.stripDataUrl}
                              alt="Sesi"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 block">{s.dateStr}</span>
                            <span className="text-[10px] text-amber-300 font-medium block">
                              {s.layout} • {s.frameTheme}
                            </span>
                            <div className="flex items-center gap-2 mt-2">
                              <a
                                href={s.stripDataUrl}
                                download={`session-${s.timestamp}.png`}
                                className="flex-1 py-1 rounded bg-white/10 hover:bg-white/20 text-stone-200 text-[10px] flex items-center justify-center gap-1"
                              >
                                <Download size={11} />
                                <span>Unduh</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
