import { useMutation, useQueryClient } from '@tanstack/react-query';

import { enviar, enviarArquivos } from '@/api/cliente';
import {
  chaveDosDocumentos,
  type DocumentoResponse,
} from '@/compartilhado/documentos/useDocumentos';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

export function useEnviarDocumentos(aeronaveId: number) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (arquivos: File[]) =>
      contexto.interacao('enviar-documentos', () => {
        contexto.registrar('documentos.quantidade', arquivos.length);
        return enviarArquivos<DocumentoResponse[]>(
          `/aeronaves/${aeronaveId}/documentos`,
          'arquivos',
          arquivos,
        );
      }),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: chaveDosDocumentos(aeronaveId) }),
  });
}

export function useRemoverDocumento(aeronaveId: number) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      contexto.interacao('remover-documento', () =>
        enviar<void>(`/aeronaves/${aeronaveId}/documentos/${id}`, undefined, 'DELETE'),
      ),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: chaveDosDocumentos(aeronaveId) }),
  });
}
