import { useQuery } from '@tanstack/react-query';

import { buscar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';

export type DocumentosResponse = components['schemas']['DocumentosResponse'];
export type DocumentoResponse = components['schemas']['DocumentoResponse'];

/** Chave dos documentos de uma aeronave; envio e remoção a invalidam. */
export function chaveDosDocumentos(aeronaveId: number) {
  return ['documentos', aeronaveId] as const;
}

/**
 * Os documentos de uma aeronave. A tela de Documentos lista; o detalhe da aeronave só conta —
 * "Documentos (3)" no cabeçalho.
 */
export function useDocumentos(aeronaveId: number) {
  return useQuery({
    queryKey: chaveDosDocumentos(aeronaveId),
    queryFn: () => buscar<DocumentosResponse>(`/aeronaves/${aeronaveId}/documentos`),
    enabled: Number.isFinite(aeronaveId) && aeronaveId > 0,
  });
}
