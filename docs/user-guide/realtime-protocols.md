# Panduan Protokol Realtime: WebSocket, SSE, & WebRTC

Aplikasi **Network Tester GUI** menyediakan lingkungan pengujian mendalam untuk komunikasi *streaming* dan *realtime* dua arah tanpa memerlukan alat pihak ketiga.

---

## ⚡ 1. WebSocket (WS / WSS) Tester

Modul WebSocket memungkinkan Anda membuka koneksi persisten ke server WebSocket, bertukar pesan teks atau biner, serta memonitor latensi secara berkala.

### 1.1. Konfigurasi & Koneksi
1. Buka tab **WebSocket**.
2. Masukkan URL target:
   - `ws://` untuk koneksi plaintext.
   - `wss://` untuk koneksi terenkripsi TLS/SSL.
   - Contoh: `ws://127.0.0.1:9081`.
3. Buka sub-tab **Handshake Headers** jika server membutuhkan header autentikasi khusus (misal: `Sec-WebSocket-Protocol`, `Authorization`, atau cookie kustom).
4. Klik **Connect**. Status bar akan menyala hijau dan menampilkan `Status: Connected`.

### 1.2. Timeline Pesan Dua Arah
Pesan yang dikirim dan diterima ditampilkan dalam daftar timeline virtualisasi berkecepatan tinggi:
- **Panah Hijau `[OUT]`**: Pesan keluar dari klien Anda ke server.
- **Panah Biru `[IN]`**: Pesan masuk dari server ke klien Anda.
- **Ikon Kuning `[SYSTEM]`**: Notifikasi sistem (koneksi terbuka, tertutup, atau galat).
- Setiap item menampilkan timestamp presisi, ukuran byte, dan tombol **Copy** serta **Inspect** untuk melihat isi pesan dalam format JSON atau Hex.

### 1.3. Heartbeat Ping-Pong & RTT Tracking
- Centang opsi **Enable Auto Ping**.
- Tentukan interval ping dalam detik (misal: `5s` atau `30s`).
- Aplikasi akan mengirim frame Ping secara otomatis. Ketika server merespon dengan frame Pong, aplikasi mencatat latensi bolak-balik (*Round-Trip Time / RTT*) dalam milidetik secara presisi.

---

## 🌊 2. Server-Sent Events (SSE) Tester

Server-Sent Events adalah standar HTTP streaming di mana server mengirim aliran event berkesinambungan (`text/event-stream`) melalui satu koneksi HTTP yang tetap terbuka (*keep-alive*).

### 2.1. Membuka Koneksi Aliran SSE
1. Buka tab **Server-Sent Events (SSE)**.
2. Masukkan URL stream:
   - Contoh: `http://127.0.0.1:9082/sse`.
3. Tambahkan Custom Headers jika endpoint memerlukan API key atau token Bearer.
4. Klik **Listen Stream**.
5. Klien akan menerima event secara terus menerus tanpa terputus.

### 2.2. Parsing Format Standar SSE
Aplikasi secara otomatis mem-parsing blok event sesuai spesifikasi W3C:
- **`event:`**: Nama tipe event kustom (misal: `tick`, `price_update`, `chat_message`).
- **`id:`**: Identifier event unik untuk tracking sequence.
- **`data:`**: Payload data (jika berupa string JSON, otomatis diparse dan diwarnai sintaksnya).
- **`retry:`**: Interval waktu rekomendasi untuk reconnect otomatis jika koneksi terputus.

### 2.3. Fitur Filter Event
Jika aliran data sangat padat (misal ratusan event per detik), gunakan input pencarian **Filter Event Type** di atas timeline untuk hanya menampilkan tipe event tertentu yang sedang Anda analisis.

---

## 📹 3. WebRTC Peer-to-Peer & DataChannel Tester

WebRTC memanfaatkan antarmuka native browser Chromium di dalam Electron, memungkinkan Anda menguji komunikasi P2P suara, video, dan saluran data (*RTCDataChannel*) tanpa instalasi driver native tambahan.

### 3.1. Handshake Offline (Copy-Paste SDP)
Jika Anda ingin menguji koneksi P2P antara dua perangkat di jaringan lokal tanpa server perantara:
1. **Perangkat 1 (Offerer)**:
   - Klik **Create Offer**.
   - String SDP Offer dan ICE candidates otomatis ter-generate. Salin string tersebut.
2. **Perangkat 2 (Answerer)**:
   - Tempelkan SDP Offer dari Perangkat 1 ke kolom **Remote Offer**.
   - Klik **Create Answer**.
   - Salin SDP Answer yang dihasilkan.
3. **Perangkat 1 (Offerer)**:
   - Tempelkan SDP Answer dari Perangkat 2 ke kolom **Remote Answer**.
   - Klik **Set Remote Description**.
4. Status ICE Connection akan berubah menjadi `Connected`, dan saluran `RTCDataChannel` akan terbuka (*Open*).

### 3.2. DataChannel Chat & Throughput Benchmark
- Ketik pesan teks atau JSON pada input DataChannel untuk menguji pengiriman data berlatensi sangat rendah (*sub-10ms* pada loopback lokal).
- Klik tombol **Benchmark Throughput** untuk menguji pengiriman 1.000 paket berukuran 64 KB secara beruntun guna mengukur megabit per detik (Mbps) aktual.

### 3.3. Synthetic Audio & Video Loopback
- Tidak memiliki webcam atau mikrofon? Aktifkan opsi **Synthetic Video Stream Generator**.
- Aplikasi akan membuat canvas buatan dengan pola warna bergerak dan gelombang audio sinusoidal 440 Hz (Nada A) murni dari kode, lalu mengalirkannya ke peer penerima secara mulus.

### 3.4. Telemetri Real-Time `getStats()`
Saat koneksi aktif, panel telemetri menampilkan metrik langsung yang di-polling setiap 1.000ms:
- **Current RTT**: Latensi bolak-balik transmisi paket.
- **Bitrate In / Out**: Kecepatan transfer data saat ini dalam KB/s atau MB/s.
- **Packets Lost**: Jumlah paket yang hilang di jaringan (UDP loss rate).

---

🔙 **Kembali ke**: [Portal Dokumentasi Utama (README.md)](file:///d:/network-tools/docs/README.md) | ➡️ **Lanjut ke**: [Panduan IoT & Sockets (iot-and-sockets.md)](file:///d:/network-tools/docs/user-guide/iot-and-sockets.md)
