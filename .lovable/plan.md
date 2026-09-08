# Deixar as configurações do site prontas para a VPS

Objetivo: você abrir o `.env` na VPS e saber, sem dúvida, o que colocar em cada linha — e levar os produtos, categorias e pedidos atuais para o seu próprio banco.

## Caminho escolhido

Banco próprio no Supabase (é o único jeito de o envio de orçamento por e-mail funcionar na sua VPS, porque ele precisa da chave de serviço, que o banco atual da Lovable não disponibiliza).

## O que eu vou preparar

1. **`.env.example` autoexplicativo**
   Cada linha ganha um comentário curto dizendo o nome exato do campo no painel do Supabase e um exemplo do formato. Nada de termos soltos.

2. **Comando que cria o `.env` perguntando os valores**
   Um `bash deploy/configurar.sh` que pergunta um dado por vez ("Cole a URL do projeto", "Cole a chave anon", ...), confere se não ficou vazio e grava o `.env` já pronto. Assim você não precisa editar arquivo no terminal.

3. **Guia com fotos-passo do painel (texto)**
   Uma seção nova no `PUBLICAR-VPS.md` com o caminho exato de cada valor:
   - URL do projeto e chave pública: Project Settings → API → Project URL / anon key
   - Chave de serviço: Project Settings → API → service_role → Reveal
   - Identificador do projeto: o trecho que aparece dentro da própria URL

4. **Levar os dados atuais**
   Eu gero `deploy/dados-atuais.sql` com as suas categorias, produtos e pedidos de hoje, para você colar no SQL Editor do seu projeto novo depois da estrutura. Assim o site sobe já com o conteúdo que você cadastrou.

5. **Checagem final**
   Uma lista curta no guia para conferir que o site subiu certo: catálogo abre, login funciona, `/admin` abre, foto sobe, orçamento é salvo.

## Observações

- Os campos de e-mail continuam podendo ficar em branco: o pedido é salvo e aparece no painel; quando você tiver um serviço de e-mail, preenche e roda o comando de atualização.
- Nenhuma senha ou chave sua fica dentro do projeto — tudo apenas no `.env` da sua VPS.
