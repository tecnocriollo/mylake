#!/bin/bash
set -e

DOMAIN="api.mylake.tecnocriollo.com"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

echo "Setting up nginx for $DOMAIN (requires sudo)"
sudo -v

sudo tee "$NGINX_CONF" > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }
}
EOF

sudo ln -sf "$NGINX_CONF" "/etc/nginx/sites-enabled/$DOMAIN"
sudo nginx -t
sudo systemctl reload nginx

echo "Nginx configured. Getting SSL cert..."
sudo certbot --nginx -d "$DOMAIN"


echo "Done. $DOMAIN live with HTTPS."
