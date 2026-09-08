#!/usr/bin/env bash
# Preparação da VPS (rode UMA vez, como root):
#   bash deploy/setup-vps.sh
set -e

DOMINIO="tudotop.dev-prod.cloud"

echo "==> Atualizando o sistema"
apt update && apt upgrade -y
apt install -y curl git unzip nginx

echo "==> Instalando Node 20"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "==> Instalando Bun"
curl -fsSL https://bun.sh/install | bash
ln -sf /root/.bun/bin/bun /usr/local/bin/bun

echo "==> Instalando PM2 e Certbot"
npm install -g pm2
apt install -y certbot python3-certbot-nginx

echo "==> Configurando o Nginx para $DOMINIO"
cp "$(dirname "$0")/nginx-tudotop.conf" /etc/nginx/sites-available/tudotop
ln -sf /etc/nginx/sites-available/tudotop /etc/nginx/sites-enabled/tudotop
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo
echo "Pronto. Agora:"
echo "  1) cp .env.example .env  &&  nano .env   (preencha as chaves)"
echo "  2) bash deploy/atualizar.sh"
echo "  3) certbot --nginx -d $DOMINIO -d www.$DOMINIO"
