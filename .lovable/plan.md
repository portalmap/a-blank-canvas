
## Plano: Ajustar Tamanhos e Espaçamentos do Dialog de Automação

### Problema Identificado

O dialog de automação de template está com:
- Textos de labels muito grandes
- Cards com padding excessivo
- Botões de ação muito grandes
- Espaçamentos desproporcionais

A experiência está ruim porque os elementos ocupam muito espaço vertical, forçando scroll excessivo.

### Solução Proposta

Ajustar os tamanhos de fonte, padding e espaçamentos para criar uma interface mais compacta e utilizável.

---

### Mudanças por Componente

#### 1. `TemplateAutomationDialog.tsx`
- Reduzir `space-y-6` para `space-y-4` no container principal
- Ajustar padding dos cards de `p-4` para `p-3`
- Usar `text-xs` para labels secundárias

#### 2. `MultiActionSelector.tsx`
- Reduzir labels de `text-sm` para `text-xs`
- Ajustar padding das cards de ação de `p-3` para `p-2`
- Reduzir espaçamento `space-y-3` para `space-y-2`
- Badges de ação com tamanho menor

#### 3. `ActionConfigForm.tsx`
- Labels com `text-xs` ao invés do tamanho padrão
- Reduzir `space-y-2` para `space-y-1.5` nos campos
- SelectTriggers mais compactos

#### 4. `ActionSelector.tsx`
- Reduzir altura do ScrollArea de `400px` para `280px`
- Reduzir padding dos botões de `py-3` para `py-2`
- Ícones menores (de `h-4 w-4` para `h-3.5 w-3.5`)

#### 5. `TriggerSelector.tsx`
- Reduzir altura do ScrollArea de `400px` para `280px`
- Ajustar padding e espaçamentos

#### 6. `ConditionRow.tsx`
- Reduzir espaçamentos dos selects
- Compactar layout geral

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/settings/TemplateAutomationDialog.tsx` | Reduzir espaçamentos e padding |
| `src/components/automations/advanced/MultiActionSelector.tsx` | Labels menores, padding compacto |
| `src/components/automations/advanced/ActionConfigForm.tsx` | Labels `text-xs`, campos compactos |
| `src/components/automations/advanced/ActionSelector.tsx` | ScrollArea menor, padding reduzido |
| `src/components/automations/advanced/TriggerSelector.tsx` | ScrollArea menor, layout compacto |
| `src/components/automations/advanced/ConditionRow.tsx` | Layout mais compacto |
| `src/components/automations/advanced/ConditionsBuilder.tsx` | Espaçamentos reduzidos |

---

### Comparativo Visual

```text
ANTES                              DEPOIS
─────────────────────              ─────────────────────
┌─────────────────────┐            ┌─────────────────────┐
│                     │            │ 1. Mover tarefa [✗] │
│  1. Mover tarefa    │            │ Lista: Designer...  │
│                     │            ├─────────────────────┤
│     [Alterar] [✗]   │            │ 2. Add etiqueta [✗] │
│                     │            │ Etiq: enviar desi.. │
│  Configurar ação    │            ├─────────────────────┤
│                     │            │  + Adicionar ação   │
│  Lista de destino * │            └─────────────────────┘
│  ┌───────────────┐  │            
│  │Designer/Ed... │  │            Mais compacto!
│  └───────────────┘  │            Menos scroll!
│                     │            
└─────────────────────┘            
```

---

### Principais Ajustes de CSS

```typescript
// MultiActionSelector - antes vs depois
// Card de ação
<Card className="p-3">  →  <Card className="p-2">

// Label
<Label className="text-sm font-medium">  →  <Label className="text-xs font-medium">

// ActionConfigForm - campos
<div className="space-y-2">  →  <div className="space-y-1.5">

// Labels de campos
<Label>  →  <Label className="text-xs">

// ActionSelector/TriggerSelector - ScrollArea
<ScrollArea className="h-[400px]">  →  <ScrollArea className="h-[280px]">

// Botões de ação
<button className="px-3 py-3">  →  <button className="px-2.5 py-2">
```

---

### Resultado Esperado

1. Interface mais compacta e profissional
2. Menos scroll necessário para configurar automações
3. Melhor aproveitamento do espaço do dialog
4. Experiência mais fluida e moderna
5. Mantém toda a funcionalidade existente
