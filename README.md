# SnapDeploy X

Node.js gateway: static-site surface, hidden status console, and a WebSocket bridge to TCP/UDP.

## Run

```bash
npm install
npm start
```

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

Kalau package masih private:

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u <username> --password-stdin
docker run -d -p 3000:3000 ghcr.io/cngreenapple/snapdeploy-x:latest
```

## Env

| Var | Default | Fungsi |
|-----|---------|--------|
| `PORT` | `3000` | Port HTTP/WS |
| `UUID` | `9afd1229-b893-40c1-84dd-51e7ce204913` | Client ID di config generator |
| `CONSOLE_PATH` | `/assets/js/app` | Path console status |
| `ROUTE_A` | `/assets/js/runtime.min.js` | Route profile A |
| `ROUTE_B` | `/assets/js/vendor.chunk.js` | Route profile B |
| `NODE_NAME` | `NODE-1` | Judul console |
| `SITE_NAME` | `Studio Nord` | Nama situs decoy di `/` |

Semua path dinormalisasi: nilai tanpa `/` di depan tetap diterima, trailing slash dibuang.

## Surface

| Path | Isi |
|------|-----|
| `/` | Landing page statis (decoy) |
| `/robots.txt`, `/favicon.ico` | File statis biasa |
| `CONSOLE_PATH` | 308 ke `CONSOLE_PATH/` |
| `CONSOLE_PATH/` | Console status (uptime, RX/TX, generator) |
| `CONSOLE_PATH/api/stats` | `{uptime, rx, tx}` |
| `ROUTE_A`, `ROUTE_B` | WebSocket bridge; GET biasa dibalas stub JS |

Tidak ada path yang menyebut nama protokol, `xray`, `tunnel`, atau `argo`. Upgrade WebSocket di luar `ROUTE_A`/`ROUTE_B` ditolak di level `verifyClient` (HTTP 401), bukan cuma ditutup setelah koneksi diterima.

## Catatan

- Console mengirim `Cache-Control: no-store`; stub aset di-cache 1 jam supaya terlihat seperti chunk build nyata.
- `uuid`, path, dan nama node di panel di-inject dari env saat request, bukan hardcoded di HTML.
- Source tidak lagi memuat service latar (unduh binary / spawn proses); murni HTTP + WS bridge.
