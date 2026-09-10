import { useMutation, useQueryClient } from '@tanstack/react-query';

import { enviar } from '@/api/cliente';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';
import { CHAVE_DA_SESSAO, type SessaoResponse } from '@/compartilhado/sessao/sessao';

export type { SessaoResponse };

interface Credenciais {
  email: string;
  senha: string;
}

interface CodigoInformado {
  email: string;
  codigo: string;
}

interface SenhaNova extends CodigoInformado {
  novaSenha: string;
}

/**
 * Abre a sessão. O token não volta no corpo: ele vem num cookie HttpOnly que o navegador guarda
 * sozinho, então não há nada para este código armazenar.
 */
export function useEntrar() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (credenciais: Credenciais) =>
      contexto.interacao('entrar', () =>
        enviar<SessaoResponse>('/autenticacao/entrar', credenciais),
      ),
    // A sessão recém-aberta é a resposta desta chamada: semear o cache evita que a área logada
    // faça um GET /sessao redundante no primeiro render depois de entrar.
    onSuccess: (sessao) => cliente.setQueryData(CHAVE_DA_SESSAO, sessao),
  });
}

/**
 * Encerra a sessão. Limpa o cache inteiro, não só a chave da sessão: o que estava em memória era
 * de quem saiu, e deixar resquício na tela de quem entrar depois é vazamento de dado.
 */
export function useSair() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: () =>
      contexto.interacao('sair', () => enviar<void>('/autenticacao/sessao', undefined, 'DELETE')),
    onSuccess: () => cliente.clear(),
  });
}

/** Responde igual para e-mail cadastrado e desconhecido: a tela não pode revelar quem tem conta. */
export function useSolicitarCodigo() {
  return useMutation({
    mutationFn: (email: string) =>
      contexto.interacao('solicitar-codigo', () =>
        enviar<void>('/autenticacao/recuperacao', { email }),
      ),
  });
}

export function useValidarCodigo() {
  return useMutation({
    mutationFn: (dados: CodigoInformado) =>
      contexto.interacao('validar-codigo', () =>
        enviar<void>('/autenticacao/recuperacao/codigo', dados),
      ),
  });
}

export function useRedefinirSenha() {
  return useMutation({
    mutationFn: (dados: SenhaNova) =>
      contexto.interacao('redefinir-senha', () =>
        enviar<void>('/autenticacao/recuperacao/senha', dados),
      ),
  });
}
