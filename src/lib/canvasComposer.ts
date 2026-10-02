import { LayoutConfig, PhotoBox, WeddingConfig, WeddingFramePreset } from "../types";
import { getDefaultBoxesForLayout } from "./frameLayouts";

export interface ComposeOptions {
  photos: string[]; // data URLs
  layout: LayoutConfig;
  preset: WeddingFramePreset;
  customOverlayUrl?: string;
  photoBoxes?: PhotoBox[];
  weddingConfig: WeddingConfig;
  filterCss?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/**
 * Draws an image with object-fit: cover into specified rect with optional rounded corners
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 0
) {
  ctx.save();

  if (radius > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.clip();
  }

  const imgRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = w / h;

  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (imgRatio > targetRatio) {
    sw = img.naturalHeight * targetRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / targetRatio;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

/**
 * Composes a full resolution wedding photobooth strip
 */
export async function composeWeddingStrip(options: ComposeOptions): Promise<string> {
  const { photos, layout, preset, customOverlayUrl, photoBoxes, weddingConfig, filterCss } = options;

  // Load photos
  const loadedPhotos = await Promise.all(
    photos.map((p) => (p ? loadImage(p).catch(() => null) : null))
  );

  // If custom frame overlay is present, compose photos according to photoBoxes and overlay on top
  if (customOverlayUrl) {
    try {
      const overlayImg = await loadImage(customOverlayUrl);
      const W = overlayImg.naturalWidth > 0 ? overlayImg.naturalWidth : (layout.cols === 1 ? 600 : 1200);
      const H = overlayImg.naturalHeight > 0 ? overlayImg.naturalHeight : 1800;

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Could not initialize canvas context");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // 1. Clean paper base
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);

      // 2. Determine target photo boxes
      const targetBoxes =
        photoBoxes && photoBoxes.length > 0
          ? photoBoxes
          : getDefaultBoxesForLayout(layout.id);

      // 3. Draw each photo in its designated box (under the frame overlay)
      const totalPhotosToDraw = Math.min(layout.totalPhotos, targetBoxes.length);
      for (let i = 0; i < totalPhotosToDraw; i++) {
        const box = targetBoxes[i];
        const bx = Math.round((box.x / 100) * W);
        const by = Math.round((box.y / 100) * H);
        const bw = Math.round((box.w / 100) * W);
        const bh = Math.round((box.h / 100) * H);

        const img = loadedPhotos[i];
        if (img) {
          ctx.save();
          if (filterCss && filterCss !== "none") {
            ctx.filter = filterCss;
          }
          drawImageCover(ctx, img, bx, by, bw, bh, 0);
          ctx.restore();
        } else {
          ctx.fillStyle = "#F1F5F9";
          ctx.fillRect(bx, by, bw, bh);
        }
      }

      // 4. Draw Custom Frame Overlay directly on top so photos peek cleanly through holes
      ctx.drawImage(overlayImg, 0, 0, W, H);

      return canvas.toDataURL("image/png");
    } catch (err) {
      console.warn("Failed drawing custom overlay, falling back to preset compose:", err);
    }
  }

