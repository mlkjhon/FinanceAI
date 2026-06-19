import React, { Suspense, useState, useRef, useEffect } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Brain, Lightbulb, TrendingDown, PiggyBank, Send, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { insightsApi } from '../lib/api';
import { Navbar } from '../components/Navbar';
import { FinanceCard, SkeletonCard } from '../components/ui';
import { formatCurrency } from '../lib/utils';
import { SplashScreen } from '../components/SplashScreen';

export const Route = createFileRoute('/insights')({
  beforeLoad: () => {
    if (!localStorage.getItem('finance_token') && !sessionStorage.getItem('finance_token')) throw redirect({ to: '/auth' });
  },
  component: InsightsPage,
});

const iconMap: Record<string, React.ReactNode> = {
  economia: <PiggyBank size={22} />,
  gasto: <TrendingDown size={22} />,
  sugestao: <Lightbulb size={22} />,
  padrao: <Brain size={22} />,
};

type ChatMsg = { role: 'user' | 'ai'; content: string };

function InsightsContent() {
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights, isFetching } = useQuery({
    queryKey: ['insights'],
    queryFn: insightsApi.list,
    // Não busca automaticamente ao montar para evitar custo de API desnecessário
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
  });

  // Estado do chat - começa com mensagem de boas-vindas
  const [chat, setChat] = useState<ChatMsg[]>([
    { role: 'ai', content: 'Olá! 👋 Sou o assistente financeiro do FinanceAI. Como posso te ajudar a melhorar suas finanças hoje?' },
  ]);
  const [histLoaded, setHistLoaded] = useState(false);
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Carrega o histórico de chat do banco de dados ao abrir a página
  useEffect(() => {
    if (histLoaded) return;
    insightsApi.historico().then((hist) => {
      if (hist && hist.length > 0) {
        // Monta o histórico: cada linha do banco vira dois balões (usuário + IA)
        const msgs: ChatMsg[] = [
          { role: 'ai', content: 'Olá! 👋 Sou o assistente financeiro do FinanceAI. Como posso te ajudar a melhorar suas finanças hoje?' },
        ];
        hist.forEach((h: any) => {
          msgs.push({ role: 'user', content: h.mensagem });
          if (h.resposta) msgs.push({ role: 'ai', content: h.resposta });
        });
        setChat(msgs);
      }
      setHistLoaded(true);
    }).catch(() => setHistLoaded(true));
  }, [histLoaded]);

  // Rola o chat para o final sempre que novas mensagens chegam
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setChat((prev) => [...prev, { role: 'user', content: userMsg }]);
    setIsAiLoading(true);
    try {
      const res = await insightsApi.chat(userMsg);
      setChat((prev) => [...prev, { role: 'ai', content: res.reply }]);
    } catch {
      setChat((prev) => [...prev, { role: 'ai', content: 'Desculpe, não consegui processar agora. Tente de novo em instantes!' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="font-brand text-2xl font-bold text-gray-900">Insights com IA</h1>
        <p className="text-sm text-gray-500">Análises personalizadas do seu perfil financeiro</p>
      </div>

      {/* Chat com a IA */}
      <div className="finance-card overflow-hidden">
        {/* Cabeçalho do chat */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
          <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">Assistente FinanceAI</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <p className="text-xs text-gray-400">Online</p>
            </div>
          </div>
        </div>

        {/* Área de mensagens */}
        <div ref={chatRef} className="h-72 overflow-y-auto p-4 space-y-3">
          {chat.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'gradient-hero text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}

          {/* Animação enquanto a IA processa */}
          {isAiLoading && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl gradient-hero flex items-center justify-center">
                <Sparkles size={14} className="text-white animate-spin" />
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-green-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Campo de digitação */}
        <div className="px-4 pb-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Pergunte sobre suas finanças..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
          />
          <button
            onClick={sendMessage}
            disabled={isAiLoading || !input.trim()}
            className="px-4 py-2.5 rounded-xl gradient-hero text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>

      {/* Seção de dicas personalizadas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-brand font-semibold text-lg text-gray-900">Dicas Personalizadas</h2>
          <button
            onClick={() => refetchInsights()}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-green-600 border border-green-200 hover:bg-green-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Gerando...' : 'Gerar dicas'}
          </button>
        </div>

        {insightsLoading || isFetching ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={3} />)}
          </div>
        ) : insights?.length ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {insights.map((ins, i) => (
              <motion.div
                key={ins.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="finance-card p-5"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-500 shrink-0">
                    {iconMap[ins.tipo] ?? <Lightbulb size={22} />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{ins.titulo}</p>
                    {ins.valor && (
                      <p className="text-xs text-green-500 font-medium mt-0.5">
                        Potencial: {formatCurrency(ins.valor)}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{ins.descricao}</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <FinanceCard className="text-center py-12">
            <Brain size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm mb-3">Clique em "Gerar dicas" para receber conselhos personalizados</p>
            <button
              onClick={() => refetchInsights()}
              className="px-4 py-2 rounded-xl gradient-hero text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Gerar minhas dicas
            </button>
          </FinanceCard>
        )}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<SplashScreen type="ai" />}>
          <InsightsContent />
        </Suspense>
      </div>
    </div>
  );
}
