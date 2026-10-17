import {
  BoothSettings,
  CustomTemplate,
  DriveConfig,
  FrameSlot,
  PartyConfig,
  SavedSession,
  WeddingConfig,
} from "../types";
import {
  DEFAULT_BOOTH_SETTINGS,
  DEFAULT_DRIVE_CONFIG,
  DEFAULT_FRAME_SLOTS,
  DEFAULT_PARTY_CONFIG,
  DEFAULT_PARTY_FRAME_SLOTS,
  DEFAULT_WEDDING_CONFIG,
} from "../config";
import {
  pushFramesToCloud,
  CloudSyncConfig,
  loadCloudSyncConfig,
  saveCloudSyncConfig,
} from "./cloudSync";
import {
  loadFramesFromIndexedDB,
  saveFramesToIndexedDB,
} from "./frameDB";

const KEYS = {
  WEDDING: "yodha_wedding_config",
  PARTY: "yodha_party_config",
  DRIVE: "yodha_drive_config",
  SETTINGS: "yodha_booth_settings",
  TEMPLATES: "yodha_custom_templates",
  HISTORY: "yodha_session_history",
  SLOTS: "yodha_frame_slots",
  PARTY_SLOTS: "yodha_party_frame_slots",
};

export interface ServerSharedConfig {
  frameSlots?: FrameSlot[];
  partyFrameSlots?: FrameSlot[];
  weddingConfig?: WeddingConfig;
  partyConfig?: PartyConfig;
  driveConfig?: DriveConfig;
  boothSettings?: BoothSettings;
  cloudSyncConfig?: CloudSyncConfig;
  updatedAt?: number;
  partyUpdatedAt?: number;
}

let cachedEndpoint: string | null = null;

export const syncChannel = typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel("yodha_sync_channel")
  : null;

function getStorageEndpoints(): string[] {
  if (typeof window === "undefined") return ["/api/config", "api.php", "../api.php"];
  
  const currentPath = window.location.pathname;
  const dir = currentPath.substring(0, currentPath.lastIndexOf("/") + 1);

  const list = [
    `${dir}api.php`,
    `${dir}../api.php`,
    "api.php",
    "../api.php",
    "/api/config",
    "/api.php",
  ];

  if (cachedEndpoint) {
    return [cachedEndpoint, ...list.filter((u) => u !== cachedEndpoint)];
  }
  return list;
}

let lastLocalFrameUpdate: number = 0;
let lastLocalPartyFrameUpdate: number = 0;

export function getLastLocalFrameUpdate(): number {
  return lastLocalFrameUpdate;
}

export function setLastLocalFrameUpdate(ts: number): void {
  lastLocalFrameUpdate = ts;
}

export function getLastLocalPartyFrameUpdate(): number {
  return lastLocalPartyFrameUpdate;
}

export function setLastLocalPartyFrameUpdate(ts: number): void {
  lastLocalPartyFrameUpdate = ts;
}

let cachedMemorySlots: FrameSlot[] | null = null;
let cachedPartyMemorySlots: FrameSlot[] | null = null;

export function getCachedMemorySlots(): FrameSlot[] | null {
  return cachedMemorySlots;
}

export function setCachedMemorySlots(slots: FrameSlot[]): void {
  if (Array.isArray(slots) && slots.length > 0) {
    cachedMemorySlots = slots;
  }
}

export function getCachedPartyMemorySlots(): FrameSlot[] | null {
  return cachedPartyMemorySlots;
}

export function setCachedPartyMemorySlots(slots: FrameSlot[]): void {
  if (Array.isArray(slots) && slots.length > 0) {
    cachedPartyMemorySlots = slots;
  }
}

