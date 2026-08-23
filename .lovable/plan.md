# Logo da MAP no cabeçalho da sidebar + favicon

## O que muda

1. **Cabeçalho da sidebar** (`src/components/AppSidebar.tsx`)
   - Remove a "bolinha" âmbar e a caixinha com o texto "MAP".
   - Coloca a logo da MAP (ícone) à esquerda + o wordmark "MAP Flow" ao lado.
   - Quando a sidebar está recolhida, mostra só o ícone da logo.

2. **Arquivos de logo** (`src/components/ThemeLogo.tsx`)
   - Substitui os dois arquivos atuais pelas novas imagens enviadas:
     - modo claro: `logo-map-light.png` (círculo preto + marca âmbar)
     - modo escuro: `logo_map_dark.png` (versão para fundo escuro)
   - O componente continua trocando automaticamente conforme o tema.

3. **Favicon**
   - Usa `favicon_map.png` como favicon do app (cópia quadrada em `public/favicon.png`) e aponta o `<link rel="icon">` no `src/routes/__root.tsx`, removendo o ícone padrão antigo.

## Detalhes técnicos

- Novas imagens entram como assets de CDN (`lovable-assets`) e o `ThemeLogo` passa a importar os ponteiros `.asset.json`; os PNGs antigos em `src/assets` são removidos.
- No `AppSidebar`, o bloco das linhas 132-145 passa a renderizar `<ThemeLogo className="h-7 w-7" />` (expandido: logo + "MAP Flow"; recolhido: só a logo).
- Favicon é arquivo real em `public/favicon.png` (redimensionado para 64x64 com padding), nunca ponteiro de asset.
- Nada além do cabeçalho da sidebar, do `ThemeLogo` e do `head()` do root é alterado.
