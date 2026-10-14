export type MovementType = 'income' | 'expense';
export type MovementStatus = 'paid' | 'pending';

export type Movement = {
  id: string;
  type: MovementType;
  category: string;
  amount: number;
  date: string;
  status: MovementStatus;
  dueDate: string;
  description: string;
};

export type MovementFormState = {
  id?: string;
  type: MovementType;
  category: string;
  amount: string;
  date: string;
  status: MovementStatus;
  dueDate: string;
  description: string;
};

export const defaultMovementForm: MovementFormState = {
  type: 'income',
  category: 'Vendas',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  status: 'paid',
  dueDate: new Date().toISOString().slice(0, 10),
  description: '',
};

export const initialMovements: Movement[] = [
  {
    id: 'm1',
    type: 'income',
    category: 'Vendas',
    amount: 4200,
    date: '2026-10-01',
    status: 'paid',
    dueDate: '2026-10-05',
    description: 'Venda de produto X',
  },
  {
    id: 'm2',
    type: 'expense',
    category: 'Fornecedor',
    amount: 1450,
    date: '2026-10-03',
    status: 'paid',
    dueDate: '2026-10-04',
    description: 'Compra de insumos',
  },
  {
    id: 'm3',
    type: 'income',
    category: 'Vendas',
    amount: 2600,
    date: '2026-10-09',
    status: 'pending',
    dueDate: '2026-10-18',
    description: 'Pedido em aberto',
  },
  {
    id: 'm4',
    type: 'expense',
    category: 'Aluguel',
    amount: 1100,
    date: '2026-10-05',
    status: 'paid',
    dueDate: '2026-10-05',
    description: 'Aluguel do espaço',
  },
];
