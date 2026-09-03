import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction, Category, RecurringIncomeSource } from '../types';
import { DEFAULT_CATEGORIES, INITIAL_TRANSACTIONS, INITIAL_BUDGETS } from '../data/initialData';

export interface UserFinancialProfile {
  monthlyIncome: number;
  totalReserve: number;
  reserveTargetMonths: number;
  initialized?: boolean;
}

// Inicializar perfil do usuário e dados iniciais se for a primeira vez
export async function initializeUserDataIfNeeded(
  userId: string,
  userEmail?: string | null,
  displayName?: string | null
): Promise<UserFinancialProfile> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data() as Partial<UserFinancialProfile>;
    return {
      monthlyIncome: typeof data.monthlyIncome === 'number' ? data.monthlyIncome : 8000,
      totalReserve: typeof data.totalReserve === 'number' ? data.totalReserve : 24000,
      reserveTargetMonths: typeof data.reserveTargetMonths === 'number' ? data.reserveTargetMonths : 6,
      initialized: true,
    };
  }

  // Primeiro acesso do usuário: configurar perfil e dados padrão no Firestore
  const initialProfile: UserFinancialProfile = {
    monthlyIncome: 8000,
    totalReserve: 24000,
    reserveTargetMonths: 6,
    initialized: true,
  };

  const batch = writeBatch(db);

  // 1. Perfil principal
  batch.set(userRef, {
    uid: userId,
    email: userEmail || '',
    displayName: displayName || '',
    monthlyIncome: initialProfile.monthlyIncome,
    totalReserve: initialProfile.totalReserve,
    reserveTargetMonths: initialProfile.reserveTargetMonths,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 2. Orçamentos iniciais
  Object.entries(INITIAL_BUDGETS).forEach(([catId, amount]) => {
    const bRef = doc(db, 'users', userId, 'budgets', catId);
    batch.set(bRef, { categoryId: catId, reservedAmount: amount });
  });

  // 3. Categorias padrão
  DEFAULT_CATEGORIES.forEach((cat) => {
    const catRef = doc(db, 'users', userId, 'categories', cat.id);
    batch.set(catRef, cat);
  });

  // 4. Lançamentos iniciais para demonstração (podem ser apagados ou mantidos)
  INITIAL_TRANSACTIONS.forEach((tx) => {
    const txRef = doc(db, 'users', userId, 'transactions', tx.id);
    batch.set(txRef, {
      ...tx,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  // 5. Fontes de renda padrão
  const defaultSources: RecurringIncomeSource[] = [
    {
      id: 'inc-salario',
      name: 'Salário Base Líquido',
      amount: 6800,
      dayOfMonth: 5,
      paydayType: 'fifth_working_day',
      notes: 'Depósito principal CLT / PJ',
    },
    {
      id: 'inc-va',
      name: 'Vale Alimentação / Refeição (VA/VR)',
      amount: 1200,
      dayOfMonth: 1,
      isWorkingDaysVA: true,
      dailyRate: 50,
      notes: 'Calculado por dias úteis no mês',
    },
  ];

  defaultSources.forEach((src) => {
    const srcRef = doc(db, 'users', userId, 'recurringIncomes', src.id);
    batch.set(srcRef, src);
  });

  await batch.commit();
  return initialProfile;
}

// Inscrição em tempo real aos Lançamentos do Usuário
export function subscribeToTransactions(
  userId: string,
  onData: (txs: Transaction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const txsRef = collection(db, 'users', userId, 'transactions');
  const q = query(txsRef, orderBy('date', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Transaction[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Transaction;
        list.push({
          ...data,
          id: d.id,
        });
      });
      onData(list);
    },
    (err) => {
      console.error('Erro na sincronização de transações:', err);
      if (onError) onError(err);
    }
  );
}

// Inscrição em tempo real ao Perfil Financeiro do Usuário (Renda, Reserva, Metas)
export function subscribeToUserProfile(
  userId: string,
  onData: (profile: UserFinancialProfile) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<UserFinancialProfile>;
        onData({
          monthlyIncome: typeof data.monthlyIncome === 'number' ? data.monthlyIncome : 0,
          totalReserve: typeof data.totalReserve === 'number' ? data.totalReserve : 0,
          reserveTargetMonths: typeof data.reserveTargetMonths === 'number' ? data.reserveTargetMonths : 6,
          initialized: true,
        });
      }
    },
    (err) => {
      console.error('Erro na sincronização do perfil financeiro:', err);
      if (onError) onError(err);
    }
  );
}

// Inscrição em tempo real aos Orçamentos do Usuário
export function subscribeToBudgets(
  userId: string,
  onData: (budgets: Record<string, number>) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const budgetsRef = collection(db, 'users', userId, 'budgets');

  return onSnapshot(
    budgetsRef,
    (snapshot) => {
      const map: Record<string, number> = {};
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.categoryId && typeof data.reservedAmount === 'number') {
          map[data.categoryId] = data.reservedAmount;
        }
      });
      onData(map);
    },
    (err) => {
      console.error('Erro na sincronização de orçamentos:', err);
      if (onError) onError(err);
    }
  );
}

