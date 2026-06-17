import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi, getUserData } from '../lib/api';
import { FinanceCard } from '../components/ui';
import { Navbar } from '../components/Navbar';
import { formatCurrency } from '../lib/utils';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@tanstack/react-router';

export const Route = createFileRoute('/categorias')({
  component: CategoriasPage,
});

// Gráfico de rosca (donut) copiado do dashboard para manter consistência
function DonutChart({ data }: { data: { categoria: string; valor: number; cor?: string }[] }) {
  const total = data.reduce((s, d) => s + d.valor, 0);
  if (!data.length || total === 0) {
    return <p className="text-sm text-gray-400 text-center pt-8">Sem dados disponíveis</p>;
  }

  let offset = 0;
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  const colors = ['#10B981', '#34D399', '#6EE7B7', '#059669', '#047857'];

  return (
    <div className="flex flex-col md:flex-row items-center gap-8 justify-center">
      <svg viewBox="0 0 160 160" className="w-48 h-48 shrink-0 -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--color-finance-primary)" strokeWidth="20" strokeOpacity="0.1" />
        {data.map((d, i) => {
          const dash = (d.valor / total) * circ;
          const strokeDasharray = `${dash} ${circ}`;
          const strokeDashoffset = -offset;
          offset += dash;
          return (
            <circle
              key={d.categoria}
              cx="80" cy="80" r={radius}
              fill="none"
              stroke={d.cor || colors[i % colors.length]}
              strokeWidth="24"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          );
        })}
      </svg>
      <div className="space-y-3 w-full md:w-auto">
        {data.map((d, i) => (
          <div key={d.categoria} className="flex items-center justify-between gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.cor || colors[i % colors.length] }} />
              <span className="text-gray-600 dark:text-gray-300 font-medium">{d.categoria}</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">{Math.round((d.valor / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoriasPage() {
  const user = getUserData();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard', user?.id, 'all'],
    queryFn: () => dashboardApi.getSummary(user?.id, 'all'),
    enabled: !!user?.id,
  });

  const gastos = summary?.gastos_por_categoria || [];
  const total = gastos.reduce((acc: number, curr: any) => acc + curr.valor, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] font-sans text-gray-900 pb-20">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Análise de Categorias</h1>
            <p className="text-gray-500">Detalhamento completo de seus gastos por categoria.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FinanceCard>
            <h2 className="font-semibold text-gray-900 mb-6">Visão Geral</h2>
            <div className="min-h-[250px] flex items-center justify-center">
              {isLoading ? (
                <div className="text-gray-400">Carregando gráfico...</div>
              ) : (
                <DonutChart data={gastos} />
              )}
            </div>
          </FinanceCard>

          <FinanceCard>
            <h2 className="font-semibold text-gray-900 mb-6">Detalhamento</h2>
            {isLoading ? (
              <div className="text-gray-400">Carregando detalhes...</div>
            ) : (
              <div className="space-y-4">
                {gastos.length === 0 && <p className="text-sm text-gray-500">Nenhum gasto registrado nesta área.</p>}
                {gastos.map((gasto: any, i: number) => {
                  const colors = ['#10B981', '#34D399', '#6EE7B7', '#059669', '#047857'];
                  const percent = total > 0 ? ((gasto.valor / total) * 100).toFixed(1) : 0;
                  return (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50/50 border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${colors[i % colors.length]}20` }}>
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                        </div>
                        <span className="font-medium text-gray-800">{gasto.categoria}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          {formatCurrency(gasto.valor)}
                        </div>
                        <div className="text-xs font-medium text-gray-500 mt-0.5">{percent}% do total</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </FinanceCard>
        </div>
      </div>
    </div>
  );
}
