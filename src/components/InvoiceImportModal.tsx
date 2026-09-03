import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  CreditCard,
  Upload,
  FileText,
  CheckSquare,
  Square,
  X,
  Sparkles,
  Check,
  FolderOpen,
  Search,
  Layers,
  ArrowRightLeft,
  AlertCircle,
  Repeat,
  HelpCircle,
  Smartphone,
  ChevronDown,
  Loader2,
  Zap,
  Calendar,
  RotateCcw,
} from 'lucide-react';
import { Category, ExpenseNature, InvoiceParsedItem, Transaction } from '../types';
import {
  parseInvoiceContent,
  APPLE_SUBSCRIPTION_PRESETS,
  POPULAR_SUBSCRIPTION_PRESETS,
} from '../utils/invoiceParser';
import { formatBRL } from '../data/initialData';

interface InvoiceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  currentMonth: string;
  onImport: (newTransactions: Omit<Transaction, 'id'>[]) => void;
}

const SAMPLE_INVOICE_TEXT = `02/09/2026 TRANSFACIL BHBUS R$ 45,00
03/09/2026 DROGARIA ARAUJO LJ 120 R$ 68,40
04/09/2026 PAGUEMENOS00530 R$ 52,90
05/09/2026 APPLE.COM/BILL R$ 14,90
06/09/2026 GOOGLE *GOOGLE ONE R$ 7,99
07/09/2026 SPOTIFY PREMIUM R$ 21,90
08/09/2026 APPLE.COM/BILL R$ 21,90
10/09/2026 SUPERMERCADOS BH R$ 340,50
12/09/2026 UBER *TRIP SÃO PAULO R$ 34,50
14/09/2026 POSTO IPIRANGA COMBUSTIVEL R$ 180,00
18/09/2026 CEMIG DISTRIBUICAO ENERGIA R$ 145,20
22/09/2026 NETFLIX.COM MENSALIDADE R$ 55,90`;

