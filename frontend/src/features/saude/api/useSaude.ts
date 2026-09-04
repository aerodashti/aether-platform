import { useQuery } from '@tanstack/react-query';

import { buscar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';

/** O tipo vem do OpenAPI do backend. Não escreva tipo de API à mão. */
export type Saude = components['schemas']['SaudeResponse'];

export function useSaude() {
  return useQuery({
    queryKey: ['saude'],
    queryFn: () => buscar<Saude>('/saude'),
  });
}
