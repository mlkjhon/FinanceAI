import { z } from 'zod';

// Mesmo teto do servidor (api/src/services/limitesValor.js)
export const VALOR_MAXIMO = 999_999_999_999.99;

export const txSchema = z.object({
  descricao: z.string().min(2, 'Descrição obrigatória'),
  valor: z.coerce.number().positive('Valor deve ser positivo').max(VALOR_MAXIMO, 'Valor alto demais. O máximo é R$ 999.999.999.999,99'),
  tipo: z.enum(['receita', 'despesa']),
  id_categoria: z.string().optional(),
  id_subcategoria: z.string().optional(),
  data: z.string().optional(),
});

export type TxForm = z.infer<typeof txSchema>;