// Check and push changes to server storage so other devices get them
export async function pushToServer(partialData: Partial<ServerSharedConfig>): Promise<boolean> {
  try {
    const timestamp = partialData.updatedAt || Date.now();
    const partyTimestamp = partialData.partyUpdatedAt || Date.now();
    const slotsToPush = partialData.frameSlots || cachedMemorySlots || loadFrameSlots();
    const partySlotsToPush = partialData.partyFrameSlots || cachedPartyMemorySlots || loadPartyFrameSlots();
    const payload: ServerSharedConfig = {
      frameSlots: slotsToPush,
      partyFrameSlots: partySlotsToPush,
      weddingConfig: partialData.weddingConfig || loadWeddingConfig(),
      partyConfig: partialData.partyConfig || loadPartyConfig(),
      driveConfig: partialData.driveConfig || loadDriveConfig(),
      boothSettings: partialData.boothSettings || loadBoothSettings(),
      cloudSyncConfig: partialData.cloudSyncConfig || loadCloudSyncConfig(),
      updatedAt: timestamp,
      partyUpdatedAt: partyTimestamp,
    };

    // Broadcast immediately to other tabs on the same machine
    try {
      syncChannel?.postMessage({ type: "CONFIG_UPDATED", data: payload });
    } catch (_) {}

    const endpoints = getStorageEndpoints();
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          cachedEndpoint = url;
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
    const endpoints = getStorageEndpoints();
    for (const url of endpoints) {
      try {
        const res = await fetch(url, { method: "GET", cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as ServerSharedConfig;
          if (data && typeof data === "object" && Object.keys(data).length > 0) {
            cachedEndpoint = url;

            // 1. Wedding frameSlots
            if (data.frameSlots && Array.isArray(data.frameSlots) && data.frameSlots.length > 0) {
              const serverUpdatedAt = data.updatedAt || 0;
              if (serverUpdatedAt >= lastLocalFrameUpdate) {
                lastLocalFrameUpdate = serverUpdatedAt;
                cachedMemorySlots = data.frameSlots;
                saveFramesToIndexedDB(data.frameSlots, serverUpdatedAt, "current_frame_slots").catch(() => {});
                try {
                  localStorage.setItem(KEYS.SLOTS, JSON.stringify(data.frameSlots));
                } catch (_) {}
              } else {
                data.frameSlots = undefined;
                pushToServer({ updatedAt: lastLocalFrameUpdate }).catch(() => {});
              }
            }

            // 2. Party frameSlots
            if (data.partyFrameSlots && Array.isArray(data.partyFrameSlots) && data.partyFrameSlots.length > 0) {
              const serverPartyUpdatedAt = data.partyUpdatedAt || 0;
              if (serverPartyUpdatedAt >= lastLocalPartyFrameUpdate) {
                lastLocalPartyFrameUpdate = serverPartyUpdatedAt;
                cachedPartyMemorySlots = data.partyFrameSlots;
                saveFramesToIndexedDB(data.partyFrameSlots, serverPartyUpdatedAt, "party_frame_slots").catch(() => {});
                try {
                  localStorage.setItem(KEYS.PARTY_SLOTS, JSON.stringify(data.partyFrameSlots));
                } catch (_) {}
              } else {
                data.partyFrameSlots = undefined;
                pushToServer({ partyUpdatedAt: lastLocalPartyFrameUpdate }).catch(() => {});
              }
            }

            if (data.weddingConfig && data.weddingConfig.brideName) {
              try {
                localStorage.setItem(KEYS.WEDDING, JSON.stringify(data.weddingConfig));
              } catch (_) {}
            }
            if (data.partyConfig && data.partyConfig.eventName) {
              try {
                localStorage.setItem(KEYS.PARTY, JSON.stringify(data.partyConfig));
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
            if (data.cloudSyncConfig && data.cloudSyncConfig.supabaseUrl) {
              try {
                const cur = loadCloudSyncConfig();
                if (!cur.supabaseUrl || cur.supabaseUrl !== data.cloudSyncConfig.supabaseUrl) {
                  saveCloudSyncConfig({
                    ...data.cloudSyncConfig,
                    enabled: true,
                  });
                }
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
  if (cachedMemorySlots && cachedMemorySlots.length > 0) {
    return cachedMemorySlots;
  }
  try {
    const raw = localStorage.getItem(KEYS.SLOTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedMemorySlots = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load frame slots:", e);
  }
  return DEFAULT_FRAME_SLOTS;
}

/**
 * Initializes frame slots from IndexedDB first (bypassing localStorage 5MB quota).
 * If IndexedDB is empty, falls back to localStorage or DEFAULT_FRAME_SLOTS and migrates them.
 */
export async function initFrameSlots(): Promise<FrameSlot[]> {
  try {
    const idbResult = await loadFramesFromIndexedDB();
    if (idbResult && idbResult.slots && idbResult.slots.length > 0) {
      if (idbResult.updatedAt) {
        lastLocalFrameUpdate = Math.max(lastLocalFrameUpdate, idbResult.updatedAt);
      }
      cachedMemorySlots = idbResult.slots;
      return idbResult.slots;
    }
  } catch (err) {
    console.warn("Failed loading frames from IndexedDB:", err);
  }

  // Fallback to localStorage or defaults
  const localSlots = loadFrameSlots();
  if (localSlots && localSlots.length > 0 && localSlots !== DEFAULT_FRAME_SLOTS) {
    cachedMemorySlots = localSlots;
    saveFramesToIndexedDB(localSlots, lastLocalFrameUpdate).catch(() => {});
  }
  return localSlots;
}

export function saveFrameSlots(slots: FrameSlot[], timestamp: number = Date.now()): void {
  lastLocalFrameUpdate = Math.max(lastLocalFrameUpdate, timestamp);
  cachedMemorySlots = slots;

  // 1. Always save to IndexedDB (safe from quota limits)
  saveFramesToIndexedDB(slots, timestamp, "current_frame_slots").catch((err) => {
    console.error("Failed to save frame slots to IndexedDB:", err);
  });

  // 2. Try saving to localStorage safely (ignore quota errors if slots contain large base64)
  try {
    localStorage.setItem(KEYS.SLOTS, JSON.stringify(slots));
  } catch (quotaErr) {
    console.warn("localStorage quota exceeded for frame slots; safely stored in IndexedDB:", quotaErr);
  }

  // 3. Broadcast to other tabs on same machine
  try {
    syncChannel?.postMessage({
      type: "CONFIG_UPDATED",
      data: { frameSlots: slots, updatedAt: timestamp },
    });
  } catch (_) {}

  // 4. Push to local dev/PHP server
  pushToServer({ frameSlots: slots, updatedAt: timestamp }).catch(() => {});

  // 5. Push to cloud database if configured
  pushFramesToCloud(slots).catch(() => {});
}

// ---------------------------------------------------------------------------
// Party Frame Slots Management
// ---------------------------------------------------------------------------
export function loadPartyFrameSlots(): FrameSlot[] {
  if (cachedPartyMemorySlots && cachedPartyMemorySlots.length > 0) {
    // If it has frames other than the 5 official frames, clean it to exactly the 5 official frames
    if (
      cachedPartyMemorySlots.length !== DEFAULT_PARTY_FRAME_SLOTS.length ||
      cachedPartyMemorySlots.some((s) => !DEFAULT_PARTY_FRAME_SLOTS.some((d) => d.id === s.id))
    ) {
      cachedPartyMemorySlots = DEFAULT_PARTY_FRAME_SLOTS;
      try {
        localStorage.setItem(KEYS.PARTY_SLOTS, JSON.stringify(DEFAULT_PARTY_FRAME_SLOTS));
      } catch (_) {}
    }
    return cachedPartyMemorySlots;
  }
  try {
    const raw = localStorage.getItem(KEYS.PARTY_SLOTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Enforce strictly only the 5 official frames
        if (
          parsed.length !== DEFAULT_PARTY_FRAME_SLOTS.length ||
          parsed.some((s: any) => !DEFAULT_PARTY_FRAME_SLOTS.some((d) => d.id === s.id))
        ) {
          cachedPartyMemorySlots = DEFAULT_PARTY_FRAME_SLOTS;
          try {
            localStorage.setItem(KEYS.PARTY_SLOTS, JSON.stringify(DEFAULT_PARTY_FRAME_SLOTS));
          } catch (_) {}
          saveFramesToIndexedDB(DEFAULT_PARTY_FRAME_SLOTS, Date.now(), "party_frame_slots").catch(() => {});
          return DEFAULT_PARTY_FRAME_SLOTS;
        }
        cachedPartyMemorySlots = parsed;
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load party frame slots:", e);
  }
  cachedPartyMemorySlots = DEFAULT_PARTY_FRAME_SLOTS;
  return DEFAULT_PARTY_FRAME_SLOTS;
}

export async function initPartyFrameSlots(): Promise<FrameSlot[]> {
  try {
    const idbResult = await loadFramesFromIndexedDB("party_frame_slots");
    if (idbResult && idbResult.slots && idbResult.slots.length > 0) {
      // If it contains other/old frames, sanitize to only the 5 official frames
      if (
        idbResult.slots.length !== DEFAULT_PARTY_FRAME_SLOTS.length ||
        idbResult.slots.some((s: any) => !DEFAULT_PARTY_FRAME_SLOTS.some((d) => d.id === s.id))
      ) {
        cachedPartyMemorySlots = DEFAULT_PARTY_FRAME_SLOTS;
        saveFramesToIndexedDB(DEFAULT_PARTY_FRAME_SLOTS, Date.now(), "party_frame_slots").catch(() => {});
        try {
          localStorage.setItem(KEYS.PARTY_SLOTS, JSON.stringify(DEFAULT_PARTY_FRAME_SLOTS));
        } catch (_) {}
        return DEFAULT_PARTY_FRAME_SLOTS;
      }
      cachedPartyMemorySlots = idbResult.slots;
      return idbResult.slots;
    }
  } catch (err) {
    console.warn("Failed loading party frames from IndexedDB:", err);
  }

  // Fallback to defaults
  const localSlots = loadPartyFrameSlots();
  cachedPartyMemorySlots = localSlots;
  saveFramesToIndexedDB(localSlots, Date.now(), "party_frame_slots").catch(() => {});
  return localSlots;
}

export function savePartyFrameSlots(slots: FrameSlot[], timestamp: number = Date.now()): void {
  lastLocalPartyFrameUpdate = Math.max(lastLocalPartyFrameUpdate, timestamp);
  cachedPartyMemorySlots = slots;

  // 1. Always save to IndexedDB
  saveFramesToIndexedDB(slots, timestamp, "party_frame_slots").catch((err) => {
    console.error("Failed to save party frame slots to IndexedDB:", err);
  });

  // 2. Try saving to localStorage safely
  try {
    localStorage.setItem(KEYS.PARTY_SLOTS, JSON.stringify(slots));
  } catch (quotaErr) {
    console.warn("localStorage quota exceeded for party frame slots:", quotaErr);
  }

  // 3. Broadcast to other tabs on same machine
  try {
    syncChannel?.postMessage({
      type: "CONFIG_UPDATED",
      data: { partyFrameSlots: slots, partyUpdatedAt: timestamp },
    });
  } catch (_) {}

  // 4. Push to local server
  pushToServer({ partyFrameSlots: slots, partyUpdatedAt: timestamp }).catch(() => {});

  // 5. Push party frames to cloud database if configured
  pushFramesToCloud(slots, undefined, "party_frames").catch(() => {});
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

export function loadPartyConfig(): PartyConfig {
  try {
    const raw = localStorage.getItem(KEYS.PARTY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.title === "PHOTOBOOTH PARTY" || parsed.eventName === "Yodha Party & Celebration") {
        return DEFAULT_PARTY_CONFIG;
      }
      return { ...DEFAULT_PARTY_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn("Failed to load party config:", e);
  }
  return DEFAULT_PARTY_CONFIG;
}

export function savePartyConfig(config: PartyConfig): void {
  try {
    localStorage.setItem(KEYS.PARTY, JSON.stringify(config));
    pushToServer({ partyConfig: config }).catch(() => {});
  } catch (e) {
    console.error("Failed to save party config:", e);
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
    if (raw) return { ...DEFAULT_BOOTH_SETTINGS, ...JSON.parse(raw), screenRotation: 0 };
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
