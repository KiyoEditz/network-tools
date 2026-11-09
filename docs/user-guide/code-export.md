# Panduan Ekspor Kode (Code Generation)

Aplikasi menyertakan generator kode bawaan yang memungkinkan Anda mengubah request apa pun yang sedang Anda racik menjadi kode program siap jalan dalam 1 klik.

Target bahasa yang diprioritaskan adalah **Node.js** dan **Python**, serta perintah terminal standar **cURL**.

---

## 💻 1. Cara Menggunakan Ekspor Kode

1. Di tab HTTP, susun request Anda (URL, Method, Headers, Query Params, dan Body JSON/Form-data).
2. Klik tombol **Code** (ikon `</>`) di sebelah tombol Send.
3. Modal **Code Export** akan terbuka menampilkan kode yang dihasilkan secara langsung.
4. Pilih bahasa atau pustaka target pada tab pemilih:
   - **Node.js (Native Fetch)**
   - **Node.js (Axios)**
   - **Python (Requests)**
   - **Python (HTTPX)**
   - **cURL Command**
5. Klik **Copy Code** untuk menyalin ke clipboard Anda.

---

## 📋 2. Format & Contoh Kode yang Dihasilkan

Misalkan Anda memiliki request POST ke `https://api.example.com/v1/users` dengan header `Authorization` dan body JSON:

### 2.1. Node.js — Native Fetch (Node.js 18+)
```javascript
// Node.js Native Fetch (ESM / CJS)
const response = await fetch("https://api.example.com/v1/users", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_ACCESS_TOKEN",
    "User-Agent": "NetworkTester/1.0"
  },
  body: JSON.stringify({
    name: "Alice",
    role: "admin"
  })
});

const data = await response.json();
console.log(data);
```

### 2.2. Node.js — Axios
```javascript
// Node.js Axios
import axios from 'axios';

try {
  const response = await axios.post("https://api.example.com/v1/users", {
    name: "Alice",
    role: "admin"
  }, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_ACCESS_TOKEN"
    }
  });
  console.log(response.status, response.data);
} catch (error) {
  console.error("Request failed:", error.response?.data || error.message);
}
```

### 2.3. Python — Requests
```python
# Python 3 Requests
import requests

url = "https://api.example.com/v1/users"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
payload = {
    "name": "Alice",
    "role": "admin"
}

response = requests.post(url, json=payload, headers=headers)
print(response.status_code)
print(response.json())
```

### 2.4. Python — HTTPX (Asinkron / Sinkron)
```python
# Python 3 HTTPX (Async support)
import httpx

url = "https://api.example.com/v1/users"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}
payload = {
    "name": "Alice",
    "role": "admin"
}

with httpx.Client() as client:
    response = client.post(url, json=payload, headers=headers)
    print(response.status_code, response.json())
```

### 2.5. cURL (Terminal / Bash)
```bash
curl -X POST "https://api.example.com/v1/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"name":"Alice","role":"admin"}'
```

---

🔙 **Kembali ke**: [Portal Dokumentasi Utama (README.md)](file:///d:/network-tools/docs/README.md) | ➡️ **Lanjut ke**: [Desain Sistem & Arsitektur (system-design.md)](file:///d:/network-tools/docs/architecture/system-design.md)
