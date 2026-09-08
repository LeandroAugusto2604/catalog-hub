# Publicar em VPS própria — tudotop.dev-prod.cloud

Guia completo, do zero até o site no ar com HTTPS.

> Vai usar a sua própria conta Supabase? Faça primeiro o **[MIGRACAO-SUPABASE.md](./MIGRACAO-SUPABASE.md)**
> e depois volte para cá com as chaves em mãos.

---

## 1. Apontar o domínio

No painel do seu domínio, crie dois registros:

| Tipo | Nome | Valor |
|------|------|-------|
| A | @ (ou `tudotop`) | IP da sua VPS |
| A | www | IP da sua VPS |

A propagação pode levar algumas horas.

---

## 2. Preparar a VPS (Ubuntu/Debian)

```bash
sudo apt update && sudo apt upgrade -y

# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# Bun (opcional, mais rápido que o npm)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# PM2 e Certbot
sudo npm install -g pm2
sudo apt install -y certbot python3-certbot-nginx
```

---

## 3. Baixar o projeto e configurar

```bash
cd /var/www
git clone SEU_REPOSITORIO catalog-hub
cd tudotop

bun install          # ou: npm install

cp .env.example .env
nano .env            # preencha os valores e salve (Ctrl+O, Enter, Ctrl+X)
```

O que preencher no `.env` está explicado dentro do próprio arquivo.
A chave de serviço do backend você pega no painel do Lovable Cloud (Settings).
Os dados de SMTP são do seu provedor de e-mail.

---

## 4. Gerar e iniciar o site

```bash
bun run build:vps          # ou: npx vite build --config vite.config.vps.ts
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup                # execute o comando que ele imprimir
```

Teste local: `curl -I http://127.0.0.1:3000` deve responder `200`.

> Importante: use sempre `build:vps` na VPS. O `build` normal é usado pela
> hospedagem da Lovable e gera outro formato de saída.

---

## 5. Configurar o Nginx

```bash
sudo cp deploy/nginx-tudotop.conf /etc/nginx/sites-available/tudotop
sudo ln -s /etc/nginx/sites-available/tudotop /etc/nginx/sites-enabled/tudotop
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. Ativar o HTTPS

```bash
sudo certbot --nginx -d tudotop.dev-prod.cloud -d www.tudotop.dev-prod.cloud
```

O certificado renova automaticamente.

---

## 7. Endereços do site

| Página | URL |
|--------|-----|
| Catálogo (clientes) | https://tudotop.dev-prod.cloud |
| Entrar / criar senha | https://tudotop.dev-prod.cloud/auth |
| Painel de produtos | https://tudotop.dev-prod.cloud/admin |
| Pedidos / orçamentos | https://tudotop.dev-prod.cloud/admin/quotes |

---

## 8. Atualizar depois de novas mudanças

```bash
cd /var/www/catalog-hub
git pull
bun install
bun run build:vps
pm2 restart tudotop
```

---

## Problemas comuns

| Sintoma | O que verificar |
|---------|-----------------|
| 502 Bad Gateway | `pm2 status` e `pm2 logs tudotop` — o site precisa estar rodando na porta 3000 |
| Site abre mas sem produtos | Valores `SUPABASE_*` e `VITE_SUPABASE_*` no `.env`; refaça o build depois de alterar |
| Orçamento não envia e-mail | Dados `SMTP_*` no `.env`; veja `pm2 logs tudotop` |
| Foto grande não sobe | `client_max_body_size` no arquivo do Nginx |
| Link de redefinição de senha aponta para outro domínio | Configure a URL do site no painel do Lovable Cloud como `https://tudotop.dev-prod.cloud` |
