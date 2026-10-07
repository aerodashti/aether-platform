import { useMutation, useQueryClient } from '@tanstack/react-query';

import { baixarArquivo, enviar, enviarArquivos } from '@/api/cliente';
import {
  chaveDosDocumentos,
  type DocumentoResponse,
} from '@/compartilhado/documentos/useDocumentos';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

/**
 * Remoção e download invalidam a lista também quando falham: o 404 de um documento removido em
 * outra aba quer dizer que a lista na tela está velha.
 */
function useInvalidarDocumentos(aeronaveId: number) {
  const cliente = useQueryClient();
  return () => void cliente.invalidateQueries({ queryKey: chaveDosDocumentos(aeronaveId) });
}

export function useEnviarDocumentos(aeronaveId: number) {
  const invalidar = useInvalidarDocumentos(aeronaveId);
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
    onSuccess: invalidar,
  });
}

export function useRemoverDocumento(aeronaveId: number) {
  const invalidar = useInvalidarDocumentos(aeronaveId);
  return useMutation({
    mutationFn: (id: number) =>
      contexto.interacao('remover-documento', () =>
        enviar<void>(`/aeronaves/${aeronaveId}/documentos/${id}`, undefined, 'DELETE'),
      ),
    onSettled: invalidar,
  });
}

/** Salva o conteúdo com o nome dado, pela janela de download do navegador. */
function salvar(conteudo: Blob, nome: string) {
  const endereco = URL.createObjectURL(conteudo);
  const ancora = document.createElement('a');
  ancora.href = endereco;
  ancora.download = nome;
  ancora.click();
  URL.revokeObjectURL(endereco);
}

export function useBaixarDocumento(aeronaveId: number) {
  const invalidar = useInvalidarDocumentos(aeronaveId);
  return useMutation({
    mutationFn: ({ id, nome }: { id: number; nome: string }) =>
      contexto.interacao('baixar-documento', async () => {
        salvar(await baixarArquivo(`/aeronaves/${aeronaveId}/documentos/${id}/conteudo`), nome);
      }),
    onError: invalidar,
  });
}