// Helper para formatar data ISO (YYYY-MM-DD) para padrão brasileiro DD/MM/AAAA
function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export function InvoiceImportModal({
  isOpen,
  onClose,
  categories,
  currentMonth,
  onImport,
}: InvoiceImportModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<InvoiceParsedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiClassifying, setIsAiClassifying] = useState(false);
  const [aiBatchStatus, setAiBatchStatus] = useState<'idle' | 'classifying' | 'ai_applied' | 'fallback_applied'>('idle');
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'subscriptions' | 'regular'>('all');
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<string[]>([]);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limpa o estado e retorna o modal ao formato padrão aguardando nova fatura
  const resetModalState = () => {
    setPastedText('');
    setFileName(null);
    setParsedItems([]);
    setIsProcessing(false);
    setIsAiClassifying(false);
    setAiBatchStatus('idle');
    setSearchFilter('');
    setSubscriptionFilter('all');
    setSelectedCategoryFilters([]);
    setFeedbackToast(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Garante que o estado seja resetado quando o modal for fechado
  useEffect(() => {
    if (!isOpen) {
      resetModalState();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3200);
  };

  // Prioriza categorização em lote via IA (Gemini Flash) com fallback transparente para regras locais
  const runAiBatchCategorization = async (itemsToCategorize: InvoiceParsedItem[]) => {
    if (itemsToCategorize.length === 0) return;
    setIsAiClassifying(true);
    setAiBatchStatus('classifying');

    try {
      const res = await fetch('/api/gemini/batch-categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsToCategorize.map((it) => ({
            id: it.id,
            description: it.description,
            amount: it.amount,
          })),
        }),
      });

      if (!res.ok) throw new Error('Falha no servidor ao categorizar em lote.');
      const data = await res.json();

      if (Array.isArray(data.items) && data.items.length > 0) {
        const aiMap = new Map(data.items.map((it: any) => [String(it.id), it]));

        setParsedItems((prev) =>
          prev.map((it) => {
            const aiItem = aiMap.get(String(it.id)) as any;
            if (!aiItem) return it;

            const matchedCat = categories.find((c) => c.id === aiItem.categoryId);
            return {
              ...it,
              categoryId: aiItem.categoryId || it.categoryId,
              categoryName: matchedCat?.name || aiItem.categoryName || it.categoryName,
              subcategory: aiItem.subcategory || it.subcategory,
              nature: (aiItem.nature as ExpenseNature) || it.nature,
              isSubscription: Boolean(aiItem.isSubscription ?? it.isSubscription),
              subscriptionName: aiItem.subscriptionName || it.subscriptionName,
              confidence: aiItem.confidence ?? it.confidence,
              classifiedBy: data.classifiedBy === 'ai' ? 'ai' : 'fallback',
            };
          })
        );

        if (data.classifiedBy === 'ai') {
          setAiBatchStatus('ai_applied');
          showToast(`✨ ${itemsToCategorize.length} despesas refinadas com IA (Gemini Flash)!`);
        } else {
          setAiBatchStatus('fallback_applied');
          showToast(`⚡ ${itemsToCategorize.length} despesas categorizadas via regras locais (Fallback).`);
        }
      } else {
        setAiBatchStatus('fallback_applied');
      }
    } catch (err) {
      console.warn('IA indisponível para lote, mantendo método atual de regras locais:', err);
      setAiBatchStatus('fallback_applied');
      showToast('⚡ Classificação mantida pelo método de regras e heurísticas (Fallback).');
    } finally {
      setIsAiClassifying(false);
    }
  };

  const handleProcessText = (text: string) => {
    if (!text.trim()) {
      setParsedItems([]);
      setAiBatchStatus('idle');
      return;
    }
    setIsProcessing(true);
    try {
      // 1. Passo inicial: parser e regras locais atuais (resultado instantâneo em tela)
      const items = parseInvoiceContent(text, currentMonth, categories);
      setParsedItems(items);

      // 2. Passo de prioridade: dispara categorização por IA (Gemini Flash) com fallback resiliente
      if (items.length > 0) {
        runAiBatchCategorization(items);
      }
    } catch (err) {
      console.error('Erro no processamento da fatura:', err);
      showToast('Erro ao processar o texto da fatura.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleProcessText(content);
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const handleToggleItem = (id: string) => {
    setParsedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it))
    );
  };

  const handleToggleAll = () => {
    const allSelected = parsedItems.every((it) => it.selected);
    setParsedItems((prev) => prev.map((it) => ({ ...it, selected: !allSelected })));
  };

  // Ajuste dinâmico de categoria individual com opção de propagação para similares
  const handleChangeCategory = (id: string, newCatId: string, applyToSimilar = false) => {
    const targetCat = categories.find((c) => c.id === newCatId);
    if (!targetCat) return;

    const sourceItem = parsedItems.find((it) => it.id === id);
    const merchantPrefix = sourceItem?.description.split(/[\s*–-]/)[0]?.toLowerCase().trim() || '';

    setParsedItems((prev) =>
      prev.map((it) => {
        const matchesSimilar =
          applyToSimilar &&
          merchantPrefix.length > 2 &&
          it.description.toLowerCase().includes(merchantPrefix);

        if (it.id === id || matchesSimilar) {
          return {
            ...it,
            categoryId: newCatId,
            categoryName: targetCat.name,
            subcategory: targetCat.name,
            nature: targetCat.nature,
            confidence: 1.0,
          };
        }
        return it;
      })
    );

    if (applyToSimilar && merchantPrefix) {
      showToast(`Categoria "${targetCat.name}" aplicada a todas despesas similares a "${merchantPrefix.toUpperCase()}"!`);
    }
  };

  // Ajuste dinâmico da Natureza 50/30/20 independente
  const handleChangeNature = (id: string, newNature: ExpenseNature) => {
    setParsedItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, nature: newNature } : it))
    );
  };

  // Alternar se o item é assinatura ou compra avulsa
  const handleToggleSubscription = (id: string, forceValue?: boolean) => {
    setParsedItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const newIsSub = forceValue !== undefined ? forceValue : !it.isSubscription;

        let newCatId = it.categoryId;
        let newCatName = it.categoryName;
        let newSubcategory = it.subcategory;
        let newSubName = it.subscriptionName;

        if (newIsSub) {
          const subCat = categories.find((c) => c.id === 'subscriptions' || /assinatura/i.test(c.name));
          if (subCat) {
            newCatId = subCat.id;
            newCatName = subCat.name;
          }
          if (!newSubName) {
            newSubName = it.description;
            newSubcategory = it.description;
          }
        } else {
          // Se desmarcou assinatura, ajusta para Lazer ou Categoria Padrão
          if (it.categoryId === 'subscriptions') {
            const leisureCat = categories.find((c) => c.id === 'leisure') || categories[0];
            newCatId = leisureCat.id;
            newCatName = leisureCat.name;
            newSubcategory = 'Compra Avulsa';
          }
          newSubName = undefined;
        }

        return {
          ...it,
          isSubscription: newIsSub,
          subscriptionName: newSubName,
          categoryId: newCatId,
          categoryName: newCatName,
          subcategory: newSubcategory,
        };
      })
    );
  };

  // Definir preset de serviço Apple (iCloud, Apple Music, Apple One, etc.)
  const handleSetAppleService = (id: string, presetId: string) => {
    if (!presetId) return;

    if (presetId === 'not_subscription') {
      handleToggleSubscription(id, false);
      showToast('Definido como compra avulsa (não é assinatura).');
      return;
    }

    const preset = APPLE_SUBSCRIPTION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    const subCat = categories.find((c) => c.id === 'subscriptions' || /assinatura/i.test(c.name));

    setParsedItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        return {
          ...it,
          isSubscription: true,
          subscriptionName: preset.name,
          subcategory: preset.name,
          categoryId: subCat?.id || it.categoryId,
          categoryName: subCat?.name || it.categoryName,
          nature: 'want',
          confidence: 1.0,
        };
      })
    );

    showToast(`Cobrança definida como "${preset.name}"!`);
  };

  // Definir serviço de assinatura predefinido geral (Google One, Spotify, etc.)
  const handleSetGeneralSubscription = (id: string, serviceName: string) => {
    if (!serviceName) return;
    const subCat = categories.find((c) => c.id === 'subscriptions' || /assinatura/i.test(c.name));

    setParsedItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        return {
          ...it,
          isSubscription: true,
          subscriptionName: serviceName,
          subcategory: serviceName,
          categoryId: subCat?.id || it.categoryId,
          categoryName: subCat?.name || it.categoryName,
          nature: 'want',
          confidence: 1.0,
        };
      })
    );

    showToast(`Assinatura definida como "${serviceName}"!`);
  };

  // Marcar / Desmarcar selecionados como assinatura em lote
  const handleBatchSetSubscription = (isSub: boolean) => {
    const count = parsedItems.filter((it) => it.selected).length;
    if (count === 0) return;

    const subCat = categories.find((c) => c.id === 'subscriptions' || /assinatura/i.test(c.name));
    const leisureCat = categories.find((c) => c.id === 'leisure') || categories[0];

    setParsedItems((prev) =>
      prev.map((it) => {
        if (!it.selected) return it;
        return {
          ...it,
          isSubscription: isSub,
          subscriptionName: isSub ? it.subscriptionName || it.subcategory || it.description : undefined,
          categoryId: isSub && subCat ? subCat.id : (!isSub && it.categoryId === 'subscriptions' ? leisureCat.id : it.categoryId),
          categoryName: isSub && subCat ? subCat.name : (!isSub && it.categoryId === 'subscriptions' ? leisureCat.name : it.categoryName),
        };
      })
    );

    showToast(
      isSub
        ? `${count} item(ns) marcados como Assinatura Recorrente!`
        : `${count} item(ns) desmarcados de Assinatura.`
    );
  };

  const selectedItems = parsedItems.filter((it) => it.selected);
  const totalSelectedAmount = selectedItems.reduce((acc, it) => acc + it.amount, 0);

  // Contadores de assinaturas e Apple
  const subscriptionCount = parsedItems.filter((it) => it.isSubscription).length;
  const regularCount = parsedItems.length - subscriptionCount;
  const appleItems = parsedItems.filter((it) => /apple(\.com)?|itunes/i.test(it.description));

  const handleToggleCategoryFilter = (catId: string) => {
    setSelectedCategoryFilters((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  // Itens filtrados para exibição na tabela
  const filteredItems = useMemo(() => {
    let list = parsedItems;
    if (subscriptionFilter === 'subscriptions') {
      list = list.filter((it) => it.isSubscription);
    } else if (subscriptionFilter === 'regular') {
      list = list.filter((it) => !it.isSubscription);
    }

    if (selectedCategoryFilters.length > 0) {
      list = list.filter((it) => selectedCategoryFilters.includes(it.categoryId));
    }

    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase();
    return list.filter(
      (it) =>
        it.description.toLowerCase().includes(q) ||
        it.categoryName.toLowerCase().includes(q) ||
        (it.subscriptionName && it.subscriptionName.toLowerCase().includes(q)) ||
        (it.subcategory && it.subcategory.toLowerCase().includes(q)) ||
        it.date.includes(q)
    );
  }, [parsedItems, searchFilter, subscriptionFilter, selectedCategoryFilters]);

  // Resumo dinâmico por categoria em tempo real
  const dynamicCategorySummary = useMemo(() => {
    const map: Record<string, { name: string; count: number; total: number; color?: string }> = {};

    parsedItems.forEach((it) => {
      if (!map[it.categoryId]) {
        const cat = categories.find((c) => c.id === it.categoryId);
        map[it.categoryId] = {
          name: it.categoryName || cat?.name || 'Outros',
          count: 0,
          total: 0,
          color: cat?.color || '#6366F1',
        };
      }
      map[it.categoryId].count += 1;
      map[it.categoryId].total += it.amount;
    });

    return Object.entries(map).map(([catId, val]) => ({
      catId,
      ...val,
    }));
  }, [parsedItems, categories]);

  const handleConfirmImport = () => {
    if (selectedItems.length === 0) return;

    const newTransactions: Omit<Transaction, 'id'>[] = selectedItems.map((item) => ({
      description: item.description,
      amount: item.amount,
      date: item.date,
      type: 'expense',
      categoryId: item.categoryId,
      subcategory: item.subcategory,
      nature: item.nature,
      isSubscription: item.isSubscription,
      subscriptionName: item.subscriptionName || (item.isSubscription ? item.subcategory || item.description : undefined),
      paymentMethod: 'credit',
      notes: item.isSubscription
        ? `Assinatura Recorrente: ${item.subscriptionName || item.subcategory || 'Digital'}`
        : item.subcategory
        ? `Fatura (${item.subcategory})`
        : 'Importado de fatura de cartão com auto-categorização dinâmica.',
    }));

    onImport(newTransactions);
    resetModalState();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div
        id="invoice-import-modal-card"
        className="w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-2 sm:my-6 flex flex-col max-h-[94vh]"
      >
        {/* Toast Notifier inside modal */}
        {feedbackToast && (
          <div className="bg-indigo-600 text-white text-xs font-bold py-2 px-4 text-center animate-in slide-in-from-top duration-200 shrink-0 flex items-center justify-center gap-2">
            <Check className="w-3.5 h-3.5" />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Importar Fatura & Auto-Categorização
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold uppercase">
                  Dinâmica
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Suporta Nubank, Itaú, Inter, C6, Bradesco e extratos copiados
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-8 space-y-5 overflow-y-auto flex-1">
          {/* SEÇÃO 1: Entrada de Dados (Apenas visível se NENHUMA fatura foi processada) */}
          {parsedItems.length === 0 ? (
            <div className="space-y-4">
              {/* Tabs: Colar Texto vs Upload Arquivo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('paste')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
                      activeTab === 'paste'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Colar Texto do Extrato
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
                      activeTab === 'upload'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Carregar Arquivo (CSV / OFX)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('paste');
                    setPastedText(SAMPLE_INVOICE_TEXT);
                    handleProcessText(SAMPLE_INVOICE_TEXT);
                  }}
                  className="text-xs px-3.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Preencher com Fatura de Exemplo
                </button>
              </div>

              {/* Tab 1: Paste Text */}
              {activeTab === 'paste' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Cole as linhas da fatura ou extrato abaixo:
                  </label>
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Exemplo:&#10;12/09 Assai Atacadista R$ 342,50&#10;14/09 Uber Viagem R$ 28,90&#10;15/09 Farmacia Drogasil R$ 65,00&#10;18/09 Ifood Hamburgueria R$ 52,00"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleProcessText(pastedText)}
                      disabled={!pastedText.trim() || isProcessing}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" /> Analisar e Categorizar Fatura
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: File Upload */}
              {activeTab === 'upload' && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                    isDragOver
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/50 dark:bg-slate-950/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.ofx,.txt"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {fileName ? `Arquivo selecionado: ${fileName}` : 'Clique para selecionar ou arraste o arquivo aqui'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Formatos aceitos: CSV (Nubank, C6, Inter, Itaú, Bradesco), OFX bancário ou TXT
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* SEÇÃO 2: Revisão e Ajuste dos Lançamentos (Oculta área de upload durante a edição) */
            <div className="space-y-4">
              {/* Barra de Status da Fatura Carregada com Ação de Trocar/Recarregar */}
              <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      Fatura carregada: {parsedItems.length} lançamentos encontrados
                      {fileName && (
                        <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                          ({fileName})
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Ajuste as categorias, regras ou selecione os itens desejados antes de confirmar a importação.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={resetModalState}
                  className="text-xs px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5 shadow-2xs"
                  title="Descartar esta fatura e carregar outro arquivo ou texto"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  Carregar outra fatura
                </button>
              </div>

              {/* Resumo Dinâmico em Tempo Real por Categoria (clicável para filtrar) */}
              {dynamicCategorySummary.length > 0 && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-500" />
                        Distribuição por Categoria:
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        (clique para filtrar)
                      </span>
                      {selectedCategoryFilters.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryFilters([])}
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 ml-1"
                        >
                          Limpar filtro ({selectedCategoryFilters.length})
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {selectedItems.length} selecionadas ({formatBRL(totalSelectedAmount)})
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {dynamicCategorySummary.map((cat) => {
                      const isFilterActive = selectedCategoryFilters.includes(cat.catId);
                      return (
                        <button
                          key={cat.catId}
                          type="button"
                          onClick={() => handleToggleCategoryFilter(cat.catId)}
                          className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer border ${
                            isFilterActive
                              ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 dark:border-indigo-400 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20 font-bold shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-200 shadow-2xs'
                          }`}
                          title={
                            isFilterActive
                              ? `Filtro ativo por ${cat.name}. Clique para remover.`
                              : `Clique para filtrar lançamentos de ${cat.name}`
                          }
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-semibold">
                            {cat.name}:
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {formatBRL(cat.total)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({cat.count})
                          </span>
                          {isFilterActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Linha Combinada: Ação Recomendada Apple + Status de Classificação (mesma linha) */}
              <div
                className={`grid gap-2.5 items-stretch ${
                  appleItems.length > 0 ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
                }`}
              >
                {/* Banner de Ajuda da Apple (Ação Recomendada) */}
                {appleItems.length > 0 && (
                  <div className="lg:col-span-7 p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex items-center gap-2.5 text-xs animate-in fade-in">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center shrink-0">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                          {appleItems.length} cobrança(s) Apple identificada(s)
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-bold shrink-0">
                          Ação Recomendada
                        </span>
                      </div>
                      <p className="text-amber-800/90 dark:text-amber-300/90 text-[11px] truncate" title="Como a Apple usa descrição genérica, selecione na coluna Assinatura se o lançamento é iCloud, Apple Music, Apple One ou compra avulsa">
                        Ajuste na coluna <strong>Assinatura</strong> se é iCloud, Apple Music, Apple One ou avulsa.
                      </p>
                    </div>
                  </div>
                )}

                {/* Status da Classificação & Botão de Reclassificação */}
                <div
                  className={`${
                    appleItems.length > 0 ? 'lg:col-span-5' : 'w-full'
                  } p-2.5 sm:p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-2`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0">
                      Classificação:
                    </span>
                    {isAiClassifying ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 animate-pulse shrink-0">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Analisando IA...
                      </span>
                    ) : aiBatchStatus === 'ai_applied' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                        <Sparkles className="w-3 h-3 text-emerald-500" />
                        IA Gemini
                      </span>
                    ) : aiBatchStatus === 'fallback_applied' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                        <Zap className="w-3 h-3 text-amber-500" />
                        Regras Locais
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                        Auto
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => runAiBatchCategorization(parsedItems)}
                    disabled={isAiClassifying || parsedItems.length === 0}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer disabled:opacity-50 shrink-0 shadow-2xs"
                    title="Reclassificar faturas com Gemini Flash"
                  >
                    {isAiClassifying ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                    )}
                    <span className="hidden sm:inline">Reclassificar com IA</span>
                    <span className="sm:hidden">Reclassificar</span>
                  </button>
                </div>
              </div>

              {/* Barra de Filtro e Seleção (Campos em lote de categoria e regra removidos) */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleToggleAll}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition cursor-pointer"
                  >
                    {parsedItems.every((it) => it.selected) ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    Todos ({parsedItems.length})
                  </button>

                  <span className="text-slate-300 dark:text-slate-600">•</span>

                  {/* Filtro por Assinatura / Compras Comuns */}
                  <div className="inline-flex p-0.5 bg-slate-200/70 dark:bg-slate-700/70 rounded-xl text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setSubscriptionFilter('all')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                        subscriptionFilter === 'all'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubscriptionFilter('subscriptions')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                        subscriptionFilter === 'subscriptions'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Repeat className="w-2.5 h-2.5" />
                      Assinaturas ({subscriptionCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubscriptionFilter('regular')}
                      className={`px-2 py-0.5 rounded-lg transition cursor-pointer ${
                        subscriptionFilter === 'regular'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Avulsos ({regularCount})
                    </button>
                  </div>

                  {/* Busca Rápida */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar despesa..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="pl-8 pr-3 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-36"
                    />
                  </div>
                </div>

                {/* Ações em Lote de Assinatura */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <button
                    type="button"
                    onClick={() => handleBatchSetSubscription(true)}
                    disabled={selectedItems.length === 0}
                    className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-[11px] font-bold transition cursor-pointer disabled:opacity-40 flex items-center gap-1"
                    title="Marcar todos os itens selecionados como assinatura"
                  >
                    <Repeat className="w-3 h-3" />
                    + Assinatura em lote
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBatchSetSubscription(false)}
                    disabled={selectedItems.length === 0}
                    className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700/60 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl text-[11px] font-bold transition cursor-pointer disabled:opacity-40"
                    title="Desmarcar assinatura dos itens selecionados"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              {/* Tabela Otimizada: Lançamento & Data e Categoria com o mesmo tamanho (1:1) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-[460px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs table-fixed min-w-[850px]">
                  <thead className="bg-slate-50 dark:bg-slate-950 sticky top-0 border-b border-slate-200 dark:border-slate-800 z-10">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center"></th>
                      <th className="py-3 px-3 font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider w-[30%] min-w-[240px]">
                        Lançamento & Data
                      </th>
                      <th className="py-3 px-3 font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider w-[30%] min-w-[240px]">
                        Categoria & Subcategoria
                      </th>
                      <th className="py-3 px-3 font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider w-[18%] min-w-[150px]">
                        Assinatura
                      </th>
                      <th className="py-3 px-3 font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider w-[12%] min-w-[120px]">
                        Regra 50/30/20
                      </th>
                      <th className="py-3 px-3 font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider text-right w-[10%] min-w-[90px]">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredItems.map((item) => {
                      const isApple = /apple(\.com)?|itunes/i.test(item.description);

                      return (
                        <tr
                          key={item.id}
                          onClick={() => handleToggleItem(item.id)}
                          className={`transition cursor-pointer ${
                            item.selected
                              ? 'bg-indigo-50/30 dark:bg-indigo-950/20'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-50'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center w-10" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleItem(item.id)}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>

                          {/* Lançamento & Data (Mesmo tamanho de Categoria) */}
                          <td className="py-2.5 px-3 w-[30%] min-w-[240px]">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate block"
                                  title={item.description}
                                >
                                  {item.description}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChangeCategory(item.id, item.categoryId, true);
                                  }}
                                  title="Aplicar esta categoria a todas as despesas com nome parecido"
                                  className="text-[10px] text-slate-400 hover:text-indigo-600 hover:underline inline-flex items-center gap-0.5 cursor-pointer ml-0.5 font-normal shrink-0"
                                >
                                  <ArrowRightLeft className="w-2.5 h-2.5" />
                                  replicar
                                </button>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                  {formatDateBR(item.date)}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Categoria & Subcategoria (Mesmo tamanho de Lançamento & Data) */}
                          <td className="py-2.5 px-3 w-[30%] min-w-[240px]" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-1 w-full min-w-0">
                              <select
                                value={item.categoryId}
                                onChange={(e) => handleChangeCategory(item.id, e.target.value)}
                                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer w-full"
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                              {item.subcategory && (
                                <span
                                  className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-medium pl-0.5"
                                  title={item.subcategory}
                                >
                                  Sub: {item.subcategory}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Assinatura Compacta */}
                          <td className="py-3 px-3 w-[18%] min-w-[150px]" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5 w-full">
                              <button
                                type="button"
                                onClick={() => handleToggleSubscription(item.id)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shrink-0 transition cursor-pointer ${
                                  item.isSubscription
                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                                title={item.isSubscription ? 'Desmarcar assinatura' : 'Marcar como assinatura recorrente'}
                              >
                                <Repeat className="w-2.5 h-2.5" />
                                {item.isSubscription ? 'Sim' : 'Não'}
                              </button>

                              {item.isSubscription && (
                                isApple ? (
                                  <select
                                    value={
                                      APPLE_SUBSCRIPTION_PRESETS.find(
                                        (p) =>
                                          p.name === item.subscriptionName ||
                                          p.name === item.subcategory
                                      )?.id || 'apple_generic'
                                    }
                                    onChange={(e) => handleSetAppleService(item.id, e.target.value)}
                                    className="text-[11px] px-1.5 py-1 rounded-lg font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 cursor-pointer truncate w-full min-w-0"
                                  >
                                    {APPLE_SUBSCRIPTION_PRESETS.filter((p) => p.id !== 'not_subscription').map((preset) => (
                                      <option key={preset.id} value={preset.id}>
                                        {preset.name}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <select
                                    value={
                                      POPULAR_SUBSCRIPTION_PRESETS.find(
                                        (p) =>
                                          p.name === item.subscriptionName ||
                                          p.name === item.subcategory
                                      )?.name || (item.subscriptionName || item.subcategory || '')
                                    }
                                    onChange={(e) => handleSetGeneralSubscription(item.id, e.target.value)}
                                    className="text-[11px] px-1.5 py-1 rounded-lg font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 cursor-pointer truncate w-full min-w-0"
                                  >
                                    <option value={item.subscriptionName || item.subcategory || item.description}>
                                      {item.subscriptionName || item.subcategory || 'Serviço'}
                                    </option>
                                    <optgroup label="Populares">
                                      {POPULAR_SUBSCRIPTION_PRESETS.map((preset) => (
                                        <option key={preset.id} value={preset.name}>
                                          {preset.name}
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>
                                )
                              )}
                            </div>
                          </td>

                          {/* Regra 50/30/20 */}
                          <td className="py-3 px-3 w-[12%] min-w-[120px]" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={item.nature}
                              onChange={(e) => handleChangeNature(item.id, e.target.value as ExpenseNature)}
                              className={`text-[11px] px-2 py-1 rounded-lg font-bold border cursor-pointer w-full ${
                                item.nature === 'need'
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                  : item.nature === 'want'
                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                  : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                              }`}
                            >
                              <option value="need">50% Essencial</option>
                              <option value="want">30% Desejo</option>
                              <option value="savings">20% Reserva</option>
                            </select>
                          </td>

                          {/* Valor */}
                          <td className="py-3 px-3 w-[10%] min-w-[90px] font-bold text-slate-900 dark:text-slate-100 text-right whitespace-nowrap text-xs sm:text-sm">
                            {formatBRL(item.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-8 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {selectedItems.length > 0 ? (
              <span>
                Pronto para importar <strong>{selectedItems.length} despesas</strong> somando{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {formatBRL(totalSelectedAmount)}
                </strong>{' '}
                para o mês ativo.
              </span>
            ) : (
              <span>Nenhum gasto selecionado para importação.</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="confirm-invoice-import-btn"
              type="button"
              onClick={handleConfirmImport}
              disabled={selectedItems.length === 0}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Importar {selectedItems.length} Gastos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
