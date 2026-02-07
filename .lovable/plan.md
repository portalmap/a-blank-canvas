

# Remover criacao de conta e adicionar logo MAP na pagina de login

## Resumo

Duas alteracoes na pagina de autenticacao (`/auth`):

1. **Remover a aba "Criar conta"** -- somente o formulario de login ficara disponivel
2. **Substituir o icone "M" pela logo da MAP** enviada pelo usuario

## Alteracoes

### 1. Copiar a logo para o projeto

- Copiar o arquivo `user-uploads://logo_sem_fundo_cortado.png` para `src/assets/map-logo.png`

### 2. `src/pages/Auth.tsx`

**Remover a criacao de conta:**
- Remover o componente `Tabs`, `TabsList`, `TabsTrigger` e `TabsContent`
- Manter apenas o formulario de login (email + senha + botao "Entrar")
- Remover a funcao `handleSignUp` e a referencia a `signUp` do `useAuth`
- Atualizar a descricao do card de "Entre ou crie uma conta para comecar" para "Entre com sua conta para continuar"

**Substituir a logo:**
- Remover o bloco `<div className="bg-primary rounded-lg p-3">` com a letra "M"
- Importar a imagem da logo: `import mapLogo from "@/assets/map-logo.png"`
- Renderizar `<img src={mapLogo} alt="MAP Flow" className="h-16 w-16" />` no lugar

**Resultado visual esperado:**

```
     [Logo MAP - circulo preto + seta laranja]
              MAP Flow
     Gerencie projetos com eficiencia

     +-----------------------------+
     | Bem-vindo                   |
     | Entre com sua conta         |
     |                             |
     | Email                       |
     | [________________]          |
     |                             |
     | Senha                       |
     | [________________]          |
     |                             |
     | [      Entrar      ]        |
     +-----------------------------+
```

### Importacoes removidas

- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` de `@/components/ui/tabs`
- `CheckSquare` de `lucide-react` (ja nao era usada no JSX)

### Nenhuma alteracao de banco de dados

A funcionalidade de signup continua existindo no `AuthContext` (via `signUp`), pois pode ser utilizada em outros fluxos (ex: convites). Apenas a interface publica de criacao de conta e removida.

