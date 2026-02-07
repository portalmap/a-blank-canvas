

# Adicionar "Esqueci minha senha" na tela de login

## Objetivo

Adicionar um link "Esqueci minha senha" na tela de login que permite ao usuario solicitar um e-mail de redefinicao de senha.

## Como vai funcionar

1. O usuario clica em "Esqueci minha senha" abaixo do campo de senha
2. Aparece um formulario simples pedindo apenas o e-mail
3. Ao enviar, o sistema dispara um e-mail de reset via autenticacao integrada (`supabase.auth.resetPasswordForEmail`)
4. O usuario recebe um link no e-mail que o redireciona para uma pagina de redefinicao de senha
5. Na pagina de redefinicao, o usuario digita a nova senha e confirma

## Alteracoes

### 1. `src/contexts/AuthContext.tsx`

- Adicionar a funcao `resetPassword(email: string)` ao contexto de autenticacao
- Usar `supabase.auth.resetPasswordForEmail(email, { redirectTo })` para enviar o e-mail
- O `redirectTo` vai apontar para `/auth/reset-password` (nova rota)
- Atualizar a interface `AuthContextType` para incluir `resetPassword`

### 2. `src/pages/Auth.tsx`

- Adicionar um estado `forgotPassword` para alternar entre o formulario de login e o de recuperacao
- No modo "Esqueci minha senha":
  - Exibir apenas o campo de e-mail e botao "Enviar link de redefinicao"
  - Botao "Voltar ao login" para retornar ao formulario normal
- Adicionar o link "Esqueci minha senha" logo abaixo do campo de senha, alinhado a direita

### 3. Nova pagina: `src/pages/ResetPassword.tsx`

- Pagina acessada via link do e-mail de reset
- Formulario com:
  - Campo "Nova senha"
  - Campo "Confirmar nova senha"
  - Botao de mostrar/ocultar senha
  - Botao "Redefinir senha"
- Usa `supabase.auth.updateUser({ password })` para atualizar a senha
- Apos sucesso, redireciona para `/auth` com mensagem de sucesso

### 4. `src/App.tsx`

- Adicionar a rota `/auth/reset-password` apontando para `ResetPassword`
- Essa rota fica fora do `ProtectedRoute` (usuario nao esta logado)

## Fluxo do usuario

```text
Tela de Login                E-mail                    Redefinir Senha
+-------------------+       +-----------------+       +-------------------+
| Email             |       | Ola!            |       | Nova senha        |
| [___________]     |       |                 |       | [___________]     |
| Senha             |       | Clique aqui     |       | Confirmar senha   |
| [___________]     |       | para redefinir  |       | [___________]     |
| Esqueci minha     |       | sua senha.      |       |                   |
|    senha  <--click-+-----> |                 +-----> | [Redefinir Senha] |
|                   |       +-----------------+       +-------------------+
| [   Entrar   ]    |                                        |
+-------------------+                                        v
                                                      Redireciona para
                                                      tela de login
```

## Detalhes tecnicos

### Funcao de reset no AuthContext:
```typescript
const resetPassword = async (email: string) => {
  const redirectUrl = `${window.location.origin}/auth/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });
  // tratamento de erro e toast de sucesso
};
```

### Pagina ResetPassword:
- Detecta a sessao via `onAuthStateChange` com evento `PASSWORD_RECOVERY`
- Usa `supabase.auth.updateUser({ password })` para salvar a nova senha

### Nenhuma alteracao de banco de dados necessaria

O fluxo de reset de senha e nativo da autenticacao integrada, nao requer tabelas ou funcoes adicionais.

