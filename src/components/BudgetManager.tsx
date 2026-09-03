import React, { useState } from 'react';
import {
  Wallet,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  Settings,
} from 'lucide-react';
import { Category, Transaction } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { formatBRL } from '../data/initialData';

export type BudgetStrategy = 'rule503020' | 'aggressive' | 'comfort';

export const getRecommendedBudgetForCategory = (
  categoryId: string,
  monthlyIncome: number,
  strategy: BudgetStrategy = 'rule503020'
): { percent: number; amount: number } => {
  if (!monthlyIncome || monthlyIncome <= 0) {
    return { percent: 0, amount: 0 };
  }

  const percentages: Record<BudgetStrategy, Record<string, number>> = {
    rule503020: {
      housing: 0.25,
      food: 0.18,
      transport: 0.08,
      health: 0.06,
      leisure: 0.15,
      education: 0.08,
      debts: 0.0,
      savings: 0.20,
    },
    aggressive: {
      housing: 0.26,
      food: 0.14,
      transport: 0.06,
      health: 0.04,
      leisure: 0.12,
      education: 0.08,
      debts: 0.0,
      savings: 0.30,
    },
    comfort: {
      housing: 0.30,
      food: 0.20,
      transport: 0.10,
      health: 0.07,
      leisure: 0.18,
      education: 0.05,
      debts: 0.0,
      savings: 0.10,
    },
  };

  const pct = percentages[strategy]?.[categoryId] ?? 0;
  return {
    percent: Math.round(pct * 100),
    amount: Math.round(monthlyIncome * pct),
  };
};

export const calculateFullBudgetForStrategy = (
  monthlyIncome: number,
  strategy: BudgetStrategy = 'rule503020'
): Record<string, number> => {
  if (!monthlyIncome || monthlyIncome <= 0) {
    return {
      housing: 0,
      food: 0,
      transport: 0,
      health: 0,
      leisure: 0,
      education: 0,
      debts: 0,
      savings: 0,
    };
  }

  if (strategy === 'aggressive') {
    return {
      housing: Math.round(monthlyIncome * 0.26),
      food: Math.round(monthlyIncome * 0.14),
      transport: Math.round(monthlyIncome * 0.06),
      health: Math.round(monthlyIncome * 0.04),
      leisure: Math.round(monthlyIncome * 0.12),
      education: Math.round(monthlyIncome * 0.08),
      debts: 0,
      savings: Math.round(monthlyIncome * 0.30),
    };
  }

  if (strategy === 'comfort') {
    return {
      housing: Math.round(monthlyIncome * 0.30),
      food: Math.round(monthlyIncome * 0.20),
      transport: Math.round(monthlyIncome * 0.10),
      health: Math.round(monthlyIncome * 0.07),
      leisure: Math.round(monthlyIncome * 0.18),
      education: Math.round(monthlyIncome * 0.05),
      debts: 0,
      savings: Math.round(monthlyIncome * 0.10),
    };
  }

  // rule503020
  return {
    housing: Math.round(monthlyIncome * 0.25),
    food: Math.round(monthlyIncome * 0.18),
    transport: Math.round(monthlyIncome * 0.08),
    health: Math.round(monthlyIncome * 0.06),
    leisure: Math.round(monthlyIncome * 0.15),
    education: Math.round(monthlyIncome * 0.08),
    debts: 0,
    savings: Math.round(monthlyIncome * 0.20),
  };
};

