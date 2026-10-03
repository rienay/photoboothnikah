import { FrameSlot, LayoutConfig, LayoutId, PhotoBox } from "../types";

export interface HolePreset {
  id: string;
  label: string;
  description?: string;
  getBoxes: () => PhotoBox[];
}

export function getDefaultBoxesForLayout(layoutId: LayoutId): PhotoBox[] {
  switch (layoutId) {
    case "3x1":
      // Classic 3-photo vertical photostrip (5x15 cm)
      return [
        { id: "box_1", x: 10, y: 15, w: 80, h: 22 },
        { id: "box_2", x: 10, y: 40, w: 80, h: 22 },
        { id: "box_3", x: 10, y: 65, w: 80, h: 22 },
      ];
    case "2x1":
      // 2-photo vertical photostrip (5x15 cm)
      return [
        { id: "box_1", x: 10, y: 16, w: 80, h: 32 },
        { id: "box_2", x: 10, y: 52, w: 80, h: 32 },
      ];
    case "1x1":
      // Single portrait/polaroid photo (10x15 cm)
      return [{ id: "box_1", x: 10, y: 12, w: 80, h: 72 }];
    case "2x2":
      // 4-photo grid (10x15 cm)
      return [
        { id: "box_1", x: 7, y: 11, w: 41, h: 35 },
        { id: "box_2", x: 52, y: 11, w: 41, h: 35 },
        { id: "box_3", x: 7, y: 51, w: 41, h: 35 },
        { id: "box_4", x: 52, y: 51, w: 41, h: 35 },
      ];
    case "3x2":
      // 6-photo grid (10x15 cm)
      return [
        { id: "box_1", x: 7, y: 10, w: 41, h: 24 },
        { id: "box_2", x: 52, y: 10, w: 41, h: 24 },
        { id: "box_3", x: 7, y: 38, w: 41, h: 24 },
        { id: "box_4", x: 52, y: 38, w: 41, h: 24 },
        { id: "box_5", x: 7, y: 66, w: 41, h: 24 },
        { id: "box_6", x: 52, y: 66, w: 41, h: 24 },
      ];
    case "4x2":
      // 8-photo grid (10x15 cm)
      return [
        { id: "box_1", x: 7, y: 7, w: 41, h: 18 },
        { id: "box_2", x: 52, y: 7, w: 41, h: 18 },
        { id: "box_3", x: 7, y: 29, w: 41, h: 18 },
        { id: "box_4", x: 52, y: 29, w: 41, h: 18 },
        { id: "box_5", x: 7, y: 51, w: 41, h: 18 },
        { id: "box_6", x: 52, y: 51, w: 41, h: 18 },
        { id: "box_7", x: 7, y: 73, w: 41, h: 18 },
        { id: "box_8", x: 52, y: 73, w: 41, h: 18 },
      ];
    default:
      return [
        { id: "box_1", x: 10, y: 15, w: 80, h: 22 },
        { id: "box_2", x: 10, y: 40, w: 80, h: 22 },
        { id: "box_3", x: 10, y: 65, w: 80, h: 22 },
      ];
  }
}

