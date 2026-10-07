import { useMutation, useQueryClient } from '@tanstack/react-query';

import { enviar } from '@/api/cliente';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';
import { useAcaoSobreProprietarios } from '@/compartilhado/proprietarios/useAcoesDeProprietario';
import type { ProprietarioResponse as Proprietario } from '@/compartilhado/proprietarios/useProprietarios';

export type {
  ProprietarioResponse,
  SituacaoDoProprietario,
} from '@/compartilhado/proprietarios/useProprietarios';
export { useProprietarios } from '@/compartilhado/proprietarios/useProprietarios';

/**
 * As ações que só esta tela tem. Cadastrar e atualizar ficam em `compartilhado`, junto do painel
 * que o cadastro de aeronave também abre.
 */
export function useDesativarProprietario() {
  return useAcaoSobreProprietarios<number>('desativar-proprietario', (id) =>
    enviar<Proprietario>(`/proprietarios/${id}/desativacao`),
  );
}

export function useReativarProprietario() {
  return useAcaoSobreProprietarios<number>('reativar-proprietario', (id) =>
    enviar<Proprietario>(`/proprietarios/${id}/reativacao`),
  );
}

/**
 * O pedido da saída. `contratoVigenteId` ainda não está em `tipos-gerados.ts` (some na próxima
 * `npm run gerar-tipos`): é o vigente de onde o painel partiu, e o servidor responde 409 se outro
 * entrou no lugar. O percentual ilegível vai nulo, nunca `NaN`.
 */
export interface SaidaDeProprietario {
  proprietarioId: number;
  contratos: Array<{
    aeronaveId: number;
    contratoVigenteId: number | null;
    participacoes: Array<{ proprietarioId: number; percentual: number | null }>;
  }>;
}

/**
 * A saída de quem está em contrato vigente: os contratos novos e a desativação numa chamada só. Muda
 * contratos, vínculos, rateio e saldos de uma vez — por isso invalida tudo, e não só a lista.
 */
export function useSairDosContratos() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ proprietarioId, contratos }: SaidaDeProprietario) =>
      contexto.interacao('sair-dos-contratos', () =>
        enviar<void>(`/proprietarios/${proprietarioId}/saida`, { contratos }),
      ),
    onSuccess: () => cliente.invalidateQueries(),
  });
}
