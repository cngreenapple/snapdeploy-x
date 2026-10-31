const WebSocket = require('ws');
const net = require('net');
const dgram = require('dgram');
const http = require('http');
const url = require('url');

// Constants
const horse = Buffer.from("dHJvamFu", 'base64').toString(); // "trojan"
const flash = Buffer.from("dm1lc3M=", 'base64').toString(); // "vmess/vless"

const WS_READY_STATE_OPEN = 1;

// ==================== ENVIRONMENT ====================
// Every path is normalized to look like a static asset route.
const asRoute = (value, fallback) => {
  const raw = (value || '').trim().replace(/\/+$/, '');
  if (!raw) return fallback;
  return raw.startsWith('/') ? raw : '/' + raw;
};

const UUID = process.env.UUID || '9afd1229-b893-40c1-84dd-51e7ce204913';
const NODE_NAME = process.env.NODE_NAME || 'NODE-1';
const SITE_NAME = process.env.SITE_NAME || 'Studio Nord';
const CONSOLE_PATH = asRoute(process.env.CONSOLE_PATH, '/assets/js/app');
const ROUTE_A = asRoute(process.env.ROUTE_A, '/assets/js/runtime.min.js');
const ROUTE_B = asRoute(process.env.ROUTE_B, '/assets/js/vendor.chunk.js');

class GatewayServer {
  constructor() {
    this.wss = null;
    this.httpServer = null;
    this.activeUDPConnections = new Map();

    // In-Memory Bandwidth Tracker
    this.stats = {
      rx: 0, // Received from VPN Client (Upload)
      tx: 0  // Sent to VPN Client (Download)
    };
  }

  // ==================== HTTP HANDLERS & DASHBOARD ====================

  async handleHttpRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    if (pathname === CONSOLE_PATH) {
      res.writeHead(308, { 'Location': CONSOLE_PATH + '/' });
      res.end();
      return;
    }