export const HOLE_PRESETS_MAP: Record<LayoutId, HolePreset[]> = {
  "3x1": [
    {
      id: "auto",
      label: "✨ Standar Strip 3 Foto (Rata Tengah)",
      description: "3 foto vertikal dengan margin seimbang",
      getBoxes: () => [
        { id: "box_1", x: 10, y: 15, w: 80, h: 22 },
        { id: "box_2", x: 10, y: 40, w: 80, h: 22 },
        { id: "box_3", x: 10, y: 65, w: 80, h: 22 },
      ],
    },
    {
      id: "spaced_top",
      label: "Strip dengan Header Luas (Acara / Nama Atas)",
      description: "Header luas di atas untuk judul pernikahan",
      getBoxes: () => [
        { id: "box_1", x: 10, y: 22, w: 80, h: 21 },
        { id: "box_2", x: 10, y: 46, w: 80, h: 21 },
        { id: "box_3", x: 10, y: 70, w: 80, h: 21 },
      ],
    },
    {
      id: "polaroid_strip",
      label: "3 Kotak Polaroid Persegi (1:1)",
      description: "Format polaroid modern persegi",
      getBoxes: () => [
        { id: "box_1", x: 12, y: 14, w: 76, h: 23 },
        { id: "box_2", x: 12, y: 41, w: 76, h: 23 },
        { id: "box_3", x: 12, y: 68, w: 76, h: 23 },
      ],
    },
    {
      id: "full_bleed",
      label: "Strip Tepi Penuh (Minimal Margin)",
      description: "Lebar penuh hingga ke tepi bingkai",
      getBoxes: () => [
        { id: "box_1", x: 6, y: 12, w: 88, h: 24 },
        { id: "box_2", x: 6, y: 39, w: 88, h: 24 },
        { id: "box_3", x: 6, y: 66, w: 88, h: 24 },
      ],
    },
  ],
  "2x2": [
    {
      id: "auto",
      label: "✨ Standar Grid 4 Foto (2 Kolom × 2 Baris)",
      description: "Grid simetris 4 foto persegi",
      getBoxes: () => [
        { id: "box_1", x: 7, y: 11, w: 41, h: 35 },
        { id: "box_2", x: 52, y: 11, w: 41, h: 35 },
        { id: "box_3", x: 7, y: 51, w: 41, h: 35 },
        { id: "box_4", x: 52, y: 51, w: 41, h: 35 },
      ],
    },
    {
      id: "wide_border",
      label: "Grid 4 Foto dengan Frame Lebar",
      description: "Aksen bingkai lebih tebal",
      getBoxes: () => [
        { id: "box_1", x: 9, y: 13, w: 38, h: 33 },
        { id: "box_2", x: 53, y: 13, w: 38, h: 33 },
        { id: "box_3", x: 9, y: 51, w: 38, h: 33 },
        { id: "box_4", x: 53, y: 51, w: 38, h: 33 },
      ],
    },
    {
      id: "portrait_4",
      label: "Grid 4 Foto Potret (3:4)",
      description: "Rasio potret vertikal anggun",
      getBoxes: () => [
        { id: "box_1", x: 7, y: 9, w: 41, h: 38 },
        { id: "box_2", x: 52, y: 9, w: 41, h: 38 },
        { id: "box_3", x: 7, y: 51, w: 41, h: 38 },
        { id: "box_4", x: 52, y: 51, w: 41, h: 38 },
      ],
    },
  ],
  "2x1": [
    {
      id: "auto",
      label: "✨ Standar Strip 2 Foto",
      description: "2 foto besar dalam format strip",
      getBoxes: () => [
        { id: "box_1", x: 10, y: 16, w: 80, h: 32 },
        { id: "box_2", x: 10, y: 52, w: 80, h: 32 },
      ],
    },
    {
      id: "polaroid_duo",
      label: "2 Polaroid Square (1:1)",
      description: "Dua foto persegi dengan ruang catatan di bawah",
      getBoxes: () => [
        { id: "box_1", x: 12, y: 14, w: 76, h: 32 },
        { id: "box_2", x: 12, y: 51, w: 76, h: 32 },
      ],
    },
  ],
  "1x1": [
    {
      id: "auto",
      label: "✨ Foto Polaroid Elegan Tunggal",
      description: "1 foto besar elegan 4R dengan footer nama",
      getBoxes: () => [{ id: "box_1", x: 10, y: 12, w: 80, h: 72 }],
    },
    {
      id: "centered_square",
      label: "Foto Persegi Tengah (Square 1:1)",
      description: "1 foto persegi pas di tengah bingkai",
      getBoxes: () => [{ id: "box_1", x: 12, y: 18, w: 76, h: 54 }],
    },
  ],
  "3x2": [
    {
      id: "auto",
      label: "✨ Standar Grid 6 Foto (2 Kolom × 3 Baris)",
      description: "6 foto bervariasi",
      getBoxes: () => [
        { id: "box_1", x: 7, y: 10, w: 41, h: 24 },
        { id: "box_2", x: 52, y: 10, w: 41, h: 24 },
        { id: "box_3", x: 7, y: 38, w: 41, h: 24 },
        { id: "box_4", x: 52, y: 38, w: 41, h: 24 },
        { id: "box_5", x: 7, y: 66, w: 41, h: 24 },
        { id: "box_6", x: 52, y: 66, w: 41, h: 24 },
      ],
    },
  ],
  "4x2": [
    {
      id: "auto",
      label: "✨ Standar Grid 8 Foto (2 Kolom × 4 Baris)",
      description: "8 foto lengkap",
      getBoxes: () => [
        { id: "box_1", x: 7, y: 7, w: 41, h: 18 },
        { id: "box_2", x: 52, y: 7, w: 41, h: 18 },
        { id: "box_3", x: 7, y: 29, w: 41, h: 18 },
        { id: "box_4", x: 52, y: 29, w: 41, h: 18 },
        { id: "box_5", x: 7, y: 51, w: 41, h: 18 },
        { id: "box_6", x: 52, y: 51, w: 41, h: 18 },
        { id: "box_7", x: 7, y: 73, w: 41, h: 18 },
        { id: "box_8", x: 52, y: 73, w: 41, h: 18 },
      ],
    },
  ],
};

