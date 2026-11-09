# Portal Dokumentasi Resmi: Network Tester GUI

Selamat datang di pusat dokumentasi resmi **Network Tester GUI**, aplikasi desktop pengujian jaringan multi-protokol tingkat lanjut (*developer-first workbench*) yang dibangun dengan **Electron, React 19, TypeScript, Vite, dan Tailwind CSS**.

Aplikasi ini dirancang khusus untuk memberikan pengalaman debugging jaringan yang komprehensif, cepat, dan ringan tanpa ketergantungan pada alat kompilasi native C++ (`node-gyp`) atau Rust.

---

## 🧭 Peta Panduan Dokumentasi

Dokumentasi ini dibagi menjadi beberapa modul tematik yang dapat Anda telusuri sesuai kebutuhan:

```text
docs/
├── README.md                                # Portal Dokumentasi Utama (Halaman Ini)
├── getting-started/
│   ├── installation.md                      # Panduan Instalasi & Persyaratan Sistem
│   └── quick-start.md                       # Panduan Memulai Cepat & Uji Coba Pertama
├── user-guide/
│   ├── http-client.md                       # Panduan Lengkap HTTP/1.1 & HTTP/2 Client
│   ├── realtime-protocols.md                # Panduan WebSocket, SSE, & WebRTC P2P
│   ├── iot-and-sockets.md                   # Panduan gRPC, MQTT Broker, Raw TCP & UDP
│   ├── variables-and-storage.md             # Panduan Variabel, Cookie Jar, & Web Storage
│   ├── proxy-network-spoofing.md            # Panduan Multi-Region Proxy, Local IP & Geo-IP
│   ├── scripting-and-tests.md               # Panduan Skrip Pre-request & Postman Tests
│   ├── response-viewer-media.md             # Panduan Monaco, Hex Inspector, & Media Preview
│   └── code-export.md                       # Panduan Ekspor Kode (Node.js, Python, cURL)
├── architecture/
│   └── system-design.md                     # Desain Sistem, IPC Bridge, & Optimasi Memori
├── contributing/
│   └── contributing.md                      # Panduan Kontribusi, Coding Standard, & Pengujian
└── troubleshooting.md                       # Solusi Kendala Umum, Port, Firewall, & RAM
```

---

## ⚡ Ikhtisar Cepat Fitur

| Kategori | Protokol / Fitur yang Didukung |
| :--- | :--- |
| **HTTP & Web** | HTTP/1.1, HTTP/2, REST verbs (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS), Timing Waterfall, Multipart Form-Data, URL Encoded, Raw JSON/XML. |
| **Realtime Stream** | WebSocket (Bidirectional, auto ping/pong RTT, hex/text framing), Server-Sent Events (SSE event parser & filtering). |
| **P2P & Media** | WebRTC (RTCPeerConnection, offline SDP handshake, DataChannel chat/benchmark, synthetic audio/video loopback, getStats telemetry). |
| **IoT & RPC** | gRPC (Dynamic proto loader, server reflection, Unary & Server Streaming), MQTT (v3.1.1 & v5.0, QoS 0/1/2, Retain, wildcard topic `+`/`#`). |
| **Low-Level Sockets** | Raw TCP (Client & Server mode, delimiter/length framing), UDP (Unicast, local port binding, Broadcast, Multicast `239.255.255.250`). |
| **Jaringan & Proxy** | SOCKS4, SOCKS5, SOCKS5h, HTTP/HTTPS Proxy dengan autentikasi, Source IP binding (`localAddress`), Geo-IP header spoofing. |
| **Storage & State** | Dynamic variable engine `{{var}}`, RFC 6265 Cookie Jar otomatis, Virtual LocalStorage & SessionStorage simulasi per-origin. |
| **Inspeksi & Preview** | Monaco Editor (JSON, XML, HTML, Text), 3-Column Hex Dump dengan byte-level type inspector, Native Image/Audio/Video/PDF player. |
| **Ekspor Kode** | Ekspor 1-klik ke Node.js (`fetch`, `axios`), Python (`requests`, `httpx`), dan cURL standar. |

---

## 🔗 Tautan Dokumen Utama

- 🚀 [Panduan Instalasi & Persyaratan Sistem](file:///d:/network-tools/docs/getting-started/installation.md)
- ⏱️ [Panduan Memulai Cepat (Quick Start)](file:///d:/network-tools/docs/getting-started/quick-start.md)
- 🌐 [Panduan HTTP Client](file:///d:/network-tools/docs/user-guide/http-client.md)
- 🔄 [Panduan Realtime Protocols (WS, SSE, WebRTC)](file:///d:/network-tools/docs/user-guide/realtime-protocols.md)
- 🛰️ [Panduan IoT & Sockets (gRPC, MQTT, TCP, UDP)](file:///d:/network-tools/docs/user-guide/iot-and-sockets.md)
- 🧩 [Panduan Variabel, Cookie Jar, & Web Storage](file:///d:/network-tools/docs/user-guide/variables-and-storage.md)
- 🛡️ [Panduan Proxy, Local IP, & Geo-IP Spoofing](file:///d:/network-tools/docs/user-guide/proxy-network-spoofing.md)
- 🧪 [Panduan Skrip Sandbox & Assertions](file:///d:/network-tools/docs/user-guide/scripting-and-tests.md)
- 🔬 [Panduan Response Viewer & Hex Inspector](file:///d:/network-tools/docs/user-guide/response-viewer-media.md)
- 💻 [Panduan Ekspor Kode (Node.js & Python)](file:///d:/network-tools/docs/user-guide/code-export.md)
- 🏛️ [Arsitektur & Desain Sistem](file:///d:/network-tools/docs/architecture/system-design.md)
- 🤝 [Panduan Kontribusi & Pengujian](file:///d:/network-tools/docs/contributing/contributing.md)
- ❓ [Troubleshooting & Solusi Masalah](file:///d:/network-tools/docs/troubleshooting.md)