    if (pathname === CONSOLE_PATH + '/api/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({
        uptime: Math.floor(process.uptime()),
        rx: this.stats.rx,
        tx: this.stats.tx
      }));
      return;
    }

    if (pathname === CONSOLE_PATH + '/' || pathname === CONSOLE_PATH + '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(this.consolePage());
      return;
    }

    if (pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(this.sitePage());
      return;
    }

    if (pathname === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Asset routes answer plain GETs with a harmless stub so they look like real chunks
    if (pathname === ROUTE_A || pathname === ROUTE_B) {
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      });
      res.end('/* build:' + (pathname === ROUTE_A ? 'runtime' : 'vendor') + ' — no public export */\n');
      return;
    }

    if (pathname === '/robots.txt') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('User-agent: *\nAllow: /\n');
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  sitePage() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${SITE_NAME}</title>
<meta name="description" content="${SITE_NAME} — product design and front-end engineering.">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0c0d10;color:#e8eaf0;line-height:1.6;min-height:100vh;display:flex;flex-direction:column}
header{padding:22px 32px;border-bottom:1px solid #1c1f28;display:flex;justify-content:space-between;align-items:center}
.brand{font-weight:700;font-size:17px;letter-spacing:-.02em}
nav a{color:#8b93a5;text-decoration:none;font-size:14px;margin-left:22px}
main{flex:1;display:flex;flex-direction:column;justify-content:center;max-width:640px;margin:0 auto;padding:72px 32px}
h1{font-size:38px;line-height:1.15;letter-spacing:-.03em;margin-bottom:16px}
p{color:#8b93a5;margin-bottom:12px}
footer{padding:18px 32px;border-top:1px solid #1c1f28;color:#5b6275;font-size:12px;text-align:center}
</style>
</head>
<body>
<header><div class="brand">${SITE_NAME}</div><nav><a href="/work">Work</a><a href="/about">About</a></nav></header>
<main>
<h1>Design and front-end engineering for small teams.</h1>
<p>We build interface systems, ship them, and keep them fast.</p>
<p>Available for select projects.</p>
</main>
<footer>&copy; 2026 ${SITE_NAME}</footer>
</body>
</html>`;
  }

  consolePage() {
    const config = JSON.stringify({
      uuid: UUID,
      name: NODE_NAME,
      routes: [ROUTE_A, ROUTE_B],
      base: CONSOLE_PATH
    });
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${NODE_NAME} // SYSTEM STATUS</title>
<style>
:root {
  --bg-black: #000000;
  --panel-bg: #0a0a0a;
  --card-bg: #000000;
  --border-color: #1f1f1f;
  --border-hover: #333333;
  --text-main: #ffffff;
  --text-muted: #888888;
  --accent-blue: #0088FF;
  --accent-purple: #a855f7;
  --status-green: #00df89;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background-color: var(--bg-black);
  color: var(--text-main);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Geist Sans", "Inter", sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  padding: 6vh 24px 24px 24px;
  -webkit-font-smoothing: antialiased;
}
.window-container {
  width: 100%;
  max-width: 640px;
  background-color: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.8);
  overflow: hidden;
}
.window-header {
  background-color: #050505;
  border-bottom: 1px solid var(--border-color);
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.mac-dots { display: flex; gap: 8px; }
.dot { width: 12px; height: 12px; border-radius: 50%; opacity: 0.75; }
.dot.close { background-color: #ff5f56; }
.dot.minimize { background-color: #ffbd2e; }
.dot.zoom { background-color: #27c93f; }
.brand-title {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
}
.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--status-green);
  letter-spacing: 0.5px;
}
.pulse-dot {
  width: 6px; height: 6px; background-color: var(--status-green);
  border-radius: 50%; box-shadow: 0 0 8px var(--status-green);
  animation: ambientPulse 2.5s infinite ease-in-out;
}
.window-content { padding: 32px; }
.uptime-section {
  text-align: center;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 24px;
}
.section-label {
  font-size: 0.65rem; text-transform: uppercase; color: var(--text-muted);
  letter-spacing: 2px; margin-bottom: 6px;
}
.uptime-display {
  font-size: 2.5rem; font-weight: 800; letter-spacing: -1px; font-variant-numeric: tabular-nums;
}
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
.card {
  background-color: var(--card-bg); border: 1px solid var(--border-color);
  border-radius: 8px; padding: 16px;
}
.card-value { font-size: 1.25rem; font-weight: 700; margin-top: 4px; font-variant-numeric: tabular-nums; }
.generator-section {
  background-color: var(--card-bg); border: 1px solid var(--border-color);
  border-radius: 8px; padding: 20px;
}
.btn-group { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
button {
  background-color: #111; color: #fff; border: 1px solid var(--border-color);
  padding: 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s ease;
}
button:hover { background-color: #222; border-color: #444; }
button:active { transform: scale(0.98); }
.btn-a:hover { border-color: var(--accent-blue); color: var(--accent-blue); }
.btn-b:hover { border-color: var(--accent-purple); color: var(--accent-purple); }
.output-wrapper { display: flex; gap: 8px; border-top: 1px solid var(--border-color); padding-top: 16px; }
input[type="text"] {
  flex: 1; background-color: #000; border: 1px solid var(--border-color);
  color: var(--status-green); padding: 12px 16px; border-radius: 6px;
  font-family: monospace; font-size: 0.75rem; outline: none;
}
input[type="text"]:focus { border-color: var(--border-hover); color: var(--text-main); }
.btn-copy { background-color: var(--text-main); color: var(--bg-black); padding: 0 20px; border: none; font-weight: 600; }
.btn-copy:hover { background-color: #e0e0e0; }
@media (max-width: 540px) {
  body { padding: 4vh 16px 16px 16px; }
  .window-content { padding: 24px; }
  .stats-grid { grid-template-columns: 1fr; gap: 16px; }
  .uptime-display { font-size: 2.25rem; }
  .output-wrapper { flex-direction: column; }
  .btn-copy { padding: 12px; }
}
@keyframes ambientPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
</style>
</head>
<body>

  <div class="window-container">
    <div class="window-header">
      <div class="mac-dots">
        <div class="dot close"></div>
        <div class="dot minimize"></div>
        <div class="dot zoom"></div>
      </div>
      <div class="brand-title">${NODE_NAME}</div>
      <div class="status-badge">
        <div class="pulse-dot"></div>
        RUNNING
      </div>
    </div>

    <div class="window-content">
      <div class="uptime-section">
        <div class="section-label">System Uptime</div>
        <div class="uptime-display" id="uptime-field">00:00:00</div>
      </div>

      <div class="stats-grid">
        <div class="card">
          <div class="section-label">Download (TX)</div>
          <div class="card-value" id="download-field">0 B</div>
        </div>
        <div class="card">
          <div class="section-label">Upload (RX)</div>
          <div class="card-value" id="upload-field">0 B</div>
        </div>
      </div>

      <div class="generator-section">
        <div class="section-label">Quick Generator</div>
        <div class="btn-group">
          <button class="btn-a" onclick="generateConfig(0)">PRIMARY</button>
          <button class="btn-b" onclick="generateConfig(1)">SECONDARY</button>
        </div>
        <div class="output-wrapper">
          <input type="text" id="config-output" readonly placeholder="Select a profile to generate..." />
          <button class="btn-copy" id="copy-btn" onclick="copyConfig()">Copy</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    var CFG = ${config};

    function formatBytes(bytes) {
      if (bytes === 0) return '0 B';
      var k = 1024;
      var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      var i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatTime(totalSeconds) {
      var days = Math.floor(totalSeconds / 86400);
      var hours = Math.floor((totalSeconds % 86400) / 3600);
      var minutes = Math.floor((totalSeconds % 3600) / 60);
      var seconds = totalSeconds % 60;
      var timeString = '';
      if (days > 0) timeString += days + 'd ';
      timeString += String(hours).padStart(2, '0') + ':';
      timeString += String(minutes).padStart(2, '0') + ':';
      timeString += String(seconds).padStart(2, '0');
      return timeString;
    }

    async function refreshDashboardStats() {
      try {
        var response = await fetch(CFG.base + '/api/stats');
        var statsData = await response.json();
        document.getElementById('uptime-field').innerText = formatTime(statsData.uptime);
        document.getElementById('download-field').innerText = formatBytes(statsData.tx);
        document.getElementById('upload-field').innerText = formatBytes(statsData.rx);
      } catch (error) {}
    }

    refreshDashboardStats();
    setInterval(refreshDashboardStats, 1000);

    function generateConfig(index) {
      var host = window.location.hostname;
      var route = CFG.routes[index];
      var label = CFG.name + '-' + (index === 0 ? 'A' : 'B');
      var query = 'security=tls&sni=' + host + '&type=ws&host=' + host +
                  '&path=' + encodeURIComponent(route) + '#' + label;
      var uri = index === 0
        ? 'vless://' + CFG.uuid + '@' + host + ':443?encryption=none&' + query
        : 'trojan://' + CFG.uuid + '@' + host + ':443?' + query;

      document.getElementById('config-output').value = uri;
      document.getElementById('copy-btn').innerText = 'Copy';
    }

    function copyConfig() {
      var copyText = document.getElementById('config-output');
      if (!copyText.value) return;
      copyText.select();
      copyText.setSelectionRange(0, 99999);
      navigator.clipboard.writeText(copyText.value).then(function () {
        var btn = document.getElementById('copy-btn');
        btn.innerText = 'Copied!';
        setTimeout(function () {
          if (btn.innerText === 'Copied!') btn.innerText = 'Copy';
        }, 2000);
      }).catch(function (err) {
        console.error('Failed to copy text: ', err);
      });
    }
  </script>
</body>
</html>`;
  }

  // ==================== WEBSOCKET HANDLERS ====================

  async handleWebSocketConnection(ws, request) {
    try {
      const parsedUrl = url.parse(request.url, true);
      const path = parsedUrl.pathname;

      if (path === ROUTE_A || path === ROUTE_B) {
        await this.websocketHandler(ws);
        return;
      }

      ws.close(1000, "Invalid WebSocket path");
    } catch (err) {
      ws.close(1011, 'Internal server error');
    }
  }

  async websocketHandler(ws) {
    let remoteSocketWrapper = { value: null };

    ws.on('message', async (message) => {
      try {
        const chunk = Buffer.from(message);

        this.stats.rx += chunk.length;

        if (remoteSocketWrapper.value) {
          remoteSocketWrapper.value.write(chunk);
          return;
        }

        const protocol = await this.protocolSniffer(chunk);
        let protocolHeader;

        if (protocol === horse) {
          protocolHeader = this.readHorseHeader(chunk);
        } else {
          protocolHeader = this.readFlashHeader(chunk);
        }

        if (protocolHeader.hasError) throw new Error(protocolHeader.message);

        if (protocolHeader.isUDP) {
          return await this.handleUDPOutbound(
            protocolHeader.addressRemote,
            protocolHeader.portRemote,
            chunk.slice(protocolHeader.rawDataIndex),
            ws,
            protocolHeader.version
          );
        }

        this.handleTCPOutBound(
          remoteSocketWrapper,
          protocolHeader.addressRemote,
          protocolHeader.portRemote,
          protocolHeader.rawClientData,
          ws,
          protocolHeader.version
        );
      } catch (err) {
        ws.close(1011, err.message);
      }
    });

    ws.on('close', () => {
      if (remoteSocketWrapper.value) remoteSocketWrapper.value.end();
      this.cleanupUDPConnections(ws);
    });

    ws.on('error', () => {
      this.cleanupUDPConnections(ws);
    });
  }

  // ==================== PROTOCOL SNIFFERS ====================

  async protocolSniffer(buffer) {
    if (buffer.length >= 62) {
      const horseDelimiter = buffer.slice(56, 60);
      if (horseDelimiter[0] === 0x0d && horseDelimiter[1] === 0x0a) {
        if ([0x01, 0x03, 0x7f].includes(horseDelimiter[2])) {
          if ([0x01, 0x03, 0x04].includes(horseDelimiter[3])) {
            return horse;
          }
        }
      }
    }
    return flash;
  }

  async handleTCPOutBound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, responseHeader) {
    const connectAndWrite = (address, port) => {
      return new Promise((resolve, reject) => {
        const tcpSocket = net.createConnection({ host: address, port: port }, () => {
          tcpSocket.write(rawClientData);
          resolve(tcpSocket);
        });
        tcpSocket.on('error', reject);
      });
    };

    try {
      const tcpSocket = await connectAndWrite(addressRemote, portRemote);
      remoteSocket.value = tcpSocket;
      tcpSocket.on('close', () => webSocket.close());
      tcpSocket.on('error', () => webSocket.close());
      this.remoteSocketToWS(tcpSocket, webSocket, responseHeader);
    } catch (error) {
      webSocket.close();
    }
  }

  // ==================== UDP NATIVE HANDLER ====================

  async handleUDPOutbound(targetAddress, targetPort, dataChunk, webSocket, responseHeader) {
    return new Promise((resolve) => {
      try {
        let protocolHeader = responseHeader;
        const connectionKey = `${targetAddress}:${targetPort}:${Date.now()}`;
        const udpSocket = dgram.createSocket('udp4');

        this.activeUDPConnections.set(connectionKey, { socket: udpSocket, webSocket: webSocket });

        udpSocket.on('error', () => {
          try { udpSocket.close(); } catch (_) {}
          this.activeUDPConnections.delete(connectionKey);
        });

        udpSocket.send(dataChunk, targetPort, targetAddress, (error) => {
          if (error) {
            try { udpSocket.close(); } catch (_) {}
            this.activeUDPConnections.delete(connectionKey);
            return;
          }
        });

        udpSocket.on('message', (message) => {
          this.stats.tx += message.length;

          if (webSocket.readyState === WS_READY_STATE_OPEN) {
            if (protocolHeader) {
              const combined = Buffer.concat([Buffer.from(protocolHeader), message]);
              webSocket.send(combined);
              protocolHeader = null;
            } else {
              webSocket.send(message);
            }
          }
        });

        udpSocket.on('close', () => {
          this.activeUDPConnections.delete(connectionKey);
        });

        let idleTimeout = setTimeout(() => {
          if (udpSocket) {
            try { udpSocket.close(); } catch (_) {}
            this.activeUDPConnections.delete(connectionKey);
          }
        }, 30000);

        udpSocket.on('message', () => {
          clearTimeout(idleTimeout);
          idleTimeout = setTimeout(() => {
            if (udpSocket) {
              try { udpSocket.close(); } catch (_) {}
              this.activeUDPConnections.delete(connectionKey);
            }
          }, 30000);
        });

      } catch (e) {}
    });
  }

  cleanupUDPConnections(webSocket) {
    for (const [key, connection] of this.activeUDPConnections.entries()) {
      if (connection.webSocket === webSocket) {
        try { connection.socket.close(); } catch (_) {}
        this.activeUDPConnections.delete(key);
      }
    }
  }

  readFlashHeader(buffer) {
    const version = buffer[0];
    let isUDP = false;
    const optLength = buffer[17];
    const cmd = buffer[18 + optLength];

    if (cmd === 2) isUDP = true;
    else if (cmd !== 1) return { hasError: true, message: `command ${cmd} is not supported` };

    const portIndex = 18 + optLength + 1;
    const portRemote = buffer.readUInt16BE(portIndex);
    let addressIndex = portIndex + 2;
    const addressType = buffer[addressIndex];
    let addressLength = 0;
    let addressValueIndex = addressIndex + 1;
    let addressValue = "";

    switch (addressType) {
      case 1:
        addressLength = 4;
        addressValue = Array.from(buffer.slice(addressValueIndex, addressValueIndex + addressLength)).join(".");
        break;
      case 2:
        addressLength = buffer[addressValueIndex];
        addressValueIndex += 1;
        addressValue = buffer.slice(addressValueIndex, addressValueIndex + addressLength).toString();
        break;
      case 3:
        addressLength = 16;
        const ipv6 = [];
        for (let i = 0; i < 8; i++) ipv6.push(buffer.readUInt16BE(addressValueIndex + i * 2).toString(16));
        addressValue = ipv6.join(":");
        break;
      default:
        return { hasError: true, message: `invalid addressType is ${addressType}` };
    }

    if (!addressValue) return { hasError: true, message: `addressValue is empty` };

    return {
      hasError: false,
      addressRemote: addressValue,
      addressType: addressType,
      portRemote: portRemote,
      rawDataIndex: addressValueIndex + addressLength,
      rawClientData: buffer.slice(addressValueIndex + addressLength),
      version: Buffer.from([version, 0]),
      isUDP: isUDP,
    };
  }

  readHorseHeader(buffer) {
    const dataBuffer = buffer.slice(58);
    if (dataBuffer.length < 6) return { hasError: true, message: "invalid request data" };

    let isUDP = false;
    const cmd = dataBuffer[0];
    if (cmd == 3) isUDP = true;
    else if (cmd != 1) throw new Error("Unsupported command type!");

    let addressType = dataBuffer[1];
    let addressLength = 0;
    let addressValueIndex = 2;
    let addressValue = "";

    switch (addressType) {
      case 1:
        addressLength = 4;
        addressValue = Array.from(dataBuffer.slice(addressValueIndex, addressValueIndex + addressLength)).join(".");
        break;
      case 3:
        addressLength = dataBuffer[addressValueIndex];
        addressValueIndex += 1;
        addressValue = dataBuffer.slice(addressValueIndex, addressValueIndex + addressLength).toString();
        break;
      case 4:
        addressLength = 16;
        const ipv6 = [];
        for (let i = 0; i < 8; i++) ipv6.push(dataBuffer.readUInt16BE(addressValueIndex + i * 2).toString(16));
        addressValue = ipv6.join(":");
        break;
      default:
        return { hasError: true, message: `invalid addressType is ${addressType}` };
    }

    if (!addressValue) return { hasError: true, message: `address is empty` };

    const portIndex = addressValueIndex + addressLength;
    const portRemote = dataBuffer.readUInt16BE(portIndex);
    return {
      hasError: false,
      addressRemote: addressValue,
      addressType: addressType,
      portRemote: portRemote,
      rawDataIndex: portIndex + 4,
      rawClientData: dataBuffer.slice(portIndex + 4),
      version: null,
      isUDP: isUDP,
    };
  }

  remoteSocketToWS(remoteSocket, webSocket, responseHeader) {
    let header = responseHeader;

    remoteSocket.on('data', (chunk) => {
      this.stats.tx += chunk.length;

      if (webSocket.readyState !== WS_READY_STATE_OPEN) {
        remoteSocket.destroy();
        return;
      }
      if (header) {
        const combined = Buffer.concat([Buffer.from(header), chunk]);
        webSocket.send(combined);
        header = null;
      } else {
        webSocket.send(chunk);
      }
    });
  }

  // ==================== SERVER START ====================

  start(port = process.env.PORT || 3000) {
    const server = http.createServer((req, res) => {
      this.handleHttpRequest(req, res).catch(() => {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      });
    });

    this.wss = new WebSocket.Server({
      server,
      perMessageDeflate: false,
      // Reject upgrades on anything that is not a configured asset route
      verifyClient: (info) => {
        const upgradePath = url.parse(info.req.url, true).pathname;
        return upgradePath === ROUTE_A || upgradePath === ROUTE_B;
      }
    });

    this.wss.on('connection', (ws, req) => {
      this.handleWebSocketConnection(ws, req);
    });

    const gracefulShutdown = () => {
      if (this.wss) {
        this.wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) client.close();
        });
        this.wss.close();
      }
      for (const [key, connection] of this.activeUDPConnections.entries()) {
        try { connection.socket.close(); } catch (err) {}
      }
      this.activeUDPConnections.clear();
      if (this.httpServer) {
        this.httpServer.close(() => process.exit(0));
      }
      setTimeout(() => { process.exit(1); }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    server.listen(port, '0.0.0.0', () => {
      console.log(`[web] listening on :${port}`);
    });

    this.httpServer = server;
  }
}

if (require.main === module) {
  const server = new GatewayServer();
  const port = process.env.PORT || 3000;
  server.start(port);
}

module.exports = GatewayServer;
