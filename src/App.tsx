import { useEffect, useMemo, useState } from 'react';
import { initialMovements, type Movement, type MovementFormState } from './types';
import { formatCurrency, summarizeMovements } from './utils/finance';

const STORAGE_KEY = 'resoluta-finance-movements';
const categories = ['Vendas', 'Fornecedor', 'Despesas', 'Materiais', 'Aluguel', 'Marketing', 'Outros'];

function App() {
  const [movements, setMovements] = useState<Movement[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return initialMovements;
    }

    try {
      return JSON.parse(stored) as Movement[];
    } catch {
      return initialMovements;
    }
  });

  const [form, setForm] = useState<MovementFormState>({
    type: 'income',
    category: 'Vendas',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'paid',
    dueDate: new Date().toISOString().slice(0, 10),
    description: '',
  });

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(movements));
  }, [movements]);

  const summary = useMemo(() => summarizeMovements(movements), [movements]);

  const filteredMovements = useMemo(() => {
    const normalized = movements.filter((movement) => {
      const matchesSearch =
        movement.description.toLowerCase().includes(search.toLowerCase()) ||
        movement.category.toLowerCase().includes(search.toLowerCase());

      const matchesType = typeFilter === 'all' || movement.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || movement.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || movement.status === statusFilter;

      return matchesSearch && matchesType && matchesCategory && matchesStatus;
    });

    return [...normalized].sort((a, b) => {
      if (sortBy === 'amount') {
        return b.amount - a.amount;
      }

      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [movements, search, typeFilter, categoryFilter, statusFilter, sortBy]);

  const handleInputChange = (
    field: keyof MovementFormState,
    value: string,
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      type: 'income',
      category: 'Vendas',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      status: 'paid',
      dueDate: new Date().toISOString().slice(0, 10),
      description: '',
    });
    setEditId(null);
  };

  const submitMovement = (event: React.FormEvent) => {
    event.preventDefault();

    const amountValue = Number(form.amount);

    if (!form.description.trim() || !form.category || Number.isNaN(amountValue) || amountValue <= 0) {
      window.alert('Preencha descrição, categoria e um valor válido maior que zero.');
      return;
    }

    if (!form.date || !form.dueDate) {
      window.alert('Informe a data da movimentação e a data de vencimento.');
      return;
    }

    const payload: Movement = {
      id: editId ?? `mov-${Date.now()}`,
      type: form.type,
      category: form.category,
      amount: amountValue,
      date: form.date,
      status: form.status,
      dueDate: form.dueDate,
      description: form.description.trim(),
    };

    setMovements((current) => {
      if (editId) {
        return current.map((item) => (item.id === editId ? payload : item));
      }

      return [payload, ...current];
    });

    resetForm();
  };

  const handleEdit = (movement: Movement) => {
    setEditId(movement.id);
    setForm({
      id: movement.id,
      type: movement.type,
      category: movement.category,
      amount: String(movement.amount),
      date: movement.date,
      status: movement.status,
      dueDate: movement.dueDate,
      description: movement.description,
    });
  };

  const handleDelete = (movementId: string) => {
    const confirmDelete = window.confirm('Deseja excluir esta movimentação?');

    if (!confirmDelete) {
      return;
    }

    setMovements((current) => current.filter((item) => item.id !== movementId));

    if (editId === movementId) {
      resetForm();
    }
  };

  return (
    <div className="min-h-screen bg-resoluta-background text-slate-800">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full bg-resoluta-navy p-5 text-white lg:w-72">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-resoluta-gold text-lg font-bold text-resoluta-navy">
              RF
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">RESOLUTA</p>
              <h1 className="text-xl font-semibold">Finance</h1>
            </div>
          </div>

          <nav className="space-y-2 text-sm">
            {['Visão geral', 'Movimentações financeiras', 'Análise financeira', 'Formação de preço', 'Produtos e serviços', 'Aprenda', 'Planos FREE e PRO', 'Configurações'].map((item, index) => (
              <button
                key={item}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                  index === 1 ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <span>{item}</span>
                <span className="text-xs text-slate-300">0{index + 1}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-5 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-resoluta-muted">Dashboard</p>
              <h2 className="text-2xl font-bold text-resoluta-navy">Visão geral financeira</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                Mês atual
              </span>
              <button className="rounded-xl bg-resoluta-blue px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:opacity-90">
                Exportar
              </button>
            </div>
          </header>

          <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Faturamento recebido" value={formatCurrency(summary.revenueReceived)} tone="blue" />
            <SummaryCard title="Entradas pendentes" value={formatCurrency(summary.pendingIncome)} tone="gold" />
            <SummaryCard title="Custos e despesas pagas" value={formatCurrency(summary.costsPaid)} tone="red" />
            <SummaryCard title="Resultado realizado" value={formatCurrency(summary.realized)} tone="green" />
          </section>

          <section className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-resoluta-navy">Movimentações financeiras</h3>
                <span className="text-sm text-resoluta-muted">{filteredMovements.length} registros</span>
              </div>

              <form onSubmit={submitMovement} className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Tipo
                  <select
                    value={form.type}
                    onChange={(event) => handleInputChange('type', event.target.value as MovementFormState['type'])}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none ring-0 focus:border-resoluta-blue"
                  >
                    <option value="income">Entrada</option>
                    <option value="expense">Saída</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Categoria
                  <select
                    value={form.category}
                    onChange={(event) => handleInputChange('category', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none ring-0 focus:border-resoluta-blue"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Valor (R$)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => handleInputChange('amount', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-resoluta-blue"
                    placeholder="0.00"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Status
                  <select
                    value={form.status}
                    onChange={(event) => handleInputChange('status', event.target.value as MovementFormState['status'])}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-resoluta-blue"
                  >
                    <option value="paid">Realizada/Paga</option>
                    <option value="pending">Pendente</option>
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Data da movimentação
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => handleInputChange('date', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-resoluta-blue"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Data de vencimento
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(event) => handleInputChange('dueDate', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-resoluta-blue"
                  />
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
                  Descrição
                  <input
                    value={form.description}
                    onChange={(event) => handleInputChange('description', event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-resoluta-blue"
                    placeholder="Ex.: Receita de serviço de consultoria"
                  />
                </label>

                <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
                  <button
                    type="submit"
                    className="rounded-xl bg-resoluta-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    {editId ? 'Salvar alterações' : 'Adicionar movimentação'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Limpar formulário
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <h3 className="mb-4 text-lg font-semibold text-resoluta-navy">Filtros</h3>
              <div className="space-y-3">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar descrição ou categoria"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-resoluta-blue"
                />

                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as 'all' | 'income' | 'expense')}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-resoluta-blue"
                >
                  <option value="all">Tipo: todos</option>
                  <option value="income">Entrada</option>
                  <option value="expense">Saída</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-resoluta-blue"
                >
                  <option value="all">Categoria: todas</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | 'paid' | 'pending')}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-resoluta-blue"
                >
                  <option value="all">Status: todos</option>
                  <option value="paid">Realizada/Paga</option>
                  <option value="pending">Pendente</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as 'date' | 'amount')}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 outline-none focus:border-resoluta-blue"
                >
                  <option value="date">Ordenar por data</option>
                  <option value="amount">Ordenar por valor</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-resoluta-navy">Histórico</h3>
              <span className="text-sm text-resoluta-muted">Últimas movimentações</span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Descrição</th>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Categoria</th>
                    <th className="px-3 py-2 font-medium">Valor</th>
                    <th className="px-3 py-2 font-medium">Data</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMovements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                        Nenhuma movimentação encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredMovements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3">{movement.description}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              movement.type === 'income'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {movement.type === 'income' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="px-3 py-3">{movement.category}</td>
                        <td className={`px-3 py-3 font-semibold ${movement.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {movement.type === 'income' ? '+' : '-'}
                          {formatCurrency(movement.amount)}
                        </td>
                        <td className="px-3 py-3">{new Date(movement.date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              movement.status === 'paid'
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {movement.status === 'paid' ? 'Realizada' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(movement)}
                              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(movement.id)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  value: string;
  tone: 'blue' | 'gold' | 'red' | 'green';
};

function SummaryCard({ title, value, tone }: SummaryCardProps) {
  const tones = {
    blue: 'bg-blue-50 text-blue-900',
    gold: 'bg-amber-50 text-amber-900',
    red: 'bg-rose-50 text-rose-900',
    green: 'bg-emerald-50 text-emerald-900',
  };

  return (
    <div className={`rounded-2xl border border-slate-200 p-4 shadow-card ${tones[tone]}`}>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <h3 className="mt-3 text-2xl font-bold">{value}</h3>
    </div>
  );
}

export default App;
