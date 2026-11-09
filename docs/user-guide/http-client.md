# Panduan Lengkap HTTP Client

Modul HTTP Client pada **Network Tester GUI** dirancang sebagai pengganti tangguh untuk Postman dan Insomnia, ditenagai oleh mesin jaringan **Undici** yang menawarkan performa tinggi, efisiensi memori, dan analisis latensi jaringan mendalam.

---

## 🎯 1. Fitur Utama HTTP Client

- **Dukungan Protokol**: HTTP/1.1 dan HTTP/2 dengan negosiasi ALPN otomatis.
- **Dukungan Method Penuh**: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, dan `OPTIONS`.
- **Timing Waterfall**: Analisis presisi milidetik untuk tahapan koneksi: DNS Lookup, TCP Connection, TLS Handshake, Time to First Byte (TTFB), dan Content Download.
- **Beragam Format Body**:
  - `none`: Request tanpa body (default untuk GET/HEAD).
  - `form-data`: Berkas biner dan key-value pasangan multipart.
  - `x-www-form-urlencoded`: Formulir web standar URL encoded.
  - `raw`: Format bebas dengan selector format (JSON, XML, HTML, Plaintext, Javascript).
  - `binary`: Unggah berkas biner sembarang (gambar, arsip zip, dokumen).
- **Sistem Autentikasi**:
  - `No Auth`: Request publik.
  - `Bearer Token`: Header `Authorization: Bearer <token>`.
  - `Basic Auth`: Header `Authorization: Basic <base64(user:pass)>`.
  - `API Key`: Injeksi API Key ke dalam Header kustom atau Query Param.
- **Auto Cookie Capture & Injection**: Otomatis menangkap `Set-Cookie` dan menginjeksinya ke request berikutnya berdasarkan domain & path.
- **Timing Waterfall Inspector**: Visualisasi breakdown waktu koneksi jaringan.

---

## 🛠️ 2. Mengirim Request Berbagai Method

### 2.1. Request GET dengan Query Parameters
1. Pilih method `GET`.
2. Masukkan URL: `http://127.0.0.1:9080/api/users`.
3. Buka tab **Params**:
   - Tambahkan key `limit` bernilai `10`.
   - Tambahkan key `page` bernilai `1`.
   - Perhatikan bahwa query string di input URL otomatis tersinkronisasi menjadi `?limit=10&page=1`.
4. Klik **Send**.

### 2.2. Request POST dengan Payload JSON
1. Pilih method `POST`.
2. Masukkan URL: `http://127.0.0.1:9080/api/users`.
3. Buka tab **Body**:
   - Pilih radio button **raw**.
   - Pilih format dropdown **JSON**.
   - Ketikkan payload:
     ```json
     {
       "name": "Budi Santoso",
       "email": "budi@example.com",
       "role": "developer"
     }
     ```
4. Tab **Headers** secara otomatis menambahkan header `Content-Type: application/json`.
5. Klik **Send**. Respon `201 Created` akan diterima beserta data pengguna baru.

### 2.3. Request PUT / PATCH
1. Pilih method `PUT` atau `PATCH`.
2. Masukkan URL: `http://127.0.0.1:9080/api/users/123`.
3. Masukkan perubahan payload pada tab **Body**.
4. Klik **Send**.

---

## ⏱️ 3. Membaca Timing Waterfall

Setelah request berhasil dikirim, klik tab **Timing** pada panel respon bawah. Anda akan melihat visualisasi garis waktu jaringan:

```text
[DNS Lookup]      ██ 12ms
[TCP Handshake]      ████ 24ms
[TLS Negotiation]        ██████ 35ms
[Time to First Byte]           ████████████ 68ms
[Content Download]                         ██ 8ms
--------------------------------------------------
Total Waktu Transaksi: 147ms
```

### Penjelasan Metrik:
- **DNS Lookup**: Waktu yang dibutuhkan untuk menerjemahkan domain host menjadi alamat IP.
- **TCP Handshake**: Waktu pembentukan koneksi 3-way handshake `SYN -> SYN-ACK -> ACK`.
- **TLS Handshake**: Waktu negosiasi sertifikat SSL/TLS dan penentuan kunci enkripsi simetris.
- **Time to First Byte (TTFB)**: Waktu tunggu dari pengiriman byte terakhir request hingga byte pertama respon server diterima (mengukur kecepatan pemrosesan server backend).
- **Download**: Waktu transfer seluruh payload data dari server ke antarmuka aplikasi.

---

## 🍪 4. Integrasi Cookie Jar

Aplikasi secara otomatis mematuhi spesifikasi **RFC 6265**:
- Jika server mengembalikan header `Set-Cookie: session_id=abc; Path=/; HttpOnly`, cookie ini otomatis tersimpan ke Cookie Jar.
- Pada request berikutnya ke domain yang sama, header `Cookie: session_id=abc` akan otomatis diinjeksi tanpa perlu Anda atur manual.
- Anda dapat menginspeksi, menyunting, atau menghapus cookie kapan saja melalui modal **Cookie Manager** di header toolbar.

---

## 🛡️ 5. Melakukan Spoofing IP & Region

Untuk menguji API yang memiliki pembatasan geografis (*geo-blocking*) atau mendeteksi negara pengguna:
1. Pada tab HTTP, klik opsi **Geo-IP / Region Spoof**.
2. Centang **Enable Spoofing**.
3. Pilih Preset Negara (misal: `Japan (JP)`, `United States (US)`, `Singapore (SG)`).
4. Atau masukkan Custom IP sendiri (misal: `202.166.192.55`).
5. Saat dikirim, aplikasi menginjeksi header standar industri:
   - `X-Forwarded-For: <Custom_IP>`
   - `X-Real-IP: <Custom_IP>`
   - `CF-Connecting-IP: <Custom_IP>`
   - `CF-IPCountry: <Country_Code>`

---

🔙 **Kembali ke**: [Portal Dokumentasi Utama (README.md)](file:///d:/network-tools/docs/README.md) | ➡️ **Lanjut ke**: [Panduan Realtime Protocols (realtime-protocols.md)](file:///d:/network-tools/docs/user-guide/realtime-protocols.md)
