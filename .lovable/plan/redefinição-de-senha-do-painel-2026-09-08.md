# Redefinição de senha do painel

Hoje a tela de acesso só tem "Entrar" e "Criar conta" — não existe forma de recuperar a senha. Vou adicionar isso.

## O que você verá

1. Na tela de acesso, um link **"Esqueci minha senha"**.
2. Ao clicar, você informa o e-mail (`leandro_cjc@hotmail.com`) e recebe uma mensagem com um link seguro.
3. O link abre uma página nova onde você digita a nova senha duas vezes e salva.
4. Depois de salvar, você é levado direto ao painel.

Com estados de carregando e mensagens de sucesso/erro, no mesmo estilo visual do resto do site.

## Observação sobre o e-mail

O e-mail de recuperação é enviado pelo serviço de contas do próprio sistema (não pelo Gmail que configuramos para os orçamentos). Se ele não chegar, pode ser preciso ativar o envio de e-mails de conta com um domínio seu — aviso na hora se acontecer.

## Detalhes técnicos

- `src/routes/auth.tsx`: novo modo `forgot` chamando `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${window.location.origin}/reset-password })`.
- Novo `src/routes/reset-password.tsx` (rota pública, com `head()` próprio): detecta o hash de recuperação, valida senha (mín. 6 caracteres, confirmação) e chama `supabase.auth.updateUser({ password })` sem `current_password`; depois navega para `/admin`.
- Sem alterações de banco, RLS ou envio SMTP de orçamentos.
