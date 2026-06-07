# 📚 Panduan Instalasi — KasPemuda

Sistem Kas Organisasi Pemuda | Versi 1.0

---

## 📁 Struktur File

```
kas-pemuda/
├── index.html       ← Aplikasi utama (buka di browser)
├── style.css        ← Tampilan / desain
├── script.js        ← Logika aplikasi
├── Code.gs          ← Backend Google Apps Script
└── PANDUAN.md       ← Dokumen ini
```

---

## 🚀 CARA 1: Pakai Tanpa Internet (Offline / Lokal)

Ini cara paling mudah dan cepat untuk mulai menggunakan aplikasi.

### Langkah:
1. **Unduh semua file** (`index.html`, `style.css`, `script.js`) ke satu folder di komputer/HP.
2. **Buka `index.html`** menggunakan browser (Chrome direkomendasikan).
3. Login dengan:
   - Username: `admin`
   - Password: `admin123`
4. **Selesai!** Data tersimpan otomatis di browser (localStorage).

> ⚠️ Data tersimpan di browser lokal. Jika browser di-clear/reset, data bisa hilang. Selalu lakukan **Backup** secara rutin dari menu Pengaturan.

---

## ☁️ CARA 2: Integrasi Google Spreadsheet (Online)

Agar data tersimpan permanen di cloud dan bisa diakses dari mana saja.

### Langkah A: Buat Google Spreadsheet

