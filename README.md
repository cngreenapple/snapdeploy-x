# SnapDeploy X

Gateway Node.js: dashboard statistik + generator config, WebSocket bridge ke TCP/UDP, dan background service (Xray + tunnel) yang diambil saat runtime.

## Run

```bash
npm install
npm start
```

Buka `http://localhost:3000`.

### Docker

```bash
docker build -t snapdeploy-x .
docker run -d -p 3000:3000 --name snapdeploy-x snapdeploy-x
```

### GHCR (GitHub Actions)

Push ke `main` otomatis build & push image lewat [workflow](.github/workflows/docker-build.yml):

```
ghcr.io/cngreenapple/snapdeploy-x:latest
ghcr.io/cngreenapple/snapdeploy-x:<commit-sha>
```

Kalau package masih private, login dulu:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin
docker run -d -p 3000:3000 ghcr.io/cngreenapple/snapdeploy-x:latest
```

## Env

| Var | Default | Fungsi |
|-----|---------|--------|
| `PORT` | `3000` | Port HTTP/WS |
| `UUID` | `9afd1229-b893-40c1-84dd-51e7ce204913` | Client ID VLESS/VMess, password Trojan |
| `FILE_PATH` | `.tmp` | Direktori kerja binary + config Xray |
| `ARGO_DOMAIN` | — | Domain tunnel tetap |
| `ARGO_AUTH` | — | Token tunnel (`run --token`) |
| `ARGO_PORT` | `8001` | Port inbound Xray |
| `CFIP` | `bug.com` | IP/host CDN di config klien |
| `CFPORT` | `443` | Port CDN |
| `NAME` | `MEDIAFAIRY` | Prefix nama config |

Set `ARGO_DOMAIN` + `ARGO_AUTH` untuk domain tetap; tanpa itu, domain `trycloudflare.com` dibaca dari `boot.log`.

## Endpoints

| Path | Isi |
|------|-----|
| `/` | Dashboard (uptime, CPU/RAM, traffic, generator) |
| `/api/stats` | `{uptime, rx, tx, cpu, ram}` |
| `/api/config` | Config `native` (SNI) + `argo` (CDN) |
| `/vless-mediafairy`, `/vmess-mediafairy`, `/trojan-mediafairy` | WebSocket bridge |

`sub.txt` (3 URI) ditulis ke `FILE_PATH` setiap kali domain tunnel tersedia.

## Files

| File | Role |
|------|------|
| `server.js` | Seluruh server: dashboard, API, WS bridge, spawn Xray/tunnel |
| `Dockerfile` | `node:20-alpine` |
| `package.json` | Deps: `ws`, `axios` |

Catatan: `startBackgroundServices()` mengunduh binary dari host eksternal saat start dan mengabaikan exit code (pakai `nohup ... &`, bukan `execFile`), jadi kegagalan unduh/spawn tidak terlihat di log selain `[SYSTEM] Background service error`.
