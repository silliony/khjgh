import React, { useState } from 'react';
import {
  User as UserIcon,
  LogOut,
  Mail,
  Lock,
  Sparkles,
  Cloud,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isFirebaseConfigured } from '../lib/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccessToast,
}) => {
  const {
    user,
    isAnonymous,
    syncState,
    authError,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalMessage(null);

    if (!email || !password) {
      setLocalMessage('Preencha o e-mail e a senha.');
      return;
    }

    if (!isFirebaseConfigured) {
      setLocalMessage('Firebase não configurado neste ambiente open-source. Adicione as chaves VITE_FIREBASE_* no arquivo .env para habilitar login e sincronização remota.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'register') {
        await signUpWithEmail(email, password, name);
        if (onSuccessToast) onSuccessToast('Conta criada com sucesso! Dados sincronizados na nuvem.');
        onClose();
      } else {
        await signInWithEmail(email, password);
        if (onSuccessToast) onSuccessToast('Login efetuado com sucesso!');
        onClose();
      }
    } catch (err: any) {
      // O erro já fica gravado no contexto ou exibido
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearError();
    if (!isFirebaseConfigured) {
      setLocalMessage('Para login com o Google, defina as variáveis VITE_FIREBASE_* no arquivo .env (consulte .env.example).');
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      if (onSuccessToast) onSuccessToast('Conectado via Google! Dados sincronizados.');
      onClose();
    } catch (err) {
      // tratado no contexto
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setIsSubmitting(true);
    try {
      await logout();
      if (onSuccessToast) onSuccessToast('Você saiu da sua conta.');
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Conta & Nuvem
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acesse de qualquer navegador ou dispositivo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Atual da Conexão / Usuário */}
        {!isFirebaseConfigured && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
            <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-0.5">
              <p className="font-bold">Modo Aberto / Local Ativo</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                Nenhuma chave do Firebase foi definida no <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/60 rounded font-mono text-[10px]">.env</code>. O app está operando em modo offline seguro com armazenamento local no navegador.
              </p>
            </div>
          </div>
        )}

        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Sincronização em Nuvem:
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                syncState === 'synced'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : syncState === 'syncing'
                  ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 animate-pulse'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {syncState === 'synced' && <CheckCircle2 className="w-3 h-3" />}
              {syncState === 'syncing' && <RefreshCw className="w-3 h-3 animate-spin" />}
              {syncState === 'synced' ? 'Nuvem Ativa' : syncState === 'syncing' ? 'Sincronizando' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 text-xs font-bold shrink-0">
                {user && !isAnonymous && user.displayName
                  ? user.displayName.charAt(0).toUpperCase()
                  : user && !isAnonymous && user.email
                  ? user.email.charAt(0).toUpperCase()
                  : 'C'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {user && !isAnonymous
                    ? user.displayName || user.email
                    : 'Modo Convidado (Local / Temporário)'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user && !isAnonymous
                    ? user.email
                    : 'Conecte sua conta para salvar permanentemente'}
                </p>
              </div>
            </div>

            {user && !isAnonymous && (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isSubmitting}
                className="px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
                title="Desconectar e trocar de usuário"
              >
                <LogOut className="w-3 h-3" />
                Sair
              </button>
            )}
          </div>
        </div>

        {/* Mensagens de erro */}
        {(authError || localMessage) && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="font-medium">{authError || localMessage}</p>
          </div>
        )}

        {/* Formulário de Login / Registro */}
        {(!user || isAnonymous) ? (
          <div className="space-y-4">
            <div className="flex border-b border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearError();
                }}
                className={`flex-1 py-2 text-xs font-bold transition border-b-2 cursor-pointer ${
                  mode === 'login'
                    ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                    : 'text-slate-500 border-transparent hover:text-slate-800'
                }`}
              >
                Entrar com Conta
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  clearError();
                }}
                className={`flex-1 py-2 text-xs font-bold transition border-b-2 cursor-pointer ${
                  mode === 'register'
                    ? 'text-indigo-600 dark:text-indigo-400 border-indigo-600 dark:border-indigo-400'
                    : 'text-slate-500 border-transparent hover:text-slate-800'
                }`}
              >
                Criar Nova Conta
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'register' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Seu Nome
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Carlos Silva"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@exemplo.com"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{mode === 'login' ? 'Entrar e Sincronizar' : 'Criar Conta'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-2 text-[10px] text-slate-400 font-semibold absolute">
                OU
              </span>
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="w-full py-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continuar com o Google
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Você está conectado com segurança!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                Seus dados, faturas e lançamentos estão salvos na nuvem e isolados para o seu usuário.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Trocar de Usuário / Sair
              </button>
            </div>
          </div>
        )}

        <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
          Cada usuário tem seu próprio banco de dados isolado no Firestore. Nenhum dado financeiro é compartilhado.
        </div>
      </div>
    </div>
  );
};
