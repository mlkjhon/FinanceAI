import React, { useState, useEffect } from 'react';
import { PluggyConnect } from 'react-pluggy-connect';
import { Loader2, X } from 'lucide-react';

interface OpenFinanceWidgetProps {
  onEvent: (event: string, data?: any) => void;
  onClose: () => void;
}

export function OpenFinanceWidget({ onEvent, onClose }: OpenFinanceWidgetProps) {
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'https://api-iota-livid-42.vercel.app';
        console.log('[Pluggy] Buscando connect token em:', `${API_URL}/pluggy/connect-token`);
        
        const res = await fetch(`${API_URL}/pluggy/connect-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        const body = await res.json();
        console.log('[Pluggy] Resposta do backend:', res.status, body);

        if (!res.ok) {
          throw new Error(body.error || `Erro ${res.status}`);
        }

        if (!body.connectToken) {
          throw new Error('Backend não retornou connectToken');
        }

        console.log('[Pluggy] Token obtido com sucesso, abrindo widget...');
        setConnectToken(body.connectToken);
      } catch (err: any) {
        console.error('[Pluggy] Erro ao buscar token:', err);
        setError(err.message);
      }
    }

    fetchToken();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0">
      <div className="w-full max-w-md h-[90vh] sm:h-[600px] bg-white rounded-2xl overflow-hidden relative shadow-2xl flex flex-col">

        {/* Carregando o token */}
        {!connectToken && !error && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-[var(--color-finance-primary)] animate-spin" />
            <p className="text-gray-500 font-medium">Iniciando ambiente seguro...</p>
          </div>
        )}

        {/* Erro ao gerar o token */}
        {error && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <X className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Erro de Conexão</h3>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              Voltar
            </button>
          </div>
        )}

        {/* Widget oficial da Pluggy */}
        {connectToken && (
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
            onClose={() => {
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}
