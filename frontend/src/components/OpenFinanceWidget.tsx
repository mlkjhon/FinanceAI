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
        const clientId = 'f8e57dd0-2c03-41b5-b2d8-6b63f2672751';
        const clientSecret = '54aac48c-1d05-4594-9ab9-eed8810c2e72';

        const authRes = await fetch('https://api.pluggy.ai/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, clientSecret })
        });
        
        if (!authRes.ok) throw new Error('Falha na autenticação da API Pluggy');
        const authData = await authRes.json();
        
        const ctRes = await fetch('https://api.pluggy.ai/connect_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': authData.apiKey
          }
        });

        if (!ctRes.ok) throw new Error('Falha ao gerar o Connect Token');
        const ctData = await ctRes.json();
        
        setConnectToken(ctData.accessToken);
      } catch (err: any) {
        setError(err.message);
      }
    }

    fetchToken();
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0">
      <div className="w-full max-w-md h-[90vh] sm:h-[600px] bg-white rounded-2xl overflow-hidden relative shadow-2xl flex flex-col">
        {!connectToken && !error && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-[var(--color-finance-primary)] animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Iniciando ambiente seguro...</p>
          </div>
        )}
        
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

        {connectToken && (
          <PluggyConnect
            connectToken={connectToken}
            includeSandbox={true}
            theme="light"
            onSuccess={(itemData) => {
              onEvent('SUCCESS', itemData);
              onClose();
            }}
            onError={(error) => {
              console.error('Pluggy Error:', error);
              onEvent('ERROR', error);
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
