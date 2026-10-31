:8080 {
    root * /app/public

    handle /health {
        respond "OK" 200
    }

    # Tunnel transports: paths masquerade as static asset chunks
    handle __PATH_VLESS__* {
        reverse_proxy 127.0.0.1:3002
    }
    handle __PATH_VMESS__* {
        reverse_proxy 127.0.0.1:3003
    }
    handle __PATH_TROJAN__* {
        reverse_proxy 127.0.0.1:3004
    }

    # Admin console on a non-obvious path; not under the static root
    handle __PANEL_PATH__ {
        redir * __PANEL_PATH__/ 308
    }
    handle_path __PANEL_PATH__/* {
        root * /app/panel
        try_files {path} /index.html
        file_server
    }

    handle {
        file_server
    }
}
