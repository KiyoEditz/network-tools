# Panduan Response Viewer & Hex Inspector

Panduan penggunaan panel inspeksi respon universal: Monaco Editor dengan syntax highlighting, 3-Column Hex Dump dengan byte-level type inspector, serta media player bawaan untuk gambar, audio, video, dan berkas PDF.

---

## 🎨 1. Mode Pretty Viewer (Monaco Editor)

Ketika server merespon dengan data berbasis teks, aplikasi secara otomatis mendeteksi header `Content-Type` dan mengaktifkan syntax highlighting yang sesuai:
- **JSON**: Lipatan blok kurung (*code folding*), penyorotan sintaks key-value, dan validasi format.
- **XML / SVG**: Penutupan tag otomatis dan hierarki pohon dokumen.
- **HTML**: Format DOM web dengan warna tag dan atribut.
- **Plaintext / CSS / JS**: Pewarnaan kode standar.

### Fitur Monaco:
- Tekan `Ctrl + F` untuk mencari kata atau ekspresi reguler (Regex) di dalam respon.
- Nomor baris presisi, minimap kode di sebelah kanan, dan tombol **Format Code** untuk merapikan JSON atau XML yang terkompresi/minified.
- Tombol **Copy** instan untuk menyalin seluruh isi respon ke clipboard sistem.

---

## 🔬 2. 3-Column Hex Inspector

Untuk debugging protokol biner, transmisi socket TCP/UDP, atau analisis korupsi data, klik tab **Hex View**:

```text
Offset    00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F  ASCII
-------------------------------------------------------------------------
00000000  89 50 4E 47 0D 0A 1A 0A  00 00 00 0D 49 48 44 52  .PNG........IHDR
00000010  00 00 00 20 00 00 00 20  08 06 00 00 00 73 7A 7A  ... ... ....szz
00000020  00 00 00 00 49 45 4E 44  AE 42 60 82              ....IEND.B`.
```

### Struktur Tiga Kolom:
1. **Kolom Offset**: Alamat memori heksadesimal 32-bit (dimulai dari `00000000`).
2. **Kolom Heksadesimal**: 16 byte per baris, dipisahkan menjadi dua kelompok 8-byte untuk kemudahan pembacaan.
3. **Kolom ASCII**: Karakter teks yang dapat dicetak (*printable characters*), atau tanda titik `.` untuk byte kontrol yang tidak dapat dicetak.

### Byte-Level Data Type Converter:
Saat Anda mengklik salah satu byte pada matriks Hex, panel samping **Data Inspector** akan menampilkan interpretasi nilai byte tersebut dalam berbagai tipe data:
- **Int8 / UInt8**: Nilai biner 1 byte.
- **Int16 / UInt16**: Nilai 2 byte (Big Endian & Little Endian).
- **Int32 / UInt32**: Nilai 4 byte (Big Endian & Little Endian).
- **Float32 / Float64**: Angka pecahan IEEE 754.
- **Binary String**: Representasi 8 bit (misal `10001001`).

---

## 🖼️ 3. Media Viewer Bawaan (Universal Media Preview)

Jika endpoint menghasilkan berkas biner non-teks, aplikasi langsung merendernya secara native di antarmuka tanpa perlu mengunduh atau membuka aplikasi eksternal:

### 3.1. Penampil Gambar (*Image Viewer*)
- **Format yang Didukung**: PNG, JPEG, SVG, WebP, GIF (termasuk GIF animasi), dan ICO.
- **Fitur**:
  - Kontrol Zoom In, Zoom Out, dan Reset 100%.
  - Panning (geser gambar dengan drag mouse).
  - Info metadata: Lebar x Tinggi piksel asli serta ukuran file dalam KB/MB.
  - Latar belakang pola catur (*checkerboard pattern*) untuk mengecek transparansi kanal Alpha.

### 3.2. Pemutar Audio (*Audio Player*)
- **Format yang Didukung**: WAV, MP3, OGG, AAC.
- **Fitur**:
  - Pemutar HTML5 native dengan tombol Play, Pause, dan Seek Bar.
  - Pengatur volume suara dan indikator durasi waktu (menit:detik).

### 3.3. Pemutar Video (*Video Player*)
- **Format yang Didukung**: MP4 (H.264), WebM (VP8/VP9/AV1).
- **Fitur**:
  - Tampilan video akselerasi perangkat keras (*hardware-accelerated*).
  - Mode Fullscreen dan tombol Picture-in-Picture.

### 3.4. Penampil Dokumen PDF (*PDF Preview*)
- **Format yang Didukung**: Dokumen `.pdf` standar.
- **Fitur**:
  - Merender halaman PDF secara instan ke elemen canvas beresolusi tajam.
  - Navigasi halaman berikutnya / sebelumnya dan zoom dokumen.

---

🔙 **Kembali ke**: [Portal Dokumentasi Utama (README.md)](file:///d:/network-tools/docs/README.md) | ➡️ **Lanjut ke**: [Panduan Ekspor Kode (code-export.md)](file:///d:/network-tools/docs/user-guide/code-export.md)
