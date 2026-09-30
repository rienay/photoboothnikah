import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Wand2,
  Sparkles,
  RotateCcw,
  Undo,
  Redo,
  Upload,
  Paintbrush,
  Eye,
  Check,
  Plus,
} from "lucide-react";
import { LayoutId } from "../types";
import { LAYOUTS } from "../config";
import { soundFx } from "../lib/audio";

export interface PhotoBox {
  id: string;
  x: number; // percentage (0 - 100)
  y: number;
  w: number;
  h: number;
}

interface FrameStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSlotIndex: number;
  initialName: string;
  initialLayoutId: LayoutId;
  initialImage?: string;
  onSaveFrame: (result: {
    slotIndex: number;
    name: string;
    layoutId: LayoutId;
    imagePngDataUrl: string;
  }) => void;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getDefaultBoxesForLayout(layoutId: string): PhotoBox[] {
  switch (layoutId) {
    case "3x1":
      return [
        { id: "box_1", x: 10, y: 15, w: 80, h: 22 },
        { id: "box_2", x: 10, y: 40, w: 80, h: 22 },
        { id: "box_3", x: 10, y: 65, w: 80, h: 22 },
      ];
    case "2x2":
      return [
        { id: "box_1", x: 8, y: 12, w: 40, h: 35 },
        { id: "box_2", x: 52, y: 12, w: 40, h: 35 },
        { id: "box_3", x: 8, y: 52, w: 40, h: 35 },
        { id: "box_4", x: 52, y: 52, w: 40, h: 35 },
      ];
    case "2x1":
      return [
        { id: "box_1", x: 10, y: 18, w: 80, h: 32 },
        { id: "box_2", x: 10, y: 54, w: 80, h: 32 },
      ];
    case "1x1":
      return [{ id: "box_1", x: 10, y: 15, w: 80, h: 70 }];
    case "3x2":
      return [
        { id: "box_1", x: 8, y: 10, w: 40, h: 24 },
        { id: "box_2", x: 52, y: 10, w: 40, h: 24 },
        { id: "box_3", x: 8, y: 38, w: 40, h: 24 },
        { id: "box_4", x: 52, y: 38, w: 40, h: 24 },
        { id: "box_5", x: 8, y: 66, w: 40, h: 24 },
        { id: "box_6", x: 52, y: 66, w: 40, h: 24 },
      ];
    case "4x2":
      return [
        { id: "box_1", x: 8, y: 8, w: 40, h: 18 },
        { id: "box_2", x: 52, y: 8, w: 40, h: 18 },
        { id: "box_3", x: 8, y: 30, w: 40, h: 18 },
        { id: "box_4", x: 52, y: 30, w: 40, h: 18 },
        { id: "box_5", x: 8, y: 52, w: 40, h: 18 },
        { id: "box_6", x: 52, y: 52, w: 40, h: 18 },
        { id: "box_7", x: 8, y: 74, w: 40, h: 18 },
        { id: "box_8", x: 52, y: 74, w: 40, h: 18 },
      ];
    default:
      return [
        { id: "box_1", x: 10, y: 15, w: 80, h: 22 },
        { id: "box_2", x: 10, y: 40, w: 80, h: 22 },
        { id: "box_3", x: 10, y: 65, w: 80, h: 22 },
      ];
  }
}

