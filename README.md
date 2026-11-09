# Advanced GUI Network Tester

> A high-performance, developer-first desktop network testing workbench built with Electron, React 19, TypeScript, Vite, and Tailwind CSS.
> Designed for rapid multi-protocol debugging with zero native C++ compilation overhead.

---

## 🚀 Key Highlights & Capabilities

- **Multi-Protocol Suite**:
  - **HTTP/1.1 & HTTP/2**: All standard verbs (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS), timing waterfall (DNS, TCP, TLS, TTFB, Download), body formats (JSON, Form-data, URL-encoded, XML, Raw text, Binary).
  - **WebSocket (WS/WSS)**: Bidirectional timeline view, custom framing, heartbeat ping-pong with sub-millisecond RTT tracking.
  - **Server-Sent Events (SSE)**: Real-time event streaming with event filtering and reconnect simulation.
  - **gRPC**: Protobuf client with server reflection or dynamic `.proto` file loader, Unary and Server Streaming support.
  - **MQTT (v3.1.1 & v5.0)**: TCP and WebSocket transport, multi-topic subscription (`+` and `#` wildcards), QoS 0/1/2, retain flags.
  - **Raw TCP**: Client & Server modes, customizable framing (Delimiter `\n`, Length prefix, Raw bytes).
  - **UDP Datagrams**: Unicast send/receive, local port binding, broadcast, and multicast group membership (`239.255.255.250`).
  - **WebRTC**: Browser-native `RTCPeerConnection`, offline copy-paste SDP handshake, automated signaling, RTCDataChannel chat & synthetic video/audio streaming, and real-time `getStats()` bandwidth/RTT graphs.

- **Developer Tooling & Network Customization**:
  - **Dynamic Variable Interpolation**: Use `{{variable}}` anywhere in URLs, headers, or payloads. Built-in generators: `{{$guid}}`, `{{$timestamp}}`, `{{$isoTimestamp}}`, `{{$randomInt}}`, and `{{$randomCountryIp:JP}}`.
  - **RFC 6265 Cookie Jar**: Automatic capture of `Set-Cookie` response headers, domain/path-scoped storage, and automated outbound injection.
  - **Virtual Web Storage**: Origin-scoped LocalStorage & SessionStorage simulation without polluting the host environment.
  - **Multi-Region Proxy Routing**: HTTP, HTTPS, SOCKS4, SOCKS5, and SOCKS5h proxies with authentication and exit IP verification.
  - **Source IP & Local Interface Binding**: Select active OS network adapters to bind the client `localAddress`.
  - **Geo-IP & Region Spoofing**: Inject Cloudflare/Akamai/CDN geolocation headers (`CF-IPCountry`, `X-Forwarded-For`, `X-Real-IP`, `CF-Connecting-IP`) to test geo-fenced services.
  - **Postman-Compatible Sandbox**: Pre-request scripts and post-response test assertions (`pm.environment`, `pm.variables`, `pm.test`, `pm.expect`).
  - **1-Click Code Generation**: Export any request instantly to **Node.js** (`fetch`, `axios`), **Python** (`requests`, `httpx`), or **cURL**.

- **Universal Response Viewer**:
  - **Pretty Viewer**: Monaco-powered code editor with syntax highlighting for JSON, XML, HTML, CSS, JavaScript, and plaintext.
  - **Raw Viewer**: Exact unformatted network bytes.
  - **3-Column Hex Inspector**: Offset address, 16-byte hex dump, and ASCII representation with interactive byte-level decoding.
  - **Rich Media Preview**: Native in-memory rendering for Images (PNG, JPG, SVG, WebP, GIF), Audio (WAV, MP3), Video (MP4, WebM), and PDF files.

---

## 🛠️ Tech Stack & Constraints

