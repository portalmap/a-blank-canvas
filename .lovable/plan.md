

# Adicionar modo escuro e atualizar logos

## Resumo

Tres alteracoes principais:

1. **Adicionar suporte a dark mode** com toggle acessivel no sidebar
2. **Substituir a logo "M" no sidebar** pela logo da MAP (versao clara, pois o sidebar e escuro)
3. **Na tela de login**, trocar a logo automaticamente conforme o tema (logo escura no light mode, logo clara no dark mode)

## Alteracoes

### 1. Salvar a nova logo

- Copiar `Design_sem_nome_13.png` para `src/assets/map-logo-light.png` (versao com fundo transparente e seta laranja sem circulo preto -- ideal para fundos escuros)

### 2. Configurar o ThemeProvider

**Arquivo: `src/App.tsx`**

- Importar `ThemeProvider` do `next-themes`
- Envolver o app com `<ThemeProvider attribute="class" defaultTheme="light" storageKey="map-flow-theme">`
- Isso ativa o suporte a dark mode em toda a aplicacao

### 3. Atualizar o Sidebar com logo e toggle de tema

**Arquivo: `src/components/AppSidebar.tsx`**

- Importar a logo clara: `import mapLogoLight from "@/assets/map-logo-light.png"`
- Substituir o bloco `<div className="bg-sidebar-primary ..."><span>M</span></div>` por `<img src={mapLogoLight} alt="MAP Flow" className="h-8 w-8" />`
- Adicionar um botao de toggle de tema (sol/lua) na secao inferior do sidebar, antes do botao "Sair"
- Usar `useTheme()` do `next-themes` para alternar entre `light` e `dark`
- Icones: `Sun` para modo claro, `Moon` para modo escuro (do lucide-react)

### 4. Atualizar o MobileHeader com a logo

**Arquivo: `src/components/MobileHeader.tsx`**

- Substituir o bloco `<div className="bg-primary ..."><span>M</span></div>` por `<img>` com a logo
- Como o header mobile segue o tema do app, usar a logo original (escura) no light mode e a logo clara no dark mode, usando `useTheme()`

### 5. Atualizar a tela de login

**Arquivo: `src/pages/Auth.tsx`**

- Importar ambas as logos
- Usar `useTheme()` para detectar o tema atual
- Renderizar `mapLogo` (escura) no light mode e `mapLogoLight` (clara) no dark mode
- Adicionar um botao pequeno de toggle de tema no canto superior direito da tela de login (icone sol/lua)

### 6. Atualizar a tela de reset de senha

**Arquivo: `src/pages/ResetPassword.tsx`**

- Mesma logica de troca de logo da tela de login

## Resultado esperado

**Sidebar (sempre escuro):**
- Logo MAP (versao laranja sem circulo) no lugar da letra "M"
- Botao sol/lua para alternar o tema do conteudo principal

**Tela de login - Light mode:**
- Logo com circulo preto + seta laranja
- Botao de toggle de tema no canto

**Tela de login - Dark mode:**
- Logo so com seta laranja (fundo escuro)
- Botao de toggle de tema no canto

**Conteudo principal:**
- Todas as cores se adaptam automaticamente (as variaveis CSS `.dark` ja estao definidas no `index.css`)

## Detalhes tecnicos

### ThemeProvider no App.tsx:
```typescript
import { ThemeProvider } from "next-themes";

// Envolver tudo com:
<ThemeProvider attribute="class" defaultTheme="light" storageKey="map-flow-theme">
  ...
</ThemeProvider>
```

### Toggle de tema no sidebar:
```typescript
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

const { theme, setTheme } = useTheme();

<SidebarMenuButton onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
  {!isCollapsed && <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>}
</SidebarMenuButton>
```

### Nenhuma alteracao de banco de dados

A preferencia de tema e salva automaticamente no `localStorage` pelo `next-themes`.

