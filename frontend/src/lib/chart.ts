// Props que o recharts passa para um tooltip customizado
export interface TooltipProps {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number | string; color?: string; name?: string }[];
  label?: string | number;
  names?: Record<string, string>;
}
