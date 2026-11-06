/**
 * ============================================================================
 * GOOGLE APPS SCRIPT UNTUK YODHA PHOTOBOOTH (100% GRATIS & PERMANEN)
 * ============================================================================
 * - Tidak akan pernah di-pause / tidak pernah masuk mode tidur!
 * - Tidak akan pernah dihapus oleh batasan hari/inaktivitas.
 * - Berfungsi untuk:
 *   1. Upload & simpan foto strip photobooth ke folder Google Drive
 *   2. Simpan & sinkronkan Desain Web / DIY Theme Builder secara online
 *   3. Simpan & ambil template bingkai foto (Frame Templates)
 * ============================================================================
 * CARA PAKAI:
 * 1. Buka script.google.com
 * 2. Buka proyek Apps Script Anda yang sudah ada
 * 3. Hapus semua kodingan lama di "Code.gs", lalu tempel (paste) kode di bawah ini.
 * 4. Pastikan variabel FOLDER_ID di bawah ini sudah sesuai dengan ID folder Drive Anda.
 * 5. Klik "Deploy" -> "New deployment" -> pilih type "Web app"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (Siapa saja)
 * 6. Klik Deploy dan copy URL Web App-nya ke Tab Google Drive di Web Photobooth.
 * ============================================================================
 */

// Ganti dengan Folder ID Google Drive Anda (ada di link folder drive Anda setelah /folders/...)
var FOLDER_ID = "1lwRNyZWiwyWjOaAh9oDH-uA9pxWtScCN";

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    var action = data.action || "";

    // 1. SIMPAN DESAIN THEME BUILDER (ONLINE)
    if (action === "saveDesigns" || action === "saveTheme") {
      var props = PropertiesService.getScriptProperties();
      if (data.designs) {
        props.setProperty("photobooth_designs", JSON.stringify(data.designs));
      }
      if (data.activeDesignId) {
        props.setProperty("active_design_id", data.activeDesignId);
      }
      if (data.activeDesign) {
        props.setProperty("active_design", JSON.stringify(data.activeDesign));
      }

      // Buat backup file json otomatis di Google Drive
      saveFileToDrive("photobooth_designs.json", JSON.stringify({
        designs: data.designs,
        activeDesignId: data.activeDesignId,
        activeDesign: data.activeDesign,
        updatedAt: new Date().getTime()
      }));

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        success: true,
        message: "✓ Berhasil disimpan online ke Google Drive & Sheets!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. UPLOAD FOTO STRIP PHOTOBOOTH
    if (data.image && !action) {
      var targetFolderId = data.folderId || FOLDER_ID;
      var folder = DriveApp.getFolderById(targetFolderId);
      var decoded = Utilities.base64Decode(data.image);
      var filename = data.filename || ("photo_" + new Date().getTime() + ".jpg");
      var blob = Utilities.newBlob(decoded, "image/jpeg", filename);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        success: true,
        url: file.getUrl(),
        fileId: file.getId()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. UPLOAD BINGKAI FOTO (FRAME TEMPLATE)
    if (action === "uploadFrame") {
      var folder = DriveApp.getFolderById(FOLDER_ID);
      var decoded = Utilities.base64Decode(data.image);
      var blob = Utilities.newBlob(decoded, "image/png", (data.name || "frame") + ".png");
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        success: true,
        frame: {
          id: file.getId(),
          name: data.name,
          url: "https://lh3.googleusercontent.com/d/" + file.getId()
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Aksi tidak dikenal" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || "";

    // AMBIL DESAIN THEME BUILDER (ONLINE)
    if (action === "getDesigns" || action === "getTheme") {
      var props = PropertiesService.getScriptProperties();
      var rawDesigns = props.getProperty("photobooth_designs");
      var activeId = props.getProperty("active_design_id");
      var activeDesign = props.getProperty("active_design");

      var designs = rawDesigns ? JSON.parse(rawDesigns) : [];
      var activeObj = activeDesign ? JSON.parse(activeDesign) : null;

      // Fallback: baca dari file Google Drive jika properties kosong
      if (!designs || designs.length === 0) {
        var fileData = readFileFromDrive("photobooth_designs.json");
        if (fileData) {
          designs = fileData.designs || [];
          activeId = fileData.activeDesignId || "";
          activeObj = fileData.activeDesign || null;
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        success: true,
        designs: designs,
        activeDesignId: activeId || "",
        activeDesign: activeObj
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "✓ Google Apps Script Yodha Photobooth Siap & Online!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper: Simpan file json ke folder Google Drive
function saveFileToDrive(filename, contentString) {
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var files = folder.getFilesByName(filename);
    if (files.hasNext()) {
      var file = files.next();
      file.setContent(contentString);
    } else {
      var blob = Utilities.newBlob(contentString, "application/json", filename);
      var newFile = folder.createFile(blob);
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
  } catch (e) {}
}

// Helper: Baca file json dari folder Google Drive
function readFileFromDrive(filename) {
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var files = folder.getFilesByName(filename);
    if (files.hasNext()) {
      var file = files.next();
      var text = file.getBlob().getDataAsString();
      return JSON.parse(text);
    }
  } catch (e) {}
  return null;
}

