# Panduan Multi-Region Proxy, Local IP, & Geo-IP Spoofing

Panduan lengkap untuk merutekan lalu lintas jaringan melalui proxy, mengikat socket ke alamat IP antarmuka lokal tertentu (`localAddress`), serta mensimulasikan permintaan dari berbagai negara (*Geo-IP Spoofing*).

---

## 🛡️ 1. Multi-Region Proxy Manager

Aplikasi mendukung rute lalu lintas HTTP/HTTPS dan Socket melalui berbagai jenis server proxy:

### 1.1. Protokol Proxy yang Didukung
- **HTTP / HTTPS Proxy**: Proxy web standar dengan dukungan CONNECT tunneling untuk koneksi TLS.
- **SOCKS4 / SOCKS4a**: Protokol proxy TCP dasar.
- **SOCKS5 / SOCKS5h**: Protokol proxy canggih dengan dukungan autentikasi Username/Password, resolusi DNS jarak jauh di sisi server proxy (`socks5h`), serta penerusan paket UDP.

### 1.2. Mengonfigurasi Proxy Global atau Per-Request
1. Klik tombol **Proxy** pada header toolbar (ikon perisai).
2. Centang **Enable Proxy Routing**.
3. Pilih protokol proxy pada dropdown (misal `SOCKS5` atau `HTTP`).
4. Masukkan **Host** (misal `127.0.0.1` atau `proxy.singapore.net`) dan **Port** (misal `1080` atau `8080`).
5. Jika proxy memerlukan autentikasi, masukkan **Username** dan **Password**.
6. Klik tombol **Test Proxy Connection**:
   - Aplikasi akan menguji handshake ke proxy dan menampilkan **Exit IP & Location** yang terdeteksi dari luar.
7. Simpan konfigurasi. Semua request yang dikirim aplikasi sekarang akan dialirkan melalui rute proxy tersebut.

---

## 🖧 2. Source IP Binding (`localAddress`)

Jika komputer Anda terhubung ke beberapa jaringan sekaligus (misalnya: memiliki koneksi Wi-Fi, kabel LAN Ethernet, koneksi VPN, atau beberapa adapter virtual Docker/VMware), Anda dapat memilih adapter mana yang akan digunakan untuk mengirim paket keluar.

### 2.1. Memilih Antarmuka Jaringan
1. Pada tab HTTP atau tab TCP / UDP, buka panel **Network Adapter / Local IP**.
2. Klik dropdown **Select Local Interface**:
   - Sistem secara otomatis mencantumkan seluruh adapter fisik dan virtual yang sedang aktif di sistem operasi Anda beserta alamat IP-nya:
     - `Wi-Fi (10.223.29.123)`
     - `Ethernet (192.168.1.50)`
     - `VPN Adapter (10.8.0.2)`
     - `Default (OS Routing Table)`
3. Saat Anda memilih salah satu adapter, socket TCP/UDP klien akan memanggil `net.createConnection({ localAddress: '10.223.29.123' })`.
4. Paket keluar dijamin menggunakan alamat sumber dan rute antarmuka fisik tersebut.

---

## 🌍 3. Simulasi Region & Geo-IP Spoofing

Banyak layanan web dan CDN (seperti Cloudflare, Akamai, Fastly, CloudFront, atau AWS) membaca header gateway untuk menentukan negara asal pengguna, menerapkan pembatasan wilayah konten (*geo-blocking*), atau menghitung tarif mata uang.

### 3.1. Preset Region Cepat
Pada panel **Geo-IP Spoofing**, Anda dapat memilih preset negara:
- 🇯🇵 **Jepang (`JP`)**: Injeksi IP rentang NTT/Softbank + `CF-IPCountry: JP`.
- 🇺🇸 **Amerika Serikat (`US`)**: Injeksi IP rentang Verizon/AT&T + `CF-IPCountry: US`.
- 🇸🇬 **Singapura (`SG`)**: Injeksi IP rentang Singtel + `CF-IPCountry: SG`.
- 🇮🇩 **Indonesia (`ID`)**: Injeksi IP rentang Telkom/Biznet + `CF-IPCountry: ID`.
- 🇩🇪 **Jerman (`DE`)**: Injeksi IP rentang Deutsche Telekom + `CF-IPCountry: DE`.

### 3.2. Header Standar yang Diinjeksi
Saat fitur spoofing aktif, aplikasi menyuntikkan header-header berikut ke dalam request HTTP:

```http
GET /api/check-region HTTP/1.1
Host: api.example.com
X-Forwarded-For: 202.166.192.55
X-Real-IP: 202.166.192.55
CF-Connecting-IP: 202.166.192.55
CF-IPCountry: SG
X-Client-Geo-Location: SG
```

Ini memungkinkan Anda menguji endpoint backend yang membaca `req.headers['x-forwarded-for']` atau `req.headers['cf-ipcountry']` tanpa harus menyewa VPS di negara terkait.

---

🔙 **Kembali ke**: [Portal Dokumentasi Utama (README.md)](file:///d:/network-tools/docs/README.md) | ➡️ **Lanjut ke**: [Panduan Skrip Sandbox & Tests (scripting-and-tests.md)](file:///d:/network-tools/docs/user-guide/scripting-and-tests.md)
