

## Plano: Dialog de Template IDÊNTICO à Visualização de Tarefa

### Problema Identificado

Criei um dialog personalizado com layout diferente, quando já existe uma visualização de tarefa completa e funcional no sistema. O usuário quer o MESMO layout, os MESMOS componentes.

---

### Solução: Reutilizar `TaskMainContent` Como Base

Vou copiar a estrutura exata do componente `TaskMainContent.tsx` para o dialog de template, adaptando apenas para trabalhar com estado local em vez de tarefas do banco.

---

### Estrutura Atual da Tarefa (a ser replicada)

```text
┌──────────────────────────────────────────────────────────┐
│  Briefing de Identidade - Executech                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  🚩 Status                    🚩 Prioridade              │
│  ┌──────────────────────┐     ┌──────────────────────┐   │
│  │ 🟢 Concluído      ▼  │     │ 🟡 Média          ▼  │   │
│  └──────────────────────┘     └──────────────────────┘   │
│                                                          │
│  📅 Data de Início            ⏰ Data de Entrega         │
│  ┌──────────────────────┐     ┌──────────────────────┐   │
│  │ dd/mm/aaaa        📅 │     │ dd/mm/aaaa        📅 │   │
│  └──────────────────────┘     └──────────────────────┘   │
│                                                          │
│  👤 Responsáveis                                         │
│  ┌──────────────────────────────────────────────────────┐│
│  │ [B] beatrizsantos@assessoriamap.com.br            [×]││
│  ├──────────────────────────────────────────────────────┤│
│  │             + Adicionar responsável                  ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  🏷️ Etiquetas                                            │
│  ┌──────────────────────────────────────────────────────┐│
│  │  + Adicionar etiqueta                                ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  Descrição                                        [↗]    │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Documento de Briefing para Desenvolvimento...        ││
│  │ Este documento tem como objetivo coletar...          ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  ∨ Subtarefas                              + Adicionar   │
│  ┌──────────────────────────────────────────────────────┐│
│  │              Nenhuma subtarefa                       ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  ☑ Checklists                              + Adicionar   │
│  ┌──────────────────────────────────────────────────────┐│
│  │             Nenhuma checklist                        ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ─────────────────────────────────────────────────────── │
│                                                          │
│  📎 Anexos (2)                             + Adicionar   │
│  ┌──────────────────────────────────────────────────────┐│
│  │  [img1]  [Brief... 129.1KB ⬇]                        ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│                            [Cancelar]  [Salvar]          │
└──────────────────────────────────────────────────────────┘
```

---

### Diferença Entre Tarefa Real e Template

| Campo | Tarefa Real | Template |
|-------|-------------|----------|
| Status | ID do status | ID do status_template_item |
| Datas | Data fixa (2025-01-27) | Offset relativo (+7 dias) |
| Responsáveis | IDs de usuários reais | Apenas placeholder visual |
| Anexos | Arquivos reais | Não suportado (placeholder) |
| Subtarefas | Tarefas filhas reais | Não suportado no template |
| Checklists | Checklists reais | Não suportado no template |

---

### Implementação

#### 1. Atualizar `TemplateTaskDialog.tsx`

Reescrever completamente para seguir a mesma estrutura de `TaskMainContent.tsx`:

**Campos Funcionais (com suporte no banco):**
- Título (editável)
- Status (do template de status)
- Prioridade (badge colorido)
- Data de Início (offset em dias)
- Data de Entrega (offset em dias)
- Etiquetas (tag_names array)
- Descrição (textarea expandível)
- Tempo estimado
- Marco (milestone)

**Campos Visuais (placeholders para referência):**
- Responsáveis: "Será atribuído quando a tarefa for criada"
- Subtarefas: "Adicione subtarefas após criar o space"
- Checklists: "Adicione checklists após criar o space"
- Anexos: "Adicione anexos após criar o space"

---

### Mudanças Técnicas

#### Layout do Dialog

