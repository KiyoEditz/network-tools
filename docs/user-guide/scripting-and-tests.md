# Panduan Skrip Sandbox & Assertions Pengujian

Aplikasi menyertakan lingkungan sandbox eksekusi skrip JavaScript yang terisolasi dan aman berbasis Node.js `vm`. Lingkungan ini sepenuhnya kompatibel dengan sintaks API Postman (`pm.*`).

---

## 🏃 1. Alur Siklus Hidup Eksekusi Skrip

Setiap kali Anda menekan tombol **Send** pada request HTTP, urutan eksekusi adalah sebagai berikut:

```text
[1. Pre-request Script] 
         │ (Menyiapkan variabel, token HMAC, atau timestamp)
         ▼
[2. Variable Interpolation] 
         │ (Mengganti {{var}} dengan nilai terbaru)
         ▼
[3. Outbound Network Request] 
         │ (Mengirim request melalui jaringan / proxy)
         ▼
[4. Server Response Received] 
         │ (Menangkap status, header, body, dan cookies)
         ▼
[5. Post-Response Tests Script] 
         │ (Menjalankan pm.test() dan menyimpan variabel respon)
         ▼
[6. Render Response & Test Results UI]
```

---

## 📝 2. Skrip Pre-Request

Skrip Pre-request dijalankan sebelum request jaringan dikirim ke server. Sangat berguna untuk:
- Meng-generate timestamp dinamis atau hash kriptografi.
- Mengatur variabel lingkungan sebelum dipakai pada URL atau Headers.

### Contoh 1: Menghitung Signature HMAC SHA-256
```javascript
// Contoh membuat header signature
const apiKey = pm.environment.get('API_KEY');
const apiSecret = pm.environment.get('API_SECRET');
const timestamp = Math.floor(Date.now() / 1000).toString();

// Mengeset variabel sementara untuk dipakai pada Header request
pm.variables.set('reqTimestamp', timestamp);
pm.variables.set('clientSignature', 'sig_' + timestamp + '_' + apiKey);
```

### Contoh 2: Logika Kondisional
```javascript
if (!pm.environment.get('sessionId')) {
    pm.environment.set('sessionId', 'sess_' + Math.random().toString(36).substring(7));
}
```

---

## 🧪 3. Skrip Post-Response (Tests Assertions)

Skrip Tests dieksekusi setelah respon server diterima. Hasil pengujian (`PASSED` atau `FAILED`) akan otomatis dirender pada tab **Test Results** di panel respon bawah.

### 3.1. Memeriksa Status Code
```javascript
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Successful creation status", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 202]);
});
```

### 3.2. Memeriksa Header Respon
```javascript
pm.test("Content-Type header is JSON", function () {
    pm.response.to.have.header("content-type");
    pm.expect(pm.response.headers.get("content-type")).to.include("application/json");
});
```

### 3.3. Memvalidasi Struktur & Nilai Body JSON
```javascript
pm.test("Response body contains valid user data", function () {
    const jsonData = pm.response.json();
    
    pm.expect(jsonData).to.be.an('object');
    pm.expect(jsonData.status).to.eql("success");
    pm.expect(jsonData.data).to.be.an('array');
    pm.expect(jsonData.data.length).to.be.greaterThan(0);
});
```

### 3.4. Menyimpan Token Respon ke Environment untuk Request Berikutnya
Salah satu skenario paling umum adalah *request chaining* (misal: login lalu menggunakan token untuk request profil):
```javascript
pm.test("Extract and persist authentication bearer token", function () {
    const res = pm.response.json();
    pm.expect(res.token).to.be.a('string');
    
    // Simpan ke environment aktif
    pm.environment.set("jwtToken", res.token);
    
    // Simpan juga ke virtual local storage
    pm.localStorage.setItem("user_token", res.token);
});
```

---

## 📚 4. Daftar Referensi Objek `pm`

| Objek / Metode | Deskripsi |
| :--- | :--- |
| `pm.environment.get(key)` | Mengambil nilai variabel dari environment aktif. |
| `pm.environment.set(key, val)` | Menyimpan/memperbarui variabel pada environment aktif. |
| `pm.variables.get(key)` | Mengambil variabel dengan hierarki prioritas (Local > Env > Global). |
| `pm.variables.set(key, val)` | Menetapkan variabel lokal sementara untuk request saat ini. |
| `pm.localStorage.getItem(key)` | Membaca nilai dari Virtual LocalStorage origin terkait. |
| `pm.localStorage.setItem(key, val)`| Menulis nilai ke Virtual LocalStorage origin terkait. |
| `pm.sessionStorage.getItem(key)` | Membaca nilai dari Virtual SessionStorage origin terkait. |
| `pm.sessionStorage.setItem(key, val)`| Menulis nilai ke Virtual SessionStorage origin terkait. |
| `pm.response.code` | Angka status code HTTP (misal: 200, 404, 500). |
| `pm.response.status` | Teks status code HTTP (misal: "OK", "Not Found"). |
| `pm.response.responseTime` | Waktu respon server total dalam milidetik. |
| `pm.response.json()` | Mem-parsing body respon menjadi objek JavaScript. |
| `pm.response.text()` | Mengambil body respon dalam format string mentah. |
| `pm.test(testName, fn)` | Mendefinisikan satu unit pengujian asersi. |
| `pm.expect(val)` | Memulai rantai asersi berbasis pustaka Chai (misal `.to.equal()`, `.to.be.true`). |

---

🔙 **Kembali ke**: [Portal Dokumentasi Utama (README.md)](file:///d:/network-tools/docs/README.md) | ➡️ **Lanjut ke**: [Panduan Response Viewer & Media (response-viewer-media.md)](file:///d:/network-tools/docs/user-guide/response-viewer-media.md)
