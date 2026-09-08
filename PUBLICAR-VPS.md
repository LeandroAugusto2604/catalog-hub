# Publicar o site na sua VPS (via GitHub)

- Site: **https://tudotop.dev-prod.cloud**
- VPS: **76.13.80.61**
- Painel do site: `/auth` (entrar) e `/admin` (produtos e pedidos)

---

## 1. Apontar o domínio

No painel onde o domínio `dev-prod.cloud` está registrado, crie:

| Tipo | Nome     | Valor         |
| ---- | -------- | ------------- |
| A    | tudotop  | 76.13.80.61   |
| A    | www.tudotop | 76.13.80.61 |

Espere alguns minutos até o domínio responder.

## 2. Criar o seu banco no Supabase

Siga o guia **MIGRACAO-SUPABASE.md**. Resumo:

1. Crie um projeto novo em supabase.com (região South America).
2. Em **Storage**, crie dois espaços públicos: `product-images` e `products`.
3. Em **SQL Editor**, cole todo o conteúdo de `deploy/supabase-schema.sql` e clique em Run.
4. Em **Authentication → URL Configuration**: Site URL `https://tudotop.dev-prod.cloud`
   e Redirect URLs `https://tudotop.dev-prod.cloud/**`.
5. Em **Project Settings → API**, copie: a URL do projeto, a chave `anon/publishable`
   e a chave `service_role`.

## 3. Preparar a VPS

Conecte por SSH (`ssh root@76.13.80.61`) e rode:

```bash
cd /var/www
git clone SEU-REPOSITORIO-DO-GITHUB tudotop
cd tudotop
bash deploy/setup-vps.sh
```

Isso instala tudo que o site precisa e já configura o Nginx para o seu domínio.

## 4. Preencher as configurações

```bash
cp .env.example .env
nano .env
```

Preencha com os valores do passo 2:

| Campo | O que colocar |
| ----- | ------------- |
| `SUPABASE_URL` e `VITE_SUPABASE_URL` | a URL do seu projeto, ex. `https://abcdef.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PUBLISHABLE_KEY` | a chave `anon/publishable` |
| `SUPABASE_SERVICE_ROLE_KEY` | a chave `service_role` (nunca compartilhe) |
| `VITE_SUPABASE_PROJECT_ID` | o pedaço do meio da URL, ex. `abcdef` |
| `PORT` | `3000` |
| `SITE_URL` | `https://tudotop.dev-prod.cloud` |
| `ADMIN_EMAIL` | `leandro_cjc@hotmail.com` |
| Campos `SMTP_*` | deixe em branco por enquanto |

Salve com `Ctrl+O`, `Enter`, `Ctrl+X`.

> **E-mail dos orçamentos:** com os campos `SMTP_*` em branco, o pedido do cliente
> é salvo e aparece em `/admin/quotes` normalmente, só não sai e-mail. Quando você
> tiver um serviço de e-mail (Gmail, provedor da hospedagem, etc.), preencha esses
> campos e rode `bash deploy/atualizar.sh` — nada mais precisa mudar.

## 5. Subir o site

```bash
bash deploy/atualizar.sh
```

Depois ative o HTTPS:

```bash
certbot --nginx -d tudotop.dev-prod.cloud -d www.tudotop.dev-prod.cloud
```

Abra **https://tudotop.dev-prod.cloud** — o site já está no ar.

## 6. Virar administrador

1. Acesse `https://tudotop.dev-prod.cloud/auth` e cadastre-se com `leandro_cjc@hotmail.com`.
2. No SQL Editor do Supabase, rode:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'leandro_cjc@hotmail.com'
ON CONFLICT DO NOTHING;
```

3. Recarregue o site: `/admin` já abre para você cadastrar produtos e categorias.

---

## Atualizações futuras

Toda vez que houver mudança no projeto:

```bash
cd /var/www/tudotop && bash deploy/atualizar.sh
```

## Comandos úteis

| Para que | Comando |
| -------- | ------- |
| Ver se o site está rodando | `pm2 status` |
| Ver erros do site | `pm2 logs tudotop` |
| Reiniciar o site | `pm2 restart tudotop --update-env` |
| Recarregar o Nginx | `systemctl reload nginx` |
