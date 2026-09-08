# Migrar para a sua própria conta Supabase

O site não precisa de nenhuma alteração de código: ele lê o endereço e as chaves
do arquivo `.env`. Basta criar o projeto, recriar a estrutura e trocar as chaves.

---

## 1. Criar o projeto

1. Acesse supabase.com, entre na sua conta e clique em **New project**.
2. Nome: `tudotop` · Região: **South America (São Paulo)** · defina uma senha do banco.
3. Aguarde alguns minutos até o projeto ficar pronto.

---

## 2. Criar os espaços das fotos

Em **Storage → New bucket**, crie dois buckets marcados como **Public**:

- `product-images`
- `products`

---

## 3. Criar a estrutura do banco

1. Vá em **SQL Editor → New query**.
2. Abra o arquivo `deploy/supabase-schema.sql` do projeto, copie tudo e cole lá.
3. Clique em **Run**. Deve terminar sem erros.

Isso cria: produtos, categorias, orçamentos, itens dos orçamentos, perfis,
permissões de administrador e todas as regras de acesso.

---

## 4. Configurar o login

Em **Authentication → Sign In / Providers**:

- Deixe **Email** ativado.
- Desative **Confirm email** se quiser entrar sem confirmar o e-mail (ou mantenha ativado).

Em **Authentication → URL Configuration**:

- **Site URL**: `https://tudotop.dev-prod.cloud`
- **Redirect URLs**: adicione `https://tudotop.dev-prod.cloud/**`

Sem isso o link de redefinição de senha aponta para o endereço errado.

---

## 5. Pegar as chaves

Em **Project Settings → API**:

| Onde usar | Valor |
|-----------|-------|
| `SUPABASE_URL` e `VITE_SUPABASE_URL` | Project URL |
| `SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PUBLISHABLE_KEY` | chave **anon / publishable** |
| `SUPABASE_SERVICE_ROLE_KEY` | chave **service_role** (secreta, só no servidor) |
| `VITE_SUPABASE_PROJECT_ID` | o código do projeto (aparece na URL) |

Coloque tudo no `.env` da VPS, conforme o `.env.example`.

---

## 6. Criar seu acesso de administrador

1. Rode o site (`bun run build:vps` + `pm2 restart tudotop`).
2. Acesse `https://tudotop.dev-prod.cloud/auth` e crie sua conta.
3. No **SQL Editor** do Supabase, rode (troque o e-mail):

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'leandro_cjc@hotmail.com'
ON CONFLICT DO NOTHING;
```

4. Saia e entre de novo no site: o menu do painel aparece.

---

## 7. Levar os dados atuais (opcional)

Se você já cadastrou produtos aqui e quer reaproveitar:

- **Produtos e categorias**: no projeto atual, exporte as tabelas em CSV
  (Table Editor → menu da tabela → Export) e importe no novo projeto
  (Table Editor → Import data from CSV). Importe **categorias antes de produtos**.
- **Fotos**: baixe os arquivos do bucket e envie no bucket novo com o mesmo nome,
  ou simplesmente reenvie as fotos pelo painel de produtos.
- **Usuários**: senhas não são transferíveis; crie sua conta novamente (passo 6).

---

## 8. E-mail dos orçamentos

O envio continua pelo SMTP configurado no `.env` da VPS (`SMTP_*`), independente
do Supabase. Se preferir usar o serviço de e-mail do Supabase, ele serve apenas
para e-mails de login/redefinição de senha, não para os orçamentos.

---

## Conferindo se deu certo

| Teste | Esperado |
|-------|----------|
| Abrir o site | catálogo carrega (vazio no começo) |
| Criar conta em `/auth` | login funciona |
| Após virar admin, abrir `/admin` | painel abre |
| Cadastrar produto com fotos | produto aparece no catálogo |
| Enviar um orçamento | aparece em `/admin/quotes` e chega o e-mail |