1. Buka [Google Sheets](https://sheets.google.com)
2. Klik **"+"** untuk membuat spreadsheet baru
3. Beri nama: **"KasPemuda"**
4. Catat **ID Spreadsheet** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[INI_ADALAH_ID_NYA]/edit
   ```

### Langkah B: Setup Google Apps Script

1. Di Spreadsheet, klik menu **Extensions → Apps Script**
2. Hapus semua kode yang ada
3. **Salin seluruh isi file `Code.gs`** dan tempelkan
4. Ganti baris ini dengan ID spreadsheet Anda:
   ```javascript
   const SPREADSHEET_ID = 'ISI_ID_SPREADSHEET_ANDA_DISINI';
   ```
5. Klik tombol **💾 Simpan** (Ctrl+S)

### Langkah C: Jalankan Setup Awal

1. Di bagian atas, pilih fungsi: **`setupTrigger`**
2. Klik tombol **▶ Run**
3. Izinkan akses ketika diminta (klik "Allow")
4. Spreadsheet akan otomatis dibuat dengan 3 sheet:
   - **Anggota** — data anggota
   - **Transaksi** — riwayat transaksi
   - **Log** — log aktivitas sistem

### Langkah D: Deploy sebagai Web App

1. Di Apps Script, klik **Deploy → New deployment**
2. Klik ikon ⚙️ di samping "Select type" → pilih **Web app**
3. Atur:
   - **Description**: `KasPemuda API v1`
   - **Execute as**: `Me (email Anda)`
   - **Who has access**: `Anyone` ⬅️ Penting!
4. Klik **Deploy**
5. **Salin URL Web App** yang muncul:
   ```
   https://script.google.com/macros/s/XXXXXX/exec
   ```

### Langkah E: Hubungkan ke Aplikasi

1. Buka aplikasi KasPemuda di browser
2. Masuk ke **menu Pengaturan**
3. Tempel URL tadi ke kolom **"URL Google Apps Script"**
4. Klik **"Simpan & Test Koneksi"**
5. Jika muncul ✅ Koneksi berhasil — selesai!

---

## 🌐 CARA 3: Upload ke Hosting (GitHub Pages — GRATIS)

Agar aplikasi bisa diakses dari mana saja lewat URL.

### Langkah:
1. Daftar akun di [github.com](https://github.com) (gratis)
2. Buat repository baru bernama `kas-pemuda`
3. Upload 3 file: `index.html`, `style.css`, `script.js`
4. Masuk ke **Settings → Pages**
5. Pilih **Source: Deploy from branch → main → / (root)**
6. Klik **Save**
7. Tunggu 1-2 menit, lalu akses:
   ```
   https://[username].github.io/kas-pemuda
   ```

---

## 🔐 Informasi Login Default

| Username | Password  |
|----------|-----------|
| admin    | admin123  |

> ⚠️ Segera ganti password dari menu **Pengaturan → Keamanan** setelah pertama kali login!

---

## 📱 Cara Akses dari HP

### Jika menggunakan GitHub Pages:
- Buka URL `https://[username].github.io/kas-pemuda` dari browser HP
- Tambahkan ke home screen: **Share → Add to Home Screen** (iOS/Android)

### Jika menggunakan lokal di PC yang terhubung WiFi:
1. Cari IP komputer Anda (misal: `192.168.1.10`)
2. Akses dari HP via: `http://192.168.1.10/kas-pemuda`
   *(perlu web server seperti XAMPP atau Live Server VSCode)*

---

## 📋 Struktur Google Spreadsheet

### Sheet: Anggota
| Kolom | Keterangan |
|-------|-----------|
| ID | ID unik anggota (otomatis) |
| Nama | Nama lengkap anggota |
| HP | Nomor handphone |
| Alamat | Alamat lengkap |
| Status | aktif / nonaktif |
| Tanggal Dibuat | Timestamp pendaftaran |

### Sheet: Transaksi
| Kolom | Keterangan |
|-------|-----------|
| ID | ID unik transaksi |
| Tanggal | Tanggal transaksi (YYYY-MM-DD) |
| ID Anggota | Referensi ke ID anggota |
| Nama Anggota | Nama anggota |
| Jenis | Masuk / Keluar |
| Kategori | Jenis kategori |
| Nominal | Jumlah uang (Rupiah) |
| Keterangan | Catatan tambahan |
| Petugas | Nama petugas pencatat |
| Dibuat | Timestamp pencatatan |

### Sheet: Log
| Kolom | Keterangan |
|-------|-----------|
| Waktu | Waktu aksi |
| Aksi | Jenis operasi |
| Detail | Detail informasi |

---

## 📷 Fitur Scan QR Code

- Klik tombol **📷** saat mencatat transaksi
- Izinkan akses kamera di browser
- Arahkan ke QR Code anggota
- Nama anggota otomatis terisi!

> ✅ Bekerja tanpa aplikasi tambahan di Chrome (Android/Desktop)  
> ℹ️ iOS: gunakan browser Chrome atau Firefox untuk akses kamera

---

## 📊 Fitur Laporan

| Jenis | Keterangan |
|-------|-----------|
| Harian | Transaksi hari yang dipilih |
| Mingguan | Transaksi satu minggu penuh |
| Bulanan | Transaksi satu bulan penuh |
| Tahunan | Transaksi satu tahun penuh |
| Export Excel | File `.xlsx` siap print |
| Export PDF | File `.pdf` siap print |

---

## 💾 Tips Backup Data

Lakukan backup rutin setiap minggu:
1. Masuk ke **Pengaturan**
2. Klik **"💾 Backup Data"**
3. File `.json` akan terunduh otomatis
4. Simpan di Google Drive atau folder aman

Untuk memulihkan: klik **"📂 Restore Data"** dan pilih file backup.

---

## ❓ Troubleshooting

**Q: Data hilang setelah browser di-reset?**  
A: Lakukan backup rutin, atau hubungkan ke Google Spreadsheet agar data tersimpan di cloud.

**Q: Koneksi ke Google Spreadsheet gagal?**  
A: Pastikan deployment diatur ke "Who has access: Anyone". Coba re-deploy Apps Script.

**Q: Kamera tidak bisa dibuka untuk scan QR?**  
A: Browser harus dibuka melalui HTTPS atau localhost. Izinkan akses kamera di pengaturan browser.

**Q: QR Code tidak terdeteksi?**  
A: Fitur BarcodeDetector hanya tersedia di Chrome 83+. Update browser ke versi terbaru.

**Q: Aplikasi lambat dengan 500+ anggota?**  
A: Data tetap ringan karena menggunakan localStorage. Tidak ada batasan jumlah anggota.

---

## 📞 Kontak & Dukungan

Aplikasi ini dibuat menggunakan teknologi web standar:
- **HTML5** — Struktur halaman
- **CSS3** — Tampilan & animasi  
- **JavaScript (ES6+)** — Logika aplikasi
- **Google Apps Script** — Backend API
- **Google Spreadsheet** — Database cloud
- **QRCode.js** — Generator QR Code
- **html2pdf.js** — Export PDF
- **SheetJS (xlsx)** — Export Excel

**Gratis selamanya. Tidak perlu server. Tidak perlu bayar.**

---

*KasPemuda v1.0 — Untuk Organisasi Pemuda Indonesia 🇮🇩*
