# Publicar o catálogo em VPS própria (tudotop.dev-prod.cloud)

## Objetivo
Deixar o projeto que você já baixou do Git rodando na sua VPS, servido em https://tudotop.dev-prod.cloud, com envio de e-mail funcionando.

## O que muda no projeto (arquivos de configuração)

1. **Alvo de build para servidor Node**
   O projeto está configurado para o ambiente de hospedagem da Lovable (Cloudflare). Para rodar num servidor comum, ajusto o `vite.config.ts` para gerar uma saída Node (`.output/server/index.mjs`) e removo a dependência do plugin Cloudflare do build. O `wrangler.jsonc` deixa de ser usado.

2. **`.env.example` novo**
   Arquivo modelo listando tudo que a VPS precisa (você copia para `.env` e preenche):
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - `ADMIN_EMAIL`, `PORT=3000`

3. **`ecosystem.config.cjs` (PM2)**
   Configuração pronta para manter o site no ar e reiniciar sozinho após reboot.

4. **`deploy/nginx-tudotop.conf`**
   Arquivo pronto para o Nginx com o domínio `tudotop.dev-prod.cloud` e `www`, encaminhando para o site na porta 3000 e aceitando upload de fotos até 20 MB.

5. **`DEPLOY.md`**
   Passo a passo em português: instalar Node/Bun/PM2/Nginx, apontar o domínio, subir o site, ativar o certificado HTTPS e atualizar o site depois de novas mudanças.

## Passos que você executa na VPS (resumo)
1. DNS: registro A de `tudotop.dev-prod.cloud` e `www` para o IP da VPS.
2. `bun install` (ou `npm install`), criar o `.env` a partir do modelo.
3. `bun run build` e `pm2 start ecosystem.config.cjs`.
4. Copiar o arquivo do Nginx para `sites-available`, criar o link em `sites-enabled`, testar e recarregar.
5. `certbot --nginx -d tudotop.dev-prod.cloud -d www.tudotop.dev-prod.cloud` para o HTTPS.

## Observações
- O banco, o login e as fotos continuam no mesmo backend atual; nada precisa ser migrado.
- Preciso da senha do seu e-mail de envio? Não — ela fica só no `.env` da sua VPS, nunca no projeto.
- Se você quiser que o e-mail saia do domínio novo, use um SMTP que aceite `tudotop.dev-prod.cloud` como remetente.
