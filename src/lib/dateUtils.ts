/**
 * Utilitários para manipulação de datas
 * 
 * Problema: Datas armazenadas como "2026-01-16" (apenas data) são interpretadas
 * como meia-noite UTC pelo JavaScript. Para usuários no Brasil (UTC-3), isso
 * resulta em 15/01/2026 21:00 hora local, exibindo o dia errado.
 * 
 * Solução: parseLocalDate() adiciona "T00:00:00" para forçar interpretação
 * como hora local, garantindo que a data exibida seja a mesma armazenada.
 */

/**
 * Converte uma string de data (YYYY-MM-DD) para Date interpretada como hora local.
 * Evita problemas de timezone onde "2026-01-16" seria interpretado como UTC
 * e exibido como 15/01/2026 em fusos negativos como Brasil (UTC-3).
 * 
 * @param dateString - String no formato "YYYY-MM-DD" ou null
 * @returns Date object ou null
 */
export function parseLocalDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  
  // Se já contém informação de hora, retorna parseado normalmente
  if (dateString.includes('T')) {
    return new Date(dateString);
  }
  
  // Adiciona T00:00:00 para forçar parsing como hora local
  // "2026-01-16" -> "2026-01-16T00:00:00"
  return new Date(dateString + 'T00:00:00');
}
