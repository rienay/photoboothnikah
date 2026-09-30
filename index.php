<?php
// Laragon Apache auto-serve / redirect helper
if (file_exists(__DIR__ . '/dist/index.html')) {
    header("Location: dist/");
    exit;
} else {
    echo "<h1>Wedding Photobooth</h1><p>Jalankan <code>npm run dev</code> atau <code>npm run build</code> untuk memulai.</p>";
}
