import React, { useState, useEffect } from 'react';
import {
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  BrainCircuit,
  Loader2,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { Category, Transaction, BehavioralDiagnostic } from '../types';
import { formatBRL, formatPct } from '../data/initialData';

interface VisualReportsProps {
  categories: Category[];
  transactions: Transaction[];
  budgets: Record<string, number>;
  monthlyIncome: number;
  currentMonth: string; // YYYY-MM
}

export const VisualReports: React.FC<VisualReportsProps> = ({
  categories,
  transactions,
  budgets,
  monthlyIncome,
  currentMonth,
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<BehavioralDiagnostic | null>(null);
  const [isLoadingDiagnostic, setIsLoadingDiagnostic] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);

  // Filter transactions for selected month
  const monthExpenses = transactions.filter(
    (t) => t.date.startsWith(currentMonth) && t.type === 'expense'
  );

  const totalSpent = monthExpenses.reduce((sum, t) => sum + t.amount, 0);

  // Category breakdown
  const categoryBreakdown = categories
    .map((cat) => {
      const spent = monthExpenses
        .filter((t) => t.categoryId === cat.id)
        .reduce((sum, t) => sum + t.amount, 0);
      const budget = budgets[cat.id] || 0;
      const percentage = totalSpent > 0 ? (spent / totalSpent) * 100 : 0;
      return {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        nature: cat.nature,
        spent,
        budget,
        percentage,
      };
    })
    .filter((c) => c.spent > 0 || c.budget > 0);

  // 50 / 30 / 20 Breakdown
  const spentNeeds = monthExpenses
    .filter((t) => t.nature === 'need')
    .reduce((sum, t) => sum + t.amount, 0);

  const spentWants = monthExpenses
    .filter((t) => t.nature === 'want')
    .reduce((sum, t) => sum + t.amount, 0);

  const spentSavings = monthExpenses
    .filter((t) => t.nature === 'savings')
    .reduce((sum, t) => sum + t.amount, 0);

  const incomeBase = monthlyIncome > 0 ? monthlyIncome : totalSpent || 1;
  const pctNeeds = (spentNeeds / incomeBase) * 100;
  const pctWants = (spentWants / incomeBase) * 100;
  const pctSavings = (spentSavings / incomeBase) * 100;

  // Daily Spending distribution
  const daysInMonth = 30;
  const dailySpending: { day: number; amount: number }[] = Array.from(
    { length: daysInMonth },
    (_, i) => {
      const dayStr = String(i + 1).padStart(2, '0');
      const dayTransactions = monthExpenses.filter((t) =>
        t.date.endsWith(`-${dayStr}`)
      );
      const amount = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
      return { day: i + 1, amount };
    }
  );

  const maxDailySpent = Math.max(...dailySpending.map((d) => d.amount), 100);

  // Fetch AI Advisor on demand or automatically
  const fetchDiagnostic = async () => {
    setIsLoadingDiagnostic(true);
    setDiagnosticError(null);

    try {
      const res = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyIncome,
          totalSpent,
          categoryBreakdown: categoryBreakdown.map((c) => ({
            name: c.name,
            spent: c.spent,
            budget: c.budget,
          })),
          budgetLimits: budgets,
        }),
      });

      if (!res.ok) throw new Error('Falha ao gerar relatório comportamental.');
      const data: BehavioralDiagnostic = await res.json();
      setDiagnostic(data);
    } catch (err) {
      console.warn('Erro diagnostic:', err);
      // Fallback local diagnostic
      const savingsRate = monthlyIncome > 0 ? Math.max(0, ((monthlyIncome - totalSpent) / monthlyIncome) * 100) : 0;
      setDiagnostic({
        overallStatus: totalSpent > monthlyIncome ? 'Atenção ao Orçamento' : 'Equilibrado e Consciente',
        behavioralScore: Math.min(100, Math.max(30, Math.round(50 + savingsRate))),
        summary: `Neste mês você gastou ${formatBRL(totalSpent)} de uma renda de ${formatBRL(monthlyIncome)}. Sua taxa de poupança atual é de ${savingsRate.toFixed(1)}%.`,
        recommendations: [
          'Monitore as categorias com maior volatilidade, como delivery e compras por impulso.',
          'Automatize seus investimentos no dia do pagamento para evitar gastar o excedente.',
          'Revise o teto de gastos de Moradia e Alimentação para mantê-los em até 50% da renda.',
        ],
        categoryAlerts: categoryBreakdown
          .filter((c) => c.spent > c.budget && c.budget > 0)
          .map((c) => `A categoria ${c.name} excedeu a reserva estipulada em ${formatBRL(c.spent - c.budget)}.`),
        savingsPotential: Math.round(monthlyIncome * 0.12),
      });
    } finally {
      setIsLoadingDiagnostic(false);
    }
  };

  useEffect(() => {
    fetchDiagnostic();
  }, [currentMonth, totalSpent, monthlyIncome]);

  // Donut SVG generator
  let cumulativeAngle = 0;
  const radius = 80;
  const strokeWidth = 32;
  const center = 100;
  const circumference = 2 * Math.PI * radius;

  return (
    <div id="visual-reports-section" className="space-y-6 animate-in fade-in duration-200">
      {/* 1. AI Behavioral Diagnostic Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-5">
            {/* Score Ring */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-indigo-600 dark:stroke-indigo-400 transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray={251.2}
                  strokeDashoffset={
                    251.2 - (251.2 * (diagnostic?.behavioralScore || 70)) / 100
                  }
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-800 dark:text-slate-50">
                  {diagnostic?.behavioralScore ?? 75}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">/ 100</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                  <BrainCircuit className="w-3.5 h-3.5" /> Diagnóstico Comportamental IA
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  {diagnostic?.overallStatus || 'Análise Financeira'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-50">
                Parecer do Comportamento Financeiro Mensal
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {diagnostic?.summary ||
                  'Carregando análise comportamental personalizada dos seus padrões de consumo e reservas...'}
              </p>
            </div>
          </div>

          <button
            id="refresh-diagnostic-btn"
            type="button"
            onClick={fetchDiagnostic}
            disabled={isLoadingDiagnostic}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {isLoadingDiagnostic ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Recalcular com IA
              </>
            )}
          </button>
        </div>

        {/* Actionable recommendations & Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
          {/* Recomendações */}
          <div className="bg-slate-50 dark:bg-slate-950/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Recomendações Práticas de Otimização
            </span>
            <ul className="space-y-2.5">
              {diagnostic?.recommendations?.map((rec, i) => (
                <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Alertas & Potencial de Economia */}
          <div className="bg-slate-50 dark:bg-slate-950/50 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Pontos de Atenção & Desvios
              </span>
              {diagnostic?.categoryAlerts && diagnostic.categoryAlerts.length > 0 ? (
                <ul className="space-y-2 mb-3">
                  {diagnostic.categoryAlerts.map((alert, i) => (
                    <li key={i} className="text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <span>{alert}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-3">
                  <ShieldCheck className="w-4 h-4" /> Todas as categorias estão respeitando o teto de reserva planejado!
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Potencial de economia ajustando excessos:
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                +{formatBRL(diagnostic?.savingsPotential || 0)} / mês
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Charts Grid: Donut & 50/30/20 Rule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Donut */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-indigo-500" />
                  Distribuição de Gastos por Categoria
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Participação percentual de cada área no total gasto ({formatBRL(totalSpent)})
                </p>
              </div>
            </div>

            {totalSpent === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                Nenhuma despesa registrada neste mês para gerar o gráfico.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
                {/* SVG Donut */}
                <div className="relative w-48 h-48 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                    {categoryBreakdown.map((cat) => {
                      const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
                      const strokeDashoffset = -cumulativeAngle;
                      cumulativeAngle += (cat.percentage / 100) * circumference;

                      const isHovered = hoveredCategory === cat.id;

                      return (
                        <circle
                          key={cat.id}
                          cx={center}
                          cy={center}
                          r={radius}
                          stroke={cat.color}
                          strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          fill="none"
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setHoveredCategory(cat.id)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs text-slate-400 font-medium">Total Gasto</span>
                    <span className="text-base font-bold text-slate-800 dark:text-slate-50">
                      {formatBRL(totalSpent)}
                    </span>
                  </div>
                </div>

                {/* Interactive Legend */}
                <div className="flex-1 w-full space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {categoryBreakdown.map((cat) => (
                    <div
                      key={cat.id}
                      onMouseEnter={() => setHoveredCategory(cat.id)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition ${
                        hoveredCategory === cat.id
                          ? 'bg-slate-100 dark:bg-slate-800'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                          {cat.name}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-slate-800 dark:text-slate-100 block">
                          {formatBRL(cat.spent)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {cat.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 50 / 30 / 20 Framework Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-500" />
                  Comportamento na Regra 50 / 30 / 20
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Comparação da sua distribuição real com o padrão ótimo de saúde financeira
                </p>
              </div>
            </div>

            <div className="space-y-4 py-2">
              {/* Necessidades (Meta 50%) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Necessidades Essenciais
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      Meta: máx 50%
                    </span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {pctNeeds.toFixed(1)}% ({formatBRL(spentNeeds)})
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pctNeeds > 55 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, pctNeeds)}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Moradia, supermercado, contas essenciais, saúde e transporte fixo.
                </span>
              </div>

              {/* Desejos / Estilo de Vida (Meta 30%) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Estilo de Vida & Desejos
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      Meta: máx 30%
                    </span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {pctWants.toFixed(1)}% ({formatBRL(spentWants)})
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pctWants > 35 ? 'bg-rose-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min(100, pctWants)}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Lazer, delivery, restaurantes, assinaturas e compras pessoais.
                </span>
              </div>

              {/* Poupança / Investimentos (Meta 20%) */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Reserva & Investimentos
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      Meta: mín 20%
                    </span>
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {pctSavings.toFixed(1)}% ({formatBRL(spentSavings)})
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pctSavings >= 20 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, pctSavings)}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Reserva de emergência, aportes em renda fixa e investimentos para o futuro.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Daily Spending Velocity Bar Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              Velocidade de Gastos Diários no Mês
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Identifique picos de consumo ao longo dos 30 dias para regular o ritmo financeiro
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Média diária de gastos:{' '}
            <strong className="text-slate-800 dark:text-slate-100">
              {formatBRL(totalSpent / 30)}
            </strong>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="h-44 w-full flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 border-b border-slate-200 dark:border-slate-800">
          {dailySpending.map((d) => {
            const heightPercent = Math.max(6, (d.amount / maxDailySpent) * 100);
            const isHigh = d.amount > (totalSpent / 30) * 1.8;

            return (
              <div
                key={d.day}
                className="flex-1 h-full flex flex-col justify-end items-center group relative"
              >
                {/* Tooltip */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-slate-900 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap z-20">
                  Dia {d.day}: {formatBRL(d.amount)}
                </div>

                <div
                  className={`w-full rounded-t-lg transition-all duration-300 ${
                    isHigh
                      ? 'bg-rose-500 group-hover:bg-rose-600'
                      : d.amount > 0
                      ? 'bg-indigo-500 group-hover:bg-indigo-600'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Day scale */}
        <div className="flex justify-between text-[10px] text-slate-400 pt-2 px-1 font-mono">
          <span>Dia 1</span>
          <span>Dia 5</span>
          <span>Dia 10</span>
          <span>Dia 15</span>
          <span>Dia 20</span>
          <span>Dia 25</span>
          <span>Dia 30</span>
        </div>
      </div>
    </div>
  );
};
