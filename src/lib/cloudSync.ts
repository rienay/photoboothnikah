import { FrameSlot } from "../types";

export interface CloudSyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  enabled: boolean;
  lastSyncedAt?: number;
}

const STORAGE_KEY = "yodha_cloud_sync_config";

export const DEFAULT_CLOUD_SYNC: CloudSyncConfig = {
  supabaseUrl: "",
  supabaseAnonKey: "",
  enabled: false,
};

export const SUPABASE_SQL_SETUP = `-- Jalankan perintah ini di Menu 'SQL Editor' pada dashboard Supabase Anda:
CREATE TABLE IF NOT EXISTS photobooth_frames (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Izinkan akses publik (baca dan tulis) untuk photobooth
ALTER TABLE photobooth_frames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access photobooth_frames" ON photobooth_frames;
CREATE POLICY "Public Access photobooth_frames" 
ON photobooth_frames 
FOR ALL 
USING (true) 
WITH CHECK (true);
`;

export function loadCloudSyncConfig(): CloudSyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_CLOUD_SYNC, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn("Failed to load cloud sync config:", e);
  }
  return DEFAULT_CLOUD_SYNC;
}

export function saveCloudSyncConfig(cfg: CloudSyncConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (e) {
    console.error("Failed to save cloud sync config:", e);
  }
}

/**
 * Normalizes URL ensuring no trailing slash
 */
function cleanUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Tests connection to the Supabase photobooth_frames table
 */
export async function testCloudConnection(
  urlInput: string,
  keyInput: string
): Promise<{ success: boolean; message: string; tableReady?: boolean }> {
  const url = cleanUrl(urlInput);
  const key = keyInput.trim();

  if (!url || !key) {
    return { success: false, message: "URL dan Anon Key Supabase wajib diisi." };
  }

  try {
    const testEndpoint = `${url}/rest/v1/photobooth_frames?select=id&limit=1`;
    const res = await fetch(testEndpoint, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (res.ok) {
      return {
        success: true,
        tableReady: true,
        message: "✓ Berhasil terhubung ke Supabase! Tabel 'photobooth_frames' siap digunakan.",
      };
    }

    if (res.status === 404 || res.status === 400) {
      const errBody = await res.text();
      if (errBody.includes("relation") || errBody.includes("not find") || res.status === 404) {
        return {
          success: false,
          tableReady: false,
          message:
            "Koneksi tersambung, tetapi tabel 'photobooth_frames' belum dibuat di Supabase. Silakan jalankan script SQL yang tersedia.",
        };
      }
    }

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        message: "Koneksi ditolak (401/403). Periksa kembali Supabase Anon Key Anda.",
      };
    }

    return {
      success: false,
      message: `Supabase merespons dengan status HTTP ${res.status}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungi Supabase: ${err.message || "Periksa koneksi internet."}`,
    };
  }
}

/**
 * Uploads (upserts) the active frame slots to Supabase
 */
export async function pushFramesToCloud(
  slots: FrameSlot[],
  overrideCfg?: CloudSyncConfig
): Promise<{ success: boolean; message?: string }> {
  const cfg = overrideCfg || loadCloudSyncConfig();
  if (!cfg.enabled || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    return { success: false, message: "Sinkronisasi cloud belum aktif atau belum dikonfigurasi." };
  }

  const url = `${cleanUrl(cfg.supabaseUrl)}/rest/v1/photobooth_frames`;
  const key = cfg.supabaseAnonKey.trim();

  try {
    const payload = {
      id: "active_frames",
      data: slots,
      updated_at: new Date().toISOString(),
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      cfg.lastSyncedAt = Date.now();
      saveCloudSyncConfig(cfg);
      return { success: true };
    }

    const errText = await res.text();
    return { success: false, message: `Gagal upload ke Supabase: ${res.status} - ${errText}` };
  } catch (e: any) {
    return { success: false, message: e.message || "Gagal upload frame ke cloud." };
  }
}

/**
 * Downloads the active frame slots from Supabase
 */
export async function fetchFramesFromCloud(
  overrideCfg?: CloudSyncConfig
): Promise<{ success: boolean; frames?: FrameSlot[]; updatedAt?: string; message?: string }> {
  const cfg = overrideCfg || loadCloudSyncConfig();
  if (!cfg.enabled || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    return { success: false, message: "Sinkronisasi cloud belum aktif." };
  }

  const url = `${cleanUrl(cfg.supabaseUrl)}/rest/v1/photobooth_frames?id=eq.active_frames&select=*`;
  const key = cfg.supabaseAnonKey.trim();

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, message: `Status HTTP ${res.status}` };
    }

    const rows = await res.json();
    if (Array.isArray(rows) && rows.length > 0) {
      const row = rows[0];
      if (row.data && Array.isArray(row.data) && row.data.length > 0) {
        cfg.lastSyncedAt = Date.now();
        saveCloudSyncConfig(cfg);
        return {
          success: true,
          frames: row.data as FrameSlot[],
          updatedAt: row.updated_at,
        };
      }
    }

    return { success: false, message: "Belum ada frame tersimpan di Supabase." };
  } catch (e: any) {
    return { success: false, message: e.message || "Gagal mengunduh frame dari cloud." };
  }
}
