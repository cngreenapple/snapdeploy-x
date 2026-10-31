FROM alpine:3.20

ENV PORT=8080

# Install Xray-core + Caddy
RUN apk add --no-cache curl unzip caddy && \
    curl -L https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip -o /tmp/xray.zip && \
    unzip -o /tmp/xray.zip -d /usr/local/bin/ xray && \
    rm /tmp/xray.zip && \
    apk del curl unzip

COPY xray-docker/config.json.tpl /etc/xray/config.json.tpl
COPY Caddyfile.tpl /etc/caddy/Caddyfile.tpl
COPY panel /panel
COPY start.sh /start.sh

WORKDIR /app
COPY public /app/public
RUN mkdir -p /app/panel

RUN chmod +x /start.sh

EXPOSE 8080

CMD ["/start.sh"]