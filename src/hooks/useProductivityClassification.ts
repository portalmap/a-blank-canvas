import { useProductivitySettings } from './useProductivitySettings';

export type ProductivityClassification = 'early' | 'on_time' | 'late';

/**
 * Calcula o percentual de entrega (tempo usado / prazo total * 100)
 */
export const calculateDeliveryPercentage = (
  startDate: string,
  dueDate: string,
  referenceDate: Date
): number => {
  const start = new Date(startDate + 'T00:00:00');
  const due = new Date(dueDate + 'T23:59:59');
  const totalMs = due.getTime() - start.getTime();

  if (totalMs <= 0) return 200; // prazo inválido = máximo atraso

  const usedMs = referenceDate.getTime() - start.getTime();
  return (usedMs / totalMs) * 100;
};

/**
 * Score de produtividade individual: 200 - percentual_entrega, clamped [0, 200]
 */
export const calculateProductivityScore = (
  startDate: string,
  dueDate: string,
  referenceDate: Date
): number => {
  const deliveryPct = calculateDeliveryPercentage(startDate, dueDate, referenceDate);
  return Math.max(0, Math.min(200, 200 - deliveryPct));
};

export const calculateClassification = (
  startDate: string,
  dueDate: string,
  referenceDate: Date,
  earlyThreshold: number = 50,
  onTimeThreshold: number = 100
): { classification: ProductivityClassification; percentage: number; productivityScore: number } => {
  const percentage = calculateDeliveryPercentage(startDate, dueDate, referenceDate);
  const productivityScore = Math.max(0, Math.min(200, 200 - percentage));

  let classification: ProductivityClassification;
  if (percentage <= earlyThreshold) classification = 'early';
  else if (percentage <= onTimeThreshold) classification = 'on_time';
  else classification = 'late';

  return { classification, percentage, productivityScore };
};

export const getClassificationLabel = (classification: ProductivityClassification): string => {
  switch (classification) {
    case 'early': return 'Antecipada';
    case 'on_time': return 'Em dia';
    case 'late': return 'Atrasada';
  }
};

export const getClassificationColor = (classification: ProductivityClassification) => {
  switch (classification) {
    case 'early': return { bg: 'bg-green-500', text: 'text-green-500', border: 'border-green-500' };
    case 'on_time': return { bg: 'bg-blue-500', text: 'text-blue-500', border: 'border-blue-500' };
    case 'late': return { bg: 'bg-red-500', text: 'text-red-500', border: 'border-red-500' };
  }
};

export const useTaskProductivityClassification = (task: {
  start_date?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
}) => {
  const { data: settings } = useProductivitySettings();

  if (!task.start_date || !task.due_date) return null;

  const earlyThreshold = settings?.early_threshold_percent ?? 50;
  const onTimeThreshold = settings?.on_time_threshold_percent ?? 100;

  const referenceDate = task.completed_at ? new Date(task.completed_at) : new Date();

  return calculateClassification(
    task.start_date,
    task.due_date,
    referenceDate,
    earlyThreshold,
    onTimeThreshold
  );
};
