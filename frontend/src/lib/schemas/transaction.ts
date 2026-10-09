import { z } from 'zod';

export const txSchema = z.object({
  descricao: z.string().min(2, 'Descrição obrigatória'),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  tipo: z.enum(['receita', 'despesa']),
  id_categoria: z.string().optional(),
  id_subcategoria: z.string().optional(),
  data: z.string().optional(),
});

export type TxForm = z.infer<typeof txSchema>;
