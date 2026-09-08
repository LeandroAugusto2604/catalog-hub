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

## 2. Banco de dados — nada a fazer

A VPS vai usar o mesmo banco de hoje, com os seus produtos, pedidos, login e fotos.
Os dados de acesso já estão prontos no arquivo do passo 4.

Se algum dia você quiser um banco só seu, o guia **MIGRACAO-SUPABASE.md** explica como.

## 3. Preparar a VPS

Conecte por SSH (`ssh root@76.13.80.61`) e rode:

```bash
cd /var/www
git clone SEU-REPOSITORIO-DO-GITHUB catalog-hub
cd tudotop
bash deploy/setup-vps.sh
```

Isso instala tudo que o site precisa e já configura o Nginx para o seu domínio.

## 4. Configurações (já vêm prontas)

Basta copiar o arquivo pronto:

```bash
cp deploy/env-vps.txt .env
```

Ele já vem preenchido com o banco, o login e as fotos que o site usa hoje —
seus produtos e pedidos aparecem na VPS sem precisar migrar nada.
Nada mais precisa ser digitado agora.

Só edite (`nano .env`) quando quiser ativar o e-mail dos orçamentos: preencha os
campos `SMTP_*` e rode `bash deploy/atualizar.sh`.

> Quiser usar a sua própria conta Supabase no futuro? Siga o **MIGRACAO-SUPABASE.md**
> e troque no `.env` os valores de endereço, chave pública e identificador do projeto.

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
cd /var/www/catalog-hub && bash deploy/atualizar.sh
```

## Comandos úteis

| Para que | Comando |
| -------- | ------- |
| Ver se o site está rodando | `pm2 status` |
| Ver erros do site | `pm2 logs tudotop` |
| Reiniciar o site | `pm2 restart tudotop --update-env` |
| Recarregar o Nginx | `systemctl reload nginx` |
