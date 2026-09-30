import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Wand2,
  Sparkles,
  RotateCcw,
  Undo,
  Redo,
  Paintbrush,
  Camera,
  Plus,
  Trash2,
  Square,
  Move,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { LayoutId } from "../types";

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

const LAYOUT_LABELS: Record<string, string> = {
  "3x1": "Strip Vertikal (3x1 / 3 Foto)",
  "3x2": "Grid 6 Foto (3x2 / 6 Foto)",
  "2x2": "Grid 4 Foto (2x2 / 4 Foto)",
  "2x1": "Strip Pendek (2x1 / 2 Foto)",
  "1x1": "Foto Tunggal (1x1 / 1 Foto)",
  "4x2": "Grid 8 Foto (4x2 / 8 Foto)",
};

const HOLE_PRESETS: Record<string, { id: string; label: string }[]> = {
  "2x2": [
    { id: "auto", label: "✨ Otomatis Sesuai Lubang Bingkai (Auto-Detect)" },
    { id: "default", label: "Default (Full Overlap)" },
  ],
  "3x1": [
    { id: "auto", label: "✨ Otomatis Sesuai Lubang Bingkai (Auto-Detect)" },
    { id: "frame1", label: "Pink (Preset 1)" },
    { id: "frame2", label: "Biru (Preset 2)" },
    { id: "frame3", label: "Frame 1 (Preset 3)" },
    { id: "frame4", label: "Frame 2 (Preset 4)" },
    { id: "frame5", label: "Frame 3 (Preset 5)" },
  ],
  "2x1": [
    { id: "auto", label: "✨ Otomatis Sesuai Lubang Bingkai (Auto-Detect)" },
    { id: "frame1", label: "Frame 1 (Preset 1)" },
    { id: "frame2", label: "Frame 2 (Preset 2)" },
  ],
  "3x2": [
    { id: "auto", label: "✨ Otomatis Sesuai Lubang Bingkai (Auto-Detect)" },
    { id: "default", label: "Default (Preset 1)" },
  ],
  "1x1": [
    { id: "auto", label: "✨ Otomatis Sesuai Lubang Bingkai (Auto-Detect)" },
    { id: "default", label: "Default (Full Overlap)" },
  ],
  "4x2": [
    { id: "auto", label: "✨ Otomatis Sesuai Lubang Bingkai (Auto-Detect)" },
    { id: "default", label: "Default (Full Overlap)" },
  ],
};

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
  const [toolMode, setToolMode] = useState<"wand" | "restore">("wand");
  const [brushSize] = useState(30);
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
  const previewImgRef = useRef<HTMLImageElement | null>(null);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setNewName(initialName || "");
      setNewLayout(initialLayoutId || "3x1");
      setNewPreset(initialPreset || "auto");
      setRawBase64Img(initialImage || "");
      setActiveCanvasData(initialImage || "");
      setHistoryStack([]);
      setRedoStack([]);
      setUploadError("");
      setActionStatus("");
      setPhotoBoxes(
        initialPhotoBoxes && initialPhotoBoxes.length > 0
          ? initialPhotoBoxes
          : getDefaultBoxesForLayout(initialLayoutId || "3x1")
      );
      setSelectedBoxId(null);
      setInteractionMode("erase");
      setToolMode("wand");

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
  }, [isOpen, initialName, initialLayoutId, initialImage, initialPreset, initialPhotoBoxes]);

  // Layout change handler
  const handleLayoutChange = (l: LayoutId) => {
    setNewLayout(l);
    setNewPreset("auto");
    const boxes = getDefaultBoxesForLayout(l);
    setPhotoBoxes(boxes);
    setSelectedBoxId(boxes[0]?.id || null);
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

          const defaultBoxes = getDefaultBoxesForLayout(newLayout);
          setPhotoBoxes(defaultBoxes);
          setSelectedBoxId(defaultBoxes[0]?.id || null);
          setActionStatus("Gambar berhasil dimuat. Siap dilubangi!");
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
      setActionStatus("Gambar dipulihkan ke kondisi awal.");
    }
  };

  // Auto-Scan Erase
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
    const targetBoxes = photoBoxes.length > 0 ? photoBoxes : getDefaultBoxesForLayout(newLayout);

    targetBoxes.forEach((box) => {
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
    setActionStatus(`Scan otomatis selesai! Berhasil melubangi area ${targetBoxes.length} kotak foto.`);
  };

  // Erase chosen color
  const handleEraseChosenColor = (hex: string) => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    const canvas = workingCanvasRef.current;
    setHistoryStack((prev) => [...prev.slice(-14), activeCanvasData]);
    setRedoStack([]);

    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const target = hexToRgb(hex);
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
    setActionStatus(`Warna ${hex} berhasil dilubangi!`);
  };

  // Click on canvas for Magic Wand
  const handlePreviewImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const yRatio = (e.clientY - rect.top) / rect.height;

    const canvas = workingCanvasRef.current;
    const naturalX = Math.floor(xRatio * canvas.width);
    const naturalY = Math.floor(yRatio * canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const startIndex = (naturalY * width + naturalX) * 4;
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

    queue[tail++] = naturalX;
    queue[tail++] = naturalY;
    visited[naturalY * width + naturalX] = 1;

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
    setActionStatus("Area kotak yang diklik berhasil dilubangi!");
  };

  // Restore brush pointer events
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (toolMode === "restore") {
      setBrushCursor({ x, y, visible: true });
    }

    // Box drag/resize handling
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

  const handleCanvasPointerUp = () => {
    setDragState(null);
  };

  // Add box manually
  const handleAddBox = () => {
    const newId = `box_${photoBoxes.length + 1}`;
    const newBox: PhotoBox = {
      id: newId,
      x: 20,
      y: 20 + photoBoxes.length * 10,
      w: 60,
      h: 25,
    };
    setPhotoBoxes([...photoBoxes, newBox]);
    setSelectedBoxId(newId);
    setInteractionMode("boxes");
  };

  // Punch clean inside selected box
  const handlePunchSelectedBox = () => {
    if (!workingCanvasRef.current || !activeCanvasData || !selectedBoxId) return;
    const box = photoBoxes.find((b) => b.id === selectedBoxId);
    if (!box) return;

    const canvas = workingCanvasRef.current;
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    setHistoryStack((prev) => [...prev.slice(-14), activeCanvasData]);
    setRedoStack([]);

    const bx = Math.max(0, Math.min(width - 1, Math.round((box.x / 100) * width)));
    const by = Math.max(0, Math.min(height - 1, Math.round((box.y / 100) * height)));
    const bw = Math.max(1, Math.min(width - bx, Math.round((box.w / 100) * width)));
    const bh = Math.max(1, Math.min(height - by, Math.round((box.h / 100) * height)));

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) {
        const idx = (y * width + x) * 4;
        data[idx + 3] = 0;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const finalData = canvas.toDataURL("image/png");
    setActiveCanvasData(finalData);
    setActionStatus(`Kotak berhasil dilubangi 100% transparan!`);
  };

  const handlePunchAllBoxes = () => {
    if (!workingCanvasRef.current || !activeCanvasData) return;
    const canvas = workingCanvasRef.current;
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    setHistoryStack((prev) => [...prev.slice(-14), activeCanvasData]);
    setRedoStack([]);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    photoBoxes.forEach((box) => {
      const bx = Math.max(0, Math.min(width - 1, Math.round((box.x / 100) * width)));
      const by = Math.max(0, Math.min(height - 1, Math.round((box.y / 100) * height)));
      const bw = Math.max(1, Math.min(width - bx, Math.round((box.w / 100) * width)));
      const bh = Math.max(1, Math.min(height - by, Math.round((box.h / 100) * height)));

      for (let y = by; y < by + bh; y++) {
        for (let x = bx; x < bx + bw; x++) {
          const idx = (y * width + x) * 4;
          data[idx + 3] = 0;
        }
      }
    });

    ctx.putImageData(imgData, 0, 0);
    const finalData = canvas.toDataURL("image/png");
    setActiveCanvasData(finalData);
    setActionStatus(`Semua ${photoBoxes.length} kotak berhasil dilubangi!`);
  };

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

  // Submit / Save
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

    onSaveFrame({
      id: initialId,
      slotIndex: initialSlotIndex,
      name: newName,
      layoutId: newLayout,
      imagePngDataUrl: activeCanvasData || rawBase64Img,
      presetId: newPreset,
      photoBoxes,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 md:p-6 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-blue-600" />
              <span>Studio Unggah & Konfigurasi Bingkai</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload file bingkai (PNG/JPG). Hapus kotak foto atau warna latar dengan 1 klik agar foto pengunjung masuk pas ke lubang bingkai.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          {/* LEFT COLUMN: Form Inputs & Eraser Controls */}
          <div className="lg:col-span-6 p-6 space-y-4">
            <form onSubmit={handleSave} id="frame-upload-form" className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Nama Template Bingkai</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Cute Pink Bears (4 Foto)"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Tata Letak (Layout)</label>
                  <select
                    value={newLayout}
                    onChange={(e) => handleLayoutChange(e.target.value as LayoutId)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="3x1">Strip Vertikal (3x1 / 3 Foto)</option>
                    <option value="2x2">Grid 4 Foto (2x2 / Custom 4 Lubang)</option>
                    <option value="3x2">Grid 6 Foto (3x2 / 6 Foto)</option>
                    <option value="2x1">Strip Pendek (2x1 / 2 Foto)</option>
                    <option value="1x1">Foto Tunggal (1x1)</option>
                    <option value="4x2">Grid 8 Foto (4x2 / 8 Foto)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Preset Lubang Foto</label>
                  <select
                    value={newPreset}
                    onChange={(e) => setNewPreset(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {(HOLE_PRESETS[newLayout] || HOLE_PRESETS["3x1"]).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File Upload Box */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">Berkas Frame (PNG, JPG, WEBP)</label>
                  {imageMeta && (
                    <span className="text-[10px] text-slate-400 font-mono">
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
                  className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${
                    activeCanvasData
                      ? "border-blue-400 bg-blue-50/20 hover:bg-blue-50/40"
                      : "border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30"
                  }`}
                >
                  {activeCanvasData ? (
                    <div className="flex items-center justify-center gap-3">
                      <img
                        src={activeCanvasData}
                        alt="Thumbnail"
                        className="w-10 h-10 object-contain rounded border border-slate-200 bg-[repeating-conic-gradient(#cbd5e1_0_25%,#fff_0_50%)] bg-[length:6px_6px]"
                      />
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-800 block">Gambar Berhasil Dimuat</span>
                        <span className="text-[11px] text-blue-600 font-medium hover:underline">Klik untuk ganti gambar</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-2 space-y-1">
                      <Plus className="w-5 h-5 text-slate-400 mx-auto" />
                      <span className="text-xs font-semibold text-slate-700 block">Pilih Gambar Frame (PNG / JPG / WEBP)</span>
                      <span className="text-[10px] text-slate-400 block">Bisa berupa gambar transparan atau gambar dengan kotak putih / latar hijau</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 1. ALAT HAPUS & PULIHKAN BACKGROUND */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Wand2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">
                        Alat Hapus & Pulihkan Background
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Hapus background atau pulihkan kembali gambar asli
                      </span>
                    </div>
                  </div>

                  {/* Undo, Redo & Pulihkan Asli Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={historyStack.length === 0}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      title="Undo"
                    >
                      <Undo className="w-3 h-3 text-slate-600" />
                      <span>Undo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={redoStack.length === 0}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      title="Redo"
                    >
                      <Redo className="w-3 h-3 text-slate-600" />
                      <span>Redo</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetOriginal}
                      disabled={!rawBase64Img || historyStack.length === 0}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                      title="Pulihkan seluruh gambar ke kondisi awal"
                    >
                      <RotateCcw className="w-3 h-3 text-slate-600" />
                      <span>Pulihkan Asli</span>
                    </button>
                  </div>
                </div>

                {/* Primary Auto-Scan Button */}
                <button
                  type="button"
                  onClick={handleAutoScanErase}
                  disabled={!activeCanvasData}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                  title="Pindai dan hapus background foto di dalam bingkai secara otomatis"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
                  <span>✨ Scan Otomatis & Hapus Background Foto</span>
                </button>

                {/* Quick Erase & Restore Tool Buttons */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setToolMode("wand");
                      setInteractionMode("erase");
                      setPreviewTab("checkerboard");
                    }}
                    disabled={!activeCanvasData}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer border ${
                      toolMode === "wand" && interactionMode === "erase"
                        ? "bg-blue-600 text-white border-blue-700 shadow-blue-500/20"
                        : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Wand2 className={`w-4 h-4 ${toolMode === "wand" && interactionMode === "erase" ? "text-white" : "text-blue-600"}`} />
                    <span className="text-[11px] font-bold leading-tight text-center">Magic Wand</span>
                    <span className={`text-[9px] ${toolMode === "wand" && interactionMode === "erase" ? "text-blue-100" : "text-slate-400"}`}>
                      Hapus Klik
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setToolMode("restore");
                      setInteractionMode("erase");
                      setPreviewTab("checkerboard");
                    }}
                    disabled={!activeCanvasData}
                    className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer border ${
                      toolMode === "restore" && interactionMode === "erase"
                        ? "bg-amber-600 text-white border-amber-700 shadow-amber-500/20"
                        : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Paintbrush className={`w-4 h-4 ${toolMode === "restore" && interactionMode === "erase" ? "text-white" : "text-amber-600"}`} />
                    <span className="text-[11px] font-bold leading-tight text-center">Pulihkan</span>
                    <span className={`text-[9px] ${toolMode === "restore" && interactionMode === "erase" ? "text-amber-100" : "text-slate-400"}`}>
                      Kuas Usap
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEraseChosenColor("#FFFFFF")}
                    disabled={!activeCanvasData}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer"
                  >
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-400 bg-white" />
                    <span className="text-[11px] font-bold text-slate-800 leading-tight">Hapus Putih</span>
                    <span className="text-[9px] text-slate-400">1-Klik Semua</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEraseChosenColor("#00FF00")}
                    disabled={!activeCanvasData}
                    className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex flex-col items-center justify-center gap-1 transition-all shadow-2xs cursor-pointer"
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold text-slate-800 leading-tight">Hapus Hijau</span>
                    <span className="text-[9px] text-slate-400">Green Screen</span>
                  </button>
                </div>

                {toolMode !== "restore" && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700">Toleransi Kepekaan Warna:</span>
                      <span className="font-mono font-bold text-blue-600">{chromaTolerance}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="65"
                      value={chromaTolerance}
                      onChange={(e) => setChromaTolerance(Number(e.target.value))}
                      className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-600 font-medium">Hapus Warna Tertentu:</span>
                        <input
                          type="color"
                          value={chromaColor}
                          onChange={(e) => setChromaColor(e.target.value)}
                          className="w-6 h-6 rounded border border-slate-200 cursor-pointer p-0.5"
                          title="Pilih warna kustom"
                        />
                        <span className="text-[10px] font-mono text-slate-500">{chromaColor}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEraseChosenColor(chromaColor)}
                        disabled={!activeCanvasData}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Hapus Warna Ini
                      </button>
                    </div>
                  </div>
                )}

                {actionStatus && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium animate-in fade-in flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{actionStatus}</span>
                  </div>
                )}
              </div>

              {/* 2. PENANDA POSISI FOTO */}
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Square className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">
                        Penanda Posisi Foto ({photoBoxes.length} Kotak)
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Menandai letak & rasio foto pengunjung saat sesi foto booth
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const boxes = getDefaultBoxesForLayout(newLayout);
                        setPhotoBoxes(boxes);
                        setSelectedBoxId(boxes[0]?.id || null);
                        setActionStatus("Penanda posisi dipasang otomatis!");
                      }}
                      className="px-2.5 py-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                      <span>✨ Pasang Otomatis</span>
                    </button>
                    {photoBoxes.length > 0 && (
                      <button
                        type="button"
                        onClick={handlePunchAllBoxes}
                        className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Lubangi Semua</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddBox}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Manual</span>
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-indigo-900/80 bg-white/80 p-2 rounded-lg border border-indigo-100 leading-relaxed">
                  💡 <strong>Catatan:</strong> Kotak ini menandai area foto pengunjung. Anda juga dapat menekan <strong>Lubangi Kotak</strong> di bawah untuk membuat area foto di dalam kotak 100% transparan tanpa merusak background bingkai.
                </p>

                {photoBoxes.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
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
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <span>Kotak #{idx + 1}</span>
                            <span className="text-[10px] opacity-75">
                              ({Math.round(box.w)}% × {Math.round(box.h)}%)
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {selectedBoxId && (
                      <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            Atur Ukuran & Rasio Kotak Terpilih
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoBoxes((boxes) => boxes.filter((b) => b.id !== selectedBoxId));
                              setSelectedBoxId(null);
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus Kotak</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-5 gap-1.5">
                          {(["1:1", "3:4", "4:3", "9:16", "2:3"] as const).map((ratio) => (
                            <button
                              key={ratio}
                              type="button"
                              onClick={() => setBoxRatio(ratio)}
                              className="px-2 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 rounded-lg text-[11px] font-bold text-slate-700 transition-all text-center cursor-pointer"
                            >
                              {ratio}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={handlePunchSelectedBox}
                          className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-1"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Lubangi Bersih Kotak Ini (100% Transparan)</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-white/70 rounded-xl text-center text-xs text-slate-400">
                    Belum ada kotak foto. Klik "Tambah Kotak" untuk memulai.
                  </div>
                )}
              </div>

              {uploadError && (
                <p className="text-xs text-red-600 font-medium bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {uploadError}
                </p>
              )}
            </form>
          </div>

          {/* RIGHT COLUMN: Interactive Live Preview & Mode Switcher */}
          <div className="lg:col-span-6 p-5 bg-slate-50/70 flex flex-col gap-2.5 justify-start">
            {/* Mode Switcher Tabs Header */}
            <div className="flex items-center justify-between gap-2 flex-wrap shrink-0">
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setToolMode("wand");
                    setInteractionMode("erase");
                    setPreviewTab("checkerboard");
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    toolMode === "wand" && interactionMode === "erase" && previewTab === "checkerboard"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>1. Hapus (Wand)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setToolMode("restore");
                    setInteractionMode("erase");
                    setPreviewTab("checkerboard");
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    toolMode === "restore" && interactionMode === "erase" && previewTab === "checkerboard"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span>2. Pulihkan (Kuas)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInteractionMode("boxes");
                    setPreviewTab("checkerboard");
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    interactionMode === "boxes" && previewTab === "checkerboard"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>3. Atur Posisi Foto ({photoBoxes.length})</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const boxes = getDefaultBoxesForLayout(newLayout);
                    setPhotoBoxes(boxes);
                    setSelectedBoxId(boxes[0]?.id || null);
                    setActionStatus("Penanda posisi dipasang otomatis!");
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  <span>✨ Pasang Penanda Otomatis</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab(previewTab === "photos" ? "checkerboard" : "photos")}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    previewTab === "photos"
                      ? "bg-purple-600 text-white border-purple-700 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Simulasi Foto</span>
                </button>
              </div>
            </div>

            {/* Dimension & Aspect Ratio info pill */}
            {imageMeta && (
              <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-medium shrink-0">
                <span>Ukuran Frame: <strong className="font-mono text-slate-700">{imageMeta.width} × {imageMeta.height} px</strong></span>
                <span className="font-mono text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full text-[10px]">
                  Rasio {Math.round((imageMeta.width / imageMeta.height) * 100) / 100} : 1
                </span>
              </div>
            )}

            {/* Live Preview Canvas Outer Container */}
            <div className="w-full flex justify-center py-1 shrink-0">
              <div
                ref={previewContainerRef}
                onClick={interactionMode === "erase" && toolMode !== "restore" ? handlePreviewImageClick : undefined}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                style={{
                  aspectRatio: imageMeta ? `${imageMeta.width} / ${imageMeta.height}` : "2 / 3",
                  width: imageMeta && imageMeta.height > 0
                    ? `min(100%, calc(min(62vh, 580px) * ${imageMeta.width} / ${imageMeta.height}))`
                    : "100%",
                  maxHeight: "min(62vh, 580px)",
                }}
                className={`relative max-w-full rounded-2xl overflow-hidden border border-slate-300 shadow-sm flex items-center justify-center select-none ${
                  toolMode === "restore" && interactionMode === "erase"
                    ? "cursor-none touch-none"
                    : interactionMode === "erase" && activeCanvasData
                    ? "cursor-crosshair"
                    : "cursor-default"
                } ${
                  previewTab === "checkerboard"
                    ? "bg-[repeating-conic-gradient(#cbd5e1_0_25%,#fff_0_50%)] bg-[length:14px_14px]"
                    : "bg-slate-900"
                }`}
              >
                {/* Circular Brush Cursor in Restore Mode */}
                {toolMode === "restore" && interactionMode === "erase" && brushCursor.visible && (
                  <div
                    className="absolute pointer-events-none rounded-full border-2 border-amber-500 bg-amber-400/25 shadow-xs -translate-x-1/2 -translate-y-1/2 z-40"
                    style={{
                      left: `${brushCursor.x}px`,
                      top: `${brushCursor.y}px`,
                      width: `${brushSize}px`,
                      height: `${brushSize}px`,
                    }}
                  />
                )}

                {/* Photo Simulation Layer */}
                {previewTab === "photos" && (
                  <div className="absolute inset-0 z-0 pointer-events-none">
                    {photoBoxes.map((box, i) => {
                      const colors = [
                        "from-sky-400 to-indigo-600",
                        "from-pink-400 to-rose-600",
                        "from-amber-400 to-orange-500",
                        "from-emerald-400 to-teal-600",
                        "from-purple-500 to-indigo-600",
                        "from-cyan-400 to-blue-600",
                      ];
                      const colorClass = colors[i % colors.length];

                      return (
                        <div
                          key={box.id}
                          className={`absolute rounded-lg bg-gradient-to-tr ${colorClass} flex flex-col items-center justify-center text-white shadow-inner opacity-95`}
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
                      ref={previewImgRef}
                      src={activeCanvasData}
                      alt="Frame Preview"
                      className="w-full h-full block object-fill"
                    />
                  </div>
                ) : (
                  <div className="p-6 text-center space-y-2 text-slate-400 z-10">
                    <ImageIcon className="w-12 h-12 mx-auto opacity-40" />
                    <p className="text-xs font-semibold text-slate-600">Belum ada gambar dipilih</p>
                    <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto">
                      Pilih berkas frame di sebelah kiri untuk melihat pratinjau dan mengatur kotak foto
                    </p>
                  </div>
                )}

                {/* Photo Boxes Guides & Interactive Overlay */}
                {activeCanvasData && (
                  <div className={`absolute inset-0 z-20 ${interactionMode === "boxes" ? "pointer-events-auto" : "pointer-events-none"}`}>
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
                          className={`absolute select-none rounded-lg flex flex-col items-center justify-between p-1.5 transition-all ${
                            interactionMode === "boxes"
                              ? isSelected
                                ? "cursor-move border-2 border-indigo-500 bg-indigo-500/20 ring-2 ring-indigo-400/60 shadow-lg z-30"
                                : "cursor-move border-2 border-indigo-400/80 bg-indigo-500/10 hover:border-indigo-400 z-20"
                              : "border-2 border-dashed border-indigo-400/40 bg-indigo-500/5 z-10"
                          }`}
                        >
                          <div className="w-full flex items-center justify-between pointer-events-none">
                            <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-bold text-[9px] shadow-xs">
                              #{idx + 1}
                            </span>
                            {isSelected && interactionMode === "boxes" && (
                              <span className="text-[8px] bg-slate-900/80 text-white px-1 py-0.5 rounded font-mono">
                                {Math.round(box.w)}% × {Math.round(box.h)}%
                              </span>
                            )}
                          </div>

                          <div className="pointer-events-none text-center">
                            <Camera className={`w-3.5 h-3.5 mx-auto ${isSelected && interactionMode === "boxes" ? "text-indigo-700" : "text-slate-500"}`} />
                            <span className={`text-[9px] font-bold ${isSelected && interactionMode === "boxes" ? "text-indigo-800" : "text-slate-600"}`}>
                              Foto #{idx + 1}
                            </span>
                          </div>

                          <div className="w-full h-1" />

                          {isSelected && interactionMode === "boxes" && (
                            <>
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
                                className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-full cursor-nwse-resize z-40 shadow-xs"
                                title="Tarik sudut untuk ubah ukuran"
                              />
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Mode Instruction Banner */}
                {activeCanvasData && (
                  <div className="absolute bottom-2 left-2 right-2 z-30 pointer-events-none">
                    {interactionMode === "erase" ? (
                      <div className="bg-slate-900/85 backdrop-blur-xs text-white text-[11px] font-medium py-1.5 px-3 rounded-xl shadow-lg text-center">
                        💡 <strong>Mode Magic Wand:</strong> Klik pada area gambar (misal bagian putih di dalam pigura) untuk melubanginya menjadi transparan.
                      </div>
                    ) : (
                      <div className="bg-indigo-900/85 backdrop-blur-xs text-white text-[11px] font-medium py-1.5 px-3 rounded-xl shadow-lg text-center">
                        🎯 <strong>Mode Penanda Foto:</strong> Geser kotak atau tarik sudutnya untuk menandai letak & ukuran foto pengunjung.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Helper / Status Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md font-semibold border border-indigo-200">
                  <Move className="w-3.5 h-3.5" />
                  <span>{photoBoxes.length} Slot Foto Terpasang</span>
                </span>
              </div>

              <span className="text-slate-500 font-semibold">
                {LAYOUT_LABELS[newLayout] || newLayout}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {photoBoxes.length > 0 ? (
              <span className="text-emerald-700 font-semibold">
                ✓ Siap! Foto pengunjung akan masuk pas ke dalam {photoBoxes.length} posisi yang sudah ditandai.
              </span>
            ) : (
              <span className="text-slate-500">
                💡 Tip: Lubangi pigura foto dengan Magic Wand lalu atur penanda foto.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="frame-upload-form"
              disabled={!newName || (!activeCanvasData && !rawBase64Img)}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              Simpan Bingkai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
