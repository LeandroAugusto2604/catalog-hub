## Objetivo

Preparar o projeto para rodar numa VPS própria como aplicação Node.js (em vez do alvo Cloudflare Workers que vem por padrão no template Lovable).

## O que muda

Hoje o `vite.config.ts` usa `@lovable.dev/vite-tanstack-config`, que aplica o plugin do Cloudflare no build. O resultado disso é uma saída pensada para Workers — não para `node .output/server/index.mjs` numa VPS. Vamos ajustar para o preset **node-server** do TanStack Start, que gera exatamente esse arquivo e roda em qualquer VPS com Node 20+.

## Passos do plano

### 1. Trocar o alvo do build para Node
- Em `vite.config.ts`, passar a opção `target: "node-server"` para o TanStack Start (via override do config Lovable).
- Remover/ignorar `wrangler.jsonc` do fluxo de produção da VPS (mantemos o arquivo, só não é usado).
- Remover `@cloudflare/vite-plugin` das dependências (não é mais necessário em produção na VPS).

Resultado esperado: `npm run build` gera `.output/server/index.mjs` + `.output/public/` prontos para Node.

### 2. Ajustar `package.json`
- Adicionar script `"start": "node .output/server/index.mjs"`.
- Adicionar campo `"engines": { "node": ">=20" }`.

### 3. Criar arquivos de apoio para a VPS
- `ecosystem.config.cjs` — configuração PM2 (nome do app, porta, restart, env file).
- `.env.example` — lista das variáveis que precisam existir na VPS:
  - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` (precisam existir no momento do `build`, pois são injetadas no bundle)
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `ADMIN_EMAIL`
  - `PORT` (default 3000)
- `nginx.conf.example` — server block pronto: `proxy_pass http://127.0.0.1:3000`, headers `X-Forwarded-*`, suporte a WebSocket (para HMR não — mas mantém upgrade headers caso use realtime), bloco `location /` único (sem servir estáticos separados, pois o servidor Node já serve `.output/public`).
- `DEPLOY.md` em português com o passo a passo: clone → `npm ci` → criar `.env` → `npm run build` → `pm2 start ecosystem.config.cjs` → configurar Nginx + Certbot.

### 4. Verificação
- Rodar `npm run build` no sandbox e confirmar que `.output/server/index.mjs` é gerado.
- Não preciso testar PM2/Nginx aqui (é ambiente da sua VPS), mas o build precisa concluir limpo.

## Detalhes técnicos

- O preset `node-server` do TanStack Start já empacota o servidor + assets estáticos num único processo Node. Não precisa de Nginx servindo a pasta `dist/` — o Nginx só faz proxy reverso.
- As rotas server (`/api/send-quote-email`) continuam funcionando idênticas porque o runtime passa a ser Node real (com acesso completo a `process.env`, `nodemailer`, `crypto`, etc.).
- O cliente Supabase server-side (`client.server.ts`) já lê `process.env.SUPABASE_SERVICE_ROLE_KEY` — basta a variável existir na VPS.
- Variáveis `VITE_*` são embutidas no bundle no momento do `npm run build`, então o `.env` precisa estar presente **antes** do build.

## O que NÃO vou fazer

- Não vou mexer em lógica de aplicação, RLS, autenticação ou rotas existentes.
- Não vou remover `wrangler.jsonc` (mantenho para o preview do Lovable continuar funcionando).
- Não vou configurar domínio/SSL — isso é manual na VPS (Certbot está documentado no DEPLOY.md).

Posso seguir?
