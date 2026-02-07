

# Adicionar "Ver Automacoes" no menu de contexto do Space, Pasta e Lista

## Objetivo

Permitir acessar rapidamente a pagina de Automacoes ja filtrada pelo item selecionado (Space, Pasta ou Lista) diretamente pelo menu de contexto na sidebar.

## Como vai funcionar

1. Ao clicar com botao direito (ou no icone "...") em um Space, Pasta ou Lista, aparece uma nova opcao **"Ver Automacoes"** com icone de raio (Zap)
2. Ao clicar, o usuario e redirecionado para `/automations?scopeType=space&scopeId=abc123`
3. A pagina de Automacoes le os parametros da URL e ja inicia com os filtros aplicados

## Alteracoes

### 1. `src/pages/Automations.tsx`

- Importar `useSearchParams` do `react-router-dom`
- Na inicializacao do state `filters`, verificar se existem query params `scopeType` e `scopeId` na URL
- Se existirem, usar esses valores como estado inicial dos filtros em vez do padrao `{ scopeType: 'all', scopeId: null }`

### 2. `src/components/workspace/SpaceTreeItem.tsx`

- Importar `useNavigate` e o icone `Zap`
- Adicionar um novo `DropdownMenuItem` chamado **"Ver Automacoes"** no menu de contexto
- Ao clicar, navegar para `/automations?scopeType=space&scopeId={space.id}`
- Posicionar o item apos "Nova Lista" e antes do separador

### 3. `src/components/workspace/FolderTreeItem.tsx`

- Importar `useNavigate` e o icone `Zap`
- Adicionar um novo `DropdownMenuItem` chamado **"Ver Automacoes"** no menu de contexto
- Ao clicar, navegar para `/automations?scopeType=folder&scopeId={folder.id}`
- Posicionar o item apos "Nova Lista" e antes do separador

### 4. `src/components/workspace/ListTreeItem.tsx`

- Importar o icone `Zap` (ja tem `useNavigate`)
- Adicionar um novo `DropdownMenuItem` chamado **"Ver Automacoes"** no menu de contexto
- Ao clicar, navegar para `/automations?scopeType=list&scopeId={list.id}`
- Posicionar o item apos "Nova Tarefa" e antes do separador

## Fluxo do usuario

```text
Sidebar                          Pagina de Automacoes
+------------------+             +-------------------------+
| MAP | Accerth    |             |                         |
|   [...]          |             | Filtro: [Spaces v]      |
|   > Ver Autom.   | -- click -> | Item:  [Accerth v]      |
|   > Renomear     |             | Automacoes filtradas... |
+------------------+             +-------------------------+
```

## Detalhes tecnicos

A pagina de Automacoes passara a ler `searchParams` na inicializacao:

```typescript
const [searchParams] = useSearchParams();
const initialScopeType = searchParams.get('scopeType') || 'all';
const initialScopeId = searchParams.get('scopeId') || null;

const [filters, setFilters] = useState<AutomationsFilterState>({
  scopeType: initialScopeType as AutomationsFilterState['scopeType'],
  scopeId: initialScopeId,
  searchTerm: '',
});
```

Nos tree items, a navegacao sera simples:

```typescript
navigate(`/automations?scopeType=space&scopeId=${space.id}`);
```

Nenhuma alteracao de banco de dados e necessaria.

