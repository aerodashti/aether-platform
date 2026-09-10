import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { buscar, enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

export type EmpresaResponse = components['schemas']['EmpresaResponse'];
export type AlterarEmpresaRequest = components['schemas']['AlterarEmpresaRequest'];
export type TrocarSenhaRequest = components['schemas']['TrocarSenhaRequest'];

const CHAVE_DA_EMPRESA = ['empresa'] as const;

/**
 * Os dados da conta. A frota também depende deles: a antecedência de aviso governa a coluna
 * Situação da tela de Aeronaves, então mudá-la invalida as duas consultas.
 */
export function useEmpresa() {
  return useQuery({
    queryKey: CHAVE_DA_EMPRESA,
    queryFn: () => buscar<EmpresaResponse>('/empresa'),
  });
}

function useAlteracaoDaEmpresa<T>(nome: string, acao: (entrada: T) => Promise<EmpresaResponse>) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (entrada: T) => contexto.interacao(nome, () => acao(entrada)),
    onSuccess: (empresa) => {
      cliente.setQueryData(CHAVE_DA_EMPRESA, empresa);
      // A situação de cada aeronave é derivada da antecedência de aviso: mudou a política,
      // mudou a frota na tela.
      void cliente.invalidateQueries({ queryKey: ['aeronaves'] });
    },
  });
}

export function useAlterarEmpresa() {
  return useAlteracaoDaEmpresa<AlterarEmpresaRequest>('alterar-empresa', (dados) =>
    enviar<EmpresaResponse>('/empresa', dados, 'PUT'),
  );
}

export function useAlterarAviso() {
  return useAlteracaoDaEmpresa<number>('alterar-aviso-de-vencimento', (diasDeAviso) =>
    enviar<EmpresaResponse>('/empresa/aviso-de-vencimento', { diasDeAviso }, 'PUT'),
  );
}

/** Manda o código de seis dígitos para o e-mail cadastrado. */
export function useSolicitarTokenDeSenha() {
  return useMutation({
    mutationFn: () =>
      contexto.interacao('solicitar-token-de-senha', () =>
        enviar<void>('/autenticacao/senha/token'),
      ),
  });
}

export function useTrocarSenha() {
  return useMutation({
    mutationFn: (dados: TrocarSenhaRequest) =>
      contexto.interacao('trocar-senha', () => enviar<void>('/autenticacao/senha', dados)),
  });
}
