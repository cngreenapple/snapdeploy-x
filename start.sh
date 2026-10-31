#!/bin/sh
set -e

UUID="${UUID:-f3b7c97d-4a53-4b54-a1d5-84d9df4fd91c}"
PANEL_PATH="${PANEL_PATH:-/_console}"
PANEL_USER="${PANEL_USER:-aero}"
PANEL_PASS="${PANEL_PASS:-aero}"

# WS paths masquerade as static assets instead of protocol names
PATH_VLESS="${PATH_VLESS:-/assets/js/runtime.vless}"
PATH_VMESS="${PATH_VMESS:-/assets/js/runtime.vmess}"
PATH_TROJAN="${PATH_TROJAN:-/assets/js/runtime.trojan}"

render() {
  sed -e "s|__PANEL_PATH__|${PANEL_PATH}|g" \
      -e "s|__UUID__|${UUID}|g" \
      -e "s|__PANEL_USER__|${PANEL_USER}|g" \
      -e "s|__PANEL_PASS__|${PANEL_PASS}|g" \
      -e "s|__PATH_VLESS__|${PATH_VLESS}|g" \
      -e "s|__PATH_VMESS__|${PATH_VMESS}|g" \
      -e "s|__PATH_TROJAN__|${PATH_TROJAN}|g" \
      "$1" > "$2"
}

render /etc/caddy/Caddyfile.tpl /etc/caddy/Caddyfile
render /etc/xray/config.json.tpl /etc/xray/config.json
render /panel/index.html.tpl /app/panel/index.html

xray -c /etc/xray/config.json &
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile