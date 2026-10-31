{
  "log": { "loglevel": "warning" },
  "inbounds": [
    {
      "port": 3000,
      "protocol": "vless",
      "settings": {
        "clients": [{ "id": "__UUID__" }],
        "decryption": "none",
        "fallbacks": [
          { "dest": 3001 },
          { "path": "__PATH_VLESS__", "dest": 3002 },
          { "path": "__PATH_VMESS__", "dest": 3003 },
          { "path": "__PATH_TROJAN__", "dest": 3004 }
        ]
      },
      "streamSettings": { "network": "tcp" }
    },
    {
      "port": 3001,
      "listen": "127.0.0.1",
      "protocol": "vless",
      "settings": { "clients": [{ "id": "__UUID__" }], "decryption": "none" },
      "streamSettings": { "network": "tcp", "security": "none" }
    },
    {
      "port": 3002,
      "listen": "127.0.0.1",
      "protocol": "vless",
      "settings": { "clients": [{ "id": "__UUID__" }], "decryption": "none" },
      "streamSettings": { "network": "ws", "wsSettings": { "path": "__PATH_VLESS__" } }
    },
    {
      "port": 3003,
      "listen": "127.0.0.1",
      "protocol": "vmess",
      "settings": { "clients": [{ "id": "__UUID__", "alterId": 0 }] },
      "streamSettings": { "network": "ws", "wsSettings": { "path": "__PATH_VMESS__" } }
    },
    {
      "port": 3004,
      "listen": "127.0.0.1",
      "protocol": "trojan",
      "settings": { "clients": [{ "password": "__UUID__" }] },
      "streamSettings": { "network": "ws", "wsSettings": { "path": "__PATH_TROJAN__" } }
    }
  ],
  "dns": { "servers": ["https+local://8.8.8.8/dns-query"] },
  "outbounds": [
    {
      "protocol": "freedom",
      "tag": "direct",
      "settings": { "domainStrategy": "UseIPv4" },
      "streamSettings": {
        "sockopt": { "tcpFastOpen": true, "tcpKeepAlive": 300 }
      }
    },
    { "protocol": "blackhole", "tag": "block" }
  ]
}