/**
 * Cleanly punch transparent holes in a canvas corresponding to the photoBoxes.
 * Can apply rounded corners if borderRadius > 0.
 */
export function punchBoxesOnCanvas(
  canvas: HTMLCanvasElement,
  boxes: PhotoBox[],
  borderRadius: number = 0
): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "rgba(0, 0, 0, 1)";

  boxes.forEach((box) => {
    const bx = Math.round((box.x / 100) * w);
    const by = Math.round((box.y / 100) * h);
    const bw = Math.round((box.w / 100) * w);
    const bh = Math.round((box.h / 100) * h);

    if (borderRadius > 0 && typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(bx, by, bw, bh);
    }
  });

  ctx.restore();
}

/**
 * Derives the active layout configuration dynamically based on the frame slot.
 * If the frame has custom photo boxes, totalPhotos and grid dimensions will adapt automatically.
 */
export function getEffectiveLayout(slot: FrameSlot, allLayouts: LayoutConfig[]): LayoutConfig {
  const baseLayout =
    allLayouts.find((l) => l.id === slot.layoutId) ||
    allLayouts.find((l) => l.id === "3x1") ||
    allLayouts[0];

  const boxCount =
    slot.photoBoxes && slot.photoBoxes.length > 0
      ? slot.photoBoxes.length
      : baseLayout.totalPhotos;

  return {
    ...baseLayout,
    name: slot.name || baseLayout.name,
    totalPhotos: boxCount,
  };
}

/**
 * Calculates the exact aspect ratio (width / height) for an individual photo hole.
 * Used to size the camera viewfinder and crop captures so what you see is what gets placed in the frame.
 */
export function calculateTargetPhotoRatio(
  box?: PhotoBox | null,
  frameRatio: number = 2 / 3,
  layoutAspectRatio?: string
): number {
  if (box && box.w > 0 && box.h > 0) {
    const r = (box.w / box.h) * frameRatio;
    if (r >= 0.4 && r <= 2.5) {
      return r;
    }
  }
  if (layoutAspectRatio === "1/1") return 1.0;
  if (frameRatio < 0.45) return 4 / 3; // Strip 1:3 -> landscape 4:3
  return 3 / 2; // Default 3:2 landscape
}