- **Runtime**: Node.js v24.22.1 & Electron 35.0.0
- **Frontend**: React 19, TypeScript, Tailwind CSS, Zustand, Monaco Editor (`@monaco-editor/react`), Lucide React
- **Network Engine**: Pure JavaScript/TypeScript (`undici`, `ws`, `eventsource`, `@grpc/grpc-js`, `mqtt`, `socks-proxy-agent`, `tough-cookie`)
- **Compilation Constraint**: **Zero C++ Build Tools & Zero Rust compile step** (`x86_64-pc-windows-gnu` safe). 100% pure JS/Wasm runtime compatible with low-spec hardware (Intel Celeron N4000, 2 cores, 6 GB RAM).

---

## 📦 Getting Started

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Development Mode (GUI Application)
Start Vite HMR and launch the Electron desktop window:
```bash
npm run dev
```

### 3. Integrated Protocol Mock Server (Port Isolation Safe)
Run the all-in-one local test server (HTTP: `9080`, WS: `9081`, SSE: `9082`, TCP: `9001`, UDP: `9002`, MQTT: `1883`, WebRTC Signaling: `9083`):
```bash
npm run mock:server
```
*(All ports avoid `~3000` and `~8000` to prevent any conflict with existing local projects).*

### 4. Running Automated Tests
Run unit tests (Variable engine, Cookie jar, Virtual storage, Sandbox script execution):
```bash
npm run test:unit
```

Run end-to-end multi-protocol suite:
```bash
npm run test:e2e
```

Run entire test suite:
```bash
npm test
```

### 5. Production Build
Compile TypeScript main process and bundle Vite frontend:
```bash
npm run build
```

---

## 📚 Documentation & User Guides

Complete official user manuals, guides, and architectural references are available in the [`docs/`](file:///d:/network-tools/docs/README.md) directory:

- 📖 **[Main Documentation Portal](file:///d:/network-tools/docs/README.md)**
- 🚀 **Getting Started**:
  - [Installation & System Requirements](file:///d:/network-tools/docs/getting-started/installation.md)
  - [Quick Start Guide](file:///d:/network-tools/docs/getting-started/quick-start.md)
- 🌐 **User Guides**:
  - [HTTP/1.1 & HTTP/2 Client Guide](file:///d:/network-tools/docs/user-guide/http-client.md)
  - [Realtime Protocols (WebSocket, SSE, WebRTC)](file:///d:/network-tools/docs/user-guide/realtime-protocols.md)
  - [IoT & Low-Level Sockets (gRPC, MQTT, TCP, UDP)](file:///d:/network-tools/docs/user-guide/iot-and-sockets.md)
  - [Dynamic Variables, Cookie Jar, & Virtual Storage](file:///d:/network-tools/docs/user-guide/variables-and-storage.md)
  - [Multi-Region Proxy, Source IP, & Geo-IP Spoofing](file:///d:/network-tools/docs/user-guide/proxy-network-spoofing.md)
  - [Sandbox Scripting & Tests Assertions](file:///d:/network-tools/docs/user-guide/scripting-and-tests.md)
  - [Response Viewer, Hex Inspector, & Media Players](file:///d:/network-tools/docs/user-guide/response-viewer-media.md)
  - [1-Click Code Generation (Node.js & Python)](file:///d:/network-tools/docs/user-guide/code-export.md)
- 🏛️ **Architecture & Development**:
  - [System Design & Memory Optimization](file:///d:/network-tools/docs/architecture/system-design.md)
  - [Contributing & Testing Guidelines](file:///d:/network-tools/docs/contributing/contributing.md)
  - [Troubleshooting & Common Issues](file:///d:/network-tools/docs/troubleshooting.md)

---

## 📄 License
Licensed under the [Non-Commercial Ethical & Lawful Use License (NCEL-1.0)](file:///d:/network-tools/LICENSE).
Strictly prohibited for unauthorized / unlawful activities and restricted from commercial use by corporations with stable revenue. Free for individuals, students, researchers, and open-source developers.
