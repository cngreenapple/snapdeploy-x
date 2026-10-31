# 🚀 SnapDeploy

Edge static hosting front end (Caddy) + private tunnel transport (Xray-core). Deploy on Railway or self-host via Docker.

Public surface is a plain static-hosting landing page. The admin console and the tunnel transports live on non-obvious paths.

## Architecture

```
Client → :8080 → Caddy ─┬─ /                     static landing page (decoy)
                        ├─ /assets/js/runtime.*  WebSocket transport → Xray
                        └─ /_console             admin console (not under static root)
```

## Paths

Semua path di bawah ini bisa diganti lewat env var. Default:

| Env | Default | Fungsi |
|-----|---------|--------|
| `PANEL_PATH` | `/_console` | Admin console |
| `PATH_VLESS` | `/assets/js/runtime.vless` | VLESS WebSocket |
| `PATH_VMESS` | `/assets/js/runtime.vmess` | VMess WebSocket |
| `PATH_TROJAN` | `/assets/js/runtime.trojan` | Trojan WebSocket |
| `UUID` | `f3b7c97d-4a53-4b54-a1d5-84d9df4fd91c` | Client ID / trojan password |
| `PANEL_USER` / `PANEL_PASS` | `aero` / `aero` | Login console |

Set `UUID`, `PANEL_PATH`, `PANEL_USER`, `PANEL_PASS` di Railway → Variables. Kalau tidak diset, default di atas dipakai (ganti sebelum deploy publik).

## How masking works

- `/` dan path lain yang tidak dikenal menyajikan halaman statis biasa (bukan dashboard).
- Path transport memakai nama aset (`/assets/js/runtime.*`) — tidak menyebut nama protokol.
- Console ada di `PANEL_PATH`, filenya di `/app/panel`, di luar root statis, jadi tidak bisa diakses lewat `/panel/...`.
- Semua secret di-inject saat container start oleh `start.sh`; file template tidak berisi kredensial nyata.

## Deployment

### Railway

1. Fork repo → Railway → Deploy from GitHub
2. Set region **Singapore**
3. Set Variables: `UUID`, `PANEL_PATH`, `PANEL_USER`, `PANEL_PASS`
4. Buka `https://<domain><PANEL_PATH>/` → login

### Docker (self-hosted)

```bash
docker run -d -p 8080:8080 \
  -e UUID=<uuid> -e PANEL_PATH=/_console -e PANEL_USER=<user> -e PANEL_PASS=<pass> \
  --name snapdeploy ghcr.io/cngreenapple/snapdeploy-x:latest
```

Buka `http://localhost:8080/_console/`, login.

### GitHub Actions (CI/CD)

Tiap push ke `main` otomatis build & push ke ghcr.io via [workflow](.github/workflows/docker-build.yml).

## Dashboard

- Dark/light theme toggle
- Config generator: URI + QR code + full Clash YAML (DNS, proxy-groups, rules)
- Expand/collapse YAML preview, Copy & Download

## Files

| File | Role |
|------|------|
| `xray-docker/config.json.tpl` | Xray config template (inbounds, fallbacks, DNS) |
| `Caddyfile.tpl` | Caddy template: transport routes, console, static |
| `panel/index.html.tpl` | Console UI template |
| `public/index.html` | Landing page (decoy) |
| `start.sh` | Entrypoint: render templates from env, start Xray + Caddy |
| `Dockerfile` | Build: install Caddy + Xray on Alpine |

## Client Config

Semua config pake **WebSocket (WS)**. Nilai `<path>` = env `PATH_*` yang dipakai.

### VLESS (WS)

| Field | Value |
|-------|-------|
| Address | your-domain |
| Port | 443 |
| UUID | env `UUID` |
| Encryption | `none` |
| Network | `ws` |
| Path | `/assets/js/runtime.vless` |
| TLS | `tls` |
| SNI | your-domain |
| Fingerprint | `firefox` |

### VMess (WS)

| Field | Value |
|-------|-------|
| Address | your-domain |
| Port | 443 |
| UUID | env `UUID` |
| AlterID | `0` |
| Security | `auto` |
| Network | `ws` |
| Path | `/assets/js/runtime.vmess` |
| TLS | `tls` |
| SNI | your-domain |
| Fingerprint | `firefox` |

### Trojan (WS)

| Field | Value |
|-------|-------|
| Address | your-domain |
| Port | 443 |
| Password | env `UUID` |
| Network | `ws` |
| Path | `/assets/js/runtime.trojan` |
| TLS | `tls` |
| SNI | your-domain |
| Fingerprint | `firefox` |

---

*SnapDeploy — Static hosting edge*

