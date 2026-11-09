# Panduan Variabel, Cookie Jar, & Web Storage

Panduan mengelola variabel lingkungan dinamis, sistem Cookie Jar otomatis berstandar RFC 6265, serta simulator Virtual LocalStorage dan SessionStorage.

---

## 🧩 1. Dynamic Variable Engine (`{{variable}}`)

Variable Engine memungkinkan Anda menulis request yang fleksibel, dinamis, dan tidak terikat pada nilai statis *hardcoded*.

### 1.1. Sintaks Variabel
Gunakan tanda kurung kurawal ganda:
```text
{{nama_variabel}}
```
Variabel dapat disematkan di mana saja:
- Pada **URL**: `{{baseUrl}}/api/v1/orders/{{orderId}}`
- Pada **Headers**: `Authorization: Bearer {{authToken}}`
- Pada **Query Params**: `filter={{searchQuery}}`
- Pada **Body JSON**: `{ "userId": "{{userId}}", "amount": 5000 }`

### 1.2. Hierarki Prioritas Variabel
Jika terdapat nama variabel yang sama di berbagai tingkat, sistem menyelesaikannya dengan urutan prioritas tertinggi:
1. **Local Variables**: Variabel sementara yang diset via skrip pre-request (`pm.variables.set(...)`).
2. **Environment Variables**: Variabel aktif dari environment terpilih (misal "Development" atau "Production").
3. **Global Variables**: Variabel umum yang berlaku di seluruh workspace dan tab.

### 1.3. Generator Dinamis Bawaan (*Dynamic Generators*)
Aplikasi menyertakan fungsi generator dinamis siap pakai tanpa perlu skrip tambahan:

| Sintaks Generator | Output Contoh | Deskripsi |
| :--- | :--- | :--- |
| `{{$guid}}` | `a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d` | UUID v4 acak |
| `{{$timestamp}}` | `1731139200` | Waktu saat ini dalam detik epoch UNIX |
| `{{$isoTimestamp}}`| `2026-11-09T07:30:00.000Z` | Timestamp format ISO 8601 |
| `{{$randomInt}}` | `482` | Bilangan bulat acak antara 0 hingga 1.000 |
| `{{$randomCountryIp:JP}}` | `133.242.18.90` | Alamat IP publik valid dari region Jepang |
| `{{$randomCountryIp:US}}` | `104.16.249.5` | Alamat IP publik valid dari region Amerika Serikat |
| `{{$randomCountryIp:SG}}` | `202.166.192.55`| Alamat IP publik valid dari region Singapura |

---

## 🍪 2. RFC 6265 Cookie Jar

Aplikasi menyertakan mesin Cookie Jar internal berbasis `tough-cookie` yang mengelola siklus hidup cookie web secara otomatis:

### 2.1. Penangkapan Otomatis (*Auto Capture*)
Setiap kali respon HTTP menyertakan header `Set-Cookie`, aplikasi mem-parsing dan menyimpannya ke dalam Cookie Jar:
```http
HTTP/1.1 200 OK
Set-Cookie: session_token=xyz9988; Domain=example.com; Path=/; HttpOnly; SameSite=Lax
```
Aplikasi memvalidasi:
- Masa kedaluwarsa (`Expires` / `Max-Age`).
- Validitas domain dan subdomain.
- Batasan jalur akses (`Path`).

### 2.2. Injeksi Otomatis (*Auto Injection*)
Ketika Anda mengirim request berikutnya ke domain atau path yang cocok, aplikasi secara otomatis menyusun dan menyuntikkan header `Cookie`:
```http
GET /api/profile HTTP/1.1
Host: example.com
Cookie: session_token=xyz9988
```

### 2.3. Modal Cookie Manager
Klik ikon **Cookies** pada header atas untuk:
- Melihat seluruh domain yang memiliki cookie tersimpan.
- Membaca nilai, atribut `HttpOnly`, `Secure`, dan tanggal kedaluwarsa.
- Mengedit nilai cookie secara langsung atau menghapusnya (*Clear Domain Cookies*).

---

## 💾 3. Virtual Web Storage (LocalStorage & SessionStorage)

Ketika menguji arsitektur Single Page Application (SPA), server sering kali mengandalkan token autentikasi yang disimpan di `localStorage` atau `sessionStorage` peramban klien.

Karena aplikasi desktop pengujian berjalan di luar browser aplikasi target, **Network Tester GUI** menyediakan **Virtual Web Storage** per-origin:

### 3.1. Lingkup Berbasis Origin (*Origin Scope*)
Storage diisolasi secara ketat berdasarkan skema, domain, dan port (misal `http://127.0.0.1:9080` terpisah dari `https://api.production.com`).

### 3.2. Akses Melalui Skrip Uji
Anda dapat membaca dan menulis data ke virtual storage menggunakan API `pm` di tab **Tests** atau **Pre-request**:
```javascript
// Menyimpan token respon ke virtual LocalStorage
const responseJson = pm.response.json();
pm.localStorage.setItem('auth_token', responseJson.token);

// Menyimpan session id sementara
pm.sessionStorage.setItem('current_step', 'checkout_payment');

// Membaca kembali pada request berikutnya
const savedToken = pm.localStorage.getItem('auth_token');
pm.variables.set('activeToken', savedToken);
```

### 3.3. Menginspeksi Storage
Klik ikon **Storage** pada toolbar atas untuk membuka modal inspektur penyimpanan virtual. Anda dapat meninjau pasangan key-value, menambahkan item baru, atau mengosongkan penyimpanan per origin.

---

🔙 **Kembali ke**: [Portal Dokumentasi Utama (README.md)](file:///d:/network-tools/docs/README.md) | ➡️ **Lanjut ke**: [Panduan Proxy & Spoofing (proxy-network-spoofing.md)](file:///d:/network-tools/docs/user-guide/proxy-network-spoofing.md)
