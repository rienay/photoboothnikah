export type Screen =
  | "home"
  | "layout"
  | "frame"
  | "filter"
  | "shoot"
  | "review"
  | "result";

export type LayoutId = "1x1" | "2x1" | "3x1" | "2x2" | "3x2" | "4x2";

export interface LayoutConfig {
  id: LayoutId;
  name: string;
  subtitle: string;
  rows: number;
  cols: number;
  totalPhotos: number;
  paperSizeLabel: string;
  badge: string;
  aspectRatio: string;
}

export type FrameThemeId =
  | "royal_gold"
  | "rose_floral"
  | "botanical_sage"
  | "midnight_star"
  | "minimal_ivory"
  | "custom";

export interface WeddingFramePreset {
  id: FrameThemeId;
  name: string;
  description: string;
  bgGradient: string;
  bgColor: string;
  borderColor: string;
  accentColor: string;
  textColor: string;
  secondaryTextColor: string;
  headerStyle: "ornament" | "flourish" | "minimal" | "botanical";
  previewClass: string;
}
export interface FrameSlot {
  id: string; // "slot_1" | "slot_2" | "slot_3" | custom id
  name: string;
  layoutId: LayoutId;
  customImage?: string;
  presetThemeId: FrameThemeId;
  enabled?: boolean;
  presetId?: string;
  photoBoxes?: { id: string; x: number; y: number; w: number; h: number }[];
}
export interface CameraFilter {
  id: string;
  name: string;
  css: string;
  desc: string;
  emoji: string;
}

export interface WeddingConfig {
  groomName: string;
  brideName: string;
  weddingDate: string;
  venueText: string;
  hashtag: string;
  footerText: string;
}

export interface DriveConfig {
  appsScriptUrl: string;
  driveFolderUrl: string;
  autoUpload: boolean;
}

export interface BoothSettings {
  countdownDuration: number;
  autoResetDuration: number;
  soundEnabled: boolean;
  mirrorCamera: boolean;
  adminPin: string;
  defaultPrintCopies: number;
  selectedCameraId?: string;
  kioskFullscreen: boolean;
}

export interface CustomTemplate {
  id: string;
  name: string;
  layout: LayoutId;
  imageUrl: string; // PNG transparent overlay
  createdAt: number;
}

export interface SavedSession {
  id: string;
  timestamp: number;
  dateStr: string;
  layout: LayoutId;
  frameTheme: string;
  stripDataUrl: string;
  driveUploadStatus: "success" | "error" | "pending" | "none";
}
