import {
  BoothSettings,
  CustomTemplate,
  DriveConfig,
  FrameSlot,
  SavedSession,
  WeddingConfig,
} from "../types";
import {
  DEFAULT_BOOTH_SETTINGS,
  DEFAULT_DRIVE_CONFIG,
  DEFAULT_FRAME_SLOTS,
  DEFAULT_WEDDING_CONFIG,
} from "../config";

const KEYS = {
  WEDDING: "yodha_wedding_config",
  DRIVE: "yodha_drive_config",
  SETTINGS: "yodha_booth_settings",
  TEMPLATES: "yodha_custom_templates",
  HISTORY: "yodha_session_history",
  SLOTS: "yodha_frame_slots",
};

export interface ServerSharedConfig {
  frameSlots?: FrameSlot[];
  weddingConfig?: WeddingConfig;
  driveConfig?: DriveConfig;
  boothSettings?: BoothSettings;
  updatedAt?: number;
}

// Check and push changes to server storage so other devices get them
export async function pushToServer(partialData: Partial<ServerSharedConfig>): Promise<boolean> {
  try {
    const payload: ServerSharedConfig = {
      frameSlots: partialData.frameSlots || loadFrameSlots(),
      weddingConfig: partialData.weddingConfig || loadWeddingConfig(),
      driveConfig: partialData.driveConfig || loadDriveConfig(),
      boothSettings: partialData.boothSettings || loadBoothSettings(),
      updatedAt: Date.now(),
    };

    const endpoints = ["/api/config", "api.php", "../api.php"];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return true;
        }
      } catch (err) {
        // try next endpoint
      }
    }
  } catch (e) {
    console.warn("Could not push to server:", e);
  }
  return false;
}

// Fetch shared config from server storage
export async function syncFromServer(): Promise<ServerSharedConfig | null> {
  try {
    const endpoints = ["/api/config", "api.php", "../api.php"];
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { method: "GET", cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as ServerSharedConfig;
          if (data && Object.keys(data).length > 0) {
            // Update local storage so offline access also matches
            if (data.frameSlots && Array.isArray(data.frameSlots) && data.frameSlots.length > 0) {
              try {
                localStorage.setItem(KEYS.SLOTS, JSON.stringify(data.frameSlots));
              } catch (_) {}
            }
            if (data.weddingConfig && data.weddingConfig.brideName) {
              try {
                localStorage.setItem(KEYS.WEDDING, JSON.stringify(data.weddingConfig));
              } catch (_) {}
            }
            if (data.driveConfig) {
              try {
                localStorage.setItem(KEYS.DRIVE, JSON.stringify(data.driveConfig));
              } catch (_) {}
            }
            if (data.boothSettings) {
              try {
                localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.boothSettings));
              } catch (_) {}
            }
            return data;
          }
        }
      } catch (err) {
        // try next endpoint
      }
    }
  } catch (e) {
    console.warn("Server sync check error:", e);
  }
  return null;
}

export function loadFrameSlots(): FrameSlot[] {
  try {
    const raw = localStorage.getItem(KEYS.SLOTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to load frame slots:", e);
  }
  return DEFAULT_FRAME_SLOTS;
}

export function saveFrameSlots(slots: FrameSlot[]): void {
  try {
    localStorage.setItem(KEYS.SLOTS, JSON.stringify(slots));
    pushToServer({ frameSlots: slots }).catch(() => {});
  } catch (e) {
    console.error("Failed to save frame slots:", e);
  }
}

// ---------------------------------------------------------------------------
// LocalStorage helpers with fallback
// ---------------------------------------------------------------------------
export function loadWeddingConfig(): WeddingConfig {
  try {
    const raw = localStorage.getItem(KEYS.WEDDING);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.brideName === "Arkan" || (parsed.footerText && parsed.footerText.includes("Arkan"))) {
        return DEFAULT_WEDDING_CONFIG;
      }
      return { ...DEFAULT_WEDDING_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn("Failed to load wedding config:", e);
  }
  return DEFAULT_WEDDING_CONFIG;
}

export function saveWeddingConfig(config: WeddingConfig): void {
  try {
    localStorage.setItem(KEYS.WEDDING, JSON.stringify(config));
    pushToServer({ weddingConfig: config }).catch(() => {});
  } catch (e) {
    console.error("Failed to save wedding config:", e);
  }
}

export function loadDriveConfig(): DriveConfig {
  try {
    const raw = localStorage.getItem(KEYS.DRIVE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        !parsed.driveFolderUrl ||
        parsed.driveFolderUrl.includes("1lwRNyZWiwyWjOaAh9oDH-uA9pxWtScCN") ||
        !parsed.appsScriptUrl ||
        parsed.appsScriptUrl.includes("AKfycbwjEdDj58epC0wLH3pHAbzpyaM9d_ab2qYXd-7Yf2da0lxYlEuVQMKxYoozqmPVCmRS")
      ) {
        return DEFAULT_DRIVE_CONFIG;
      }
      return { ...DEFAULT_DRIVE_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn("Failed to load drive config:", e);
  }
  return DEFAULT_DRIVE_CONFIG;
}

export function saveDriveConfig(config: DriveConfig): void {
  try {
    localStorage.setItem(KEYS.DRIVE, JSON.stringify(config));
    pushToServer({ driveConfig: config }).catch(() => {});
  } catch (e) {
    console.error("Failed to save drive config:", e);
  }
}

export function loadBoothSettings(): BoothSettings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (raw) return { ...DEFAULT_BOOTH_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Failed to load booth settings:", e);
  }
  return DEFAULT_BOOTH_SETTINGS;
}

export function saveBoothSettings(settings: BoothSettings): void {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    pushToServer({ boothSettings: settings }).catch(() => {});
  } catch (e) {
    console.error("Failed to save booth settings:", e);
  }
}

// ---------------------------------------------------------------------------
// Custom Template Storage (IndexedDB for storing large image files safely)
// ---------------------------------------------------------------------------
const DB_NAME = "YodhaWeddingPhotoboothDB";
const STORE_TEMPLATES = "custom_templates";
const STORE_SESSIONS = "sessions";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported"));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_TEMPLATES)) {
        db.createObjectStore(STORE_TEMPLATES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllCustomTemplates(): Promise<CustomTemplate[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TEMPLATES, "readonly");
      const store = tx.objectStore(STORE_TEMPLATES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveCustomTemplate(template: CustomTemplate): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TEMPLATES, "readwrite");
      const store = tx.objectStore(STORE_TEMPLATES);
      const req = store.put(template);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function deleteCustomTemplate(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TEMPLATES, "readwrite");
      const store = tx.objectStore(STORE_TEMPLATES);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session History
// ---------------------------------------------------------------------------
export async function getSessionHistory(): Promise<SavedSession[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SESSIONS, "readonly");
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list: SavedSession[] = req.result || [];
        // Sort newest first
        list.sort((a, b) => b.timestamp - a.timestamp);
        resolve(list.slice(0, 50)); // Keep max 50 recent
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveSessionHistory(session: SavedSession): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SESSIONS, "readwrite");
    const store = tx.objectStore(STORE_SESSIONS);
    store.put(session);
  } catch (e) {
    console.warn("Failed to save session history:", e);
  }
}

export async function clearSessionHistory(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_SESSIONS, "readwrite");
    const store = tx.objectStore(STORE_SESSIONS);
    store.clear();
  } catch (e) {
    console.warn("Failed to clear session history:", e);
  }
}
