# Pagamento no site com Pix e cartão (Mercado Pago)

O cliente monta o carrinho, informa dados e endereço, e paga na hora por Pix ou cartão de crédito. Você recebe direto na sua conta Mercado Pago e o pedido fica registrado no painel.

## Como vai funcionar para o cliente

1. No carrinho, ele escolhe entre **Pedir orçamento** (o fluxo atual, por e-mail/WhatsApp) e **Comprar agora**.
2. Em "Comprar agora" ele preenche nome, WhatsApp, e-mail e endereço completo (CEP, rua, número, complemento, bairro, cidade, estado).
3. Ao confirmar, abre a tela de pagamento do Mercado Pago com Pix (QR Code e código copia e cola) e cartão de crédito em até 12x.
4. Pagamento aprovado: ele volta para uma página de confirmação do pedido e recebe e-mail de confirmação; você recebe e-mail de aviso com os itens e o endereço de entrega.
5. Pix pendente ou cartão recusado: página explicando o status, com o pedido guardado para ele tentar de novo.

O frete não é calculado automaticamente — o endereço é registrado e a entrega é combinada por você, como você pediu.

## No painel admin

- Nova aba **Pedidos pagos**, separada dos orçamentos: valor, forma de pagamento, status (pendente, pago, recusado, devolvido), endereço de entrega e itens.
- Você pode marcar o pedido como enviado/entregue.

## O que você precisa providenciar

- Conta Mercado Pago (a que você já tem) e as credenciais de produção: **Access Token** e **Public Key**. Elas ficam em "Suas integrações" no painel do Mercado Pago.
- Eu deixo o campo pronto no arquivo de configuração da sua VPS; você só cola os dois valores e roda a atualização de sempre.
- Começamos com as credenciais de teste, validamos um Pix e um cartão fictício, e depois trocamos pelas de produção.

## Detalhes técnicos

**Banco (nova migração)**
- `orders`: dados do cliente, endereço (cep, rua, numero, complemento, bairro, cidade, uf), `total`, `status`, `payment_method`, `mp_preference_id`, `mp_payment_id`, `created_at`.
- `order_items`: `order_id`, `product_id`, `product_name`, `unit_price`, `quantity`.
- GRANTs explícitos + RLS: `INSERT` para `anon`/`authenticated` com validação de tamanho/valores; `SELECT`/`UPDATE` apenas via `has_role(auth.uid(),'admin')`. Escrita de status só pelo webhook usando service role.

**Rotas de servidor (TanStack `createFileRoute` + `server.handlers`)**
- `src/routes/api.create-payment.ts` (POST): valida o payload com Zod, revalida preços lendo `products` no servidor (nunca confia no preço do cliente), grava `orders` + `order_items` com status `pendente`, cria a preferência via `POST https://api.mercadopago.com/checkout/preferences` com `external_reference = order.id`, `back_urls` e `notification_url`, e devolve o `init_point`.
- `src/routes/api/public/mercadopago-webhook.ts` (POST): recebe a notificação, valida a assinatura `x-signature` (HMAC do `MP_WEBHOOK_SECRET`, comparação timing-safe), consulta `GET /v1/payments/{id}` com o access token para confirmar o status real, atualiza `orders.status` e `mp_payment_id` via `supabaseAdmin` importado dentro do handler, e dispara os e-mails reaproveitando o transporte SMTP já existente. Idempotente por `mp_payment_id`.

**Front-end**
- `CartSheet.tsx`: duas ações — orçamento (atual) e checkout; formulário de endereço com máscara de CEP e preenchimento automático via ViaCEP.
- Nova rota `src/routes/pedido.$id.tsx` para retorno do pagamento (sucesso/pendente/falha), com `head()` próprio.
- Nova aba de pedidos em `admin.quotes.tsx`/`admin.tsx`.

**Configuração**
- `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` (servidor) e `VITE_MP_PUBLIC_KEY` adicionados em `.env.example` e `deploy/env-vps.txt`; a coluna nova entra também em `deploy/supabase-schema.sql`.
- Webhook configurado no Mercado Pago apontando para `https://tudotop.dev-prod.cloud/api/public/mercadopago-webhook`.
