export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
}

export function summarizeMovements(movements: { amount: number; type: 'income' | 'expense'; status: 'paid' | 'pending' }[]) {
  const revenueReceived = movements
    .filter((m) => m.type === 'income' && m.status === 'paid')
    .reduce((sum, m) => sum + m.amount, 0);

  const pendingIncome = movements
    .filter((m) => m.type === 'income' && m.status === 'pending')
    .reduce((sum, m) => sum + m.amount, 0);

  const costsPaid = movements
    .filter((m) => m.type === 'expense' && m.status === 'paid')
    .reduce((sum, m) => sum + m.amount, 0);

  const pendingExpenses = movements
    .filter((m) => m.type === 'expense' && m.status === 'pending')
    .reduce((sum, m) => sum + m.amount, 0);

  const realized = revenueReceived - costsPaid;
  const estimated = (revenueReceived + pendingIncome) - (costsPaid + pendingExpenses);

  return {
    revenueReceived,
    pendingIncome,
    costsPaid,
    pendingExpenses,
    realized,
    estimated,
  };
}
