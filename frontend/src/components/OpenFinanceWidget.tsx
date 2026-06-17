import React, { useState, useEffect } from 'react';
import { PluggyConnect } from 'react-pluggy-connect';
import { Loader2, X, FlaskConical, Copy, Check } from 'lucide-react';

interface OpenFinanceWidgetProps {
  onEvent: (event: string, data?: any) => void;
  onClose: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="ml-2 text-gray-400 hover:text-[var(--color-finance-primary)] transition-colors">
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  );
}

export function OpenFinanceWidget({ onEvent, onClose }: OpenFinanceWidgetProps) {
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showWidget, setShowWidget] = useState(false);

  useEffect(() => {
    async function fetchToken() {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'https://api-iota-livid-42.vercel.app';
        const res = await fetch(`${API_URL}/pluggy/connect-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const body = await res.json();
        if (!res.ok || !body.connectToken) throw new Error(body.error || 'Erro ao gerar token');
        setConnectToken(body.connectToken);
      } catch (err: any) {
        setError(err.message);
      }
    }
    fetchToken();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">

      {/* Tela de instrução sandbox (antes de abrir o widget) */}
      {connectToken && !showWidget && (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FlaskConical size={18} className="text-amber-500" />
              <span className="font-semibold text-gray-800 text-sm">Modo de Demonstração</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X size={18} />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="px-5 py-5">
            <p className="text-sm text-gray-600 mb-4">
              No modo de teste, conecte ao banco <strong>"Pluggy Bank"</strong> (banco fictício). O fluxo é idêntico ao de um banco real.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 mb-5">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Credenciais de teste</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Login</span>
                <span className="flex items-center font-mono font-medium text-gray-800">
                  user-ok <CopyButton text="user-ok" />
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Senha</span>
                <span className="flex items-center font-mono font-medium text-gray-800">
                  password <CopyButton text="password" />
                </span>
              </div>
            </div>

            <ol className="text-xs text-gray-500 space-y-1 mb-5 list-decimal list-inside">
              <li>Clique em <strong>"Abrir Pluggy"</strong> abaixo</li>
              <li>Selecione <strong>"Pluggy Bank"</strong> na lista</li>
              <li>Use as credenciais acima</li>
              <li>Pronto — conta sincronizada! ✅</li>
            </ol>

            <button
              onClick={() => setShowWidget(true)}
              className="w-full py-3 rounded-xl gradient-hero text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Abrir Pluggy →
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {!connectToken && !error && (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[var(--color-finance-primary)] animate-spin" />
          <p className="text-gray-500 font-medium">Iniciando ambiente seguro...</p>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <X className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Erro de Conexão</h3>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button onClick={onClose} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors">
            Voltar
          </button>
        </div>
      )}

      {/* Widget Pluggy real */}
      {connectToken && showWidget && (
        <div className="w-full max-w-md h-[90vh] sm:h-[620px] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          <PluggyConnect
            connectToken={connectToken}
            includeSandbox={true}
            theme="light"
            onSuccess={(itemData) => {
              onEvent('SUCCESS', itemData);
              onClose();
            }}
            onError={(err) => {
              console.error('Pluggy Error:', err);
              onEvent('ERROR', err);
            }}
            onClose={() => onClose()}
          />
        </div>
      )}
    </div>
  );
}
