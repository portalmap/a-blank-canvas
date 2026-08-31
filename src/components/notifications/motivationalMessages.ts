export const MOTIVATIONAL_MESSAGES = [
  'Tudo em dia por aqui. Continue assim!',
  'Caixa limpa, mente leve. Bom trabalho!',
  'Nenhuma pendência: esse é o ritmo certo.',
  'Você está em dia — aproveite o foco.',
  'Organização é o atalho para a consistência.',
  'Zero notificações pendentes. Excelente!',
  'Cada tarefa fechada é um passo à frente.',
  'Ritmo impecável hoje. Siga firme!',
  'Sem pendências: hora de avançar no que importa.',
  'Constância vence pressa. Você está no caminho.',
  'Trabalho em ordem, resultado à vista.',
  'Nada esperando por você agora. Respire e siga.',
  'Disciplina de hoje, tranquilidade de amanhã.',
  'Você está no controle. Continue assim!',
  'Feito é melhor que perfeito — e você está fazendo.',
];

export function pickMotivationalMessage() {
  return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
}
