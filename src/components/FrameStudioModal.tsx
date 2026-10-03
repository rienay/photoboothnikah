import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Wand2,
  Sparkles,
  RotateCcw,
  Undo,
  Redo,
  Paintbrush,
  Eraser,
  Camera,
  Plus,
  Trash2,
  Square,
  CheckCircle2,
  Image as ImageIcon,
  Check,
  Maximize2,
  Sliders,
} from "lucide-react";
import { LayoutId, PhotoBox } from "../types";
import {
  getDefaultBoxesForLayout,
  HOLE_PRESETS_MAP,
  punchBoxesOnCanvas,
} from "../lib/frameLayouts";

interface FrameStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSlotIndex?: number;
  initialId?: string;
  initialName?: string;
  initialLayoutId?: LayoutId;
  initialImage?: string;
  initialPreset?: string;
  initialPhotoBoxes?: PhotoBox[];
  onSaveFrame: (result: {
    id?: string;
    slotIndex?: number;
    name: string;
    layoutId: LayoutId;
    imagePngDataUrl: string;
    presetId: string;
    photoBoxes: PhotoBox[];
  }) => void;
}

const LAYOUT_OPTIONS: { id: LayoutId; label: string; desc: string }[] = [
  { id: "3x1", label: "Strip Vertikal 3 Foto (3x1)", desc: "Format strip klasik 5×15 cm" },
  { id: "2x2", label: "Grid 4 Foto (2x2)", desc: "Format 4 foto persegi / 4R" },
  { id: "3x2", label: "Grid 6 Foto (3x2)", desc: "6 foto 2 kolom 4R" },
  { id: "2x1", label: "Strip Pendek 2 Foto (2x1)", desc: "2 foto format strip 5×15 cm" },
  { id: "1x1", label: "Foto Tunggal Polaroid (1x1)", desc: "1 foto besar elegan 4R" },
  { id: "4x2", label: "Grid 8 Foto (4x2)", desc: "8 foto lengkap 4R" },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export const FrameStudioModal: React.FC<FrameStudioModalProps> = ({
  isOpen,
  onClose,
  initialSlotIndex,
  initialId,
  initialName,
  initialLayoutId,
  initialImage,
  initialPreset,
  initialPhotoBoxes,
  onSaveFrame,
}) => {
  const [newName, setNewName] = useState(initialName || "");
  const [newLayout, setNewLayout] = useState<LayoutId>(initialLayoutId || "3x1");
  const [newPreset, setNewPreset] = useState(initialPreset || "auto");
  const [uploadError, setUploadError] = useState("");
  const [rawBase64Img, setRawBase64Img] = useState(initialImage || "");
  const [activeCanvasData, setActiveCanvasData] = useState(initialImage || "");
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [chromaTolerance, setChromaTolerance] = useState(25);
  const [chromaColor, setChromaColor] = useState("#FFFFFF");
  const [toolMode, setToolMode] = useState<"wand" | "brush_erase" | "brush_restore">("wand");
  const [brushSize, setBrushSize] = useState(30);
  const [cornerRadius, setCornerRadius] = useState<number>(0);
  const [brushCursor, setBrushCursor] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [interactionMode, setInteractionMode] = useState<"erase" | "boxes">("erase");
  const [previewTab, setPreviewTab] = useState<"checkerboard" | "photos">("checkerboard");
  const [photoBoxes, setPhotoBoxes] = useState<PhotoBox[]>(
    initialPhotoBoxes && initialPhotoBoxes.length > 0
      ? initialPhotoBoxes
      : getDefaultBoxesForLayout(initialLayoutId || "3x1")
  );
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number } | null>(null);
  const [actionStatus, setActionStatus] = useState<string>("");
  const [isBrushPainting, setIsBrushPainting] = useState(false);

  // Dragging or resizing photo boxes
  const [dragState, setDragState] = useState<{
    type: "move" | "resize";
    boxId: string;
    handle?: "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    initBox: PhotoBox;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setNewName(initialName || "");
      const layout = initialLayoutId || "3x1";
      setNewLayout(layout);
      setNewPreset(initialPreset || "auto");
      setRawBase64Img(initialImage || "");
      setActiveCanvasData(initialImage || "");
      setHistoryStack([]);
      setRedoStack([]);
      setUploadError("");
      setActionStatus("");
      setCornerRadius(0);
      setPhotoBoxes(
        initialPhotoBoxes && initialPhotoBoxes.length > 0
          ? initialPhotoBoxes
          : getDefaultBoxesForLayout(layout)
      );
      setSelectedBoxId(null);
      setInteractionMode("erase");
      setToolMode("wand");

      if (initialImage) {
        const img = new Image();
        img.crossOrigin = "anonymous";
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
  }, [isOpen, initialName, initialLayoutId, initialImage, initialPreset, initialPhotoBoxes]);

  // Helper to push history
  const pushHistory = useCallback(() => {
    if (activeCanvasData) {
      setHistoryStack((prev) => [...prev.slice(-19), activeCanvasData]);
      setRedoStack([]);
    }
  }, [activeCanvasData]);

  // Layout change handler: updates default boxes and sets preset to auto
  const handleLayoutChange = (l: LayoutId) => {
    setNewLayout(l);
    setNewPreset("auto");
    const boxes = getDefaultBoxesForLayout(l);
    setPhotoBoxes(boxes);
    setSelectedBoxId(boxes[0]?.id || null);
    setActionStatus(`Tata letak diubah ke ${l.toUpperCase()}`);
  };

  // Preset hole change handler: applies actual coordinates immediately
  const handlePresetChange = (presetId: string) => {
    setNewPreset(presetId);
    const presets = HOLE_PRESETS_MAP[newLayout] || HOLE_PRESETS_MAP["3x1"];
    const found = presets.find((p) => p.id === presetId);
    if (found) {
      const boxes = found.getBoxes();
      setPhotoBoxes(boxes);
      setSelectedBoxId(boxes[0]?.id || null);
      setActionStatus(`Preset "${found.label}" diterapkan!`);
    }
  };

  // File change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Berkas harus berupa gambar (PNG, JPG, WEBP)!");
      return;
    }

    setUploadError("");
    setActionStatus("Sedang memproses gambar frame...");
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.crossOrigin = "anonymous";
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

          const defaultBoxes = getDefaultBoxesForLayout(newLayout);
          setPhotoBoxes(defaultBoxes);
          setSelectedBoxId(defaultBoxes[0]?.id || null);
          setActionStatus("✓ Gambar frame siap! Gunakan tombol 'Lubangi Kotak Foto' atau Magic Wand.");
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
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ctx = workingCanvasRef.current?.getContext("2d", { willReadFrequently: true });
      if (ctx && workingCanvasRef.current) {
        ctx.clearRect(0, 0, workingCanvasRef.current.width, workingCanvasRef.current.height);
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = prev;
    setActionStatus("Langkah dibatalkan (Undo).");
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !workingCanvasRef.current) return;
    const next = redoStack[0];
    setHistoryStack((h) => [...h, activeCanvasData]);
    setRedoStack((r) => r.slice(1));
    setActiveCanvasData(next);

    const img = new Image();
    img.crossOrigin = "anonymous";
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
    pushHistory();
    const canvas = workingCanvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImageRef.current, 0, 0);
      const data = canvas.toDataURL("image/png");
      setActiveCanvasData(data);
      setActionStatus("Gambar dipulihkan ke kondisi awal tanpa lubang.");
    }
  };

  // Convert client pointer event into image canvas coordinates
  const getCanvasCoords = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    if (!previewContainerRef.current || !workingCanvasRef.current) return null;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const canvas = workingCanvasRef.current;
    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(relX * canvas.width)));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(relY * canvas.height)));
    return { x, y, rectX: e.clientX - rect.left, rectY: e.clientY - rect.top };
  };

  // 1-Click Clean Punch on All Photo Boxes
  const handlePunchCleanBoxes = (radius: number = cornerRadius) => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    pushHistory();
    punchBoxesOnCanvas(workingCanvasRef.current, photoBoxes, radius);
    const resultData = workingCanvasRef.current.toDataURL("image/png");
    setActiveCanvasData(resultData);
    setActionStatus(`✓ ${photoBoxes.length} lubang foto berhasil dibuat 100% transparan!`);
  };

  // Punch Single Selected Box
  const handlePunchSelectedBox = () => {
    if (!workingCanvasRef.current || !activeCanvasData || !selectedBoxId) return;
    const box = photoBoxes.find((b) => b.id === selectedBoxId);
    if (!box) return;
    pushHistory();
    punchBoxesOnCanvas(workingCanvasRef.current, [box], cornerRadius);
    const resultData = workingCanvasRef.current.toDataURL("image/png");
    setActiveCanvasData(resultData);
    setActionStatus(`✓ Kotak terpilih berhasil dilubangi transparan!`);
  };

  // Auto-Scan & Erase Dominant Background inside Boxes
  const handleAutoScanErase = () => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    pushHistory();

    const canvas = workingCanvasRef.current;
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const targetBoxes = photoBoxes.length > 0 ? photoBoxes : getDefaultBoxesForLayout(newLayout);

    targetBoxes.forEach((box) => {
      const bx = Math.max(0, Math.min(width - 1, Math.round((box.x / 100) * width)));
      const by = Math.max(0, Math.min(height - 1, Math.round((box.y / 100) * height)));
      const bw = Math.max(1, Math.min(width - bx, Math.round((box.w / 100) * width)));
      const bh = Math.max(1, Math.min(height - by, Math.round((box.h / 100) * height)));

      // Sample center pixel of box
      const cx = Math.floor(bx + bw / 2);
      const cy = Math.floor(by + bh / 2);
      const centerIdx = (cy * width + cx) * 4;

      const sr = data[centerIdx];
      const sg = data[centerIdx + 1];
      const sb = data[centerIdx + 2];
      const sa = data[centerIdx + 3];

      const threshold = (chromaTolerance / 100) * 441.67;

      if (sa > 20) {
        // Flood fill from center within bounding box
        const visited = new Uint8Array(bw * bh);
        const queueX = new Int32Array(bw * bh);
        const queueY = new Int32Array(bw * bh);
        let head = 0;
        let tail = 0;

        queueX[tail] = cx;
        queueY[tail] = cy;
        tail++;
        visited[(cy - by) * bw + (cx - bx)] = 1;

        while (head < tail) {
          const px = queueX[head];
          const py = queueY[head];
          head++;

          const pIdx = (py * width + px) * 4;
          data[pIdx + 3] = 0;

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
              const localIdx = (ny - by) * bw + (nx - bx);
              if (!visited[localIdx]) {
                visited[localIdx] = 1;
                const nDataIdx = (ny * width + nx) * 4;
                if (data[nDataIdx + 3] > 0) {
                  const dr = data[nDataIdx] - sr;
                  const dg = data[nDataIdx + 1] - sg;
                  const db = data[nDataIdx + 2] - sb;
                  const dist = Math.sqrt(dr * dr + dg * dg + db * db);
                  if (dist <= threshold) {
                    queueX[tail] = nx;
                    queueY[tail] = ny;
                    tail++;
                  }
                }
              }
            }
          }
        }
      }

      // Ensure crisp interior cutout
      for (let y = by + 2; y < by + bh - 2; y++) {
        for (let x = bx + 2; x < bx + bw - 2; x++) {
          const idx = (y * width + x) * 4;
          if (data[idx + 3] > 0) {
            const dr = data[idx] - sr;
            const dg = data[idx + 1] - sg;
            const db = data[idx + 2] - sb;
            if (Math.sqrt(dr * dr + dg * dg + db * db) <= threshold * 1.3) {
              data[idx + 3] = 0;
            }
          }
        }
      }
    });

    ctx.putImageData(imgData, 0, 0);
    const finalData = canvas.toDataURL("image/png");
    setActiveCanvasData(finalData);
    setActionStatus(`✓ Scan otomatis selesai pada ${targetBoxes.length} kotak foto!`);
  };

  // Magic Wand Click: Accurate Flood Fill with 1px Edge Defringe
  const handleMagicWandClick = (startX: number, startY: number) => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    pushHistory();

    const canvas = workingCanvasRef.current;
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const startIndex = (startY * width + startX) * 4;
    const targetR = data[startIndex];
    const targetG = data[startIndex + 1];
    const targetB = data[startIndex + 2];
    const targetA = data[startIndex + 3];

    if (targetA === 0) {
      setActionStatus("Area ini sudah transparan.");
      return;
    }

    const threshold = (chromaTolerance / 100) * 441.67;

    const visited = new Uint8Array(width * height);
    const queueX = new Int32Array(width * height);
    const queueY = new Int32Array(width * height);
    let head = 0;
    let tail = 0;

    queueX[tail] = startX;
    queueY[tail] = startY;
    tail++;
    visited[startY * width + startX] = 1;

    while (head < tail) {
      const cx = queueX[head];
      const cy = queueY[head];
      head++;

      const idx = (cy * width + cx) * 4;
      data[idx + 3] = 0;

      const neighbors = [
        cx + 1, cy,
        cx - 1, cy,
        cx, cy + 1,
        cx, cy - 1,
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
                queueX[tail] = nx;
                queueY[tail] = ny;
                tail++;
              }
            }
          }
        }
      }
    }

    // Edge defringe: Dilate 1px into anti-aliased border
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const pIdx = y * width + x;
        if (visited[pIdx] === 1) {
          const nbrs = [pIdx + 1, pIdx - 1, pIdx + width, pIdx - width];
          for (const n of nbrs) {
            if (!visited[n] && data[n * 4 + 3] > 0) {
              const dr = data[n * 4] - targetR;
              const dg = data[n * 4 + 1] - targetG;
              const db = data[n * 4 + 2] - targetB;
              if (Math.sqrt(dr * dr + dg * dg + db * db) <= threshold * 1.2) {
                data[n * 4 + 3] = 0;
              }
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const finalData = canvas.toDataURL("image/png");
    setActiveCanvasData(finalData);
    setActionStatus("✓ Area yang diklik berhasil dilubangi!");
  };

  // Erase Chosen Hex Color Globally
  const handleEraseChosenColor = (hex: string) => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    pushHistory();

    const canvas = workingCanvasRef.current;
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const target = hexToRgb(hex);
    const threshold = (chromaTolerance / 100) * 441.67;

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

    // If erasing a green shade, automatically despill any remaining green edges into the floral bronze tone
    if (target.g > target.r * 1.15 && target.g > target.b * 1.15) {
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const avgRB = (r + b) / 2;
          if (g > avgRB + 15 && g > 45) {
            if (r < 110 && b < 100) {
              const lum = Math.min(1, Math.max(0.25, (r * 0.299 + g * 0.587 + b * 0.114) / 200));
              data[i] = Math.round(95 * lum + 20);
              data[i + 1] = Math.round(75 * lum + 15);
              data[i + 2] = Math.round(50 * lum + 10);
            } else {
              data[i + 1] = Math.round(avgRB);
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const finalData = canvas.toDataURL("image/png");
    setActiveCanvasData(finalData);
    setActionStatus(`✓ Warna ${hex} berhasil dilubangi transparan!`);
  };

  // 1-Click Despill: Neutralize green fringes/spill on leaves and line elements
  const handleDespillGreen = () => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    pushHistory();

    const canvas = workingCanvasRef.current;
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let modifiedCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const avgRB = (r + b) / 2;
      // Detect if pixel has green cast / spill
      if (g > avgRB + 12 && g > 40) {
        if (r < 115 && b < 105) {
          // Re-color green lines to matching warm bronze floral outline
          const lum = Math.min(1, Math.max(0.2, (r * 0.299 + g * 0.587 + b * 0.114) / 190));
          data[i] = Math.round(95 * lum + 20);     // Bronze red
          data[i + 1] = Math.round(75 * lum + 15); // Bronze green
          data[i + 2] = Math.round(50 * lum + 10); // Bronze blue
        } else {
          // Neutralize green cast
          data[i + 1] = Math.round(avgRB);
        }
        modifiedCount++;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const finalData = canvas.toDataURL("image/png");
    setActiveCanvasData(finalData);
    setActionStatus(
      modifiedCount > 0
        ? `✓ Berhasil! Warna hijau pada daun (${modifiedCount} piksel) telah diubah kembali ke warna cokelat bunga.`
        : "Tidak ditemukan sisa noda hijau pada bingkai."
    );
  };

  // Brush Erase & Restore Drawing Handlers
  const applyBrush = (canvasX: number, canvasY: number, mode: "erase" | "restore") => {
    const canvas = workingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const radius = Math.max(5, Math.round((brushSize / 100) * (canvas.width * 0.08)));

    if (mode === "erase") {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (mode === "restore" && originalImageRef.current) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(canvasX, canvasY, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(originalImageRef.current, 0, 0);
      ctx.restore();
    }
  };

  // Pointer Down on Preview Canvas
  const handlePreviewPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interactionMode === "boxes") return;

    const coords = getCanvasCoords(e);
    if (!coords) return;

    if (toolMode === "wand") {
      handleMagicWandClick(coords.x, coords.y);
    } else if (toolMode === "brush_erase" || toolMode === "brush_restore") {
      pushHistory();
      setIsBrushPainting(true);
      applyBrush(coords.x, coords.y, toolMode === "brush_erase" ? "erase" : "restore");
    }
  };

  // Pointer Move on Preview Canvas
  const handlePreviewPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (toolMode === "brush_erase" || toolMode === "brush_restore") {
      setBrushCursor({ x, y, visible: true });
    }

    if (isBrushPainting && (toolMode === "brush_erase" || toolMode === "brush_restore")) {
      const coords = getCanvasCoords(e);
      if (coords) {
        applyBrush(coords.x, coords.y, toolMode === "brush_erase" ? "erase" : "restore");
      }
    }

    // Box Drag / Resize
    if (dragState && interactionMode === "boxes") {
      const dxPercent = ((e.clientX - dragState.startX) / rect.width) * 100;
      const dyPercent = ((e.clientY - dragState.startY) / rect.height) * 100;

      setPhotoBoxes((boxes) =>
        boxes.map((b) => {
          if (b.id !== dragState.boxId) return b;
          if (dragState.type === "move") {
            const nextX = Math.max(0, Math.min(100 - b.w, dragState.initBox.x + dxPercent));
            const nextY = Math.max(0, Math.min(100 - b.h, dragState.initBox.y + dyPercent));
            return { ...b, x: Math.round(nextX * 10) / 10, y: Math.round(nextY * 10) / 10 };
          }
          if (dragState.type === "resize") {
            let nextW = dragState.initBox.w;
            let nextH = dragState.initBox.h;
            if (dragState.handle === "se") {
              nextW = Math.max(10, Math.min(100 - b.x, dragState.initBox.w + dxPercent));
              nextH = Math.max(10, Math.min(100 - b.y, dragState.initBox.h + dyPercent));
            } else if (dragState.handle === "sw") {
              nextW = Math.max(10, dragState.initBox.w - dxPercent);
              nextH = Math.max(10, dragState.initBox.h + dyPercent);
            } else if (dragState.handle === "ne") {
              nextW = Math.max(10, dragState.initBox.w + dxPercent);
              nextH = Math.max(10, dragState.initBox.h - dyPercent);
            } else if (dragState.handle === "nw") {
              nextW = Math.max(10, dragState.initBox.w - dxPercent);
              nextH = Math.max(10, dragState.initBox.h - dyPercent);
            }
            return { ...b, w: Math.round(nextW * 10) / 10, h: Math.round(nextH * 10) / 10 };
          }
          return b;
        })
      );
    }
  };

  const handlePreviewPointerUp = () => {
    if (isBrushPainting && workingCanvasRef.current) {
      setIsBrushPainting(false);
      const finalData = workingCanvasRef.current.toDataURL("image/png");
      setActiveCanvasData(finalData);
    }
    setDragState(null);
  };

  // Add box manually
  const handleAddBox = () => {
    const newId = `box_${photoBoxes.length + 1}`;
    const newBox: PhotoBox = {
      id: newId,
      x: 15,
      y: 15 + (photoBoxes.length % 4) * 12,
      w: 70,
      h: 22,
    };
    setPhotoBoxes([...photoBoxes, newBox]);
    setSelectedBoxId(newId);
    setInteractionMode("boxes");
    setActionStatus(`+ Kotak #${photoBoxes.length + 1} ditambahkan.`);
  };

  // Set Box Ratio
  const setBoxRatio = (ratio: "1:1" | "3:4" | "4:3" | "9:16" | "2:3") => {
    if (!selectedBoxId) return;
    setPhotoBoxes((boxes) =>
      boxes.map((b) => {
        if (b.id !== selectedBoxId) return b;
        let newH = b.h;
        if (ratio === "1:1") newH = b.w;
        else if (ratio === "3:4") newH = (b.w * 4) / 3;
        else if (ratio === "4:3") newH = (b.w * 3) / 4;
        else if (ratio === "9:16") newH = (b.w * 16) / 9;
        else if (ratio === "2:3") newH = (b.w * 3) / 2;
        return { ...b, h: Math.round(Math.min(95, newH) * 10) / 10 };
      })
    );
  };

  // Save Frame
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) {
      setUploadError("Nama bingkai wajib diisi!");
      return;
    }
    if (!activeCanvasData && !rawBase64Img) {
      setUploadError("Silakan upload gambar bingkai!");
      return;
    }

    // Automatically synchronize layoutId if photoBoxes length differs
    let finalLayoutId = newLayout;
    if (photoBoxes.length === 4 && newLayout === "3x1") finalLayoutId = "2x2";
    else if (photoBoxes.length === 6 && newLayout === "3x1") finalLayoutId = "3x2";
    else if (photoBoxes.length === 8 && newLayout === "3x1") finalLayoutId = "4x2";
    else if (photoBoxes.length === 2 && newLayout === "3x1") finalLayoutId = "2x1";
    else if (photoBoxes.length === 1 && newLayout === "3x1") finalLayoutId = "1x1";

    onSaveFrame({
      id: initialId,
      slotIndex: initialSlotIndex,
      name: newName,
      layoutId: finalLayoutId,
      imagePngDataUrl: activeCanvasData || rawBase64Img,
      presetId: newPreset,
      photoBoxes,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-md">
      <div className="bg-[#0e1117] rounded-2xl max-w-6xl w-full shadow-[0_25px_80px_rgba(0,0,0,0.95)] border-2 border-amber-400/40 overflow-hidden flex flex-col max-h-[96vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-3.5 border-b border-amber-400/20 flex items-center justify-between shrink-0 bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-medium text-gold-gradient">
                Studio Konfigurasi & Lubang Bingkai
              </h3>
              <p className="text-xs text-stone-400">
                Atur tata letak foto, hapus latar / lubangi bingkai 100% transparan agar foto tamu pas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Tutup Studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-amber-400/15">
          {/* ================= LEFT COLUMN: Settings & Tools ================= */}
          <div className="lg:col-span-6 p-4 sm:p-5 space-y-4 overflow-y-auto">
            <form onSubmit={handleSave} id="frame-upload-form" className="space-y-4">
              {/* Name Input */}
              <div>
                <label className="block text-xs font-medium text-amber-200 mb-1">
                  Nama Template Bingkai
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Strip Floral Romance Gold (3x1)"
                  className="w-full px-3.5 py-2 bg-stone-900/90 border border-amber-400/30 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {/* Layout & Preset Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-amber-200 mb-1">
                    Tata Letak (Layout)
                  </label>
                  <select
                    value={newLayout}
                    onChange={(e) => handleLayoutChange(e.target.value as LayoutId)}
                    className="w-full px-3 py-2 bg-stone-900 border border-amber-400/30 rounded-xl text-xs text-amber-100 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {LAYOUT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-stone-900 text-white">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-amber-200 mb-1">
                    Preset Lubang Foto
                  </label>
                  <select
                    value={newPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-amber-400/30 rounded-xl text-xs text-amber-100 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {(HOLE_PRESETS_MAP[newLayout] || HOLE_PRESETS_MAP["3x1"]).map((p) => (
                      <option key={p.id} value={p.id} className="bg-stone-900 text-white">
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File Upload Box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-amber-200">
                    Berkas Frame (PNG / JPG / WEBP)
                  </label>
                  {imageMeta && (
                    <span className="text-[10px] text-stone-400 font-mono">
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
                      ? "border-amber-400/60 bg-amber-400/10 hover:bg-amber-400/15"
                      : "border-stone-700 hover:border-amber-400/60 bg-stone-900/60 hover:bg-stone-900"
                  }`}
                >
                  {activeCanvasData ? (
                    <div className="flex items-center justify-center gap-3">
                      <img
                        src={activeCanvasData}
                        alt="Thumbnail"
                        className="w-10 h-10 object-contain rounded border border-amber-400/30 bg-stone-950"
                      />
                      <div className="text-left">
                        <span className="text-xs font-semibold text-amber-200 block">
                          Gambar Frame Berhasil Dimuat
                        </span>
                        <span className="text-[11px] text-amber-400/80 hover:underline">
                          Klik untuk ganti gambar lain
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 space-y-1">
                      <Plus className="w-5 h-5 text-amber-400/60 mx-auto" />
                      <span className="text-xs font-semibold text-stone-200 block">
                        Pilih Gambar Frame (PNG / JPG / WEBP)
                      </span>
                      <span className="text-[10px] text-stone-400 block">
                        Template dari Canva / Photoshop dengan background putih atau transparan
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ================= 1. ALAT PELUBANG & PENGHAPUS BACKGROUND ================= */}
              <div className="p-3.5 rounded-xl border border-amber-400/25 bg-stone-900/70 space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-400 text-stone-950 flex items-center justify-center font-bold">
                      <Wand2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-100 block leading-tight">
                        Alat Pelubang & Hapus Background
                      </span>
                      <span className="text-[10px] text-stone-400">
                        Buat lubang transparan untuk foto pengunjung
                      </span>
                    </div>
                  </div>

                  {/* History Undo / Redo / Reset */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={historyStack.length === 0}
                      className="px-2 py-1 bg-stone-800 border border-white/10 rounded-lg text-xs font-semibold text-stone-300 hover:text-white disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                      title="Undo"
                    >
                      <Undo className="w-3 h-3" />
                      <span>Undo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={redoStack.length === 0}
                      className="px-2 py-1 bg-stone-800 border border-white/10 rounded-lg text-xs font-semibold text-stone-300 hover:text-white disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                      title="Redo"
                    >
                      <Redo className="w-3 h-3" />
                      <span>Redo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetOriginal}
                      disabled={!rawBase64Img || historyStack.length === 0}
                      className="px-2 py-1 bg-stone-800 border border-white/10 rounded-lg text-xs font-semibold text-stone-300 hover:text-white disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                      title="Pulihkan seluruh gambar ke kondisi awal"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Primary Button: 1-Click Clean Punch */}
                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handlePunchCleanBoxes(cornerRadius)}
                    disabled={!activeCanvasData}
                    className="w-full btn-gold py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                    title="Potong dan bersihkan area kotak foto 100% transparan"
                  >
                    <Sparkles className="w-4 h-4 text-stone-900 shrink-0" />
                    <span>⚡ Lubangi Semua Kotak Foto Langsung (100% Bersih)</span>
                  </button>

                  {/* Corner radius options for holes */}
                  <div className="flex items-center justify-between text-[11px] px-1 text-stone-400">
                    <span>Bentuk Sudut Lubang:</span>
                    <div className="flex items-center gap-1">
                      {[
                        { r: 0, label: "Siku (0px)" },
                        { r: 8, label: "Lengkung (8px)" },
                        { r: 14, label: "Elegan (14px)" },
                        { r: 22, label: "Bulat (22px)" },
                      ].map((c) => (
                        <button
                          key={c.r}
                          type="button"
                          onClick={() => {
                            setCornerRadius(c.r);
                            handlePunchCleanBoxes(c.r);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                            cornerRadius === c.r
                              ? "bg-amber-400 text-stone-950 font-bold"
                              : "bg-stone-800 text-stone-300 hover:bg-stone-700"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Secondary Erase Tools Grid */}
                <div className="grid grid-cols-4 gap-2 pt-1 border-t border-amber-400/15">
                  {/* Magic Wand */}
                  <button
                    type="button"
                    onClick={() => {
                      setToolMode("wand");
                      setInteractionMode("erase");
                      setPreviewTab("checkerboard");
                    }}
                    disabled={!activeCanvasData}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                      toolMode === "wand" && interactionMode === "erase"
                        ? "bg-amber-400 text-stone-950 border-amber-300 shadow-md font-bold"
                        : "bg-stone-800/80 text-stone-300 border-white/10 hover:bg-stone-800"
                    }`}
                  >
                    <Wand2 className="w-4 h-4" />
                    <span className="text-[11px] leading-tight text-center">Magic Wand</span>
                    <span className="text-[9px] opacity-75">Hapus Klik</span>
                  </button>

                  {/* Eraser Brush */}
                  <button
                    type="button"
                    onClick={() => {
                      setToolMode("brush_erase");
                      setInteractionMode("erase");
                      setPreviewTab("checkerboard");
                    }}
                    disabled={!activeCanvasData}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                      toolMode === "brush_erase" && interactionMode === "erase"
                        ? "bg-amber-400 text-stone-950 border-amber-300 shadow-md font-bold"
                        : "bg-stone-800/80 text-stone-300 border-white/10 hover:bg-stone-800"
                    }`}
                  >
                    <Eraser className="w-4 h-4" />
                    <span className="text-[11px] leading-tight text-center">Kuas Hapus</span>
                    <span className="text-[9px] opacity-75">Usap Hapus</span>
                  </button>

                  {/* Restore Brush */}
                  <button
                    type="button"
                    onClick={() => {
                      setToolMode("brush_restore");
                      setInteractionMode("erase");
                      setPreviewTab("checkerboard");
                    }}
                    disabled={!activeCanvasData}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                      toolMode === "brush_restore" && interactionMode === "erase"
                        ? "bg-amber-400 text-stone-950 border-amber-300 shadow-md font-bold"
                        : "bg-stone-800/80 text-stone-300 border-white/10 hover:bg-stone-800"
                    }`}
                  >
                    <Paintbrush className="w-4 h-4" />
                    <span className="text-[11px] leading-tight text-center">Pulihkan</span>
                    <span className="text-[9px] opacity-75">Kuas Asli</span>
                  </button>

                  {/* 1-Click Erase White */}
                  <button
                    type="button"
                    onClick={() => handleEraseChosenColor("#FFFFFF")}
                    disabled={!activeCanvasData}
                    className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-800 border border-white/10 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <div className="w-3.5 h-3.5 rounded-full border border-stone-400 bg-white" />
                    <span className="text-[11px] font-semibold text-stone-200 leading-tight">Hapus Putih</span>
                    <span className="text-[9px] text-stone-400">1-Klik Semua</span>
                  </button>
                </div>

                {/* Tolerance & Custom Color Picker */}
                <div className="pt-2 border-t border-amber-400/15 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-300">Toleransi Kepekaan Warna:</span>
                    <span className="font-mono font-bold text-amber-300">{chromaTolerance}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="75"
                    value={chromaTolerance}
                    onChange={(e) => setChromaTolerance(Number(e.target.value))}
                    className="w-full accent-amber-400 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                  />

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-stone-400">Hapus Warna:</span>
                      <input
                        type="color"
                        value={chromaColor}
                        onChange={(e) => setChromaColor(e.target.value)}
                        className="w-6 h-6 rounded border border-amber-400/30 cursor-pointer bg-stone-900 p-0.5"
                        title="Pilih warna kustom"
                      />
                      <span className="text-[10px] font-mono text-amber-200">{chromaColor}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleEraseChosenColor(chromaColor)}
                      disabled={!activeCanvasData}
                      className="btn-gold-outline px-3 py-1 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Hapus Warna Ini
                    </button>
                  </div>

                  {/* Despill Green Spill / Neutralize Leaves */}
                  <div className="pt-2 border-t border-amber-400/10">
                    <button
                      type="button"
                      onClick={handleDespillGreen}
                      disabled={!activeCanvasData}
                      className="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 shadow-sm"
                      title="Netralkan sisa warna hijau pada daun/garis agar kembali berwarna cokelat emas alami seperti bunga di atasnya"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>🌿 Netralkan Warna Hijau Daun (Ubah ke Cokelat Emas)</span>
                    </button>
                  </div>
                </div>

                {actionStatus && (
                  <div className="p-2 rounded-lg bg-amber-400/15 border border-amber-400/30 text-[11px] text-amber-200 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{actionStatus}</span>
                  </div>
                )}
              </div>

              {/* ================= 2. PENANDA POSISI FOTO ================= */}
              <div className="p-3.5 rounded-xl border border-amber-400/25 bg-stone-900/70 space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-400 text-stone-950 flex items-center justify-center font-bold">
                      <Square className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-100 block leading-tight">
                        Penanda Posisi Foto ({photoBoxes.length} Kotak)
                      </span>
                      <span className="text-[10px] text-stone-400">
                        Atur letak dan rasio foto pengunjung pada bingkai
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const boxes = getDefaultBoxesForLayout(newLayout);
                        setPhotoBoxes(boxes);
                        setSelectedBoxId(boxes[0]?.id || null);
                        setActionStatus("Posisi kotak direset ke standar layout!");
                      }}
                      className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-amber-200 border border-white/10 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Posisi</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddBox}
                      className="px-2.5 py-1 btn-gold rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Kotak</span>
                    </button>
                  </div>
                </div>

                {/* Mode Atur Tata Letak Otomatis (Grid & Preset Presets) */}
                <div className="p-3 rounded-xl bg-stone-950/80 border border-amber-400/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mode Atur Tata Letak Otomatis:</span>
                    </div>
                    <span className="text-[10px] text-stone-400">Pilih format agar kotak rapi otomatis</span>
                  </div>

                  {/* 1-Click Layout Grid Presets */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "2x2", label: "4 Foto (Grid 2×2)", count: 4 },
                      { id: "3x1", label: "3 Foto (Strip 3×1)", count: 3 },
                      { id: "2x1", label: "2 Foto (Strip 2×1)", count: 2 },
                      { id: "3x2", label: "6 Foto (Grid 3×2)", count: 6 },
                      { id: "4x2", label: "8 Foto (Grid 4×2)", count: 8 },
                      { id: "1x1", label: "1 Foto (Polaroid 1×1)", count: 1 },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleLayoutChange(item.id as LayoutId);
                          setActionStatus(`✓ Tata letak otomatis diatur ke ${item.label}!`);
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all border cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          newLayout === item.id && photoBoxes.length === item.count
                            ? "bg-amber-400 text-stone-950 border-amber-300 font-bold shadow-md scale-[1.02]"
                            : "bg-stone-900/90 text-stone-300 border-white/10 hover:border-amber-400/50 hover:bg-stone-800"
                        }`}
                      >
                        <span className="truncate w-full text-center leading-tight">{item.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Dropdown Variasi Lubang Preset */}
                  <div className="flex items-center gap-2 pt-1 border-t border-amber-400/10">
                    <span className="text-[11px] text-stone-400 whitespace-nowrap">Variasi Lubang:</span>
                    <select
                      value={newPreset}
                      onChange={(e) => handlePresetChange(e.target.value)}
                      className="flex-1 px-2.5 py-1 bg-stone-900 border border-amber-400/30 rounded-lg text-xs text-amber-100 focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      {(HOLE_PRESETS_MAP[newLayout] || HOLE_PRESETS_MAP["3x1"]).map((p) => (
                        <option key={p.id} value={p.id} className="bg-stone-900 text-white">
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Box Selector Pills */}
                {photoBoxes.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {photoBoxes.map((box, idx) => {
                        const isSelected = (selectedBoxId || photoBoxes[0]?.id) === box.id;
                        return (
                          <button
                            key={box.id}
                            type="button"
                            onClick={() => {
                              setSelectedBoxId(box.id);
                              setInteractionMode("boxes");
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? "bg-amber-400 text-stone-950 font-bold shadow-md"
                                : "bg-stone-800 text-stone-300 hover:bg-stone-700 border border-white/10"
                            }`}
                          >
                            <span>Kotak #{idx + 1}</span>
                            <span className="text-[10px] opacity-75 font-mono">
                              ({Math.round(box.w)}% × {Math.round(box.h)}%)
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Box Controls */}
                    {selectedBoxId && (
                      <div className="p-3 bg-stone-950/70 rounded-xl border border-amber-400/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-amber-200">
                            Ubah Rasio Kotak Terpilih:
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoBoxes((boxes) => boxes.filter((b) => b.id !== selectedBoxId));
                              setSelectedBoxId(null);
                            }}
                            className="text-rose-400 hover:text-rose-300 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Kotak Ini</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-5 gap-1.5">
                          {(["1:1", "3:4", "4:3", "9:16", "2:3"] as const).map((ratio) => (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() => setBoxRatio(ratio)}
                              className="px-2 py-1 bg-stone-800 hover:bg-amber-400/20 hover:text-amber-200 border border-white/10 hover:border-amber-400/40 rounded-lg text-[11px] font-mono font-semibold text-stone-300 transition-all text-center cursor-pointer"
                            >
                              {ratio}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handlePunchSelectedBox}
                          className="w-full py-1.5 px-3 btn-gold-outline text-amber-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-1"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Lubangi Kotak Ini Saja</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-stone-950/40 rounded-xl text-center text-xs text-stone-500">
                    Belum ada kotak foto. Klik "+ Kotak" untuk menambahkan.
                  </div>
                )}
              </div>

              {uploadError && (
                <p className="text-xs text-rose-400 font-medium bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/40">
                  {uploadError}
                </p>
              )}
            </form>
          </div>

          {/* ================= RIGHT COLUMN: Interactive Live Preview ================= */}
          <div className="lg:col-span-6 p-4 sm:p-5 bg-stone-950/60 flex flex-col gap-2.5 justify-start">
            {/* Top Toolbar: Mode Switcher & Photo Simulation */}
            <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
              <div className="flex items-center bg-stone-900 border border-amber-400/20 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setInteractionMode("erase");
                    setPreviewTab("checkerboard");
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    interactionMode === "erase" && previewTab === "checkerboard"
                      ? "bg-amber-400 text-stone-950 font-bold shadow-md"
                      : "text-stone-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Mode Hapus / Lubangi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInteractionMode("boxes");
                    setPreviewTab("checkerboard");
                  }}
                  className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    interactionMode === "boxes" && previewTab === "checkerboard"
                      ? "bg-amber-400 text-stone-950 font-bold shadow-md"
                      : "text-stone-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Atur Letak Foto ({photoBoxes.length})</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTab(previewTab === "photos" ? "checkerboard" : "photos")}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  previewTab === "photos"
                    ? "bg-amber-400 text-stone-950 border-amber-300 font-bold shadow-md"
                    : "bg-stone-900 text-stone-300 border-amber-400/20 hover:bg-stone-800 hover:text-white"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Simulasi Foto</span>
              </button>
            </div>

            {/* Canvas Outer Container */}
            <div className="w-full flex justify-center py-1 shrink-0">
              <div
                ref={previewContainerRef}
                onPointerDown={handlePreviewPointerDown}
                onPointerMove={handlePreviewPointerMove}
                onPointerUp={handlePreviewPointerUp}
                style={{
                  aspectRatio: imageMeta ? `${imageMeta.width} / ${imageMeta.height}` : (newLayout === "3x1" || newLayout === "2x1" ? "1 / 2.7" : "2 / 3"),
                  width: imageMeta && imageMeta.height > 0
                    ? `min(100%, calc(min(60vh, 560px) * ${imageMeta.width} / ${imageMeta.height}))`
                    : "100%",
                  maxHeight: "min(60vh, 560px)",
                }}
                className={`relative max-w-full rounded-2xl overflow-hidden border-2 border-amber-400/30 shadow-2xl flex items-center justify-center select-none ${
                  (toolMode === "brush_erase" || toolMode === "brush_restore") && interactionMode === "erase"
                    ? "cursor-crosshair touch-none"
                    : interactionMode === "erase" && activeCanvasData
                    ? "cursor-crosshair"
                    : "cursor-default"
                }`}
              >
                {/* Checkerboard Pattern for Transparency */}
                <div
                  className="absolute inset-0 z-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(45deg, #181c24 25%, transparent 25%), linear-gradient(-45deg, #181c24 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #181c24 75%), linear-gradient(-45deg, transparent 75%, #181c24 75%)",
                    backgroundSize: "16px 16px",
                    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                    backgroundColor: "#0d1017",
                  }}
                />

                {/* Photo Simulation Layer beneath Frame */}
                {previewTab === "photos" && (
                  <div className="absolute inset-0 z-5 pointer-events-none">
                    {photoBoxes.map((box, i) => {
                      const colors = [
                        "from-amber-500 to-rose-600",
                        "from-rose-500 to-purple-600",
                        "from-blue-500 to-indigo-600",
                        "from-emerald-500 to-teal-600",
                        "from-purple-500 to-pink-600",
                        "from-cyan-500 to-blue-600",
                      ];
                      const colorClass = colors[i % colors.length];

                      return (
                        <div
                          key={box.id}
                          className={`absolute rounded bg-gradient-to-tr ${colorClass} flex flex-col items-center justify-center text-white shadow-inner opacity-90`}
                          style={{
                            left: `${box.x}%`,
                            top: `${box.y}%`,
                            width: `${box.w}%`,
                            height: `${box.h}%`,
                          }}
                        >
                          <Camera className="w-5 h-5 mb-0.5 opacity-90" />
                          <span className="text-[10px] font-bold">Foto #{i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Frame Image Layer */}
                {activeCanvasData ? (
                  <div className="relative w-full h-full z-10 flex items-center justify-center pointer-events-none">
                    <img
                      src={activeCanvasData}
                      alt="Frame Preview"
                      className="w-full h-full block object-contain"
                    />
                  </div>
                ) : (
                  <div className="p-6 text-center space-y-2 text-stone-400 z-10">
                    <ImageIcon className="w-12 h-12 mx-auto text-amber-400/40" />
                    <p className="text-xs font-serif text-amber-200">Belum ada file frame dipilih</p>
                    <p className="text-[11px] text-stone-400 max-w-[220px] mx-auto">
                      Pilih berkas frame di sebelah kiri untuk melihat pratinjau dan melubangi bingkai
                    </p>
                  </div>
                )}

                {/* Photo Boxes Guides & Interactive Drag Overlay */}
                {activeCanvasData && (
                  <div
                    className={`absolute inset-0 z-20 ${
                      interactionMode === "boxes" ? "pointer-events-auto" : "pointer-events-none"
                    }`}
                  >
                    {photoBoxes.map((box, idx) => {
                      const isSelected = (selectedBoxId || photoBoxes[0]?.id) === box.id;
                      return (
                        <div
                          key={box.id}
                          onClick={(e) => {
                            if (interactionMode !== "boxes") return;
                            e.stopPropagation();
                            setSelectedBoxId(box.id);
                          }}
                          onPointerDown={(e) => {
                            if (interactionMode !== "boxes") return;
                            e.stopPropagation();
                            setSelectedBoxId(box.id);
                            setDragState({
                              type: "move",
                              boxId: box.id,
                              startX: e.clientX,
                              startY: e.clientY,
                              initBox: { ...box },
                            });
                          }}
                          style={{
                            left: `${box.x}%`,
                            top: `${box.y}%`,
                            width: `${box.w}%`,
                            height: `${box.h}%`,
                          }}
                          className={`absolute select-none rounded transition-all ${
                            interactionMode === "boxes"
                              ? isSelected
                                ? "cursor-move border-2 border-amber-400 bg-transparent shadow-[0_0_12px_rgba(212,175,55,0.4)] z-30"
                                : "cursor-move border border-amber-400/80 hover:border-amber-300 bg-transparent z-20"
                              : "border border-dashed border-amber-400/40 bg-transparent z-10"
                          }`}
                        >
                          {/* Badge Nomor Foto: Berada di LUAR kotak (tidak menutupi sudut/garis frame) */}
                          <div
                            className={`absolute ${
                              box.y < 7 ? "-bottom-6" : "-top-6"
                            } left-0 flex items-center gap-1 pointer-events-none z-40 whitespace-nowrap`}
                          >
                            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 font-bold text-[10px] shadow border border-stone-950">
                              #{idx + 1}
                            </span>
                            {isSelected && interactionMode === "boxes" && (
                              <span className="text-[9px] bg-black/85 text-amber-200 px-1.5 py-0.5 rounded font-mono border border-amber-400/30 shadow">
                                {Math.round(box.w)}% × {Math.round(box.h)}%
                              </span>
                            )}
                          </div>

                          {/* Titik pusat halus (area dalam 100% transparan agar frame terlihat jelas) */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          </div>

                          {/* Sudut Penarik Ukuran (Resize Handle) */}
                          {isSelected && interactionMode === "boxes" && (
                            <div
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                setDragState({
                                  type: "resize",
                                  boxId: box.id,
                                  handle: "se",
                                  startX: e.clientX,
                                  startY: e.clientY,
                                  initBox: { ...box },
                                });
                              }}
                              className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border-2 border-stone-950 rounded-full cursor-nwse-resize z-40 shadow hover:scale-125 transition-transform"
                              title="Tarik sudut untuk ubah ukuran"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}


              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-stone-950/80 border-t border-amber-400/20 flex items-center justify-between shrink-0">
          <div className="text-xs text-stone-400">
            {photoBoxes.length > 0 ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Siap! {photoBoxes.length} slot foto terpasang untuk layout {newLayout.toUpperCase()}.</span>
              </span>
            ) : (
              <span>💡 Atur penanda kotak foto pengunjung.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-gold-outline px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="frame-upload-form"
              disabled={!newName || (!activeCanvasData && !rawBase64Img)}
              className="btn-gold px-6 py-2 rounded-xl text-xs font-bold shadow-lg disabled:opacity-50 cursor-pointer"
            >
              Simpan Bingkai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
