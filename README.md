# photoboothnikah

Aplikasi Wedding Photobooth yang elegan, modern, dan ultra-ringan (cocok untuk perangkat Windows dengan spesifikasi minimal).

## Fitur Utama
- **Desain Mewah & Elegan**: Disesuaikan khusus untuk tema pernikahan dengan palet warna emas (gold luxury) dan tipografi kaligrafi (*Isna & Fadel*).
- **Alur Pemotretan Cepat**:
  1. Sentuh layar untuk mulai.
  2. Pilih 1 dari 3 desain bingkai (frame).
  3. Pemotretan kamera interaktif dengan hitung mundur (*countdown*), suara shutter, dan pratinjau strip vertikal *real-time*.
  4. Layar tinjau foto dengan 6 pilihan tone warna (*Natural, Bridal, Warm, Analog, Classic, Cool*) dan opsi foto ulang satuan.
  5. Layar hasil cetak dengan integrasi Google Drive (QR Code instan) dan dukungan cetak ganda 4R (*dual-strip*).
- **Ultra-Ringan**: Ukuran bundel gzipped di bawah 100 kB, menggunakan Web Audio API sintesis tanpa aset audio berat, dan rendering canvas 300 DPI siap cetak.
- **Panel Admin Terproteksi PIN**: Pengaturan nama pengantin, tanggal, folder Google Drive, durasi countdown, dan pergantian bingkai kustom.

## Cara Menjalankan
```bash
npm install
npm run dev
```

Build untuk produksi:
```bash
npm run build
```
