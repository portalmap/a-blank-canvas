/**
 * Helpers compartilhados para converter automações entre "modelo" e "real".
 * Usado tanto na importação (real -> modelo) quanto na aplicação (modelo -> real).
 */

/** Remapeia IDs de lista/status dentro do action_config de uma automação. */
export function remapAutomationConfig(
  actionConfig: Record<string, unknown> | null | undefined,
  listIdMap: Record<string, string>,
  statusIdMap: Record<string, string>,
): Record<string, unknown> {
  const remapped = JSON.parse(JSON.stringify(actionConfig || {})) as Record<string, any>;

  if (remapped.trigger_config) {
    for (const key of ['from_status_ids', 'to_status_ids']) {
      if (Array.isArray(remapped.trigger_config[key])) {
        remapped.trigger_config[key] = remapped.trigger_config[key]
          .map((id: string) => statusIdMap[id] || id)
          .filter(Boolean);
      }
    }
  }

  if (Array.isArray(remapped.actions)) {
    remapped.actions = remapped.actions.map((action: any) => {
      if (action?.config) {
        if (action.config.target_list_id && listIdMap[action.config.target_list_id]) {
          action.config.target_list_id = listIdMap[action.config.target_list_id];
        }
        if (action.config.status_id && statusIdMap[action.config.status_id]) {
          action.config.status_id = statusIdMap[action.config.status_id];
        }
      }
      return action;
    });
  }

  if (Array.isArray(remapped.conditions)) {
    remapped.conditions = remapped.conditions.map((condition: any) => {
      if (condition?.field === 'status_id' && condition.value) {
        if (Array.isArray(condition.value)) {
          condition.value = condition.value.map((id: string) => statusIdMap[id] || id);
        } else if (typeof condition.value === 'string' && statusIdMap[condition.value]) {
          condition.value = statusIdMap[condition.value];
        }
      }
      return condition;
    });
  }

  return remapped;
}

/** Lista todos os IDs de status/lista citados no action_config (para diagnóstico). */
export function collectReferencedIds(actionConfig: Record<string, unknown> | null | undefined) {
  const config = (actionConfig || {}) as Record<string, any>;
  const statusIds: string[] = [];
  const listIds: string[] = [];

  const trigger = config.trigger_config || {};
  for (const key of ['from_status_ids', 'to_status_ids']) {
    if (Array.isArray(trigger[key])) statusIds.push(...trigger[key]);
  }
  if (Array.isArray(config.actions)) {
    for (const action of config.actions) {
      if (action?.config?.status_id) statusIds.push(action.config.status_id);
      if (action?.config?.target_list_id) listIds.push(action.config.target_list_id);
    }
  }
  if (Array.isArray(config.conditions)) {
    for (const condition of config.conditions) {
      if (condition?.field === 'status_id' && condition.value) {
        if (Array.isArray(condition.value)) statusIds.push(...condition.value);
        else if (typeof condition.value === 'string') statusIds.push(condition.value);
      }
    }
  }

  return { statusIds: Array.from(new Set(statusIds)), listIds: Array.from(new Set(listIds)) };
}

/** Nome de modelo termina em "|" (ex.: "Tráfego Pago | "); o real acrescenta o cliente. */
export function templateNameBase(name: string): string {
  return name.replace(/\|\s*$/, '').trim().toLowerCase();
}

/** "Tráfego Pago | Tintas Palmares" corresponde ao modelo "Tráfego Pago | ". */
export function realMatchesTemplateName(templateName: string, realName: string): boolean {
  const base = templateNameBase(templateName);
  const real = realName.trim().toLowerCase();
  return real === base || real.startsWith(`${base} |`) || real.startsWith(base);
}

/** Nome do cliente a partir do nome do space ("MAP | Tintas Palmares" -> "Tintas Palmares"). */
export function extractClientName(spaceName: string): string {
  const parts = spaceName.split('|');
  return parts.length > 1 ? parts[parts.length - 1]!.trim() : spaceName.trim();
}

/** Monta o nome real de uma pasta/lista criada a partir do modelo. */
export function buildRealName(templateName: string, spaceName: string): string {
  const base = templateName.replace(/\|\s*$/, '').trim();
  const client = extractClientName(spaceName);
  if (!client || base.toLowerCase().endsWith(client.toLowerCase())) return base;
  return `${base} | ${client}`;
}
