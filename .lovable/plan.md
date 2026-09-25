# Trocar o domínio para tudotoplartech.shop

Trocar todas as referências de `tudotop.dev-prod.cloud` para `www.tudotoplartech.shop` (domínio novo: `tudotoplartech.shop`).

## O que eu mudo no projeto

1. **`deploy/nginx-tudotop.conf`** — o Nginx passa a responder por `tudotoplartech.shop` e `www.tudotoplartech.shop`.
2. **`deploy/setup-vps.sh`** — domínio padrão atualizado.
3. **`deploy/env-vps.txt` e `.env.example`** — `SITE_URL="https://www.tudotoplartech.shop"`.
4. **`src/routes/api.create-payment.ts` e `src/routes/api/public/mercadopago-webhook.ts`** — os e-mails de pedido passam a usar o novo endereço no link de consulta "Meu pedido" (e no retorno do Mercado Pago, que usa o `SITE_URL`).
5. **Guias (`PUBLICAR-VPS.md`, `DEPLOY.md`, `MIGRACAO-SUPABASE.md`)** — atualizados com o novo endereço.

O e-mail de envio (`loja@dev-prod.cloud`) **não muda** — ele continua funcionando normalmente, pois é uma caixa de e-mail separada do domínio do site.

## O que você faz fora do projeto

1. **DNS (painel da Hostinger, onde o domínio está registrado):**
   - `www.tudotoplartech.shop` já aponta para a VPS (76.13.80.61) — nada a fazer.
   - O endereço **sem www** (`tudotoplartech.shop`) hoje aponta para o estacionamento da Hostinger (2.57.91.91). Crie/edite o registro **A** de `@` para **76.13.80.61**, ou o site só abre com "www".
2. **Na VPS, depois do `git pull`:**
   - Edite o `.env` (`nano .env`) e troque a linha para `SITE_URL="https://www.tudotoplartech.shop"`.
   - Rode `bash deploy/atualizar.sh`.
   - Rode `certbot --nginx -d tudotoplartech.shop -d www.tudotoplartech.shop` para o HTTPS do domínio novo.
3. **Mercado Pago:** no painel do Mercado Pago, atualize a URL do webhook para `https://www.tudotoplartech.shop/api/public/mercadopago-webhook?token=tt_9f4c1e77a2b54d3e8c06ab715d2f8e41` — sem isso, a confirmação de pagamento para de chegar.
4. **Login/redefinição de senha:** a URL do site no backend precisa apontar para o novo domínio — eu ajusto essa configuração por aqui.

## Observações

- O domínio antigo pode continuar respondendo enquanto o Nginx antigo estiver no ar; depois da troca, ele deixa de ser usado.
- Nada muda no banco de dados, produtos, pedidos ou etiquetas do SuperFrete.
