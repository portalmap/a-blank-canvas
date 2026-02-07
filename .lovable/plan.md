

# Corrigir tela de redefinicao de senha travada em "Verificando..."

## Problema

A pagina `ResetPassword.tsx` fica travada no estado "Verificando..." porque:

1. Quando o usuario clica no link do e-mail, o cliente de autenticacao processa os tokens da URL e emite o evento `PASSWORD_RECOVERY`
2. O `AuthContext` (componente pai) recebe esse evento primeiro, pois monta antes do `ResetPassword`
3. Quando o `ResetPassword` registra seu proprio listener via `onAuthStateChange`, o evento `PASSWORD_RECOVERY` ja foi consumido
4. O listener do `ResetPassword` recebe apenas `INITIAL_SESSION` (com a sessao ja estabelecida), que o codigo atual ignora
5. O `getSession()` pode retornar a sessao, mas ha uma corrida de timing com o processamento dos tokens

## Solucao

Alterar o `ResetPassword.tsx` para aceitar **qualquer evento que indique uma sessao valida**, nao apenas `PASSWORD_RECOVERY`.

### Arquivo: `src/pages/ResetPassword.tsx`

Atualizar o `useEffect` para:

1. Ouvir `PASSWORD_RECOVERY`, `INITIAL_SESSION` e `SIGNED_IN` -- qualquer um desses com sessao valida indica que o usuario chegou via link de reset
2. Manter o fallback `getSession()` com logica melhorada
3. Adicionar um timeout de seguranca (ex: 5 segundos) para mostrar uma mensagem de erro caso nenhum evento seja recebido, em vez de ficar carregando eternamente

Logica atualizada:

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    // Aceitar qualquer evento que forneca uma sessao valida
    if (event === 'PASSWORD_RECOVERY') {
      setSessionReady(true);
    } else if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session) {
      setSessionReady(true);
    }
  });

  // Fallback: verificar sessao existente
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      setSessionReady(true);
    }
  });

  // Timeout de seguranca: se apos 5 segundos nao detectou sessao,
  // mostrar mensagem de erro com opcao de voltar
  const timeout = setTimeout(() => {
    setSessionTimedOut(true);
  }, 5000);

  return () => {
    subscription.unsubscribe();
    clearTimeout(timeout);
  };
}, []);
```

Adicionar estado `sessionTimedOut` e renderizar uma mensagem de erro quando o timeout for atingido, com botao para voltar ao login.

### Nenhuma alteracao de banco de dados necessaria

O problema e exclusivamente de timing no frontend.

