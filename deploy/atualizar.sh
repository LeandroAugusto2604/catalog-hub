#!/usr/bin/env bash
# Publica/atualiza o site a partir do GitHub. Rode dentro da pasta do projeto:
#   bash deploy/atualizar.sh
set -e

echo "==> Baixando a versão mais recente do GitHub"
git pull

echo "==> Instalando dependências"
bun install

echo "==> Gerando o site"
bun run build:vps

echo "==> Subindo/reiniciando o site"
if pm2 describe tudotop > /dev/null 2>&1; then
  pm2 restart tudotop --update-env
else
  pm2 start ecosystem.config.cjs
  pm2 startup | tail -n 1 | bash || true
fi
pm2 save

echo
echo "Site atualizado. Veja o estado com:  pm2 status  |  pm2 logs tudotop"
