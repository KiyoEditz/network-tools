# Panduan Instalasi & Persyaratan Sistem

Dokumen ini menjelaskan persyaratan perangkat lunak, dependensi, dan tahapan instalasi untuk menjalankan **Network Tester GUI** di komputer lokal Anda.

---

## 💻 1. Persyaratan Sistem

Aplikasi ini dioptimalkan secara spesifik agar dapat berjalan dengan sangat efisien pada perangkat keras berspesifikasi hemat daya (*low-power hardware*):

| Komponen | Persyaratan Minimum | Rekomendasi Pengujian |
| :--- | :--- | :--- |
| **Sistem Operasi** | Windows 10/11 64-bit, macOS 12+, atau Linux (glibc 2.31+) | Windows 10 Pro 64-bit |
| **Prosesor (CPU)** | Dual-core 1.0 GHz (misal: Intel Celeron N4000) | 2 Core atau lebih tinggi |
| **Memori (RAM)** | 4 GB | 6 GB atau lebih |
| **Penyimpanan Bebas** | 500 MB (untuk node_modules & build artifacts) | 1 GB SSD/HDD |
| **Resolusi Layar** | 1280 x 720 piksel | 1366 x 768 atau 1920 x 1080 |

> [!NOTE]
> **Tidak Memerlukan C++ Build Tools:**
> Aplikasi ini tidak menggunakan *native addons* C++ (`node-gyp`), MSVC C++ Build Tools, atau kompilasi Rust. Seluruh pustaka menggunakan **100% JavaScript murni, TypeScript, dan WebAssembly**, sehingga instalasi dependensi selesai dalam waktu singkat tanpa beban kompilasi yang memicu *RAM thrashing*.

---

## 📦 2. Prasyarat Perangkat Lunak

Sebelum memasang aplikasi, pastikan runtime berikut telah terpasang pada terminal Anda:

1. **Node.js**: Versi LTS modern (rekomendasi **v20.x s/d v24.x**).
   Cek versi:
   ```bash
   node --version
   # Output contoh: v24.22.1
   ```
2. **npm**: Versi **10.x atau 11.x**.
   Cek versi:
   ```bash
   npm --version
   # Output contoh: 11.19.1
   ```

---

## 🛠️ 3. Langkah-Langkah Instalasi

### Langkah 1: Kloning atau Buka Direktori Proyek
Buka terminal (PowerShell, Command Prompt, atau Terminal Linux/macOS) dan arahkan ke folder proyek:
```bash
cd D:\network-tools
```

### Langkah 2: Instalasi Dependensi Node
Jalankan perintah instalasi dependensi menggunakan npm:
```bash
npm install
```

Proses ini akan mengunduh paket-paket berikut secara otomatis:
- **Electron**: Runtime aplikasi desktop Chromium + Node.js.
- **Vite & React 19**: Frontend framework super cepat dengan Hot Module Replacement (HMR).
- **Undici**: HTTP/1.1 & HTTP/2 client performa tinggi pengganti native `fetch`.
- **WS**: WebSocket client & server murni.
- **@grpc/grpc-js & protobufjs**: Client gRPC murni tanpa kompilasi native C++ gRPC.
- **MQTT (v5.10+)**: Client MQTT murni dengan dukungan QoS 0/1/2.
- **Socks & Socks-Proxy-Agent**: Proxy router SOCKS4/5/5h dan HTTP/HTTPS.
- **Tough-Cookie**: Mesin Cookie Jar berstandar RFC 6265.
- **Monaco Editor**: Editor kode profesional dengan syntax highlighter.

---

## 🧪 4. Memverifikasi Instalasi

Untuk memastikan instalasi berhasil dan seluruh pustaka bekerja harmonis, jalankan verifikasi pengujian otomatis:

```bash
# Menjalankan pengujian unit (Variable Engine, Cookie Jar, Virtual Storage, Script Sandbox)
npm run test:unit

# Menjalankan pengujian integrasi protokol E2E (HTTP, WS, TCP, UDP, MQTT)
npm run test:e2e
```

Jika output terminal menunjukkan `✔ pass 5` dan `✔ pass 10` dengan status hijau (exit code 0), instalasi Anda 100% sempurna dan siap digunakan.

---

## 🏗️ 5. Kompilasi Build Produksi (Opsional)

Jika Anda ingin mengompilasi kode TypeScript backend dan membundel aset web frontend:

```bash
npm run build
```

Perintah ini akan menghasilkan:
- Berkas main/preload terkompilasi di `dist/main/` dan `dist/preload/`.
- Berkas antarmuka terbundel Vite di `dist/renderer/`.

---

🔙 **Kembali ke**: [Portal Dokumentasi Utama (README.md)](file:///d:/network-tools/docs/README.md) | ➡️ **Lanjut ke**: [Panduan Memulai Cepat (quick-start.md)](file:///d:/network-tools/docs/getting-started/quick-start.md)
