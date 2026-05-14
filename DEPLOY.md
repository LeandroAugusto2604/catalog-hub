# Deploy na VPS

Guia para subir este projeto numa VPS Linux (Ubuntu/Debian) como aplicação Node.js.

## Pré-requisitos na VPS

- Node.js **20+** (`curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs`)
- Nginx (`sudo apt install -y nginx`)
- PM2 (`sudo npm install -g pm2`)
- Certbot (`sudo apt install -y certbot python3-certbot-nginx`)
- Domínio apontando (DNS tipo A) para o IP da VPS

## 1. Clonar e instalar

```bash
git clone <seu-repo> catalogo
cd catalogo
npm ci
```

## 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env   # preencha SUPABASE_*, SMTP_*, ADMIN_EMAIL, etc.
```

**Importante:** as variáveis `VITE_*` são embutidas no bundle no momento do build,
então precisam estar preenchidas **antes** do passo 3.

## 3. Build de produção

```bash
npm run build:node
```

Isso gera a pasta `dist/` (`dist/client/` com os assets e `dist/server/server.js` com o servidor Node).

## 4. Iniciar com PM2

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup        # cole o comando que ele imprimir, para subir no boot
```

Verifique:

```bash
pm2 status
curl http://127.0.0.1:3000   # deve retornar HTML da home
```

## 5. Configurar Nginx

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/catalogo
sudo nano /etc/nginx/sites-available/catalogo   # troque "seudominio.com.br"
sudo ln -s /etc/nginx/sites-available/catalogo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6. SSL com Certbot

```bash
sudo certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

O Certbot edita o Nginx automaticamente para HTTPS + redirect 301.

## Atualizar a aplicação (deploys futuros)

```bash
cd ~/catalogo
git pull
npm ci
npm run build:node
pm2 restart catalogo --update-env
```

## Logs e troubleshooting

```bash
pm2 logs catalogo           # logs da aplicação
sudo tail -f /var/log/nginx/error.log
```

- Se `npm run build:node` falhar: confira que está usando Node 20+ (`node -v`).
- Se a página abrir mas o orçamento não enviar: confira variáveis SMTP no `.env` e rode `pm2 restart catalogo --update-env`.
- Se aparecer 502 Bad Gateway: o Node caiu — `pm2 logs catalogo` mostra o motivo.