```typescript
<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
  <DialogHeader>
    {/* Título editável - igual TaskMainContent */}
    <Input 
      value={title}
      onChange={...}
      className="text-2xl font-bold"
      placeholder="Título da tarefa..."
    />
  </DialogHeader>

  <div className="space-y-6 py-4">
    {/* Status e Prioridade - grid de 2 colunas */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Flag className="h-4 w-4" /> Status
        </label>
        <Select value={statusTemplateItemId} onValueChange={...}>
          <SelectTrigger>
            <SelectValue>
              <StatusBadge status={selectedStatus?.name || 'Padrão'} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {statusTemplateItems.map(...)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="...">
          <Flag className="h-4 w-4" /> Prioridade
        </label>
        <Select value={priority} onValueChange={...}>
          <SelectTrigger>
            <SelectValue>
              <PriorityBadge priority={priority} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {/* Baixa, Média, Alta, Urgente */}
          </SelectContent>
        </Select>
      </div>
    </div>

    {/* Datas - grid de 2 colunas com offset */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="...">
          <Calendar className="h-4 w-4" /> Data de Início
        </label>
        <div className="flex items-center gap-2">
          <Input 
            type="number"
            value={startDateOffset}
            onChange={...}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">dias após criação</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="...">
          <Clock className="h-4 w-4" /> Data de Entrega
        </label>
        <div className="flex items-center gap-2">
          <Input 
            type="number"
            value={dueDateOffset}
            onChange={...}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">dias após criação</span>
        </div>
      </div>
    </div>

    {/* Responsáveis - placeholder */}
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <User className="h-4 w-4" /> Responsáveis
      </label>
      <div className="p-3 border rounded-md bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Os responsáveis serão atribuídos quando a tarefa for criada a partir do template.
        </p>
      </div>
    </div>

    {/* Etiquetas - funcional */}
    <div className="space-y-2">
      <label className="...">
        <Tag className="h-4 w-4" /> Etiquetas
      </label>
      {/* Tags selecionadas com badges */}
      {/* Input para adicionar tags */}
    </div>

    <Separator />

    {/* Descrição - expandível */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Descrição</label>
        <Button variant="ghost" size="sm" onClick={expandDescription}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
      <Textarea
        value={description}
        onChange={...}
        className="min-h-[100px]"
        placeholder="Adicione uma descrição..."
      />
    </div>

    <Separator />

    {/* Tempo Estimado e Marco */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="...">
          <Clock className="h-4 w-4" /> Tempo Estimado
        </label>
        <div className="flex items-center gap-2">
          <Input type="number" value={hours} className="w-16" />
          <span className="text-sm">h</span>
          <Input type="number" value={minutes} className="w-16" />
          <span className="text-sm">min</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="...">
          <Flag className="h-4 w-4" /> Marco
        </label>
        <div className="flex items-center gap-2 h-10">
          <Checkbox checked={isMilestone} onCheckedChange={...} />
          <span className="text-sm">É um marco (milestone)</span>
        </div>
      </div>
    </div>

    <Separator />

    {/* Subtarefas - placeholder */}
    <Collapsible>
      <CollapsibleTrigger className="flex items-center justify-between w-full">
        <span className="text-sm font-medium flex items-center gap-2">
          <ChevronRight className="h-4 w-4" /> Subtarefas
        </span>
        <span className="text-xs text-muted-foreground">+ Adicionar</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-3 mt-2 border rounded-md bg-muted/30">
          <p className="text-sm text-muted-foreground text-center">
            Adicione subtarefas após criar o space
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>

    <Separator />

    {/* Checklists - placeholder */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <CheckSquare className="h-4 w-4" /> Checklists
        </label>
        <span className="text-xs text-muted-foreground">+ Adicionar</span>
      </div>
      <div className="p-3 border rounded-md bg-muted/30">
        <p className="text-sm text-muted-foreground text-center">
          Adicione checklists após criar o space
        </p>
      </div>
    </div>

    <Separator />

    {/* Anexos - placeholder */}
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Anexos
        </label>
        <span className="text-xs text-muted-foreground">+ Adicionar</span>
      </div>
      <div className="p-3 border rounded-md bg-muted/30">
        <p className="text-sm text-muted-foreground text-center">
          Adicione anexos após criar o space
        </p>
      </div>
    </div>
  </div>

  <DialogFooter>
    <Button variant="outline" onClick={onClose}>Cancelar</Button>
    <Button onClick={onSave}>Salvar</Button>
  </DialogFooter>
</DialogContent>
```

---

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/settings/TemplateTaskDialog.tsx` | **Reescrever** - Layout idêntico à tarefa existente |

---

### Resultado Final

O dialog de "Nova Tarefa" no template terá:

1. ✅ Layout IDÊNTICO à visualização de tarefa existente
2. ✅ Badges coloridos para Status e Prioridade
3. ✅ Seções de Responsáveis, Subtarefas, Checklists e Anexos (como placeholders)
4. ✅ Descrição com botão de expandir
5. ✅ Separadores visuais entre seções
6. ✅ Campos de offset de data com indicador "dias após criação"
7. ✅ Tempo estimado e marco funcionais

O usuário terá a mesma experiência visual que já conhece da tarefa real, facilitando o entendimento e uso.