export const FrameStudioModal: React.FC<FrameStudioModalProps> = ({
  isOpen,
  onClose,
  initialSlotIndex,
  initialName,
  initialLayoutId,
  initialImage,
  onSaveFrame,
}) => {
  const [name, setName] = useState(initialName || `Desain ${initialSlotIndex + 1}`);
  const [layoutId, setLayoutId] = useState<LayoutId>(initialLayoutId || "3x1");
  const [activeCanvasData, setActiveCanvasData] = useState<string>(initialImage || "");
  const [rawBase64Img, setRawBase64Img] = useState<string>(initialImage || "");
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [chromaTolerance, setChromaTolerance] = useState(25);
  const [toolMode, setToolMode] = useState<"wand" | "white" | "green" | "restore">("wand");
  const [brushSize, setBrushSize] = useState(30);
  const [previewTab, setPreviewTab] = useState<"checkerboard" | "photos">("checkerboard");
  const [actionStatus, setActionStatus] = useState<string>("");
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setName(initialName || `Desain ${initialSlotIndex + 1}`);
      setLayoutId(initialLayoutId || "3x1");
      setActiveCanvasData(initialImage || "");
      setRawBase64Img(initialImage || "");
      setHistoryStack([]);
      setRedoStack([]);
      setActionStatus("");

      if (initialImage) {
        const img = new Image();
        img.onload = () => {
          originalImageRef.current = img;
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          setImageMeta({ width: w, height: h });

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            workingCanvasRef.current = canvas;
          }
        };
        img.src = initialImage;
      } else {
        originalImageRef.current = null;
        workingCanvasRef.current = null;
        setImageMeta(null);
      }
    }
  }, [isOpen, initialSlotIndex, initialName, initialLayoutId, initialImage]);

  // Load new frame file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setActionStatus("⚠️ Berkas harus berupa gambar (PNG, JPG, WEBP)!");
      return;
    }

    setActionStatus("Sedang memproses gambar...");
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        originalImageRef.current = img;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        setImageMeta({ width: w, height: h });

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const initialData = canvas.toDataURL("image/png");
          setRawBase64Img(initialData);
          setActiveCanvasData(initialData);
          setHistoryStack([]);
          setRedoStack([]);
          workingCanvasRef.current = canvas;
          setActionStatus("✓ Gambar berhasil dimuat. Siap dilubangi!");
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Undo / Redo / Reset
  const handleUndo = () => {
    if (historyStack.length === 0 || !workingCanvasRef.current) return;
    const prev = historyStack[historyStack.length - 1];
    setRedoStack((r) => [activeCanvasData, ...r]);
    setHistoryStack((h) => h.slice(0, -1));
    setActiveCanvasData(prev);

    const img = new Image();
    img.onload = () => {
      const ctx = workingCanvasRef.current?.getContext("2d", { willReadFrequently: true });
      if (ctx && workingCanvasRef.current) {
        ctx.clearRect(0, 0, workingCanvasRef.current.width, workingCanvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = prev;
    setActionStatus("Langkah terakhir dibatalkan (Undo).");
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !workingCanvasRef.current) return;
    const next = redoStack[0];
    setHistoryStack((h) => [...h, activeCanvasData]);
    setRedoStack((r) => r.slice(1));
    setActiveCanvasData(next);

    const img = new Image();
    img.onload = () => {
      const ctx = workingCanvasRef.current?.getContext("2d", { willReadFrequently: true });
      if (ctx && workingCanvasRef.current) {
        ctx.clearRect(0, 0, workingCanvasRef.current.width, workingCanvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = next;
    setActionStatus("Langkah diulangi (Redo).");
  };

  const handleResetOriginal = () => {
    if (!rawBase64Img || !originalImageRef.current || !workingCanvasRef.current) return;
    setHistoryStack((h) => [...h, activeCanvasData]);
    setRedoStack([]);
    const canvas = workingCanvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImageRef.current, 0, 0);
      const data = canvas.toDataURL("image/png");
      setActiveCanvasData(data);
      setActionStatus("✓ Gambar dipulihkan ke kondisi awal.");
    }
  };

  // 1-Click: Auto Scan & Erase
  const handleAutoScanErase = () => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    const canvas = workingCanvasRef.current;
    setHistoryStack((prev) => [...prev.slice(-14), activeCanvasData]);
    setRedoStack([]);

    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const boxes = getDefaultBoxesForLayout(layoutId);

    boxes.forEach((box) => {
      const bx = Math.max(0, Math.min(width - 1, Math.round((box.x / 100) * width)));
      const by = Math.max(0, Math.min(height - 1, Math.round((box.y / 100) * height)));
      const bw = Math.max(1, Math.min(width - bx, Math.round((box.w / 100) * width)));
      const bh = Math.max(1, Math.min(height - by, Math.round((box.h / 100) * height)));

      const cx = Math.floor(bx + bw / 2);
      const cy = Math.floor(by + bh / 2);
      const centerIdx = (cy * width + cx) * 4;

      const sr = data[centerIdx];
      const sg = data[centerIdx + 1];
      const sb = data[centerIdx + 2];
      const sa = data[centerIdx + 3];

      const maxDist = 441.67;
      const threshold = (chromaTolerance / 100) * maxDist;

      const isTarget =
        sa > 30 &&
        ((sr > 185 && sg > 185 && sb > 185) ||
          (sg > 150 && sr < 140 && sb < 140));

      if (isTarget) {
        const visited = new Uint8Array(width * height);
        const queue = new Int32Array(bw * bh * 2);
        let head = 0;
        let tail = 0;

        queue[tail++] = cx;
        queue[tail++] = cy;
        visited[cy * width + cx] = 1;

        while (head < tail) {
          const px = queue[head++];
          const py = queue[head++];
          const idx = (py * width + px) * 4;
          data[idx + 3] = 0;

          const neighbors = [
            px + 1, py,
            px - 1, py,
            px, py + 1,
            px, py - 1,
          ];

          for (let i = 0; i < 8; i += 2) {
            const nx = neighbors[i];
            const ny = neighbors[i + 1];

            if (nx >= bx && nx < bx + bw && ny >= by && ny < by + bh) {
              const pIdx = ny * width + nx;
              if (!visited[pIdx]) {
                visited[pIdx] = 1;
                const nDataIdx = pIdx * 4;
                if (data[nDataIdx + 3] > 0) {
                  const dr = data[nDataIdx] - sr;
                  const dg = data[nDataIdx + 1] - sg;
                  const db = data[nDataIdx + 2] - sb;
                  const dist = Math.sqrt(dr * dr + dg * dg + db * db);
                  if (dist <= threshold) {
                    queue[tail++] = nx;
                    queue[tail++] = ny;
                  }
                }
              }
            }
          }
        }
      } else {
        for (let y = by; y < by + bh; y++) {
          for (let x = bx; x < bx + bw; x++) {
            const idx = (y * width + x) * 4;
            if (data[idx + 3] > 0) {
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              if ((r > 195 && g > 195 && b > 195) || (g > 150 && r < 140 && b < 140)) {
                data[idx + 3] = 0;
              }
            }
          }
        }
      }
    });

    ctx.putImageData(imgData, 0, 0);
    const finalData = canvas.toDataURL("image/png");
    setActiveCanvasData(finalData);
    setActionStatus(`✨ Scan otomatis selesai! Berhasil melubangi area ${boxes.length} kotak foto.`);
  };

  // Erase color globally (White or Green)
  const handleEraseColor = (colorHex: string, label: string) => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    const canvas = workingCanvasRef.current;
    setHistoryStack((prev) => [...prev.slice(-14), activeCanvasData]);
    setRedoStack([]);

    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const target = hexToRgb(colorHex);
    const maxDist = 441.67;
    const threshold = (chromaTolerance / 100) * maxDist;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const dr = data[i] - target.r;
        const dg = data[i + 1] - target.g;
        const db = data[i + 2] - target.b;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);

        if (dist <= threshold) {
          data[i + 3] = 0;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const finalData = canvas.toDataURL("image/png");
    setActiveCanvasData(finalData);
    setActionStatus(`✓ Warna ${label} berhasil dilubangi!`);
  };

  // Flood fill erase from clicked point
  const handleWandClick = (canvasX: number, canvasY: number) => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    const canvas = workingCanvasRef.current;
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const startIndex = (canvasY * width + canvasX) * 4;
    const targetR = data[startIndex];
    const targetG = data[startIndex + 1];
    const targetB = data[startIndex + 2];
    const targetA = data[startIndex + 3];

    if (targetA === 0) return;

    setHistoryStack((prev) => [...prev.slice(-14), activeCanvasData]);
    setRedoStack([]);

    const maxDist = 441.67;
    const threshold = (chromaTolerance / 100) * maxDist;

    const visited = new Uint8Array(width * height);
    const queue = new Int32Array(width * height * 2);
    let head = 0;
    let tail = 0;

    queue[tail++] = canvasX;
    queue[tail++] = canvasY;
    visited[canvasY * width + canvasX] = 1;

    while (head < tail) {
      const x = queue[head++];
      const y = queue[head++];
      const idx = (y * width + x) * 4;
      data[idx + 3] = 0;

      const neighbors = [
        x + 1, y,
        x - 1, y,
        x, y + 1,
        x, y - 1,
      ];

      for (let i = 0; i < 8; i += 2) {
        const nx = neighbors[i];
        const ny = neighbors[i + 1];

        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const pIdx = ny * width + nx;
          if (!visited[pIdx]) {
            visited[pIdx] = 1;
            const nDataIdx = pIdx * 4;
            if (data[nDataIdx + 3] > 0) {
              const dr = data[nDataIdx] - targetR;
              const dg = data[nDataIdx + 1] - targetG;
              const db = data[nDataIdx + 2] - targetB;
              const dist = Math.sqrt(dr * dr + dg * dg + db * db);

              if (dist <= threshold) {
                queue[tail++] = nx;
                queue[tail++] = ny;
              }
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const finalData = canvas.toDataURL("image/png");
    setActiveCanvasData(finalData);
    setActionStatus("✓ Area kotak yang diklik berhasil dilubangi!");
  };

  // Restore brush at point
  const handleRestoreBrush = (canvasX: number, canvasY: number) => {
    if (!workingCanvasRef.current || !originalImageRef.current || !previewContainerRef.current) return;
    const canvas = workingCanvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const rect = previewContainerRef.current.getBoundingClientRect();
    const scale = rect.width > 0 ? canvas.width / rect.width : 1;
    const radius = Math.max(3, (brushSize / 2) * scale);

    ctx.save();
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(originalImageRef.current, 0, 0);
    ctx.restore();

    setActiveCanvasData(canvas.toDataURL("image/png"));
    setActionStatus("Memulihkan area gambar dengan kuas...");
  };

  const handleCanvasInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    const canvas = workingCanvasRef.current;
    const naturalX = Math.floor(xRatio * canvas.width);
    const naturalY = Math.floor(yRatio * canvas.height);

    if (toolMode === "wand") {
      handleWandClick(naturalX, naturalY);
    } else if (toolMode === "restore") {
      handleRestoreBrush(naturalX, naturalY);
    }
  };

  const handleSave = () => {
    if (!activeCanvasData) {
      setActionStatus("⚠️ Silakan muat file bingkai terlebih dahulu!");
      return;
    }
    soundFx.playChime();
    onSaveFrame({
      slotIndex: initialSlotIndex,
      name: name || `Desain ${initialSlotIndex + 1}`,
      layoutId,
      imagePngDataUrl: activeCanvasData,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-stone-900 rounded-2xl max-w-5xl w-full border border-amber-400/40 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-amber-400/20 flex items-center justify-between shrink-0 bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <Wand2 size={18} />
            </div>
            <div>
              <h3 className="text-base font-serif text-gold-gradient font-bold leading-tight">
                Studio Unggah & Konfigurasi Bingkai (Desain {initialSlotIndex + 1})
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Upload bingkai (PNG/JPG). Hapus kotak foto atau warna latar dengan 1 klik agar foto tamu pas di lubang bingkai.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2-Column Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-amber-400/15">
          {/* LEFT: Controls & Tools */}
          <div className="lg:col-span-6 p-5 space-y-4 overflow-y-auto">
            {/* Name Input */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-amber-200">Nama Desain Bingkai</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Gold Floral Wedding (3 Foto)"
                className="w-full px-3 py-2 bg-stone-950 border border-amber-400/30 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Layout Select */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-amber-200">Format Layout Foto</label>
              <select
                value={layoutId}
                onChange={(e) => setLayoutId(e.target.value as LayoutId)}
                className="w-full px-3 py-2 bg-stone-950 border border-amber-400/30 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {LAYOUTS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.totalPhotos} Foto)
                  </option>
                ))}
              </select>
            </div>

            {/* File Upload Box */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-amber-200">
                  File Frame (PNG, JPG, WEBP)
                </label>
                {imageMeta && (
                  <span className="text-[10px] text-amber-300/80 font-mono">
                    {imageMeta.width} × {imageMeta.height} px
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all ${
                  activeCanvasData
                    ? "border-amber-400/60 bg-amber-950/20 hover:bg-amber-950/30"
                    : "border-stone-700 hover:border-amber-400/50 bg-stone-950/50 hover:bg-stone-900"
                }`}
              >
                {activeCanvasData ? (
                  <div className="flex items-center justify-center gap-3">
                    <img
                      src={activeCanvasData}
                      alt="Thumbnail"
                      className="w-12 h-12 object-contain rounded border border-amber-400/40 bg-[repeating-conic-gradient(#333_0_25%,#111_0_50%)] bg-[length:6px_6px]"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold text-amber-200 block">Gambar Berhasil Dimuat</span>
                      <span className="text-[11px] text-amber-400 hover:underline">Klik untuk ganti file</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 space-y-1">
                    <Plus className="w-5 h-5 text-amber-400/70 mx-auto" />
                    <span className="text-xs font-semibold text-stone-200 block">
                      Pilih Gambar Frame (PNG / JPG / WEBP)
                    </span>
                    <span className="text-[10px] text-stone-400 block">
                      Bisa berupa gambar transparan atau gambar dengan kotak putih / latar hijau
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Editing Tools Card */}
            <div className="p-3.5 rounded-xl border border-amber-400/25 bg-stone-950/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-amber-300" />
                  <span className="text-xs font-bold text-amber-100">Alat Hapus & Pulihkan Background</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={historyStack.length === 0}
                    className="px-2 py-1 bg-stone-900 border border-amber-400/30 rounded-lg text-[10px] text-stone-200 hover:bg-stone-800 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                    title="Undo"
                  >
                    <Undo size={11} /> <span>Undo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    className="px-2 py-1 bg-stone-900 border border-amber-400/30 rounded-lg text-[10px] text-stone-200 hover:bg-stone-800 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                    title="Redo"
                  >
                    <Redo size={11} /> <span>Redo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetOriginal}
                    disabled={!rawBase64Img || historyStack.length === 0}
                    className="px-2 py-1 bg-stone-900 border border-amber-400/30 rounded-lg text-[10px] text-stone-200 hover:bg-stone-800 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                    title="Reset ke Gambar Awal"
                  >
                    <RotateCcw size={11} /> <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Big Auto-Scan Button */}
              <button
                type="button"
                onClick={handleAutoScanErase}
                disabled={!activeCanvasData}
                className="w-full py-2.5 px-3 btn-gold rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-40 active:scale-[0.99]"
              >
                <Sparkles size={14} className="animate-spin text-amber-200" />
                <span>✨ Scan Otomatis & Hapus Background Kotak Foto</span>
              </button>

              {/* Tool Mode Buttons */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setToolMode("wand")}
                  disabled={!activeCanvasData}
                  className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                    toolMode === "wand"
                      ? "bg-amber-400 text-stone-950 border-amber-400 font-bold shadow-md"
                      : "bg-stone-900 text-stone-300 border-amber-400/20 hover:bg-stone-800"
                  }`}
                >
                  <Wand2 size={14} />
                  <span className="text-[10px]">Magic Wand</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEraseColor("#FFFFFF", "Putih")}
                  disabled={!activeCanvasData}
                  className="p-2 rounded-xl flex flex-col items-center justify-center gap-1 border border-amber-400/20 bg-stone-900 text-stone-300 hover:bg-stone-800 transition-all cursor-pointer"
                >
                  <div className="w-3.5 h-3.5 rounded bg-white border border-stone-400" />
                  <span className="text-[10px]">Hapus Putih</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleEraseColor("#00FF00", "Hijau")}
                  disabled={!activeCanvasData}
                  className="p-2 rounded-xl flex flex-col items-center justify-center gap-1 border border-amber-400/20 bg-stone-900 text-stone-300 hover:bg-stone-800 transition-all cursor-pointer"
                >
                  <div className="w-3.5 h-3.5 rounded bg-emerald-500" />
                  <span className="text-[10px]">Hapus Hijau</span>
                </button>

                <button
                  type="button"
                  onClick={() => setToolMode("restore")}
                  disabled={!activeCanvasData}
                  className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                    toolMode === "restore"
                      ? "bg-amber-400 text-stone-950 border-amber-400 font-bold shadow-md"
                      : "bg-stone-900 text-stone-300 border-amber-400/20 hover:bg-stone-800"
                  }`}
                >
                  <Paintbrush size={14} />
                  <span className="text-[10px]">Kuas Pulih</span>
                </button>
              </div>

              {/* Tolerance Slider */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px] text-stone-300">
                  <span>Toleransi Warna Hapus:</span>
                  <span className="font-mono text-amber-300 font-bold">{chromaTolerance}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={70}
                  value={chromaTolerance}
                  onChange={(e) => setChromaTolerance(parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Status Alert Bar */}
              {actionStatus && (
                <div className="p-2 rounded-lg bg-amber-400/10 border border-amber-400/30 text-[11px] text-amber-200">
                  {actionStatus}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Live Interactive Preview */}
          <div className="lg:col-span-6 p-5 flex flex-col justify-between bg-stone-950/40 min-h-0">
            {/* View Switcher Tabs */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-amber-200">Pratinjau Hasil Lubang Frame</span>
              <div className="flex items-center gap-1 bg-stone-900 border border-amber-400/20 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewTab("checkerboard")}
                  className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all cursor-pointer ${
                    previewTab === "checkerboard"
                      ? "bg-amber-400 text-stone-950 font-bold"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  Papan Catur (Transparan)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("photos")}
                  className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all cursor-pointer ${
                    previewTab === "photos"
                      ? "bg-amber-400 text-stone-950 font-bold"
                      : "text-stone-400 hover:text-white"
                  }`}
                >
                  Contoh Foto Tamu
                </button>
              </div>
            </div>

            {/* Canvas / Image Display Container */}
            <div
              ref={previewContainerRef}
              onClick={handleCanvasInteraction}
              className={`flex-1 min-h-[320px] max-h-[460px] rounded-xl border border-amber-400/30 relative flex items-center justify-center overflow-hidden p-2 select-none ${
                toolMode === "wand"
                  ? "cursor-crosshair"
                  : toolMode === "restore"
                  ? "cursor-pointer"
                  : "cursor-default"
              } ${
                previewTab === "checkerboard"
                  ? "bg-[repeating-conic-gradient(#262626_0_25%,#171717_0_50%)] bg-[length:14px_14px]"
                  : "bg-stone-950"
              }`}
            >
              {/* Simulated Photos Underneath if previewTab === 'photos' */}
              {previewTab === "photos" && (
                <div className="absolute inset-2 flex flex-col gap-2 p-4 items-center justify-center opacity-80 pointer-events-none">
                  {getDefaultBoxesForLayout(layoutId).map((box, bIdx) => (
                    <div
                      key={box.id}
                      className="absolute rounded bg-gradient-to-tr from-amber-900/50 to-amber-700/40 border border-amber-400/30 flex items-center justify-center shadow-inner"
                      style={{
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.w}%`,
                        height: `${box.h}%`,
                      }}
                    >
                      <span className="text-[10px] text-amber-200 font-serif font-bold">
                        Foto Tamu #{bIdx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Current Frame Layer */}
              {activeCanvasData ? (
                <img
                  src={activeCanvasData}
                  alt="Frame Layer"
                  className="max-w-full max-h-full object-contain relative z-10 drop-shadow-xl"
                />
              ) : (
                <div className="text-center p-6 text-stone-500">
                  <Upload size={32} className="mx-auto mb-2 opacity-50" />
                  <span className="text-xs block">Belum ada berkas frame</span>
                  <span className="text-[10px] block mt-1">
                    Upload file frame di sebelah kiri untuk mulai mengedit
                  </span>
                </div>
              )}
            </div>

            <p className="text-[10px] text-stone-400 text-center mt-2">
              💡 <em>Tips: Klik langsung di atas area kotak foto pada gambar untuk melubangi dengan Magic Wand.</em>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-amber-400/20 flex items-center justify-between shrink-0 bg-stone-950/80">
          <button
            onClick={onClose}
            className="btn-gold-outline px-5 py-2 rounded-xl text-xs cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={!activeCanvasData}
            className="btn-gold px-7 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-40"
          >
            <Check size={16} />
            <span>Terapkan Bingkai ke Desain {initialSlotIndex + 1}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
