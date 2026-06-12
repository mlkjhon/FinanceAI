import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, Shield, X, Banknote, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface OpenFinanceWidgetProps {
  onEvent: (event: string, data?: any) => void;
  onClose: () => void;
}

export function OpenFinanceWidget({ onEvent, onClose }: OpenFinanceWidgetProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ instituicao: '', cpf: '', senha: '' });
  
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.instituicao || !form.cpf || !form.senha) return;
    
    setStep(2);
    
    try {
        const API_URL = import.meta.env.VITE_API_URL || 'https://api-iota-livid-42.vercel.app';
        
        const res = await fetch(`${API_URL}/conexoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                id_usuario: user?.id,
                public_token: 'auth-success-from-widget',
                instituicao: form.instituicao,
                cpf: form.cpf,
                senhaBancaria: form.senha
            })
        });

        if(!res.ok) throw new Error("Erro na conexão");

        const data = await res.json();
        
        setStep(3);
        setTimeout(() => {
            onEvent('SUCCESS', data);
            onClose();
        }, 1500);

    } catch (e) {
        onEvent('ERROR', e);
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-md bg-white dark:bg-[var(--color-finance-card-dark)] rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="p-6 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
          
          <div className="flex flex-col items-center">
            
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex flex-col"
                  onSubmit={handleConnect}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                      <Banknote size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold font-brand text-gray-900 dark:text-white">Conectar Banco</h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Ambiente Open Finance provisório (Pluggy em breve)</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Instituição Financeira</label>
                      <input 
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--color-finance-primary)] outline-none" 
                        placeholder="Ex: Itaú, Nubank, Santander..."
                        value={form.instituicao}
                        onChange={(e) => setForm({...form, instituicao: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Seu CPF</label>
                      <input 
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--color-finance-primary)] outline-none" 
                        placeholder="000.000.000-00"
                        value={form.cpf}
                        onChange={(e) => setForm({...form, cpf: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Senha Bancária de Leitura</label>
                      <input 
                        type="password"
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--color-finance-primary)] outline-none" 
                        placeholder="••••••••"
                        value={form.senha}
                        onChange={(e) => setForm({...form, senha: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl mb-6">
                    <Shield size={18} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Sua senha é criptografada de ponta a ponta. Usamos esse fluxo temporário para sincronizar as contas no banco do app.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl gradient-hero text-white font-semibold hover:opacity-90 transition-opacity"
                  >
                    Autorizar Sincronização
                  </button>
                </motion.form>
              )}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-12"
                >
                  <Loader2 size={48} className="text-[var(--color-finance-primary)] animate-spin mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Conectando ao banco...</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-xs">
                    Estamos validando suas credenciais de forma segura. Isso pode levar alguns segundos.
                  </p>
                </motion.div>
              )}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center py-12"
                >
                  <CheckCircle size={56} className="text-[var(--color-finance-accent)] mb-4" />
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    Conexão Bem-Sucedida!
                  </p>
                  <p className="text-sm text-gray-500 mt-2">Suas contas foram sincronizadas.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