interface BudgetManagerProps {
  categories: Category[];
  budgets: Record<string, number>;
  onUpdateBudget: (newBudgets: Record<string, number>) => void;
  monthlyIncome: number;
  transactions: Transaction[];
  currentMonth: string; // YYYY-MM
  strategy?: BudgetStrategy;
  onOpenSettings?: () => void;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({
  categories,
  budgets,
  onUpdateBudget,
  monthlyIncome,
  transactions,
  currentMonth,
  strategy = 'rule503020',
  onOpenSettings,
}) => {
  const activeStrategy: BudgetStrategy = strategy === 'aggressive' || strategy === 'comfort' ? strategy : 'rule503020';
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Filter current month transactions
  const monthTransactions = transactions.filter(
    (t) => t.date.startsWith(currentMonth) && t.type === 'expense'
  );

  // Total spent per category in this month
  const spentByCategory = categories.reduce((acc, cat) => {
    acc[cat.id] = monthTransactions
      .filter((t) => t.categoryId === cat.id)
      .reduce((sum, t) => sum + t.amount, 0);
    return acc;
  }, {} as Record<string, number>);

  const totalReserved: number = (Object.values(budgets) as number[]).reduce((sum, val) => sum + (val || 0), 0);
  const allocationPercentage = monthlyIncome > 0 ? (totalReserved / monthlyIncome) * 100 : 0;
  const unallocatedAmount = monthlyIncome - totalReserved;

  const handleApplyMethodology = () => {
    if (monthlyIncome <= 0) {
      setFeedbackMessage('Cadastre sua renda nas configurações para calcular limites recomendados.');
      setTimeout(() => setFeedbackMessage(null), 3500);
      return;
    }
    const calculated = calculateFullBudgetForStrategy(monthlyIncome, activeStrategy);
    onUpdateBudget(calculated);
    setFeedbackMessage('Limites recomendados da metodologia aplicados com sucesso!');
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleBudgetChange = (categoryId: string, value: string) => {
    const num = parseFloat(value) || 0;
    onUpdateBudget({
      ...budgets,
      [categoryId]: Math.max(0, num),
    });
  };

  const strategyLabel =
    activeStrategy === 'aggressive'
      ? 'Poupança Acelerada (50/20/30)'
      : activeStrategy === 'comfort'
      ? 'Equilíbrio Familiar (60/25/15)'
      : 'Regra 50/30/20 Clássica';

  return (
    <div id="budget-manager-section" className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner: Income & Presets */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <span className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Quanto Reservar para Cada Categoria
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Defina seu teto de gastos mensal por área. A metodologia divide sua renda líquida
              entre despesas essenciais, lazer e aportes de segurança financeira.
            </p>
          </div>

          {/* Renda Unificada de Referência */}
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0">
            <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Renda de Referência do Mês:
            </span>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-0.5">
              {monthlyIncome > 0 ? formatBRL(monthlyIncome) : 'R$ 0,00'}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {monthlyIncome > 0 ? 'Unificada (salário + entradas do mês)' : 'Nenhuma renda indicada'}
            </span>
          </div>
        </div>

        {/* Metodologia Ativa Selecionada no Menu */}
        <div className="pt-6">
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    Metodologia Ativa:
                  </span>
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                    {strategyLabel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  A metodologia é configurada no menu de Configurações do cabeçalho.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {feedbackMessage && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {feedbackMessage}
                </span>
              )}
              <button
                id="apply-strategy-to-all-btn"
                type="button"
                onClick={handleApplyMethodology}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Aplicar Metodologia
              </button>
            </div>
          </div>
        </div>

        {/* Global Allocation Status Meter */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Alocação Total Planejada:
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {formatBRL(totalReserved)}
              </span>
              {monthlyIncome > 0 && (
                <span className="text-xs text-slate-400">
                  ({allocationPercentage.toFixed(1)}% da renda de {formatBRL(monthlyIncome)})
                </span>
              )}
            </div>

            <div className="text-xs">
              {monthlyIncome <= 0 ? (
                <span className="text-slate-400">
                  Nenhuma renda indicada. Cadastre sua renda nas configurações para calcular alocações.
                </span>
              ) : unallocatedAmount > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Margem livre não alocada: {formatBRL(unallocatedAmount)}
                </span>
              ) : unallocatedAmount < 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5" /> Orçamento excedendo a renda em {formatBRL(Math.abs(unallocatedAmount))}
                </span>
              ) : (
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                  100% da renda alocada perfeitamente!
                </span>
              )}
            </div>
          </div>

          {/* Meter bar */}
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-300 ${
                allocationPercentage > 100
                  ? 'bg-rose-500'
                  : allocationPercentage === 100
                  ? 'bg-indigo-600'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, allocationPercentage)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((category) => {
          const reserved = budgets[category.id] || 0;
          const spent = spentByCategory[category.id] || 0;
          const remaining = reserved - spent;
          const percentUsed = reserved > 0 ? (spent / reserved) * 100 : spent > 0 ? 100 : 0;
          const pctOfIncome = monthlyIncome > 0 ? (reserved / monthlyIncome) * 100 : 0;

          // Sugestão da metodologia selecionada
          const recommended = getRecommendedBudgetForCategory(category.id, monthlyIncome, activeStrategy);

          // Status determination
          let statusBadge = {
            text: 'Dentro do Teto',
            style: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
            icon: CheckCircle2,
          };

          if (percentUsed >= 100) {
            statusBadge = {
              text: 'Teto Excedido',
              style: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
              icon: AlertOctagon,
            };
          } else if (percentUsed >= 80) {
            statusBadge = {
              text: 'Atenção (>80%)',
              style: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
              icon: AlertTriangle,
            };
          }

          const StatusIcon = statusBadge.icon;

          return (
            <div
              key={category.id}
              id={`budget-card-${category.id}`}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition"
            >
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${category.color}15`, color: category.color }}
                    >
                      <CategoryIcon iconName={category.iconName} color={category.color} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                          {category.name}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {category.nature === 'need'
                            ? 'Necessidade'
                            : category.nature === 'want'
                            ? 'Lazer/Desejo'
                            : 'Reserva'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {category.description}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-bold border flex items-center gap-1 shrink-0 ${statusBadge.style}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {statusBadge.text}
                  </span>
                </div>

                {/* Progress Bar (Gasto vs Reservado) */}
                <div className="my-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-600 dark:text-slate-400">
                      Gasto no Mês: <strong className="text-slate-800 dark:text-slate-100">{formatBRL(spent)}</strong>
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {percentUsed.toFixed(1)}% do teto
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        percentUsed >= 100
                          ? 'bg-rose-500'
                          : percentUsed >= 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, percentUsed)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-slate-500 dark:text-slate-400">
                      {remaining >= 0 ? (
                        <>
                          Margem disponível: <strong className="text-emerald-600 dark:text-emerald-400">{formatBRL(remaining)}</strong>
                        </>
                      ) : (
                        <>
                          Estouro do teto: <strong className="text-rose-600 dark:text-rose-400">{formatBRL(Math.abs(remaining))}</strong>
                        </>
                      )}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {pctOfIncome.toFixed(0)}% da renda
                    </span>
                  </div>
                </div>
              </div>

              {/* Campo Refeito de Quanto Reservar */}
              <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label
                    htmlFor={`budget-input-${category.id}`}
                    className="font-bold text-slate-700 dark:text-slate-300"
                  >
                    Quanto Reservar (Teto):
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sugerido ({recommended.percent}%):{' '}
                    <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                      {formatBRL(recommended.amount)}
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-xs font-semibold text-slate-400">
                      R$
                    </span>
                    <input
                      id={`budget-input-${category.id}`}
                      type="number"
                      step="25"
                      min="0"
                      value={reserved || ''}
                      onChange={(e) => handleBudgetChange(category.id, e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                      placeholder="0,00"
                    />
                  </div>

                  {recommended.amount > 0 && reserved !== recommended.amount && (
                    <button
                      type="button"
                      onClick={() => onUpdateBudget({ ...budgets, [category.id]: recommended.amount })}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold rounded-xl transition shrink-0 cursor-pointer"
                      title="Aplicar valor recomendado pela metodologia"
                    >
                      Aplicar Sugerido
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