  // Preset Theme Composition (Standard high resolution canvas dimensions)
  const isStrip = layout.cols === 1;
  const W = isStrip ? 600 : 1200;
  const H = 1800; // 10x15cm (4R) or 5x15cm (Strip)

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) throw new Error("Could not initialize canvas context");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 1. Draw Background
  if (preset.id === "minimal_ivory") {
    ctx.fillStyle = "#FAF7F2";
    ctx.fillRect(0, 0, W, H);
  } else if (preset.id === "botanical_sage") {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#131C16");
    bgGrad.addColorStop(1, "#0A100C");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
  } else if (preset.id === "rose_floral") {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#1D1618");
    bgGrad.addColorStop(1, "#110D0F");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
  } else if (preset.id === "midnight_star") {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#0C1220");
    bgGrad.addColorStop(1, "#060810");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
  } else {
    // Royal Champagne Gold
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, "#161921");
    bgGrad.addColorStop(1, "#0D0F14");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // 2. Draw Elegant Double Hairline Border
  const outerMargin = W * 0.035;
  const innerMargin = outerMargin + (W * 0.012);

  ctx.strokeStyle = preset.borderColor;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(outerMargin, outerMargin, W - outerMargin * 2, H - outerMargin * 2);

  ctx.strokeStyle = `${preset.borderColor}66`; // 40% alpha
  ctx.lineWidth = 1;
  ctx.strokeRect(innerMargin, innerMargin, W - innerMargin * 2, H - innerMargin * 2);

  // 3. Corner Flourishes
  const cornerSize = W * 0.045;
  ctx.strokeStyle = preset.accentColor;
  ctx.lineWidth = 1.5;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(outerMargin - 2, outerMargin + cornerSize);
  ctx.lineTo(outerMargin - 2, outerMargin - 2);
  ctx.lineTo(outerMargin + cornerSize, outerMargin - 2);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(W - outerMargin + 2 - cornerSize, outerMargin - 2);
  ctx.lineTo(W - outerMargin + 2, outerMargin - 2);
  ctx.lineTo(W - outerMargin + 2, outerMargin + cornerSize);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(outerMargin - 2, H - outerMargin - cornerSize);
  ctx.lineTo(outerMargin - 2, H - outerMargin + 2);
  ctx.lineTo(outerMargin + cornerSize, H - outerMargin + 2);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(W - outerMargin + 2 - cornerSize, H - outerMargin + 2);
  ctx.lineTo(W - outerMargin + 2, H - outerMargin + 2);
  ctx.lineTo(W - outerMargin + 2, H - outerMargin - cornerSize);
  ctx.stroke();

  // 4. Header Section
  const headerHeight = H * 0.11;
  const headerY = innerMargin + 10;

  // Subtitle / "THE WEDDING OF"
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = preset.secondaryTextColor;
  ctx.font = `600 ${Math.round(W * 0.024)}px 'Cinzel', serif`;
  ctx.letterSpacing = "4px";
  ctx.fillText("THE WEDDING OF", W / 2, headerY + headerHeight * 0.28);

  // Couple Names in Romantic Script Calligraphy
  ctx.fillStyle = preset.textColor;
  const coupleText = `${weddingConfig.brideName} & ${weddingConfig.groomName}`;
  const scriptFontSize = Math.round(isStrip ? W * 0.095 : W * 0.065);
  ctx.font = `${scriptFontSize}px 'Great Vibes', cursive`;
  ctx.fillText(coupleText, W / 2, headerY + headerHeight * 0.68);

  // 5. Grid Photos Placement
  const footerHeight = H * 0.1;
  const gridTop = headerY + headerHeight + 12;
  const gridBottom = H - outerMargin - footerHeight;
  const availableGridHeight = gridBottom - gridTop;
  const availableGridWidth = W - (innerMargin * 2) - 30;

  const { rows, cols } = layout;
  const gapX = isStrip ? 0 : 20;
  const gapY = 16;

  const photoBoxW = (availableGridWidth - (cols - 1) * gapX) / cols;
  const photoBoxH = (availableGridHeight - (rows - 1) * gapY) / rows;

  for (let i = 0; i < layout.totalPhotos; i++) {
    const colIdx = i % cols;
    const rowIdx = Math.floor(i / cols);

    const x = innerMargin + 15 + colIdx * (photoBoxW + gapX);
    const y = gridTop + rowIdx * (photoBoxH + gapY);

    const img = loadedPhotos[i];

    // Photo frame container border
    ctx.fillStyle = preset.id === "minimal_ivory" ? "#ECE8DF" : "#1B1E26";
    ctx.beginPath();
    ctx.roundRect(x, y, photoBoxW, photoBoxH, 6);
    ctx.fill();

    if (img) {
      ctx.save();
      if (filterCss && filterCss !== "none") {
        ctx.filter = filterCss;
      }
      drawImageCover(ctx, img, x + 3, y + 3, photoBoxW - 6, photoBoxH - 6, 4);
      ctx.restore();
    }

    // Thin inner photo border
    ctx.strokeStyle = preset.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, photoBoxW, photoBoxH, 6);
    ctx.stroke();
  }

  // 6. Footer Section
  const footerY = gridBottom + 12;
  const footerCenterY = footerY + footerHeight / 2 - 8;

  // Small romantic ornament divider
  ctx.strokeStyle = preset.accentColor;
  ctx.lineWidth = 1;
  const dividerW = W * 0.25;
  ctx.beginPath();
  ctx.moveTo(W / 2 - dividerW, footerCenterY - 14);
  ctx.lineTo(W / 2 + dividerW, footerCenterY - 14);
  ctx.stroke();

  // Small diamond center
  ctx.fillStyle = preset.accentColor;
  ctx.beginPath();
  ctx.arc(W / 2, footerCenterY - 14, 3, 0, Math.PI * 2);
  ctx.fill();

  // Date & Venue text
  ctx.fillStyle = preset.textColor;
  ctx.font = `500 ${Math.round(W * 0.024)}px 'Montserrat', sans-serif`;
  ctx.fillText(weddingConfig.weddingDate.toUpperCase(), W / 2, footerCenterY + 4);

  // Hashtag / Subtitle
  ctx.fillStyle = preset.secondaryTextColor;
  ctx.font = `italic 400 ${Math.round(W * 0.02)}px 'Montserrat', sans-serif`;
  ctx.fillText(weddingConfig.hashtag, W / 2, footerCenterY + 24);

  return canvas.toDataURL("image/png");
}

/**
 * Creates side-by-side 2-strip canvas for 4R photo paper print (5x15cm x 2 on 10x15cm paper)
 */
export async function createDualStripCanvas(stripDataUrl: string): Promise<string> {
  const singleImg = await loadImage(stripDataUrl);
  const sw = singleImg.naturalWidth > 0 ? singleImg.naturalWidth : 600;
  const sh = singleImg.naturalHeight > 0 ? singleImg.naturalHeight : 1800;

  const canvas = document.createElement("canvas");
  canvas.width = sw * 2;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return stripDataUrl;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, sw * 2, sh);

  // Draw left strip (0..sw)
  ctx.drawImage(singleImg, 0, 0, sw, sh);
  // Draw right strip (sw..sw*2)
  ctx.drawImage(singleImg, sw, 0, sw, sh);

  // Subtle cut line in the middle
  ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(sw, 20);
  ctx.lineTo(sw, sh - 20);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}
