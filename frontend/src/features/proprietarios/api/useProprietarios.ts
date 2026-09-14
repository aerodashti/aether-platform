import { enviar } from '@/api/cliente';
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
