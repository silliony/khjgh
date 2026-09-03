import React, { useState } from 'react';
import {
  HelpCircle,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Clock,
  Briefcase,
  Layers,
  ArrowRight,
  TrendingDown,
  Check,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sliders,
  DollarSign,
  Tag,
} from 'lucide-react';
import { Category, ExpenseNature, PurchaseEvaluationRequest, PurchaseEvaluationResult } from '../types';
import { evaluatePurchaseLocally } from '../utils/purchaseEvaluator';
import { formatBRL } from '../data/initialData';

interface PurchaseEvaluatorProps {
  categories: Category[];
  monthlyIncome: number;
  remainingBalance: number;
  totalExpenses: number;
  budgets: Record<string, number>;
  categoryExpenses: Record<string, number>;
  currentMonth: string;
  onAddTransaction: (data: {
    description: string;
    amount: number;
    date: string;
    type: 'expense';
    categoryId: string;
    nature: ExpenseNature;
    paymentMethod?: 'credit' | 'pix' | 'debit';
    notes?: string;
  }) => void;
}

export function PurchaseEvaluator({
  categories,
  monthlyIncome,
  remainingBalance,
  totalExpenses,
  budgets,
  categoryExpenses,
  currentMonth,
  onAddTransaction,
}: PurchaseEvaluatorProps) {
  // Form state
  const [itemName, setItemName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [installments, setInstallments] = useState(1);
  const [categoryId, setCategoryId] = useState('leisure');
  const [necessityLevel, setNecessityLevel] = useState<PurchaseEvaluationRequest['necessityLevel']>('impulse');
  const [reason, setReason] = useState('');
  const [useAIAdvisor, setUseAIAdvisor] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [hasEvaluated, setHasEvaluated] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<PurchaseEvaluationResult | null>(null);
  const [isAddedSuccess, setIsAddedSuccess] = useState(false);

  const amount = parseFloat(amountStr.replace(',', '.')) || 0;

  // Preset quick examples
  const loadPreset = (preset: {
    name: string;
    amount: number;
    installments: number;
    cat: string;
    level: PurchaseEvaluationRequest['necessityLevel'];
    reason: string;
  }) => {
    setItemName(preset.name);
    setAmountStr(preset.amount.toString());
    setInstallments(preset.installments);
    setCategoryId(preset.cat);
    setNecessityLevel(preset.level);
    setReason(preset.reason);
    setHasEvaluated(false);
    setIsAddedSuccess(false);
  };

  const handleEvaluate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (amount <= 0 || !itemName.trim()) return;

    setIsAddedSuccess(false);

    const selectedCat = categories.find((c) => c.id === categoryId);
    const catNature = selectedCat?.nature || 'want';

    const req: PurchaseEvaluationRequest = {
      itemName,
      amount,
      categoryId,
      nature: catNature,
      installments,
      necessityLevel,
      reason,
    };

    const ctx = {
      monthlyIncome,
      totalExpenses,
      remainingBalance,
      categorySpent: categoryExpenses[categoryId] || 0,
      categoryBudget: budgets[categoryId] || 0,
      categories,
    };

    // Avaliação base instantânea
    const localResult = evaluatePurchaseLocally(req, ctx);

    if (useAIAdvisor) {
      setIsLoadingAI(true);
      try {
        const response = await fetch('/api/gemini/evaluate-purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemName,
            amount,
            installments,
            necessityLevel,
            reason,
            monthlyIncome,
            remainingBalance,
            categoryName: selectedCat?.name || 'Geral',
            categoryBudget: budgets[categoryId] || 0,
            currentCategorySpent: categoryExpenses[categoryId] || 0,
          }),
        });

        if (response.ok) {
          const aiData = await response.json();
          // Mescla resultado da IA com cálculos numéricos locais
          setEvaluationResult({
            ...localResult,
            decision: aiData.decision || localResult.decision,
            decisionScore: aiData.decisionScore ?? localResult.decisionScore,
            verdictTitle: aiData.verdictTitle || localResult.verdictTitle,
            verdictExplanation: aiData.verdictExplanation || localResult.verdictExplanation,
            suggestions: aiData.suggestions && aiData.suggestions.length > 0 ? aiData.suggestions : localResult.suggestions,
            coolingOffAdvice: aiData.coolingOffAdvice || localResult.coolingOffAdvice,
            alternatives: aiData.alternatives && aiData.alternatives.length > 0 ? aiData.alternatives : localResult.alternatives,
          });
          setHasEvaluated(true);
          return;
        }
      } catch (err) {
        console.error('Erro na avaliação com IA:', err);
      } finally {
        setIsLoadingAI(false);
      }
    }

    setEvaluationResult(localResult);
    setHasEvaluated(true);
  };

  const handleLaunchTransaction = () => {
    if (!evaluationResult || amount <= 0 || !itemName) return;

    const today = new Date();
    const todayStr = `${currentMonth}-${String(today.getDate()).padStart(2, '0')}`;
    const selectedCat = categories.find((c) => c.id === categoryId);

    onAddTransaction({
      description: itemName,
      amount: installments > 1 ? Number((amount / installments).toFixed(2)) : amount,
      date: todayStr,
      type: 'expense',
      categoryId,
      nature: selectedCat?.nature || 'want',
      paymentMethod: installments > 1 ? 'credit' : 'pix',
      notes: `Compra avaliada pelo simulador (${installments > 1 ? `${installments}x de R$ ${(amount / installments).toFixed(2)}` : 'À vista'}). Score: ${evaluationResult.decisionScore}/100.`,
    });

    setIsAddedSuccess(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Simulador & Avaliador de Compras
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Vale a pena fazer essa compra agora?
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Teste compras esporádicas ou por impulso antes de passar o cartão. O sistema calcula o impacto
              exato no seu saldo livre, teto de categoria, horas de trabalho necessárias e dá um veredito financeiro com sugestões de encaixe.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                loadPreset({
                  name: 'Smartphone Novo',
                  amount: 2400,
                  installments: 6,
                  cat: 'leisure',
                  level: 'useful',
                  reason: 'Aparelho atual está com a bateria desgastada',
                })
              }
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition cursor-pointer"
            >
              📱 Celular (6x)
            </button>
            <button
              type="button"
              onClick={() =>
                loadPreset({
                  name: 'Tênis Esportivo em Promoção',
                  amount: 389,
                  installments: 1,
                  cat: 'leisure',
                  level: 'impulse',
                  reason: 'Vi com 40% de desconto na internet hoje',
                })
              }
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition cursor-pointer"
            >
              👟 Tênis (Impulso)
            </button>
            <button
              type="button"
              onClick={() =>
                loadPreset({
                  name: 'Curso de Especialização Profissional',
                  amount: 850,
                  installments: 3,
                  cat: 'education',
                  level: 'investment',
                  reason: 'Certificação exigida para promoção no trabalho',
                })
              }
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition cursor-pointer"
            >
              🎓 Curso (Investimento)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Parâmetros da Compra */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm h-fit space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-500" />
              Dados da Compra Pretendida
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Informe os detalhes do produto ou serviço para calcularmos a viabilidade
            </p>
          </div>

          <form onSubmit={handleEvaluate} className="space-y-4">
            {/* Nome do Item */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Item / Produto / Experiência
              </label>
              <input
                id="eval-item-name"
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Ex: PlayStation 5, Jaqueta de Couro, Fone..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                required
              />
            </div>

            {/* Valor e Parcelas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Valor Total (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    id="eval-amount"
                    type="text"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Parcelamento
                </label>
                <select
                  id="eval-installments"
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                >
                  <option value={1}>À vista (1x)</option>
                  <option value={2}>2x de R$ {(amount / 2 || 0).toFixed(2)}</option>
                  <option value={3}>3x de R$ {(amount / 3 || 0).toFixed(2)}</option>
                  <option value={4}>4x de R$ {(amount / 4 || 0).toFixed(2)}</option>
                  <option value={5}>5x de R$ {(amount / 5 || 0).toFixed(2)}</option>
                  <option value={6}>6x de R$ {(amount / 6 || 0).toFixed(2)}</option>
                  <option value={10}>10x de R$ {(amount / 10 || 0).toFixed(2)}</option>
                  <option value={12}>12x de R$ {(amount / 12 || 0).toFixed(2)}</option>
                </select>
              </div>
            </div>

            {/* Categoria Alvo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Categoria de Encaixe
              </label>
              <select
                id="eval-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.nature === 'need' ? 'Necessidade 50%' : cat.nature === 'want' ? 'Desejo 30%' : 'Reserva 20%'})
                  </option>
                ))}
              </select>
            </div>

            {/* Nível de Necessidade */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Classificação da Necessidade
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNecessityLevel('essential')}
                  className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                    necessityLevel === 'essential'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="block text-xs font-bold">🚨 Essencial</span>
                  <span className="text-[10px] opacity-80">Reposição ou saúde</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNecessityLevel('useful')}
                  className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                    necessityLevel === 'useful'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="block text-xs font-bold">💡 Útil / Conforto</span>
                  <span className="text-[10px] opacity-80">Melhora qualidade de vida</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNecessityLevel('impulse')}
                  className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                    necessityLevel === 'impulse'
                      ? 'border-rose-500 bg-rose-500/10 text-rose-800 dark:text-rose-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="block text-xs font-bold">🛍️ Impulso / Desejo</span>
                  <span className="text-[10px] opacity-80">Vontade de momento</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNecessityLevel('investment')}
                  className={`p-2.5 rounded-xl text-left border transition cursor-pointer ${
                    necessityLevel === 'investment'
                      ? 'border-teal-500 bg-teal-500/10 text-teal-800 dark:text-teal-300 font-bold'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="block text-xs font-bold">📈 Investimento</span>
                  <span className="text-[10px] opacity-80">Gera renda ou carreira</span>
                </button>
              </div>
            </div>

            {/* Motivo / Contexto */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Por que você quer comprar isso agora? (Opcional)
              </label>
              <textarea
                id="eval-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Vi uma promoção, meu computador pifou, recompensa por fechar projeto..."
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition resize-none"
              />
            </div>

            {/* AI Advisor Toggle */}
            <div className="flex items-center justify-between p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    Consultor IA Gemini
                  </p>
                  <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                    Gera parecer comportamental detalhado e alternativas
                  </p>
                </div>
              </div>
              <input
                id="eval-ai-toggle"
                type="checkbox"
                checked={useAIAdvisor}
                onChange={(e) => setUseAIAdvisor(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Submit Button */}
            <button
              id="submit-evaluation-btn"
              type="submit"
              disabled={amount <= 0 || !itemName.trim() || isLoadingAI}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-2xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoadingAI ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analisando Viabilidade Financeira...
                </>
              ) : (
                <>
                  <Sliders className="w-4 h-4" />
                  Avaliar Viabilidade & Encaixe
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Panel: Veredito e Diagnóstico Visual */}
        <div className="lg:col-span-7 space-y-6">
          {!hasEvaluated || !evaluationResult ? (
            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Aguardando Dados da Compra
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1.5 leading-relaxed">
                Preencha o formulário ao lado com o item, valor e forma de pagamento, ou clique em um dos exemplos rápidos acima para ver o diagnóstico de viabilidade.
              </p>
              <div className="mt-6 flex items-center gap-4 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Veredito Seguro
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-500" /> Horas de Trabalho
                </span>
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-500" /> Compensação Orçamentária
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Verdict Card */}
              <div
                className={`p-6 sm:p-8 rounded-3xl border shadow-sm transition-all ${
                  evaluationResult.decision === 'recommended'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                    : evaluationResult.decision === 'warning'
                    ? 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                    : 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        evaluationResult.decision === 'recommended'
                          ? 'bg-emerald-500 text-white'
                          : evaluationResult.decision === 'warning'
                          ? 'bg-amber-500 text-white'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {evaluationResult.decision === 'recommended' ? (
                        <ShieldCheck className="w-6 h-6" />
                      ) : evaluationResult.decision === 'warning' ? (
                        <AlertTriangle className="w-6 h-6" />
                      ) : (
                        <XCircle className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <span
                        className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          evaluationResult.decision === 'recommended'
                            ? 'bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                            : evaluationResult.decision === 'warning'
                            ? 'bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                            : 'bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200'
                        }`}
                      >
                        {evaluationResult.decision === 'recommended'
                          ? 'Veredito: Compra Aprovada'
                          : evaluationResult.decision === 'warning'
                          ? 'Veredito: Viável com Ressalvas'
                          : 'Veredito: Não Recomendada'}
                      </span>
                      <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 mt-1">
                        {evaluationResult.verdictTitle}
                      </h4>
                    </div>
                  </div>

                  {/* Score Indicator */}
                  <div className="bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-right shrink-0">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Score de Viabilidade
                    </span>
                    <span
                      className={`text-2xl font-black ${
                        evaluationResult.decisionScore >= 70
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : evaluationResult.decisionScore >= 45
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {evaluationResult.decisionScore}/100
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {evaluationResult.verdictExplanation}
                </p>
              </div>

              {/* Métricas de Impacto no Mês */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Saldo Atual</span>
                  <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100">
                    {formatBRL(evaluationResult.budgetImpact.currentFreeBalance)}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Saldo Pós-Compra</span>
                  <span
                    className={`text-sm sm:text-base font-bold ${
                      evaluationResult.budgetImpact.newFreeBalance >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatBRL(evaluationResult.budgetImpact.newFreeBalance)}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Impacto Mensal</span>
                  <span className="text-sm sm:text-base font-bold text-indigo-600 dark:text-indigo-400">
                    {formatBRL(evaluationResult.budgetImpact.monthlyInstallmentAmount)}
                    {installments > 1 ? ` (${installments}x)` : ''}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Reserva Categoria</span>
                  <span
                    className={`text-sm sm:text-base font-bold ${
                      evaluationResult.budgetImpact.isExceedingBudget ? 'text-amber-500' : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {formatBRL(evaluationResult.budgetImpact.newCategorySpent)} /{' '}
                    {evaluationResult.budgetImpact.categoryBudget > 0
                      ? formatBRL(evaluationResult.budgetImpact.categoryBudget)
                      : 'Ilimitada'}
                  </span>
                </div>
              </div>

              {/* Sugestões de Encaixe no Orçamento */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Sugestões de Encaixe & Compensação Orçamentária
                </h5>
                <div className="space-y-2.5">
                  {evaluationResult.suggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-600 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{sug}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alternativas e Regra das 72 Horas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
                  <h6 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Regra Comportamental
                  </h6>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {evaluationResult.coolingOffAdvice}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
                  <h6 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
                    Caminhos Alternativos
                  </h6>
                  <ul className="space-y-1.5">
                    {evaluationResult.alternatives.map((alt, i) => (
                      <li key={i} className="text-xs text-slate-600 dark:text-slate-400">
                        <strong className="text-slate-800 dark:text-slate-200 font-semibold">{alt.title}:</strong>{' '}
                        {alt.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Ação: Lançar no Extrato */}
              <div className="p-5 bg-slate-100 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Decidiu realizar a compra?
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Clique para registrar este lançamento automaticamente no extrato de {currentMonth}.
                  </p>
                </div>

                {isAddedSuccess ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-xs">
                    <Check className="w-4 h-4" />
                    Lançamento Adicionado ao Extrato!
                  </div>
                ) : (
                  <button
                    id="launch-evaluated-purchase-btn"
                    type="button"
                    onClick={handleLaunchTransaction}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-xs transition cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Registrar no Extrato ({formatBRL(installments > 1 ? amount / installments : amount)})
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
