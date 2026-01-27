

## Plano: Aprimorar Configuração de Data de Vencimento

### Situação Atual
A ação "Definir data de vencimento" tem apenas um campo simples:
- `days_from_now` (número): Dias a partir de hoje

### Nova Estrutura Proposta

Criar um seletor com 4 modos de definição de data:

| Modo | Descrição | Campo Adicional |
|------|-----------|-----------------|
| `first_day_of_month` | Primeiro dia do mês | Nenhum |
| `last_day_of_month` | Último dia do mês | Nenhum |
| `days_after_trigger` | Dias após o gatilho | Input numérico (quantidade de dias) |
| `specific_day` | Dia específico do mês | Input numérico (1-31) |

### UI Proposta

```text
┌─────────────────────────────────────────────────────┐
│  Configurar ação                                     │
│                                                      │
│  Tipo de data *                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │ Dias após o gatilho                          ▼ ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  Quantidade de dias *                               │
│  ┌─────────────────────────────────────────────────┐│
│  │ 5                                               ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

Ou para dia específico:

```text
┌─────────────────────────────────────────────────────┐
│  Configurar ação                                     │
│                                                      │
│  Tipo de data *                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │ Dia específico do mês                        ▼ ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  Dia do mês *                                       │
│  ┌─────────────────────────────────────────────────┐│
│  │ 17                                              ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

---

### Mudanças Necessárias

#### 1. Atualizar `actionCategories.ts`

Alterar a definição de `set_due_date` e `set_start_date` para usar a nova estrutura:

```typescript
{
  id: 'set_due_date',
  label: 'Definir data de vencimento',
  description: 'Definir ou alterar a data final',
  icon: Calendar,
  configFields: [
    { 
      name: 'date_type', 
      label: 'Tipo de data', 
      type: 'select', 
      required: true,
      options: [
        { value: 'first_day_of_month', label: 'Primeiro dia do mês' },
        { value: 'last_day_of_month', label: 'Último dia do mês' },
        { value: 'days_after_trigger', label: 'Dias após o gatilho' },
        { value: 'specific_day', label: 'Dia específico do mês' },
      ]
    },
    { name: 'days_count', label: 'Quantidade de dias', type: 'number' },
    { name: 'day_of_month', label: 'Dia do mês', type: 'number' },
  ]
}
```

#### 2. Criar tipo customizado em `ActionConfigField`

Adicionar um novo tipo `date_config` para tratar essa lógica especial:

```typescript
type: 'select' | 'text' | 'user' | 'status' | 'priority' | 'date' | 'number' | 'list' | 'tag' | 'date_config';
```

#### 3. Implementar renderização customizada em `ActionConfigForm.tsx`

Criar um novo case no `renderField` para renderizar os campos condicionalmente:

```typescript
case 'date_config':
  return (
    <div key={field.name} className="space-y-4">
      {/* Seletor do tipo de data */}
      <div className="space-y-2">
        <Label>Tipo de data *</Label>
        <Select
          value={config.date_type || ''}
          onValueChange={(value) => {
            // Limpar campos relacionados ao mudar o tipo
            handleFieldChange('date_type', value);
            handleFieldChange('days_count', undefined);
            handleFieldChange('day_of_month', undefined);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="first_day_of_month">Primeiro dia do mês</SelectItem>
            <SelectItem value="last_day_of_month">Último dia do mês</SelectItem>
            <SelectItem value="days_after_trigger">Dias após o gatilho</SelectItem>
            <SelectItem value="specific_day">Dia específico do mês</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Campo condicional: dias após gatilho */}
      {config.date_type === 'days_after_trigger' && (
        <div className="space-y-2">
          <Label>Quantidade de dias *</Label>
          <Input
            type="number"
            min="0"
            value={config.days_count || ''}
            onChange={(e) => handleFieldChange('days_count', parseInt(e.target.value) || 0)}
            placeholder="Ex: 5"
          />
        </div>
      )}
      
      {/* Campo condicional: dia específico */}
      {config.date_type === 'specific_day' && (
        <div className="space-y-2">
          <Label>Dia do mês *</Label>
          <Input
            type="number"
            min="1"
            max="31"
            value={config.day_of_month || ''}
            onChange={(e) => handleFieldChange('day_of_month', parseInt(e.target.value) || 1)}
            placeholder="Ex: 17"
          />
        </div>
      )}
    </div>
  );
```

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/automations/advanced/actionCategories.ts` | Atualizar `set_due_date` e `set_start_date` para usar novo tipo `date_config` |
| `src/components/automations/advanced/ActionConfigForm.tsx` | Adicionar case `date_config` com renderização condicional |

---

### Estrutura de Dados Salva

O `config` da ação será salvo assim:

**Primeiro dia do mês:**
```json
{ "date_type": "first_day_of_month" }
```

**Último dia do mês:**
```json
{ "date_type": "last_day_of_month" }
```

**Dias após o gatilho:**
```json
{ "date_type": "days_after_trigger", "days_count": 5 }
```

**Dia específico:**
```json
{ "date_type": "specific_day", "day_of_month": 17 }
```

---

### Sugestões Adicionais

Além das opções solicitadas, considere adicionar futuramente:

1. **Próximo dia útil** - Calcular excluindo finais de semana
2. **Mês seguinte** - Definir para o mesmo dia do mês seguinte
3. **Semanas após o gatilho** - Similar a dias, mas em semanas
4. **Data relativa ao início/fim da tarefa** - Caso a tarefa já tenha datas definidas

---

### Resultado Esperado

1. Usuário seleciona ação "Definir data de vencimento"
2. Aparece dropdown "Tipo de data" com 4 opções
3. Se escolher "Dias após o gatilho" → aparece campo numérico
4. Se escolher "Dia específico" → aparece campo numérico (1-31)
5. Se escolher "Primeiro/Último dia" → nenhum campo adicional

