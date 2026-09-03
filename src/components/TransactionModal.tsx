import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, CheckCircle2, AlertCircle, Repeat, Zap } from 'lucide-react';
import { Category, ExpenseNature, Transaction, TransactionType } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { APPLE_SUBSCRIPTION_PRESETS, POPULAR_SUBSCRIPTION_PRESETS, classifyInvoiceMerchant } from '../utils/invoiceParser';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>, id?: string) => void;
  categories: Category[];
  initialData?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  initialData,
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>('expense');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'housing');
  const [subcategory, setSubcategory] = useState('');
  const [nature, setNature] = useState<ExpenseNature>('need');
  const [isSubscription, setIsSubscription] = useState(false);
  const [subscriptionName, setSubscriptionName] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<Transaction['paymentMethod']>('pix');
  const [aiTip, setAiTip] = useState<string | undefined>(undefined);
  const [isClassifying, setIsClassifying] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description);
      setAmount(initialData.amount.toString());
      setDate(initialData.date);
      setType(initialData.type);
      setCategoryId(initialData.categoryId);
      setSubcategory(initialData.subcategory || '');
      setNature(initialData.nature);
      setIsSubscription(Boolean(initialData.isSubscription));
      setSubscriptionName(initialData.subscriptionName || '');
      setNotes(initialData.notes || '');
      setPaymentMethod(initialData.paymentMethod || 'pix');
      setAiTip(initialData.aiTip);
      setAiNotice(null);
    } else {
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setType('expense');
      setCategoryId(categories[0]?.id || 'housing');
      setSubcategory('');
      setNature('need');
      setIsSubscription(false);
      setSubscriptionName('');
      setNotes('');
      setPaymentMethod('pix');
      setAiTip(undefined);
      setAiNotice(null);
    }
  }, [initialData, isOpen, categories]);

  if (!isOpen) return null;

  const handleAiCategorize = async (silent = false) => {
    if (!description.trim()) {
      if (!silent) {
        setAiNotice('Digite a descrição da despesa primeiro (ex: "Supermercado R$ 150").');
      }
      return;
    }

    setIsClassifying(true);
    if (!silent) setAiNotice(null);

    try {
      // 1. Tenta primeiramente categorizar via IA (Gemini Flash) no backend
      const res = await fetch('/api/gemini/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount: parseFloat(amount) || 0,
        }),
      });

      if (!res.ok) throw new Error('Falha na resposta do servidor.');
      const data = await res.json();

      if (data.categoryId) {
        const matched = categories.find((c) => c.id === data.categoryId);
        if (matched) {
          setCategoryId(matched.id);
        }
      }
      if (data.nature) {
        setNature(data.nature as ExpenseNature);
      }
      if (data.subcategory) {
        setSubcategory(data.subcategory);
      }
      if (data.tip) {
        setAiTip(data.tip);
      }
      if (data.isSubscription) {
        setIsSubscription(true);
        if (data.subscriptionName) {
          setSubscriptionName(data.subscriptionName);
        }
      }

      if (data.classifiedBy === 'ai') {
        setAiNotice('✨ Classificado via IA (Gemini Flash)');
      } else {
        setAiNotice('⚡ Classificado via regras locais (Fallback)');
      }
    } catch (err) {
      console.warn('Erro ao chamar categorizador via rede, acionando fallback local:', err);
      // Fallback local se a rede estiver totalmente inacessível
      const localResult = classifyInvoiceMerchant(
        description,
        parseFloat(amount) || 0,
        categories
      );
      if (localResult.categoryId) {
        setCategoryId(localResult.categoryId);
        setNature(localResult.nature);
        if (localResult.subcategory) setSubcategory(localResult.subcategory);
        if (localResult.isSubscription) {
          setIsSubscription(true);
          if (localResult.subscriptionName) setSubscriptionName(localResult.subscriptionName);
        }
      }
      setAiNotice('⚡ Classificado offline via regras locais (Fallback)');
    } finally {
      setIsClassifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Por favor, preencha uma descrição válida e um valor maior que zero.');
      return;
    }

    onSave(
      {
        description: description.trim(),
        amount: parsedAmount,
        date,
        type,
        categoryId,
        subcategory: subcategory.trim() || undefined,
        nature,
        isSubscription,
        subscriptionName: isSubscription ? subscriptionName.trim() || subcategory.trim() || description.trim() : undefined,
        notes: notes.trim() || undefined,
        aiTip,
        paymentMethod,
      },
      initialData?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="transaction-modal-card"
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8"
      >
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registre receitas ou gastos com categorização precisa
            </p>
          </div>
          <button
            id="close-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {/* Tipo de Transação */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              id="type-expense-btn"
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                type === 'expense'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Despesa (Gasto)
            </button>
            <button
              id="type-income-btn"
              type="button"
              onClick={() => setType('income')}
              className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                type === 'income'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Receita (Entrada)
            </button>
          </div>

          {/* Descrição & IA Auto-Classify */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="tx-description" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Descrição do Gasto / Estabelecimento
              </label>
              {type === 'expense' && (
                <button
                  id="ai-categorize-btn"
                  type="button"
                  onClick={handleAiCategorize}
                  disabled={isClassifying || !description.trim()}
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-semibold disabled:opacity-50 transition cursor-pointer"
                >
                  {isClassifying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Classificar com IA
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              id="tx-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
                if (type === 'expense' && description.trim().length >= 3 && !initialData && !aiNotice) {
                  handleAiCategorize(true);
                }
              }}
              placeholder="Ex: Supermercado Assaí, Almoço Restaurante, Gasolina..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
              required
            />
            {aiNotice && (
              <p
                className={`mt-1 text-xs flex items-center gap-1.5 ${
                  aiNotice.includes('IA')
                    ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {aiNotice.includes('IA') ? (
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span>{aiNotice}</span>
              </p>
            )}
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-amount" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Valor (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-400">
                  R$
                </span>
                <input
                  id="tx-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="tx-date" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Data do Registro
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
                required
              />
            </div>
          </div>

          {/* Categoria e Natureza (Regra 50/30/20) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Categoria de Gasto
              </label>
              <select
                id="tx-category"
                value={categoryId}
                onChange={(e) => {
                  const cat = categories.find((c) => c.id === e.target.value);
                  setCategoryId(e.target.value);
                  if (cat) setNature(cat.nature);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tx-nature" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Classificação 50/30/20
              </label>
              <select
                id="tx-nature"
                value={nature}
                onChange={(e) => setNature(e.target.value as ExpenseNature)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
              >
                <option value="need">Necessidade Essencial (50%)</option>
                <option value="want">Desejo / Estilo de Vida (30%)</option>
                <option value="savings">Poupança / Investimento (20%)</option>
              </select>
            </div>
          </div>

          {/* Subcategoria e Forma de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="tx-subcategory" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Subcategoria (Opcional)
              </label>
              <input
                id="tx-subcategory"
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="Ex: Supermercado, Delivery, Farmácia..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>

            <div>
              <label htmlFor="tx-payment-method" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Método de Pagamento
              </label>
              <select
                id="tx-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
              >
                <option value="pix">Pix</option>
                <option value="credit">Cartão de Crédito</option>
                <option value="debit">Cartão de Débito</option>
                <option value="cash">Dinheiro em Espécie</option>
                <option value="transfer">Transferência Bancária</option>
              </select>
            </div>
          </div>

          {/* Seção de Assinatura Recorrente (Google One, iCloud, Spotify, etc.) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label htmlFor="tx-is-subscription" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer">
                <input
                  id="tx-is-subscription"
                  type="checkbox"
                  checked={isSubscription}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsSubscription(checked);
                    if (checked && !subscriptionName) {
                      setSubscriptionName(subcategory || description || '');
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="flex items-center gap-1.5">
                  <Repeat className="w-3.5 h-3.5 text-indigo-500" />
                  Esta despesa é uma Assinatura Recorrente
                </span>
              </label>
              {isSubscription && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold">
                  Recorrente
                </span>
              )}
            </div>

            {isSubscription && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                <div>
                  <label htmlFor="tx-sub-name" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Nome do Serviço
                  </label>
                  <input
                    id="tx-sub-name"
                    type="text"
                    value={subscriptionName}
                    onChange={(e) => setSubscriptionName(e.target.value)}
                    placeholder="Ex: Google One, iCloud 200GB, Spotify..."
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="tx-sub-preset" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Presets Populares
                  </label>
                  <select
                    id="tx-sub-preset"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setSubscriptionName(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <option value="">Selecionar serviço predefinido...</option>
                    <optgroup label="Serviços Apple">
                      {APPLE_SUBSCRIPTION_PRESETS.filter((p) => p.id !== 'not_subscription').map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Google, Mídia & IA">
                      {POPULAR_SUBSCRIPTION_PRESETS.map((p) => (
                        <option key={p.id} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Dica da IA (se disponível) */}
          {aiTip && (
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                <span className="font-bold block text-indigo-900 dark:text-indigo-100">
                  Dica de Comportamento Financeiro:
                </span>
                {aiTip}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              id="cancel-tx-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="save-tx-btn"
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition cursor-pointer"
            >
              {initialData ? 'Atualizar Lançamento' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
