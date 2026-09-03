import { Category, Transaction } from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'housing',
    name: 'Moradia & Contas',
    iconName: 'Home',
    color: '#3B82F6', // Blue
    nature: 'need',
    defaultPct: 25,
    description: 'Aluguel, condomínio, luz, água, gás, internet e manutenção da casa',
  },
  {
    id: 'food',
    name: 'Alimentação',
    iconName: 'Utensils',
    color: '#10B981', // Emerald
    nature: 'need',
    defaultPct: 18,
    description: 'Supermercado, feira, açougue, padaria e alimentação essencial',
  },
  {
    id: 'transport',
    name: 'Transporte & Mobilidade',
    iconName: 'Car',
    color: '#F59E0B', // Amber
    nature: 'need',
    defaultPct: 10,
    description: 'Combustível, transporte público, IPVA, manutenção e corridas por app',
  },
  {
    id: 'health',
    name: 'Saúde & Cuidados',
    iconName: 'HeartPulse',
    color: '#EC4899', // Pink
    nature: 'need',
    defaultPct: 7,
    description: 'Plano de saúde, farmácia, exames, consultas e autocuidado',
  },
  {
    id: 'leisure',
    name: 'Lazer & Estilo de Vida',
    iconName: 'Sparkles',
    color: '#8B5CF6', // Purple
    nature: 'want',
    defaultPct: 15,
    description: 'Restaurantes, delivery, cinemas, viagens, streaming e compras pessoais',
  },
  {
    id: 'education',
    name: 'Educação & Carreira',
    iconName: 'GraduationCap',
    color: '#06B6D4', // Cyan
    nature: 'need',
    defaultPct: 5,
    description: 'Cursos, livros, graduação, idiomas e ferramentas profissionais',
  },
  {
    id: 'debts',
    name: 'Dívidas & Parcelamentos',
    iconName: 'CreditCard',
    color: '#EF4444', // Red
    nature: 'need',
    defaultPct: 0,
    description: 'Parcelas de cartão acumuladas, financiamentos e empréstimos',
  },
  {
    id: 'subscriptions',
    name: 'Assinaturas & Serviços Digitais',
    iconName: 'Repeat',
    color: '#6366F1', // Indigo
    nature: 'want',
    defaultPct: 5,
    description: 'Streaming, iCloud, Google One, Spotify, softwares e serviços recorrentes',
  },
  {
    id: 'savings',
    name: 'Reserva & Investimentos',
    iconName: 'TrendingUp',
    color: '#14B8A6', // Teal
    nature: 'savings',
    defaultPct: 20,
    description: 'Reserva de emergência, Tesouro Direto, CDB, ações e previdência',
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Income
  {
    id: 'tx-inc-1',
    description: 'Salário Líquido Mensal',
    amount: 6800,
    date: '2026-09-01',
    type: 'income',
    categoryId: 'housing',
    nature: 'need',
    notes: 'Depósito em conta corrente principal',
    paymentMethod: 'transfer',
  },
  {
    id: 'tx-inc-2',
    description: 'Rendimento de Freelance / Consultoria',
    amount: 1200,
    date: '2026-09-05',
    type: 'income',
    categoryId: 'education',
    nature: 'need',
    notes: 'Projeto extra concluído',
    paymentMethod: 'pix',
  },

  // Needs (Moradia, Alimentação, Transporte, Saúde)
  {
    id: 'tx-exp-1',
    description: 'Aluguel do Apartamento + Condomínio',
    amount: 1850,
    date: '2026-09-02',
    type: 'expense',
    categoryId: 'housing',
    subcategory: 'Aluguel & Taxas',
    nature: 'need',
    paymentMethod: 'pix',
    aiTip: 'Gasto essencial prioritário no início do mês.',
  },
  {
    id: 'tx-exp-2',
    description: 'Conta de Energia Elétrica (Enel)',
    amount: 184.50,
    date: '2026-09-03',
    type: 'expense',
    categoryId: 'housing',
    subcategory: 'Contas Básicas',
    nature: 'need',
    paymentMethod: 'debit',
  },
  {
    id: 'tx-exp-3',
    description: 'Internet Fibra Óptica 600MB',
    amount: 129.90,
    date: '2026-09-04',
    type: 'expense',
    categoryId: 'housing',
    subcategory: 'Internet & Conectividade',
    nature: 'need',
    paymentMethod: 'credit',
  },
  {
    id: 'tx-exp-4',
    description: 'Supermercado Mensal - Compras de Mantimentos',
    amount: 720.30,
    date: '2026-09-03',
    type: 'expense',
    categoryId: 'food',
    subcategory: 'Supermercado',
    nature: 'need',
    paymentMethod: 'debit',
    aiTip: 'Compras em grande volume no início do mês costumam economizar até 15%.',
  },
  {
    id: 'tx-exp-5',
    description: 'Hortifruti & Feira Orgânica',
    amount: 88.40,
    date: '2026-09-08',
    type: 'expense',
    categoryId: 'food',
    subcategory: 'Feira',
    nature: 'need',
    paymentMethod: 'pix',
  },
  {
    id: 'tx-exp-6',
    description: 'Abastecimento Gasolina Comum (Tanque Cheio)',
    amount: 245.00,
    date: '2026-09-04',
    type: 'expense',
    categoryId: 'transport',
    subcategory: 'Combustível',
    nature: 'need',
    paymentMethod: 'credit',
  },
  {
    id: 'tx-exp-7',
    description: 'Farmácia - Medicamentos de Uso Contínuo e Vitaminas',
    amount: 135.20,
    date: '2026-09-06',
    type: 'expense',
    categoryId: 'health',
    subcategory: 'Farmácia',
    nature: 'need',
    paymentMethod: 'debit',
  },
  {
    id: 'tx-exp-8',
    description: 'Mensalidade da Academia',
    amount: 119.90,
    date: '2026-09-05',
    type: 'expense',
    categoryId: 'health',
    subcategory: 'Atividade Física',
    nature: 'need',
    paymentMethod: 'credit',
  },

  // Wants (Lazer, Delivery, Compras)
  {
    id: 'tx-exp-9',
    description: 'Jantar Restaurante Italiano (Fim de semana)',
    amount: 210.00,
    date: '2026-09-06',
    type: 'expense',
    categoryId: 'leisure',
    subcategory: 'Restaurante',
    nature: 'want',
    paymentMethod: 'credit',
    aiTip: 'Gastos de alimentação fora de casa entram na cota de estilo de vida (30%).',
  },
  {
    id: 'tx-exp-10',
    description: 'Assinaturas Digitais (Netflix & Spotify)',
    amount: 69.80,
    date: '2026-09-02',
    type: 'expense',
    categoryId: 'leisure',
    subcategory: 'Streaming',
    nature: 'want',
    paymentMethod: 'credit',
  },
  {
    id: 'tx-exp-11',
    description: 'Delivery Pizza no iFood',
    amount: 78.50,
    date: '2026-09-07',
    type: 'expense',
    categoryId: 'leisure',
    subcategory: 'Delivery',
    nature: 'want',
    paymentMethod: 'pix',
  },
  {
    id: 'tx-exp-12',
    description: 'Livro de Finanças e Produtividade',
    amount: 54.90,
    date: '2026-09-05',
    type: 'expense',
    categoryId: 'education',
    subcategory: 'Livros',
    nature: 'need',
    paymentMethod: 'credit',
  },

  // Savings / Investments
  {
    id: 'tx-exp-13',
    description: 'Aporte Tesouro Selic (Reserva de Emergência)',
    amount: 1200.00,
    date: '2026-09-02',
    type: 'expense',
    categoryId: 'savings',
    subcategory: 'Reserva de Emergência',
    nature: 'savings',
    paymentMethod: 'transfer',
    aiTip: 'Excelente prática! Pagar-se primeiro no início do mês garante a meta de poupança.',
  },
  {
    id: 'tx-exp-14',
    description: 'Aporte Carteira de FIIs / Ações',
    amount: 400.00,
    date: '2026-09-05',
    type: 'expense',
    categoryId: 'savings',
    subcategory: 'Investimentos Longo Prazo',
    nature: 'savings',
    paymentMethod: 'transfer',
  },
];

export const INITIAL_BUDGETS: Record<string, number> = {
  housing: 2300,
  food: 1300,
  transport: 650,
  health: 450,
  leisure: 1000,
  education: 350,
  debts: 0,
  savings: 1600,
};

export function formatBRL(amount: number): string {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safeAmount);
}

export function formatPct(value: number): string {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  return `${safeValue.toFixed(1)}%`;
}
