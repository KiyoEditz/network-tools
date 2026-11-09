# Panduan Kontribusi & Pengembangan

Terima kasih atas ketertarikan Anda untuk berkontribusi pada pengembangan **Network Tester GUI**! Dokumen ini menjelaskan alur kerja, standar kode, dan prosedur pengujian.

---

## 🛠️ 1. Alur Kerja Pengembangan Lokal

### 1.1. Prasyarat
- Node.js LTS (v20.x s/d v24.x)
- npm (v10.x / v11.x)
- Editor kode yang direkomendasikan: VS Code atau Antigravity IDE

### 1.2. Menjalankan Lingkungan Dev
```bash
# Menginstal dependensi
npm install

# Menjalankan Vite dev server + jendela Electron
npm run dev

# (Opsional) Menjalankan suite mock server di terminal terpisah
npm run mock:server
```

---

## 📏 2. Prinsip & Aturan Utama Kontribusi

> [!IMPORTANT]
> **Aturan Wajib: PURE JS / TS ONLY (NO C++ BUILD TOOLS / NO NODE-GYP)**
> Proyek ini memiliki aturan mutlak untuk **tidak menambahkan dependensi paket npm yang membutuhkan kompilasi native C++ (`node-gyp`) atau toolchain C++ Visual Studio**.
> Semua fungsionalitas harus menggunakan pustaka berbasis JavaScript murni, TypeScript, atau WebAssembly (Wasm). Tujuannya agar aplikasi dapat dikompilasi instan dan ringan dijalankan pada komputer spesifikasi rendah (Intel Celeron / RAM terbatas).

### Pedoman Tambahan:
1. **Port Isolation Safety**:
   - Jangan pernah menggunakan port pada rentang `3000-3010` atau `8000-8010` untuk layanan mock internal atau default port aplikasi, karena port tersebut sering digunakan pengguna untuk proyek pribadi mereka.
   - Gunakan rentang port aman di `9000-an` dan `18000-an`.
2. **Type Safety Strict**:
   - Semua kode baru harus memiliki tipe TypeScript yang jelas. Hindari penggunaan tipe `any` tanpa alasan yang terdokumentasi.
   - Tipe data bersama diletakkan di [`src/shared/types.ts`](file:///d:/network-tools/src/shared/types.ts).
3. **Pemisahan Logika Main vs Renderer**:
   - Operasi I/O socket, pembacaan file sistem, dan koneksi proxy **wajib** berada di Main Process (`src/main/services/`).
   - Renderer Process (`src/renderer/`) murni hanya menangani antarmuka pengguna, state management (Zustand), dan komunikasi melalui `window.networkAPI`.

---

## ➕ 3. Menambahkan Fitur Baru

### Menambahkan Protokol Baru:
1. Definisikan tipe konfigurasi dan event baru di [`src/shared/types.ts`](file:///d:/network-tools/src/shared/types.ts).
2. Buat service backend engine di `src/main/services/<nama-protokol>-engine.ts`.
3. Daftarkan IPC Handler di [`src/main/ipc/index.ts`](file:///d:/network-tools/src/main/ipc/index.ts).
4. Daftarkan fungsi pemanggilan di [`src/preload/index.ts`](file:///d:/network-tools/src/preload/index.ts).
5. Buat komponen antarmuka pengguna di `src/renderer/src/components/tabs/<NamaProtokol>Tab.tsx`.
6. Tambahkan endpoint mock di [`tests/mocks/server.ts`](file:///d:/network-tools/tests/mocks/server.ts) dan tulis tes asersi di [`tests/e2e/e2e-protocols.test.ts`](file:///d:/network-tools/tests/e2e/e2e-protocols.test.ts).

---

## 🧪 4. Menjalankan & Menulis Pengujian

Sebelum mengajukan Pull Request, pastikan seluruh pengujian berjalan sukses:

```bash
# 1. Jalankan pengujian unit
npm run test:unit

# 2. Jalankan pengujian integrasi E2E
npm run test:e2e

# 3. Jalankan build produksi untuk memvalidasi tidak ada TypeScript error
npm run build
```

---

🔙 **Kembali ke**: [Portal Dokumentasi Utama (README.md)](file:///d:/network-tools/docs/README.md) | ➡️ **Lanjut ke**: [Troubleshooting & Solusi Masalah (troubleshooting.md)](file:///d:/network-tools/docs/troubleshooting.md)
