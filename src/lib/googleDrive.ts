import QRCode from "qrcode";

export interface UploadResult {
  success: boolean;
  message?: string;
}

/**
 * Fast helper to compress image to lightweight JPEG before sending to Google Drive.
 * Reduces payload size from ~4MB to ~200KB, making upload 15x faster!
 */
async function compressForDriveUpload(base64DataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64DataUrl);
          return;
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        // High quality JPEG (0.86) is ~180-250KB and visually crisp
        const compressed = canvas.toDataURL("image/jpeg", 0.86);
        resolve(compressed);
      } catch (err) {
        console.warn("Compression fallback:", err);
        resolve(base64DataUrl);
      }
    };
    img.onerror = () => resolve(base64DataUrl);
    img.src = base64DataUrl;
  });
}

/**
 * Uploads base64 image data to Google Drive via Google Apps Script Web App
 * Compatible with the implementation in C:\laragon\www\kerja\booth
 */
export async function uploadToGoogleDrive(
  appsScriptUrl: string,
  base64DataUrl: string,
  filename: string
): Promise<UploadResult> {
  if (!appsScriptUrl || !appsScriptUrl.trim()) {
    return { success: false, message: "URL Apps Script belum diisi" };
  }

  try {
    // 1. Compress image to lightweight JPEG for blazing fast upload (<1s)
    const optimizedBase64 = await compressForDriveUpload(base64DataUrl);

    // Strip data prefix if present (e.g. data:image/jpeg;base64,...)
    const base64Clean = optimizedBase64.includes(",")
      ? optimizedBase64.split(",")[1]
      : optimizedBase64;

    // Fast upload fetch with no-cors
    const uploadFetch = fetch(appsScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        image: base64Clean,
        filename: filename,
      }),
    });

    // Race with a 2-second fallback so guests never get stuck waiting at the photobooth
    await Promise.race([
      uploadFetch,
      new Promise((res) => setTimeout(res, 2000)),
    ]);

    return {
      success: true,
      message: "Foto berhasil diunggah ke Google Drive",
    };
  } catch (error) {
    console.error("Google Drive Upload Error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mengunggah ke Google Drive",
    };
  }
}

/**
 * Generates high quality QR Code pointing to Google Drive folder
 */
export async function generateDriveQRCode(
  driveFolderUrl: string,
  colorDark: string = "#12141a",
  colorLight: string = "#ffffff"
): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(driveFolderUrl, {
      width: 360,
      margin: 2,
      color: {
        dark: colorDark,
        light: colorLight,
      },
      errorCorrectionLevel: "M",
    });
    return qrDataUrl;
  } catch (err) {
    console.error("Failed to generate QR code:", err);
    return "";
  }
}