// Inscrição em tempo real às Fontes de Renda Recorrente do Usuário
export function subscribeToRecurringIncomes(
  userId: string,
  onData: (sources: RecurringIncomeSource[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const incRef = collection(db, 'users', userId, 'recurringIncomes');

  return onSnapshot(
    incRef,
    (snapshot) => {
      const list: RecurringIncomeSource[] = [];
      snapshot.forEach((d) => {
        list.push({ ...(d.data() as RecurringIncomeSource), id: d.id });
      });
      onData(list);
    },
    (err) => {
      console.error('Erro na sincronização de fontes de renda:', err);
      if (onError) onError(err);
    }
  );
}

// Salvar ou Atualizar Lançamento
export async function syncSaveTransaction(userId: string, tx: Transaction): Promise<void> {
  const txRef = doc(db, 'users', userId, 'transactions', tx.id);
  await setDoc(
    txRef,
    {
      ...tx,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

// Excluir Lançamento
export async function syncDeleteTransaction(userId: string, txId: string): Promise<void> {
  const txRef = doc(db, 'users', userId, 'transactions', txId);
  await deleteDoc(txRef);
}

// Salvar Lote de Lançamentos (ex: Importação de Fatura)
export async function syncBatchSaveTransactions(
  userId: string,
  txs: Transaction[]
): Promise<void> {
  // O Firestore suporta até 500 operações por batch
  const chunkSize = 400;
  for (let i = 0; i < txs.length; i += chunkSize) {
    const chunk = txs.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((t) => {
      const tRef = doc(db, 'users', userId, 'transactions', t.id);
      batch.set(tRef, {
        ...t,
        updatedAt: new Date().toISOString(),
      });
    });
    await batch.commit();
  }
}

// Atualizar Perfil Financeiro (Renda Mensal, Reserva Total, Metas)
export async function syncUpdateUserProfile(
  userId: string,
  profile: Partial<UserFinancialProfile>
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await setDoc(
    userRef,
    {
      ...profile,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

// Salvar Orçamentos
export async function syncSaveBudgets(
  userId: string,
  budgets: Record<string, number>
): Promise<void> {
  const batch = writeBatch(db);
  Object.entries(budgets).forEach(([catId, amount]) => {
    const bRef = doc(db, 'users', userId, 'budgets', catId);
    batch.set(bRef, { categoryId: catId, reservedAmount: amount }, { merge: true });
  });
  await batch.commit();
}

// Salvar Fontes de Renda Recorrente
export async function syncSaveRecurringIncomes(
  userId: string,
  sources: RecurringIncomeSource[]
): Promise<void> {
  const batch = writeBatch(db);
  sources.forEach((src) => {
    const srcRef = doc(db, 'users', userId, 'recurringIncomes', src.id);
    batch.set(srcRef, src, { merge: true });
  });
  await batch.commit();
}

// Apagar todos os lançamentos do usuário
export async function syncClearAllTransactions(
  userId: string,
  transactions: Transaction[]
): Promise<void> {
  const chunkSize = 400;
  for (let i = 0; i < transactions.length; i += chunkSize) {
    const chunk = transactions.slice(i, i + chunkSize);
    const batch = writeBatch(db);
    chunk.forEach((t) => {
      const tRef = doc(db, 'users', userId, 'transactions', t.id);
      batch.delete(tRef);
    });
    await batch.commit();
  }
}

// Zerar TODOS os dados financeiros do usuário (começar do zero)
// Inclui lançamentos, rendas configuradas, reservas totais e orçamentos
export async function syncResetAllFinancialDataToZero(
  userId: string,
  localTransactions: Transaction[] = []
): Promise<void> {
  // 1. Zera o perfil do usuário (renda mensal = 0, reserva total = 0)
  const userRef = doc(db, 'users', userId);
  await setDoc(
    userRef,
    {
      monthlyIncome: 0,
      totalReserve: 0,
      reserveTargetMonths: 6,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // 2. Apaga todas as transações do usuário no Firestore
  try {
    const txSnapshot = await getDocs(collection(db, 'users', userId, 'transactions'));
    if (!txSnapshot.empty) {
      const docs = txSnapshot.docs;
      const chunkSize = 400;
      for (let i = 0; i < docs.length; i += chunkSize) {
        const chunk = docs.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar transactions no Firestore, usando fallback local:', err);
    if (localTransactions.length > 0) {
      await syncClearAllTransactions(userId, localTransactions);
    }
  }

  // 3. Apaga fontes de renda recorrente cadastradas
  try {
    const incSnapshot = await getDocs(collection(db, 'users', userId, 'recurringIncomes'));
    if (!incSnapshot.empty) {
      const batch = writeBatch(db);
      incSnapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn('Erro ao apagar recurringIncomes no Firestore:', err);
  }

  // 4. Apaga orçamentos configurados
  try {
    const budSnapshot = await getDocs(collection(db, 'users', userId, 'budgets'));
    if (!budSnapshot.empty) {
      const batch = writeBatch(db);
      budSnapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.warn('Erro ao apagar budgets no Firestore:', err);
  }
}

// Restaurar lançamentos e dados de demonstração (dummy)
export async function syncResetToDemoData(userId: string): Promise<void> {
  const batch = writeBatch(db);

  // 1. Perfil base demo
  const userRef = doc(db, 'users', userId);
  batch.set(
    userRef,
    {
      monthlyIncome: 8000,
      totalReserve: 24000,
      reserveTargetMonths: 6,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // 2. Transações demo
  INITIAL_TRANSACTIONS.forEach((tx) => {
    const txRef = doc(db, 'users', userId, 'transactions', tx.id);
    batch.set(txRef, {
      ...tx,
      updatedAt: new Date().toISOString(),
    });
  });

  // 3. Orçamentos demo
  Object.entries(INITIAL_BUDGETS).forEach(([catId, amount]) => {
    const bRef = doc(db, 'users', userId, 'budgets', catId);
    batch.set(bRef, { categoryId: catId, reservedAmount: amount });
  });

  // 4. Rendas demo
  const defaultSources: RecurringIncomeSource[] = [
    {
      id: 'inc-salario',
      name: 'Salário Base Líquido',
      amount: 6800,
      dayOfMonth: 5,
      paydayType: 'fifth_working_day',
      notes: 'Depósito principal CLT / PJ',
    },
    {
      id: 'inc-va',
      name: 'Vale Alimentação / Refeição (VA/VR)',
      amount: 1200,
      dayOfMonth: 1,
      isWorkingDaysVA: true,
      dailyRate: 50,
      notes: 'Calculado por dias úteis no mês',
    },
  ];
  defaultSources.forEach((src) => {
    const srcRef = doc(db, 'users', userId, 'recurringIncomes', src.id);
    batch.set(srcRef, src);
  });

  await batch.commit();
}
