import { useMutation } from '@tanstack/react-query';

import { enviar } from '@/api/cliente';
import type { components } from '@/api/tipos-gerados';
import { contexto } from '@/compartilhado/observabilidade/observabilidade';

export type SessaoResponse = components['schemas']['SessaoResponse'];

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
  return useMutation({
    mutationFn: (credenciais: Credenciais) =>
      contexto.interacao('entrar', () =>
        enviar<SessaoResponse>('/autenticacao/entrar', credenciais),
      ),
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
