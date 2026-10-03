import { FrameSlot } from "../types";

const DB_NAME = "YodhaPhotoboothDB";
const DB_VERSION = 1;
const STORE_NAME = "frame_slots";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported"));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Loads all frame slots from IndexedDB, preserving exact ordering.
 */
export async function loadFramesFromIndexedDB(): Promise<{ slots: FrameSlot[]; updatedAt?: number } | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get("current_frame_slots");
      req.onsuccess = () => {
        if (req.result && Array.isArray(req.result.list) && req.result.list.length > 0) {
          resolve({ slots: req.result.list, updatedAt: req.result.updatedAt });
        } else {
          // Fallback check if old format was saved via getAll()
          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const raw = (allReq.result || []).filter((item: any) => item && item.id !== "current_frame_slots");
            if (raw.length > 0) {
              resolve({ slots: raw as FrameSlot[] });
            } else {
              resolve(null);
            }
          };
          allReq.onerror = () => resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("Could not load from IndexedDB, falling back to localStorage:", err);
    return null;
  }
}

/**
 * Persists all frame slots to IndexedDB safely without any 5MB quota restrictions, preserving array order.
 */
export async function saveFramesToIndexedDB(slots: FrameSlot[], updatedAt: number = Date.now()): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        id: "current_frame_slots",
        list: slots,
        updatedAt,
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve();
    });
  } catch (err) {
    console.error("Failed saving frames to IndexedDB:", err);
  }
}
