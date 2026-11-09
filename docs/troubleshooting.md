# Troubleshooting & Solusi Kendala Umum

Halaman ini mendokumentasikan kendala-kendala umum yang mungkin terjadi selama penggunaan atau pengembangan **Network Tester GUI**, beserta solusi praktisnya.

---

## 🚫 1. Port Sudah Terpakai (`EADDRINUSE`)

### Gejala:
Saat menjalankan `npm run mock:server` atau membuka TCP/UDP Server lokal, terminal memunculkan galat:
```text
Error: listen EADDRINUSE: address already in use 127.0.0.1:9080
```

### Penyebab:
Ada proses sebelumnya yang belum berhenti secara sempurna dan masih mengunci port tersebut.

### Solusi:
Di Windows PowerShell, cari Process ID (PID) yang menggunakan port tersebut dan matikan prosesnya:
```powershell
# Cek PID yang mendengarkan di port 9080
Get-NetTCPConnection -LocalPort 9080 | Select-Object OwningProcess

# Hentikan proses terkait (ganti <PID> dengan angka proses)
Stop-Process -Id <PID> -Force
```

---

## 🛡️ 2. Peringatan Windows Defender Firewall

### Gejala:
Saat pertama kali membuka fitur **TCP Server** atau **UDP Multicast Listener**, muncul popup Windows Defender Firewall: *"Windows Defender Firewall has blocked some features of this app"*.

### Penjelasan & Solusi:
- Ini adalah perilaku standar Windows ketika aplikasi membuka listening socket yang siap menerima koneksi masuk dari jaringan luar.
- **Klik "Allow access" (Izinkan akses)** pada jaringan Private (Pribadi).
- Jika Anda hanya menguji koneksi lokal (*loopback* `127.0.0.1`), socket tetap dapat berkomunikasi meskipun peringatan diabaikan.

---

## 📹 3. Kendala Koneksi WebRTC (ICE Connection State Failed)

### Gejala:
Status WebRTC macet pada `checking` atau berubah menjadi `failed`.

### Solusi:
1. **Pengujian Antar-Tab (Lokal)**:
   - Gunakan server STUN default Google (`stun:stun.l.google.com:19302`) yang sudah terpasang di preset konfigurasi.
   - Pastikan Anda menyalin **seluruh** string SDP (termasuk semua kandidat ICE) sebelum menekan tombol *Set Remote Description*.
2. **Jaringan Korporat / Simetris NAT**:
   - Jika Anda menghubungkan dua komputer berbeda di balik jaringan Wi-Fi kantor dengan firewall ketat, Anda mungkin memerlukan server TURN (relay). Tambahkan URL TURN dan kredensialnya pada pengaturan ICE Servers.

---

## ⚡ 4. Optimasi Memori pada Komputer RAM Terbatas (6 GB RAM)

### Gejala:
Aplikasi terasa melambat setelah menerima puluhan ribu pesan streaming WebSocket atau TCP log.

### Tips Optimasi:
1. **Gunakan Tombol "Clear Logs"**:
   - Jika Anda sedang melakukan *stress-test* pengiriman jutaan pesan, bersihkan log secara berkala menggunakan tombol tong sampah di atas timeline log.
2. **Matikan Fitur Auto Ping Jika Tidak Diperlukan**:
   - Jika Anda tidak sedang menguji RTT latensi, nonaktifkan interval heartbeat ping-pong untuk menghemat siklus CPU.
3. **Hardware Acceleration**:
   - Jika GPU terintegrasi (Intel UHD Graphics 600) sedang sibuk dengan aplikasi lain, Anda dapat menonaktifkan akselerasi perangkat keras dengan menambahkan flag `--disable-gpu` saat meluncurkan Electron.

---

## 🌐 5. SOCKS5 Proxy Connection Timeout

### Gejala:
Request HTTP melalui SOCKS5 proxy mengalami error:
```text
Proxy connection timed out / SOCKS connection failed
```

### Solusi:
1. Pastikan server proxy Anda aktif dan dapat diakses via perintah terminal:
   ```bash
   Test-NetConnection -ComputerName 127.0.0.1 -Port 1080
   ```
2. Jika menggunakan proxy Tor (`127.0.0.1:9050`), pastikan Tor Daemon sedang berjalan di latar belakang.
3. Gunakan tombol **Test Proxy Connection** di modal Proxy Manager untuk melihat log handshake detail sebelum menggunakannya pada request aktif.

---

🔙 **Kembali ke**: [Portal Dokumentasi Utama (README.md)](file:///d:/network-tools/docs/README.md)
