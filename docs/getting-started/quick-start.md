# Panduan Memulai Cepat (Quick Start Guide)

Panduan praktis langkah demi langkah untuk menjalankan aplikasi **Network Tester GUI**, menghubungkannya ke Mock Server bawaan, dan mengirim request pertama Anda di berbagai protokol.

---

## 🚀 1. Menjalankan Aplikasi

Aplikasi menyediakan skrip satu langkah yang otomatis menyalakan server Vite HMR dan meluncurkan jendela desktop Electron secara simultan:

```bash
cd D:\network-tools
npm run dev
```

Pada konsol terminal, Anda akan melihat log seperti berikut:
```text
🚀 Starting Vite dev server...
⏳ Waiting for Vite on http://localhost:5173...
✅ Vite is ready!
📦 Compiling Electron Main Process...
⚡ Launching Electron...
```
Jendela aplikasi desktop GUI akan muncul di layar Anda.

---

## 🧪 2. Menjalankan Mock Server Lokal Terintegrasi

Untuk mencoba semua fitur tanpa harus bergantung pada API publik atau koneksi internet luar, buka terminal terpisah dan jalankan All-in-One Mock Suite:

```bash
cd D:\network-tools
npm run mock:server
```

Server mock lokal akan menyala dan mendengarkan pada port-port terisolasi yang aman:
- **Port 9080**: HTTP REST Mock (Users, Timing, Cookies, Geo-IP, Media PNG/Audio/PDF)
- **Port 9081**: WebSocket Echo & Ping-Pong
- **Port 9082**: Server-Sent Events (SSE) Stream
- **Port 9001**: Raw TCP Echo Socket
- **Port 9002**: UDP Datagram Echo Socket
- **Port 1883**: MQTT Broker (Aedes)
- **Port 9083**: WebRTC Automated Signaling Server

> [!TIP]
> Port-port ini sengaja dialokasikan pada rentang **9000-an dan 18000-an** untuk menghindari bentrok dengan port lokal kerja Anda (misal `~3000` atau `~8000`).

---

## 🌐 3. Mengirim Request HTTP Pertama Anda

1. **Pilih Tab HTTP**: Pada bilah tab atas, klik tab **HTTP**.
2. **Masukkan URL**: Ketik URL berikut pada input bar:
   ```text
   http://127.0.0.1:9080/api/users
   ```
3. **Pilih Method**: Pastikan dropdown method disetel ke **GET**.
4. **Klik Tombol "Send"**:
   - Status badge akan berubah menjadi `200 OK` (warna hijau).
   - Panel respon bawah akan menampilkan daftar data pengguna dalam format JSON yang rapi dengan pewarnaan sintaks Monaco Editor.
   - Periksa tab **Timing**: Anda dapat melihat diagram batang waterfall (DNS, TCP, TLS, TTFB, dan Download).

---

## 🔄 4. Menguji WebSocket Echo & Latensi

1. **Buka Tab WebSocket**: Klik tab bertanda **WebSocket (WS)**.
2. **Masukkan URL Server**:
   ```text
   ws://127.0.0.1:9081
   ```
3. **Klik "Connect"**:
   - Indikator status akan berubah menjadi hijau `Connected`.
4. **Kirim Pesan**:
   - Pada panel pesan bawah, ketik: `Halo WebSocket!`.
   - Klik **Send**.
   - Di daftar log timeline, Anda akan melihat panah hijau keluar `[OUT]` dan seketika panah biru masuk `[IN]` sebagai balasan echo dari mock server.

---

## 🛰️ 5. Menguji Raw TCP & UDP Socket

1. **Buka Tab TCP / UDP**: Klik tab **TCP / UDP**.
2. **Uji TCP Client**:
   - Pilih mode **TCP Client**.
   - Masukkan Target Host: `127.0.0.1`, Port: `9001`.
   - Klik **Connect**. Status akan berubah menjadi `Connected`.
   - Ketik teks `TEST_TCP_PACKET` dan klik **Send**.
   - Paket balasan echo akan segera muncul di log terminal bawah lengkap dengan ukuran byte dan timestamp milidetik.
3. **Uji UDP Datagram**:
   - Ganti protokol ke **UDP Datagram**.
   - Isi Bind Port: `9099`, Remote Host: `127.0.0.1`, Remote Port: `9002`.
   - Klik **Bind Socket**.
   - Ketik `TEST_UDP_DATAGRAM` dan klik **Send**. Balasan UDP akan langsung tertangkap di daftar datagram.

---

## 🧩 6. Menggunakan Variabel Lingkungan (`{{variable}}`)

1. Klik tombol **Environments** di pojok kanan atas toolbar (ikon globe).
2. Tambahkan variabel baru:
   - Key: `baseUrl`
   - Value: `http://127.0.0.1:9080`
3. Simpan konfigurasi.
4. Di input URL tab HTTP, ubah URL menjadi:
   ```text
   {{baseUrl}}/api/users?req_id={{$guid}}&time={{$timestamp}}
   ```
5. Klik **Send**. Sistem secara otomatis menginterpolasi `{{baseUrl}}` menjadi `http://127.0.0.1:9080`, `{{$guid}}` menjadi UUID v4 acak, dan `{{$timestamp}}` menjadi waktu epoch UNIX saat ini!

---

## 💻 7. Ekspor Kode Instan (1-Click Code Generation)

Ingin menggunakan request yang baru saja Anda racik di proyek backend atau skrip otomatisasi Anda?
1. Pada tab HTTP, klik tombol **Code** di sebelah tombol Send.
2. Modal **Code Export** akan terbuka.
3. Pilih bahasa tujuan Anda:
   - **Node.js (Fetch)** atau **Node.js (Axios)**
   - **Python (Requests)** atau **Python (HTTPX)**
   - **cURL Command**
4. Klik **Copy Code** untuk langsung menempelkannya ke editor kode Anda.

---

🔙 **Kembali ke**: [Portal Dokumentasi Utama (README.md)](file:///d:/network-tools/docs/README.md) | ➡️ **Lanjut ke**: [Panduan Lengkap HTTP Client (http-client.md)](file:///d:/network-tools/docs/user-guide/http-client.md)
