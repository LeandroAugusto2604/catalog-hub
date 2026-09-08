# Criar o arquivo de configuração já preenchido

Você copia um arquivo só, renomeia para `.env` na VPS e o site sobe.

## O que eu vou criar

**`deploy/env-vps.txt`** — arquivo já preenchido com os dados do banco que o site usa hoje:

- endereço do banco: `https://tgxvivfxstueitelvnal.supabase.co`
- chave pública do banco (a mesma que o site já usa no navegador)
- identificador do projeto: `tgxvivfxstueitelvnal`
- `PORT=3000`
- `SITE_URL=https://tudotop.dev-prod.cloud`
- `ADMIN_EMAIL=leandro_cjc@hotmail.com`
- campos de e-mail (`SMTP_*`) em branco, com comentário explicando que dá para preencher depois

Na VPS:

```bash
cd /var/www/tudotop
cp deploy/env-vps.txt .env
bash deploy/atualizar.sh
```

Com isso o catálogo, o login, as fotos e o painel funcionam na sua VPS usando o mesmo banco de hoje — seus produtos e pedidos aparecem lá sem migrar nada.

## Uma linha que eu não posso preencher

`SUPABASE_SERVICE_ROLE_KEY` fica em branco. Essa chave não é disponibilizada no ambiente da Lovable, e ela é usada só no momento de gravar o orçamento pelo servidor.

Para o orçamento continuar funcionando, eu ajusto o envio para gravar o pedido usando a chave pública com uma regra de acesso segura no banco (permite criar o pedido, mas não ler os pedidos de ninguém). Assim nada depende dessa chave e o site fica completo na VPS.

## Também no plano

Atualizo o `PUBLICAR-VPS.md` para apontar esse arquivo único, no lugar de preencher chave por chave.
