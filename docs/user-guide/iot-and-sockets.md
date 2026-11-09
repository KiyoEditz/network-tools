# Panduan IoT & Sockets: gRPC, MQTT, TCP, & UDP

Panduan mendalam untuk pengujian protokol Remote Procedure Call (gRPC), broker IoT (MQTT), dan socket biner tingkat rendah (Raw TCP & UDP).

---

## ⚡ 1. gRPC Dynamic Client (Proto & Reflection)

Aplikasi menyertakan implementasi gRPC murni JavaScript berbasis `@grpc/grpc-js` dan `@grpc/proto-loader`.

### 1.1. Memuat Service & Method
Terdapat dua cara untuk memuat skema gRPC ke dalam antarmuka:
1. **Server Reflection (Tanpa berkas `.proto`)**:
   - Jika server gRPC target mengaktifkan gRPC Reflection API, cukup masukkan alamat host (misal `127.0.0.1:50051`) lalu klik **Discover Services**.
   - Seluruh daftar Service, Method, dan struktur pesan input/output akan terisi otomatis.
2. **Dynamic File Loader**:
   - Klik **Load .proto File** dan pilih satu atau beberapa berkas `.proto` dari harddisk Anda.
   - Aplikasi mem-parsing berkas tersebut seketika.

### 1.2. Mengeksekusi RPC Call
- **Unary Call**:
  - Pilih Service dan Method (misal `UserService.GetUser`).
  - Ketik payload JSON permintaan pada panel input:
    ```json
    { "id": "user_1001" }
    ```
  - Klik **Invoke**. Respon biner Protobuf akan didekode secara otomatis menjadi representasi JSON yang mudah dibaca.
- **Server Streaming**:
  - Pilih Method streaming (misal `SensorService.StreamTelemetry`).
  - Klik **Start Stream**. Setiap pesan Protobuf yang dipancarkan oleh server akan muncul di panel timeline streaming secara real-time.

---

## 📡 2. MQTT Broker Client (v3.1.1 & v5.0)

Modul MQTT mendukung komunikasi publish-subscribe berbasis broker untuk perangkat IoT dan *event-driven systems*.

### 2.1. Menghubungkan ke Broker
1. Buka tab **MQTT**.
2. Masukkan URL Broker:
   - Protokol TCP: `mqtt://127.0.0.1:1883`
   - Protokol TLS: `mqtts://broker.example.com:8883`
   - Protokol WebSocket: `ws://127.0.0.1:9001/mqtt`
3. Konfigurasi Client ID (atau gunakan auto-generated UUID), Username, dan Password jika broker diamankan.
4. Klik **Connect**. Indikator status akan berubah menjadi hijau `Connected`.

### 2.2. Mengelola Subscription (Langganan Topik)
- Masukkan pola topik pada panel **Subscriptions**.
- Mendukung wildcard standar MQTT:
  - `+` (Single-level wildcard), misal: `factory/sensor/+/temperature`
  - `#` (Multi-level wildcard), misal: `factory/sensors/#`
- Pilih tingkat **QoS (Quality of Service)**:
  - **QoS 0**: At most once (tercepat, tanpa konfirmasi).
  - **QoS 1**: At least once (terjamin sampai minimal satu kali).
  - **QoS 2**: Exactly once (terjamin tepat satu kali pengiriman).
- Klik **Subscribe**. Topik aktif akan terdaftar di panel samping.

### 2.3. Mempublikasikan Pesan (Publish)
- Masukkan Topik tujuan (misal `factory/sensors/temperature`).
- Pilih format payload: **JSON**, **Text**, atau **Hex**.
- Atur QoS dan centang opsi **Retain** jika pesan ini harus disimpan oleh broker sebagai nilai terakhir untuk subscriber baru.
- Klik **Publish**. Pesan akan terkirim dan seketika diterima oleh subscriber yang cocok.

---

## 🔌 3. Raw TCP Client & Server

Modul TCP menyediakan pengujian komunikasi socket stream tingkat rendah dengan kontrol penuh atas format framing data.

### 3.1. TCP Client Mode
1. Pilih radio button **Client Mode**.
2. Masukkan Target Host (misal `127.0.0.1`) dan Port (misal `9001`).
3. Opsi: Pilih adapter IP lokal (`localAddress`) jika mesin Anda memiliki beberapa antarmuka jaringan.
4. Klik **Connect**.
5. Pilih format input:
   - **Text**: Kirim string teks UTF-8 biasa.
   - **Hex**: Kirim rangkaian biner mentah dalam representasi heksadesimal (misal `01 03 00 00 00 02 C4 0B` untuk protokol Modbus RTU/TCP).
   - **Base64**: Kirim data biner yang dienkode base64.
6. Klik **Send**.

### 3.2. Framing Mode (Penanganan Data Terpecah / TCP Chunks)
Karena TCP adalah *stream-oriented*, paket besar bisa terpecah atau tergabung. Anda dapat memilih strategi framing pada dropdown:
- **None (Raw Chunks)**: Emit event setiap kali kernel menerima paket data.
- **Delimiter**: Pisahkan pesan berdasarkan karakter pembatas (default `\n` atau `\r\n`).
- **Length Prefix**: 2-byte atau 4-byte big-endian / little-endian penentu panjang paket.

### 3.3. TCP Server Mode
Aplikasi ini juga dapat bertindak sebagai **TCP Server lokal**:
1. Pilih radio button **Server Mode**.
2. Tentukan Listening Port (misal `9005`) dan Host (`0.0.0.0` untuk semua adapter atau `127.0.0.1` untuk loopback).
3. Klik **Start Listening**.
4. Ketika perangkat eksternal (misal PLC, mikrokontroler ESP32, atau terminal `netcat`) terhubung, IP & Port remote client akan muncul di daftar **Connected Clients**.
5. Anda dapat mengirim data ke klien spesifik atau menyiarkannya ke semua klien (*broadcast*).

---

## 📦 4. UDP Datagram Tester

Berbeda dengan TCP yang berorientasi koneksi, UDP berorientasi datagram mandiri (*connectionless*), cocok untuk pengujian game, streaming DNS, VoIP, atau penemuan perangkat lokal.

### 4.1. Mengirim & Menerima Datagram Unicast
1. Buka tab **UDP**.
2. Masukkan **Bind Port** lokal (misal `9099`) agar socket lokal siap menerima respon balik.
3. Masukkan **Target Host** (misal `127.0.0.1`) dan **Target Port** (misal `9002`).
4. Klik **Bind Socket**.
5. Masukkan teks atau payload Hex dan klik **Send Datagram**.

### 4.2. Pengujian Broadcast Jaringan Lokal
1. Centang opsi **Enable Broadcast (`SO_BROADCAST`)**.
2. Masukkan Target Host broadcast subnet Anda (misal `192.168.1.255` atau `255.255.255.255`).
3. Kirim paket probe penemuan perangkat.

### 4.3. Pengujian Multicast Grup
1. Masukkan alamat IP Multicast kelas D pada kolom **Multicast Group** (misal grup SSDP `239.255.255.250` atau mDNS `224.0.0.251`).
2. Klik **Join Group (`IP_ADD_MEMBERSHIP`)**.
3. Aplikasi akan mendengarkan semua paket multicast yang dikirimkan oleh perangkat-perangkat di jaringan lokal Anda.

---

🔙 **Kembali ke**: [Portal Dokumentasi Utama (README.md)](file:///d:/network-tools/docs/README.md) | ➡️ **Lanjut ke**: [Panduan Variabel & Storage (variables-and-storage.md)](file:///d:/network-tools/docs/user-guide/variables-and-storage.md)
